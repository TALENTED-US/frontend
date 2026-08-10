import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function getResult(url) {
  try {
    return unwrapApiResponse(await apiClient.get(url))
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function getMyProfileApi() {
  return getResult('users/my/info')
}

export function getEmploymentPreparationApi() {
  return getResult('users/my/employment-preparation')
}
