import { OS } from '../types'

export interface DevHubHeaders {
  Authorization: string
  DEVHUB_HOSTNAME: string
  DEVHUB_IS_BETA: boolean
  DEVHUB_IS_DEV: boolean
  DEVHUB_IS_LANDING: boolean
  DEVHUB_PLATFORM_IS_ELECTRON: boolean
  DEVHUB_PLATFORM_REAL_OS: OS
  DEVHUB_VERSION: string
}
