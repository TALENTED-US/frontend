import axios from 'axios'

const ACCESS_TOKEN_KEY = 'buttie-access-token'
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || '/backend'
const normalizedBaseUrl = configuredBaseUrl.endsWith('/api') || configuredBaseUrl.endsWith('/api/')
  ? `${configuredBaseUrl.replace(/\/+$/, '')}/`
  : `${configuredBaseUrl.replace(/\/+$/, '')}/api/`

let unauthorizedHandler = null

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
  if (error?.status || error?.code === 'API_ERROR') {
    return {
      status: error.status || 0,
      code: error.code || 'API_ERROR',
      message: error.message || '요청을 처리하지 못했습니다.',
    }
  }
  const body = error?.response?.data
  return {
    status: error?.response?.status || 0,
    code: body?.code || error?.code || 'NETWORK_ERROR',
    message:
      body?.message ||
      (error?.code === 'ECONNABORTED'
        ? '서버 응답 시간이 초과되었습니다.'
        : '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'),
  }
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const authorization = response.headers?.authorization
    if (authorization?.startsWith('Bearer ')) {
      setAccessToken(authorization.slice(7))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipUnauthorizedHandler) {
      setAccessToken('')
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)
