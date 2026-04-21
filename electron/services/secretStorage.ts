import { safeStorage } from 'electron'

export function encryptSecret(secret: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(secret).toString('base64')}`
  }

  return `plain:${Buffer.from(secret, 'utf8').toString('base64')}`
}

export function decryptSecret(encryptedSecret: string): string {
  const separatorIndex = encryptedSecret.indexOf(':')
  if (separatorIndex < 0) {
    throw new Error('Stored secret has an invalid format.')
  }

  const kind = encryptedSecret.slice(0, separatorIndex)
  const payload = encryptedSecret.slice(separatorIndex + 1)

  if (kind === 'plain') {
    return Buffer.from(payload, 'base64').toString('utf8')
  }

  if (kind === 'safe') {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encrypted secrets are unavailable on this machine.')
    }

    try {
      return safeStorage.decryptString(Buffer.from(payload, 'base64'))
    } catch (error) {
      throw new Error(
        `Stored secret could not be decrypted: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    }
  }

  throw new Error(`Stored secret uses unsupported scheme "${kind}".`)
}
