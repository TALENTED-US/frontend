import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function requestResult(request) {
  try {
    const response = await request()
    return response.status === 204 ? null : unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function getQuestsApi() {
  return requestResult(() => apiClient.get('quest'))
}

export function completeQuestApi(questId) {
  return requestResult(() => apiClient.patch(`quest/${encodeURIComponent(questId)}/complete`))
}

export function revertQuestApi(questId) {
  return requestResult(() => apiClient.patch(`quest/${encodeURIComponent(questId)}/revert`))
}
