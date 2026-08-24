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

export function registerMyDataAssetsApi({ accountIds = [], cardIds = [], assetSelected = true }) {
  return request({
    method: 'post',
    url: 'mydata/assets',
    data: { accountIds, cardIds, assetSelected },
  })
}

export function syncMyDataTransactionsApi() {
  return request({
    method: 'post',
    url: 'mydata/transactions/sync',
    timeout: 30000,
    // 페이지 진입 시 실행되는 부가 동기화 실패가 로그인 세션까지 지우면 안 된다.
    // Access Token 재발급은 시도하되, 실패 결과는 호출 화면에서 처리한다.
    skipUnauthorizedHandler: true,
  })
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
