import { safeStorage } from 'electron'

const SAFE_SECRET_PREFIX = 'safe:'
const PLAIN_SECRET_PREFIX = 'plain:'

export function isSecretStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function encryptSecret(secret: string): string {
  if (!isSecretStorageAvailable()) {
    throw new Error('Secure password storage is unavailable on this machine.')
  }

  return `${SAFE_SECRET_PREFIX}${safeStorage.encryptString(secret).toString('base64')}`
}

export function decryptSecret(encryptedSecret: string): string {
  const { kind, payload } = parseStoredSecret(encryptedSecret)

  if (kind === 'plain') {
    throw new Error('Stored password uses a removed insecure format. Re-enter and save it again.')
  }

  if (!isSecretStorageAvailable()) {
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

export function normalizeStoredSecret(encryptedSecret: string | undefined): string | undefined {
  if (!encryptedSecret) {
    return undefined
  }

  const { kind, payload } = parseStoredSecret(encryptedSecret)
  if (kind === 'safe') {
    return encryptedSecret
  }

  if (!isSecretStorageAvailable()) {
    return undefined
  }

  return encryptSecret(Buffer.from(payload, 'base64').toString('utf8'))
}

function parseStoredSecret(encryptedSecret: string): { kind: 'safe' | 'plain'; payload: string } {
  if (encryptedSecret.startsWith(SAFE_SECRET_PREFIX)) {
    return {
      kind: 'safe',
      payload: encryptedSecret.slice(SAFE_SECRET_PREFIX.length),
    }
  }

  if (encryptedSecret.startsWith(PLAIN_SECRET_PREFIX)) {
    return {
      kind: 'plain',
      payload: encryptedSecret.slice(PLAIN_SECRET_PREFIX.length),
    }
  }

  throw new Error('Stored secret has an invalid format.')
}
