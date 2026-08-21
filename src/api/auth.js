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

const publicRequestConfig = {
  skipAuthorization: true,
  skipAuthRefresh: true,
  skipUnauthorizedHandler: true,
}

export async function verifyLoginCredentialsApi(userEmail, password) {
  try {
    const response = await apiClient.post(
      'auth/login',
      { userEmail, password },
      {
        ...publicRequestConfig,
        skipTokenUpdate: true,
        withCredentials: false,
      },
    )
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

function identityVerificationConfig(identityVerificationToken) {
  return {
    ...publicRequestConfig,
    headers: {
      'X-Identity-Verification-Token': identityVerificationToken,
    },
  }
}

export async function checkEmailDuplicateApi(email) {
  try {
    const response = await apiClient.get('auth/check-email', {
      ...publicRequestConfig,
      params: { email },
    })
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function checkNicknameDuplicateApi(nickname) {
  try {
    const response = await apiClient.get('auth/check-nickname', {
      ...publicRequestConfig,
      params: { nickname },
    })
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function verifyIdentityApi(identityVerificationId) {
  try {
    const response = await apiClient.post(
      'auth/verify',
      { identityVerificationId },
      publicRequestConfig,
    )
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function signupApi(
  { userEmail, userPassword, userPasswordCheck, userNickname },
  identityVerificationToken,
) {
  try {
    const response = await apiClient.post(
      'auth/signUp',
      { userEmail, userPassword, userPasswordCheck, userNickname },
      identityVerificationConfig(identityVerificationToken),
    )
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function createUserConsentApi(userId) {
  try {
    const response = await apiClient.post(`auth/consent/${encodeURIComponent(userId)}`)
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function findEmailApi(identityVerificationToken) {
  try {
    const response = await apiClient.get(
      'auth/email',
      identityVerificationConfig(identityVerificationToken),
    )
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function resetPasswordApi({ password, passwordCheck }, identityVerificationToken) {
  try {
    const response = await apiClient.patch(
      'auth/password',
      { password, passwordCheck },
      identityVerificationConfig(identityVerificationToken),
    )
    if (response.status === 204) return null
    return unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export async function logoutApi() {
  const csrfToken = getCookie('csrfToken') || getCookie('XSRF-TOKEN')

  try {
    const response = await apiClient.delete('auth/logout', {
      headers: csrfToken
        ? {
            'X-CSRF-Token': csrfToken,
            'X-XSRF-TOKEN': csrfToken,
          }
        : undefined,
    })
    if (response.status === 204) return null
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
