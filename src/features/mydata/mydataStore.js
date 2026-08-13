import { computed, reactive } from 'vue'
import {
  connectMyDataApi,
  disconnectMyDataAssetApi,
  getFixedExpenseCandidatesApi,
  getMyDataAssetsApi,
  getMyDataInstitutionsApi,
  registerMyDataAssetsApi,
  syncMyDataTransactionsApi,
} from '@/api/mydata'
import { loadTransactions } from '@/features/finance/financeStore'

const SELECTION_KEY = 'buttie-mydata-selected-assets'
let pageRefreshPromise = null

function readSelection() {
  try {
    const value = JSON.parse(localStorage.getItem(SELECTION_KEY) || 'null')
    return {
      accountIds: Array.isArray(value?.accountIds) ? value.accountIds.map(String) : [],
      cardIds: Array.isArray(value?.cardIds) ? value.cardIds.map(String) : [],
    }
  } catch {
    return { accountIds: [], cardIds: [] }
  }
}

const savedSelection = readSelection()
const hasSavedSelection = localStorage.getItem(SELECTION_KEY) !== null

export const mydataState = reactive({
  connection: null,
  institutions: [],
  accounts: [],
  cards: [],
  selectedAccountIds: savedSelection.accountIds,
  selectedCardIds: savedSelection.cardIds,
  selectionInitialized: hasSavedSelection,
  fixedExpenseCandidates: [],
  lastSync: null,
  loading: false,
  error: '',
})

export const selectedMyDataAccounts = computed(() => {
  const selected = new Set(mydataState.selectedAccountIds)
  return mydataState.selectionInitialized
    ? mydataState.accounts.filter((item) => selected.has(String(item.accountId)))
    : mydataState.accounts.filter((item) => item.isConsent !== false)
})

export const selectedMyDataCards = computed(() => {
  const selected = new Set(mydataState.selectedCardIds)
  return mydataState.selectionInitialized
    ? mydataState.cards.filter((item) => selected.has(String(item.cardId)))
    : mydataState.cards.filter((item) => item.isConsent !== false)
})

function persistSelection() {
  localStorage.setItem(
    SELECTION_KEY,
    JSON.stringify({
      accountIds: mydataState.selectedAccountIds,
      cardIds: mydataState.selectedCardIds,
    }),
  )
}

async function run(action, fallbackMessage) {
  mydataState.loading = true
  mydataState.error = ''
  try {
    return await action()
  } catch (error) {
    mydataState.error = error.message || fallbackMessage
    throw error
  } finally {
    mydataState.loading = false
  }
}

export async function ensureMyDataConnection() {
  return run(async () => {
    try {
      mydataState.connection = await connectMyDataApi()
    } catch (error) {
      if (error.code !== 'MYDATA_006') throw error
      mydataState.connection = { status: 'CONNECTED' }
    }
    return mydataState.connection
  }, '마이데이터 연결을 시작하지 못했습니다.')
}

export async function loadMyDataCatalog() {
  return run(async () => {
    const [institutions, assets] = await Promise.all([
      getMyDataInstitutionsApi(),
      getMyDataAssetsApi(),
    ])
    mydataState.institutions = Array.isArray(institutions) ? institutions : []
    mydataState.accounts = Array.isArray(assets?.accounts) ? assets.accounts : []
    mydataState.cards = Array.isArray(assets?.cards) ? assets.cards : []
    return assets
  }, '연결 가능한 금융 자산을 불러오지 못했습니다.')
}

export async function registerMyDataSelection({ accountIds, cardIds }) {
  return run(async () => {
    const normalizedAccounts = accountIds.map(String)
    const normalizedCards = cardIds.map(String)
    const result = await registerMyDataAssetsApi({
      accountIds: normalizedAccounts,
      cardIds: normalizedCards,
    })
    mydataState.selectedAccountIds = normalizedAccounts
    mydataState.selectedCardIds = normalizedCards
    mydataState.selectionInitialized = true
    persistSelection()
    return result
  }, '선택한 금융 자산을 등록하지 못했습니다.')
}

export async function syncMyData() {
  return run(async () => {
    const syncResult = await syncMyDataTransactionsApi()
    const candidates = await getFixedExpenseCandidatesApi()
    mydataState.lastSync = syncResult
    mydataState.fixedExpenseCandidates = Array.isArray(candidates) ? candidates : []
    return syncResult
  }, '마이데이터 거래 내역을 동기화하지 못했습니다.')
}

export function refreshMyDataForPage() {
  if (pageRefreshPromise) return pageRefreshPromise

  pageRefreshPromise = (async () => {
    const syncResult = await syncMyData()
    await loadTransactions(true)
    return syncResult
  })()
    .catch((error) => {
      if (!mydataState.error) {
        mydataState.error = error.message || '최신 마이데이터를 불러오지 못했습니다.'
      }
      throw error
    })
    .finally(() => {
      pageRefreshPromise = null
    })

  return pageRefreshPromise
}

export async function disconnectMyDataAsset(assetType, assetId) {
  return run(async () => {
    const result = await disconnectMyDataAssetApi(assetType, assetId)
    const normalizedId = String(assetId)
    if (!mydataState.selectionInitialized) {
      mydataState.selectedAccountIds = mydataState.accounts
        .filter((item) => item.isConsent !== false)
        .map((item) => String(item.accountId))
      mydataState.selectedCardIds = mydataState.cards
        .filter((item) => item.isConsent !== false)
        .map((item) => String(item.cardId))
    }
    if (assetType === 'ACCOUNT') {
      mydataState.selectedAccountIds = mydataState.selectedAccountIds.filter(
        (id) => id !== normalizedId,
      )
    } else {
      mydataState.selectedCardIds = mydataState.selectedCardIds.filter((id) => id !== normalizedId)
    }
    mydataState.selectionInitialized = true
    persistSelection()
    return result
  }, '금융 자산 연결을 해제하지 못했습니다.')
}
