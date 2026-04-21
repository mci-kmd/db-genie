import Store from 'electron-store'

import type { ConnectionProfileInput, DatabaseEngine } from '../../src/shared/contracts'
import { decryptSecret, encryptSecret } from './secretStorage'

interface StoredLastConnection {
  profileId?: string
  engine: DatabaseEngine
  name: string
  server: string
  port: number
  database: string
  user: string
  encrypt: boolean
  trustServerCertificate: boolean
  encryptedPassword: string
}

interface StoreShape {
  copilotModelId?: string
  lastConnection?: StoredLastConnection
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

  getLastConnection(): ConnectionProfileInput | null {
    const lastConnection = this.store.get('lastConnection')
    if (!lastConnection) {
      return null
    }

    return {
      id: lastConnection.profileId,
      engine: lastConnection.engine,
      name: lastConnection.name,
      server: lastConnection.server,
      port: lastConnection.port,
      database: lastConnection.database,
      user: lastConnection.user,
      password: decryptSecret(lastConnection.encryptedPassword),
      encrypt: lastConnection.encrypt,
      trustServerCertificate: lastConnection.trustServerCertificate,
      savePassword: false,
    }
  }

  setLastConnection(
    input: Omit<ConnectionProfileInput, 'savePassword'> & { password: string; profileId?: string },
  ): void {
    const password = input.password.trim()
    if (!password) {
      throw new Error('A password is required to restore the last connection.')
    }

    this.store.set('lastConnection', {
      profileId: input.profileId,
      engine: input.engine,
      name: input.name.trim(),
      server: input.server.trim(),
      port: input.port,
      database: input.database.trim(),
      user: input.user.trim(),
      encrypt: input.encrypt,
      trustServerCertificate: input.trustServerCertificate,
      encryptedPassword: encryptSecret(password),
    })
  }

  clearLastConnection(): void {
    this.store.delete('lastConnection')
  }
}
