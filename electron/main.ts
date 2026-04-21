import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { app, BrowserWindow, ipcMain, shell } from 'electron'

import type { ConnectionProfileInput, CopilotSqlRequest, SchemaObjectRef } from '../src/shared/contracts'
import { ConnectionStore } from './services/connectionStore'
import { CopilotService } from './services/copilotService'
import { DatabaseService } from './services/databaseService'
import { SettingsStore } from './services/settingsStore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const connectionStore = new ConnectionStore()
const settingsStore = new SettingsStore()
const databaseService = new DatabaseService(connectionStore, settingsStore)
const copilotService = new CopilotService(databaseService, settingsStore)

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 820,
    backgroundColor: '#070b16',
    autoHideMenuBar: true,
    title: 'DB Genie',
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL)
    return
  }

  await window.loadFile(join(__dirname, '../dist/index.html'))
}

function registerIpcHandlers(): void {
  ipcMain.handle('connections:list', () => connectionStore.listProfiles())
  ipcMain.handle('connections:save', (_event, input: ConnectionProfileInput) =>
    connectionStore.saveProfile(input),
  )
  ipcMain.handle('connections:delete', (_event, id: string) => {
    connectionStore.deleteProfile(id)
  })
  ipcMain.handle('connections:connect', (_event, input: ConnectionProfileInput) =>
    databaseService.connect(input),
  )
  ipcMain.handle('connections:disconnect', () => databaseService.disconnect())
  ipcMain.handle('app:health', () => databaseService.getHealth())
  ipcMain.handle('schema:get', (_event, forceRefresh?: boolean) =>
    databaseService.getSchema(forceRefresh),
  )
  ipcMain.handle('schema:detail', (_event, ref: SchemaObjectRef) => databaseService.getObjectDetail(ref))
  ipcMain.handle('query:run', (_event, sqlText: string) => databaseService.runQuery(sqlText))
  ipcMain.handle('query:cancel', () => databaseService.cancelQuery())
  ipcMain.handle('copilot:config', () => copilotService.getConfig())
  ipcMain.handle('copilot:model', (_event, modelId: string) => copilotService.setSelectedModel(modelId))
  ipcMain.handle('copilot:generate', (_event, request: CopilotSqlRequest) =>
    copilotService.generateSql(request),
  )
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  await databaseService.resumeLastConnection()
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void databaseService.disconnect({ clearLastConnection: false })
  void copilotService.dispose()
})
