import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function requestResult(request) {
  try {
    const response = await request()
    return response.status === 204 ? null : unwrapApiResponse(response)
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function createSimulationApi(payload) {
  return requestResult(() => apiClient.post('simulation', payload))
}

export function getCurrentSimulationApi() {
  return requestResult(() => apiClient.get('simulation'))
}

export function updateSimulationPeriodApi(payload) {
  return requestResult(() => apiClient.patch('simulation/period', payload))
}

export function applySimulationItemApi(payload) {
  return requestResult(() => apiClient.post('simulation/items', payload))
}

export function getSimulationItemsApi(category) {
  return requestResult(() => apiClient.get('simulation/items', { params: { category } }))
}

export function getSimulationReportApi() {
  return requestResult(() => apiClient.get('simulation/items/report'))
}

export function updateSimulationItemApi(encryptedItemId, payload) {
  return requestResult(() =>
    apiClient.put(`simulation/items/${encodeURIComponent(encryptedItemId)}`, payload),
  )
}

export function deleteSimulationItemApi(encryptedItemId) {
  return requestResult(() =>
    apiClient.delete(`simulation/items/${encodeURIComponent(encryptedItemId)}`),
  )
}

export function getLatestConfirmedSimulationApi() {
  return requestResult(() => apiClient.get('simulation/confirmed'))
}

export function confirmSimulationApi() {
  return requestResult(() => apiClient.post('simulation/confirmed'))
}

export function deleteConfirmedSimulationApi() {
  return requestResult(() => apiClient.delete('simulation/confirmed'))
}

export function revertConfirmedSimulationApi() {
  return requestResult(() => apiClient.patch('simulation/confirmed/revert'))
}

export function deleteDraftSimulationApi() {
  return requestResult(() => apiClient.delete('simulation'))
}

export function getSimulationRecommendationsApi() {
  return requestResult(() => apiClient.post('simulation/recommendations'))
}

export function getExpenseRecommendationsApi(prompt) {
  return requestResult(() => apiClient.post('simulation/recommendations/expense', { prompt }))
}

export function getIncomeRecommendationsApi(prompt) {
  return requestResult(() => apiClient.post('simulation/recommendations/income', { prompt }))
}

export function getPolicyRecommendationsApi(prompt) {
  return requestResult(() => apiClient.post('simulation/recommendations/policies', { prompt }))
}

export function getCustomRecommendationsApi(prompt) {
  return requestResult(() => apiClient.post('simulation/recommendations/custom', { prompt }))
}
