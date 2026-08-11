import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function requestResult(request) {
  try {
    const response = await request()
    return response.status === 204 ? null : unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function getMyProfileSummaryApi() {
  return requestResult(() => apiClient.get('users/my'))
}

export function getMyProfileApi() {
  return requestResult(() => apiClient.get('users/my/info'))
}

export function getEmploymentPreparationApi() {
  return requestResult(() => apiClient.get('users/my/employment-preparation'))
}

export function createEmploymentPreparationApi(payload) {
  return requestResult(() => apiClient.post('users/my/employment-preparation', payload))
}

export function updateEmploymentPreparationApi(payload) {
  return requestResult(() => apiClient.patch('users/my/employment-preparation', payload))
}

export function updateNicknameApi(nickname) {
  return requestResult(() => apiClient.patch('users/my/nickname', { nickname }))
}

export function withdrawUserApi(password) {
  return requestResult(() => apiClient.delete('users/my', { data: { password } }))
}
