import { contextBridge, ipcRenderer } from 'electron'

import type {
  CopilotConfig,
  ConnectionProfileInput,
  CopilotSqlRequest,
  DbGenieApi,
  SchemaObjectRef,
} from '../src/shared/contracts'

const api: DbGenieApi = {
  listConnectionProfiles: () => ipcRenderer.invoke('connections:list'),
  saveConnectionProfile: (input: ConnectionProfileInput) =>
    ipcRenderer.invoke('connections:save', input),
  deleteConnectionProfile: (id: string) => ipcRenderer.invoke('connections:delete', id),
  connect: (input: ConnectionProfileInput) => ipcRenderer.invoke('connections:connect', input),
  disconnect: () => ipcRenderer.invoke('connections:disconnect'),
  getHealth: () => ipcRenderer.invoke('app:health'),
  getSchema: (forceRefresh?: boolean) => ipcRenderer.invoke('schema:get', forceRefresh),
  getObjectDetail: (ref: SchemaObjectRef) => ipcRenderer.invoke('schema:detail', ref),
  runQuery: (sql: string) => ipcRenderer.invoke('query:run', sql),
  cancelQuery: () => ipcRenderer.invoke('query:cancel'),
  getCopilotConfig: () => ipcRenderer.invoke('copilot:config') as Promise<CopilotConfig>,
  setCopilotModel: (modelId: string) => ipcRenderer.invoke('copilot:model', modelId) as Promise<CopilotConfig>,
  generateSql: (request: CopilotSqlRequest) => ipcRenderer.invoke('copilot:generate', request),
}

contextBridge.exposeInMainWorld('dbGenie', api)
