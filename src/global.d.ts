import type { DbGenieApi } from './shared/contracts'

declare global {
  interface Window {
    dbGenie: DbGenieApi
  }
}

export {}
