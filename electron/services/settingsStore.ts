import Store from 'electron-store'

interface StoreShape {
  copilotModelId?: string
}

export class SettingsStore {
  private readonly store = new Store<StoreShape>({
    name: 'db-genie-settings',
  })

  getCopilotModelId(): string | null {
    return this.store.get('copilotModelId') ?? null
  }

  setCopilotModelId(modelId: string): void {
    const normalized = modelId.trim()
    if (!normalized) {
      throw new Error('A Copilot model must be selected.')
    }

    this.store.set('copilotModelId', normalized)
  }
}
