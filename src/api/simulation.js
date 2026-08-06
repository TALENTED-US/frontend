import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function requestResult(request) {
  try {
    return unwrapApiResponse(await request())
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
