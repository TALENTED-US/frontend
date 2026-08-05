import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function getResult(url) {
  try {
    return unwrapApiResponse(await apiClient.get(url))
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function getMyProfileApi() {
  return getResult('/api/users/my')
}

export function getEmploymentPreparationApi() {
  return getResult('/api/users/my/employment-preparation')
}
