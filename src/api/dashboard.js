import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

export async function getButtieDashboardApi() {
  try {
    return unwrapApiResponse(await apiClient.get('dashboard/buttie'))
  } catch (error) {
    throw normalizeApiError(error)
  }
}
