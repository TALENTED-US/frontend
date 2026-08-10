import axios from 'axios'

const ACCESS_TOKEN_KEY = 'buttie-access-token'
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/backend'
const normalizedBaseUrl =
  configuredBaseUrl.endsWith('/api') || configuredBaseUrl.endsWith('/api/')
    ? `${configuredBaseUrl.replace(/\/+$/, '')}/`
    : `${configuredBaseUrl.replace(/\/+$/, '')}/api/`

let unauthorizedHandler = null
let accessTokenReissueHandler = null
let accessTokenReissuePromise = null

export const apiClient = axios.create({
  baseURL: normalizedBaseUrl,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

export function setAccessToken(token) {
  if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  else sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function getCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix))

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : ''
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

export function setAccessTokenReissueHandler(handler) {
  accessTokenReissueHandler = handler
}

export function unwrapApiResponse(response) {
  const body = response?.data
  if (!body || body.isSuccess !== true) {
    const error = new Error(body?.message || '요청을 처리하지 못했습니다.')
    error.code = body?.code || 'API_ERROR'
    error.status = response?.status
    throw error
  }
  return body.result
}

export function normalizeApiError(error) {
  const response = error?.response
  if (response) {
    const body = response.data
    const status = response.status || 0
    return {
      status,
      code: body?.code || 'HTTP_ERROR',
      message:
        body?.message ||
        (status >= 500
          ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
          : '요청을 처리하지 못했습니다.'),
    }
  }

  if (error?.status || error?.code === 'API_ERROR') {
    return {
      status: error.status || 0,
      code: error.code || 'API_ERROR',
      message: error.message || '요청을 처리하지 못했습니다.',
    }
  }

  return {
    status: 0,
    code: error?.code || 'NETWORK_ERROR',
    message:
      error?.code === 'ECONNABORTED'
        ? '서버 응답 시간이 초과되었습니다.'
        : '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  }
}

apiClient.interceptors.request.use((config) => {
  if (config.skipAuthorization) {
    if (typeof config.headers?.delete === 'function') config.headers.delete('Authorization')
    else if (config.headers) delete config.headers.Authorization
    return config
  }

  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function reissueAccessTokenOnce() {
  if (!accessTokenReissuePromise) {
    accessTokenReissuePromise = Promise.resolve()
      .then(() => accessTokenReissueHandler())
      .then((accessToken) => {
        if (!accessToken) throw new Error('Access Token을 재발급하지 못했습니다.')
        setAccessToken(accessToken)
        return accessToken
      })
      .catch((error) => {
        setAccessToken('')
        unauthorizedHandler?.()
        throw error
      })
      .finally(() => {
        accessTokenReissuePromise = null
      })
  }

  return accessTokenReissuePromise
}

apiClient.interceptors.response.use(
  (response) => {
    const authorization = response.headers?.authorization
    if (authorization?.startsWith('Bearer ')) {
      setAccessToken(authorization.slice(7))
    }
    return response
  },
  async (error) => {
    const config = error.config
    const shouldHandleUnauthorized =
      error.response?.status === 401 && !config?.skipUnauthorizedHandler
    const canReissue =
      shouldHandleUnauthorized &&
      !config?.skipAuthRefresh &&
      !config?._accessTokenRetry &&
      typeof accessTokenReissueHandler === 'function'

    if (canReissue) {
      config._accessTokenRetry = true

      try {
        const accessToken = await reissueAccessTokenOnce()
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(config)
      } catch (reissueError) {
        return Promise.reject(reissueError)
      }
    }

    if (shouldHandleUnauthorized) {
      setAccessToken('')
      unauthorizedHandler?.()
    }

    return Promise.reject(error)
  },
)
