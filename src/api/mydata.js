import { apiClient, normalizeApiError, unwrapApiResponse } from '@/api/client'

async function request(config) {
  try {
    return unwrapApiResponse(await apiClient(config))
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function connectMyDataApi() {
  return request({ method: 'post', url: 'mydata/connect' })
}

export function getMyDataInstitutionsApi() {
  return request({ method: 'get', url: 'mydata/institutions' })
}

export function getMyDataAssetsApi() {
  return request({ method: 'get', url: 'mydata/assets' })
}

export function registerMyDataAssetsApi({ accountIds = [], cardIds = [] }) {
  return request({
    method: 'post',
    url: 'mydata/assets',
    data: { accountIds, cardIds },
  })
}

export function syncMyDataTransactionsApi() {
  return request({ method: 'post', url: 'mydata/transactions/sync', timeout: 30000 })
}

export function disconnectMyDataAssetApi(assetType, assetId) {
  return request({
    method: 'delete',
    url: `mydata/assets/${encodeURIComponent(assetType)}/${encodeURIComponent(assetId)}`,
  })
}

export function getFixedExpenseCandidatesApi() {
  return request({ method: 'get', url: 'mydata/fixed-expense-candidates' })
}
