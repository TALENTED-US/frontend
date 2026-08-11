import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

export async function getTimelineApi() {
  try {
    return unwrapApiResponse(await apiClient.get('timeline'))
  } catch (error) {
    throw normalizeApiError(error)
  }
}
