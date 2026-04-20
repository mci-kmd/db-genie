import {
  CopilotClient,
  defineTool,
  type PermissionRequest,
  type PermissionRequestResult,
} from '@github/copilot-sdk'
import { createRequire } from 'node:module'
import { z } from 'zod'

import type {
  CopilotConfig,
  CopilotModel,
  CopilotSqlRequest,
  CopilotSqlResult,
} from '../../src/shared/contracts'
import { DatabaseService } from './databaseService'
import { SettingsStore } from './settingsStore'

const require = createRequire(import.meta.url)
const COPILOT_BINARY_PACKAGES = {
  win32: {
    arm64: '@github/copilot-win32-arm64',
    x64: '@github/copilot-win32-x64',
  },
  darwin: {
    arm64: '@github/copilot-darwin-arm64',
    x64: '@github/copilot-darwin-x64',
  },
  linux: {
    arm64: '@github/copilot-linux-arm64',
    x64: '@github/copilot-linux-x64',
  },
} as const

export class CopilotService {
  private readonly client = new CopilotClient({
    cliPath: resolveCopilotCliPath(),
    env: buildCopilotCliEnv(),
  })
  private started = false
  private readonly databaseService: DatabaseService
  private readonly settingsStore: SettingsStore

  constructor(databaseService: DatabaseService, settingsStore: SettingsStore) {
    this.databaseService = databaseService
    this.settingsStore = settingsStore
  }

  async getConfig(): Promise<CopilotConfig> {
    const models = await this.listModels()
    return {
      models,
      selectedModel: this.resolveSelectedModelId(models),
    }
  }

  async setSelectedModel(modelId: string): Promise<CopilotConfig> {
    const models = await this.listModels()
    const normalized = modelId.trim()
    if (!models.some((model) => model.id === normalized)) {
      throw new Error(`Copilot model "${normalized}" is unavailable for this account.`)
    }

    this.settingsStore.setCopilotModelId(normalized)
    return {
      models,
      selectedModel: normalized,
    }
  }

  async generateSql(request: CopilotSqlRequest): Promise<CopilotSqlResult> {
    const promptGoal = request.goal.trim()
    if (!promptGoal) {
      throw new Error('Describe the SQL you want Copilot to generate.')
    }

    const models = await this.listModels()
    const model = this.resolveSelectedModelId(models)
    const schemaSummary = await this.databaseService.getSchemaSummary()

    const session = await this.client.createSession({
      model,
      streaming: false,
      onPermissionRequest: allowOnlyCustomTools,
      systemMessage: {
        content: `
<workflow_rules>
- You are generating SQL for DB Genie.
- Target SQL Server T-SQL unless the user explicitly asks otherwise.
- Use only schema information from the provided tools and prompt context.
- Prefer read-only queries unless the user explicitly requests INSERT, UPDATE, DELETE, MERGE, DDL, or procedures.
- If JSON columns are involved, use SQL Server JSON functions such as JSON_VALUE, JSON_QUERY, or OPENJSON when useful.
- Return a single SQL code block first, then a short rationale.
</workflow_rules>
        `.trim(),
      },
      tools: [
        defineTool('list_schema_objects', {
          description: 'List the most relevant tables and views in the active database',
          parameters: z.object({}),
          skipPermission: true,
          handler: async () => ({
            databaseObjects: schemaSummary,
          }),
        }),
        defineTool('get_object_details', {
          description: 'Get columns, types, and JSON path hints for a table or view',
          parameters: z.object({
            schema: z.string().describe('Database schema name'),
            name: z.string().describe('Table or view name'),
            type: z.enum(['table', 'view']).optional(),
          }),
          skipPermission: true,
          handler: async ({ schema, name, type }) =>
            this.databaseService.getObjectDetail({
              schema,
              name,
              type: type ?? 'table',
            }),
        }),
      ],
    })

    try {
      const selectedObjectText = request.selectedObject
        ? `Selected object: ${request.selectedObject.schema}.${request.selectedObject.name} (${request.selectedObject.type}).`
        : 'Selected object: none.'
      const currentSqlText = request.currentSql?.trim()
        ? `Current editor SQL:\n${request.currentSql.trim()}`
        : 'Current editor SQL: empty.'

      const response = await session.sendAndWait(
        {
          prompt: `
Goal:
${promptGoal}

${selectedObjectText}

${currentSqlText}

Visible schema summary:
${JSON.stringify(schemaSummary, null, 2)}
          `.trim(),
        },
        90_000,
      )

      const rawResponse = response?.data.content?.trim() ?? ''
      if (!rawResponse) {
        throw new Error('Copilot returned an empty response.')
      }

      const { sql, rationale } = extractSql(rawResponse)
      return {
        sql,
        rationale,
        rawResponse,
        model,
      }
    } finally {
      await session.disconnect()
    }
  }

  async dispose(): Promise<void> {
    if (!this.started) {
      return
    }

    await this.client.stop()
    this.started = false
  }

  private async ensureStarted(): Promise<void> {
    if (this.started) {
      return
    }

    await this.client.start()
    this.started = true
  }

  private async listModels(): Promise<CopilotModel[]> {
    await this.ensureStarted()

    const models = await this.client.listModels()
    return models
      .filter((model) => !model.policy || model.policy.state === 'enabled')
      .map((model) => ({
        id: model.id,
        name: model.name,
      }))
  }

  private resolveSelectedModelId(models: CopilotModel[]): string {
    if (models.length === 0) {
      throw new Error('No Copilot models are available for this account.')
    }

    const storedModelId = this.settingsStore.getCopilotModelId()
    const selectedModelId =
      storedModelId && models.some((model) => model.id === storedModelId) ? storedModelId : models[0].id

    if (selectedModelId !== storedModelId) {
      this.settingsStore.setCopilotModelId(selectedModelId)
    }

    return selectedModelId
  }
}

function allowOnlyCustomTools(request: PermissionRequest): PermissionRequestResult {
  if (request.kind === 'custom-tool') {
    return { kind: 'approved' }
  }

  return { kind: 'denied-by-rules', rules: [] }
}

function extractSql(rawResponse: string): { sql: string; rationale: string } {
  const fencedMatch = rawResponse.match(/```(?:sql)?\s*([\s\S]*?)```/i)
  if (!fencedMatch) {
    return {
      sql: rawResponse.trim(),
      rationale: '',
    }
  }

  const sql = fencedMatch[1].trim()
  const rationale = rawResponse.replace(fencedMatch[0], '').trim()
  return {
    sql,
    rationale,
  }
}

function resolveCopilotCliPath(): string | undefined {
  const packageName = COPILOT_BINARY_PACKAGES[process.platform as keyof typeof COPILOT_BINARY_PACKAGES]?.[
    process.arch as 'arm64' | 'x64'
  ]

  if (!packageName) {
    return undefined
  }

  try {
    return require.resolve(packageName)
  } catch {
    return undefined
  }
}

function buildCopilotCliEnv(): Record<string, string | undefined> {
  return {
    ...process.env,
    NODE_OPTIONS: mergeNodeOptions(process.env.NODE_OPTIONS, '--disable-warning=ExperimentalWarning'),
  }
}

function mergeNodeOptions(current: string | undefined, extraFlag: string): string {
  if (!current?.trim()) {
    return extraFlag
  }

  if (current.includes(extraFlag) || current.includes('--no-warnings')) {
    return current
  }

  return `${current} ${extraFlag}`
}
