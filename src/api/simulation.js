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
