import { constants, DevHubHeaders } from '@devhub/core'
import { Platform } from '../libs/platform'

export function getDefaultDevHubHeaders({
  appToken,
}: {
  appToken: string | undefined
}): DevHubHeaders {
  const headers: DevHubHeaders = {
    Authorization: appToken ? `bearer ${appToken}` : '',
    DEVHUB_HOSTNAME: constants.HOSTNAME!,
    DEVHUB_IS_BETA: constants.IS_BETA,
    DEVHUB_IS_DEV: __DEV__,
    DEVHUB_IS_LANDING: false,
    DEVHUB_PLATFORM_IS_ELECTRON: Platform.isElectron,
    DEVHUB_PLATFORM_REAL_OS: Platform.realOS,
    DEVHUB_VERSION: constants.APP_VERSION,
  }

  return headers
}

export function WrapUrlWithToken(url: string, token: string | undefined) {
  return `${url}?token=${token}`
}
