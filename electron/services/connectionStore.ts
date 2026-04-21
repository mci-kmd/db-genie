import { randomUUID } from 'node:crypto'

import Store from 'electron-store'

import type { ConnectionProfile, ConnectionProfileInput } from '../../src/shared/contracts'
import { decryptSecret, encryptSecret } from './secretStorage'

interface StoredConnectionProfile extends Omit<ConnectionProfile, 'hasSavedPassword'> {
  encryptedPassword?: string
}

interface StoreShape {
  profiles: StoredConnectionProfile[]
}

export interface ResolvedConnectionProfile extends ConnectionProfile {
  password: string
}

export class ConnectionStore {
  private readonly store = new Store<StoreShape>({
    name: 'db-genie-connections',
    defaults: {
      profiles: [],
    },
  })

  listProfiles(): ConnectionProfile[] {
    return this.store
      .get('profiles')
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map(({ encryptedPassword, ...profile }) => ({
        ...profile,
        hasSavedPassword: Boolean(encryptedPassword),
      }))
  }

  saveProfile(input: ConnectionProfileInput): ConnectionProfile {
    const profiles = this.store.get('profiles')
    const existing = input.id ? profiles.find((profile) => profile.id === input.id) : undefined
    const id = existing?.id ?? input.id ?? randomUUID()
    const encryptedPassword = this.resolveStoredPassword(input, existing?.encryptedPassword)

    const nextProfile: StoredConnectionProfile = {
      id,
      engine: input.engine,
      name: input.name.trim(),
      server: input.server.trim(),
      port: input.port,
      database: input.database.trim(),
      user: input.user.trim(),
      encrypt: input.encrypt,
      trustServerCertificate: input.trustServerCertificate,
      updatedAt: new Date().toISOString(),
      encryptedPassword,
    }

    const nextProfiles = profiles.filter((profile) => profile.id !== id)
    nextProfiles.unshift(nextProfile)
    this.store.set('profiles', nextProfiles)

    return {
      ...nextProfile,
      hasSavedPassword: Boolean(encryptedPassword),
    }
  }

  deleteProfile(id: string): void {
    this.store.set(
      'profiles',
      this.store.get('profiles').filter((profile) => profile.id !== id),
    )
  }

  resolveConnection(input: ConnectionProfileInput): ResolvedConnectionProfile {
    const existing = input.id
      ? this.store.get('profiles').find((profile) => profile.id === input.id)
      : undefined
    const password = input.password?.trim()
      ? input.password
      : existing?.encryptedPassword
        ? this.decryptPassword(existing.encryptedPassword)
        : undefined

    if (!password) {
      throw new Error('A password is required to connect.')
    }

    return {
      id: existing?.id ?? input.id ?? randomUUID(),
      engine: input.engine,
      name: input.name.trim(),
      server: input.server.trim(),
      port: input.port,
      database: input.database.trim(),
      user: input.user.trim(),
      encrypt: input.encrypt,
      trustServerCertificate: input.trustServerCertificate,
      updatedAt: existing?.updatedAt ?? new Date().toISOString(),
      hasSavedPassword: Boolean(existing?.encryptedPassword),
      password,
    }
  }

  private resolveStoredPassword(
    input: ConnectionProfileInput,
    previousEncryptedPassword?: string,
  ): string | undefined {
    if (!input.savePassword) {
      return undefined
    }

    if (input.password?.trim()) {
      return encryptSecret(input.password)
    }

    return previousEncryptedPassword
  }

  private decryptPassword(encryptedPassword: string): string {
    return decryptSecret(encryptedPassword)
  }
}
