import {
  apiClient,
  getCookie,
  normalizeApiError,
  setAccessToken,
  unwrapApiResponse,
} from './client'

export async function loginApi(userEmail, password) {
  try {
    const response = await apiClient.post(
      '/api/auth/login',
      { userEmail, password },
      { skipUnauthorizedHandler: true },
    )
    const result = unwrapApiResponse(response)
    setAccessToken(result?.accessToken)
    return result
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function logoutApi() {
  const csrfToken = getCookie('csrfToken')

  try {
    const response = await apiClient.delete('/api/auth/logout', {
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    })
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}
