import { apiClient, normalizeApiError, unwrapApiResponse } from './client'

async function requestResult(request) {
  try {
    return unwrapApiResponse(await request())
  } catch (error) {
    throw normalizeApiError(error)
  }
}

const publicRequest = {
  skipAuthorization: true,
  skipAuthRefresh: true,
  skipUnauthorizedHandler: true,
}

export function getPoliciesApi(params = {}) {
  return requestResult(() =>
    apiClient.get('catalog/policy', {
      ...publicRequest,
      params,
    }),
  )
}

export function searchPoliciesApi(payload = {}) {
  return requestResult(() => apiClient.post('catalog/policy/search', payload, publicRequest))
}
