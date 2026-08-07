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
      'auth/login',
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
    const response = await apiClient.delete('auth/logout', {
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    })
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function reissueAccessTokenApi() {
  try {
    const response = await apiClient.get('auth/reissue', {
      skipAuthorization: true,
      skipAuthRefresh: true,
      skipUnauthorizedHandler: true,
    })
    const result = unwrapApiResponse(response)
    const accessToken = result?.accessToken

    if (!accessToken) {
      const error = new Error('Access Token을 재발급하지 못했습니다.')
      error.code = 'TOKEN_REISSUE_FAILED'
      error.status = response?.status
      throw error
    }

    setAccessToken(accessToken)
    return accessToken
  } catch (error) {
    throw normalizeApiError(error)
  }
}
