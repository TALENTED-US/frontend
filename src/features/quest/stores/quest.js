import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { completeQuestApi, getQuestsApi, revertQuestApi } from '@/api/quest'
import { useSessionStore } from '@/stores/session'
import { normalizeExternalUrl } from '@/utils/externalUrl'
import { EXPENSE_CATEGORY_BY_NAME } from '@/constants/expenseCategories'

const CATEGORY_META = Object.freeze({
  EXPENSE: { kind: 'expense', icon: '🍚' },
  INCOME: { kind: 'income', icon: '💼' },
  POLICY: { kind: 'policy', icon: '🏛️' },
})

const EXPENSE_ICONS = Object.freeze({
  FOOD: '🍚',
  ALCOHOL_ENTERTAINMENT: '🍻',
  CAFE_SNACK: '☕',
  JOB_PREPARATION: '📚',
  SHOPPING: '🛍️',
  HOBBY_LEISURE: '🎨',
  HOUSING_COMMUNICATION: '🏠',
  TRANSPORT_FUEL: '🚌',
  HEALTH_FITNESS: '🏋️',
  OTHER_FINANCE: '🧾',
})

function questMatchesPlan(item, plan) {
  if (!plan) return true

  const category = item?.simulationItemCategory
  const amount = Number(item?.amount) || 0
  const matchesRemoteItem = (planItem) =>
    !planItem.remoteId
    || !item?.simulationItemId
    || String(planItem.remoteId) === String(item.simulationItemId)

  if (category === 'EXPENSE') {
    return (plan.expenses || []).some((expense) =>
      matchesRemoteItem(expense)
      && EXPENSE_CATEGORY_BY_NAME[expense.name] === item?.expenseCategory
      && Number(expense.saving) === amount,
    )
  }

  if (category === 'INCOME') {
    return (plan.incomes || []).some((income) =>
      matchesRemoteItem(income)
      && income.name === item?.displayName
      && Number(income.amount) === amount
      && (income.type === 'once' ? 'ONCE' : 'MONTHLY') === item?.recurrenceType,
    )
  }

  if (category === 'POLICY') {
    return (plan.policies || []).some((policy) =>
      matchesRemoteItem(policy)
      && policy.name === (item?.policyName || item?.displayName),
    )
  }

  return false
}

function dedupeQuests(quests) {
  const unique = new Map()

  quests.forEach((item) => {
    const fallbackKey = [
      item?.simulationItemCategory,
      item?.expenseCategory,
      item?.displayName || item?.policyName,
      item?.amount,
      item?.recurrenceType,
    ].join('|')
    const key = String(item?.simulationItemId || fallbackKey)
    // 같은 항목으로 퀘스트가 여러 번 생성된 경우 응답의 마지막 항목을 사용한다.
    unique.set(key, item)
  })

  return [...unique.values()]
}

function mapQuestResponse(item) {
  const category = CATEGORY_META[item?.simulationItemCategory] || CATEGORY_META.EXPENSE
  const amount = Number(item?.amount) || 0

  return {
    id: item?.questId || '',
    name: item?.displayName || item?.policyName || '이름 없는 퀘스트',
    subtitle: item?.policyDueDate
      ? `신청 마감 ${item.policyDueDate}`
      : item?.recurrenceType === 'MONTHLY'
        ? '매월 반복'
        : '일회성',
    amount: category.kind === 'expense' ? -Math.abs(amount) : amount,
    expReward: Math.max(0, Number(item?.expReward) || 0),
    icon:
      category.kind === 'expense'
        ? EXPENSE_ICONS[item?.expenseCategory] || category.icon
        : category.icon,
    kind: category.kind,
    expenseCategory: item?.expenseCategory || '',
    recurrence: item?.recurrenceType === 'MONTHLY' ? 'monthly' : 'once',
    completed: item?.questStatus === 'COMPLETED',
    questUrl: normalizeExternalUrl(
      item?.questUrl
      || item?.policyUrl
      || item?.applicationUrl
      || item?.applyUrl
      || item?.sourceUrl
      || item?.url,
    ),
  }
}

export const useQuestStore = defineStore('quest', () => {
  const session = useSessionStore()
  const remoteEnabled = import.meta.env.VITE_USE_MOCK_API !== 'true'
  const items = ref([])
  const loading = ref(false)
  const error = ref('')
  const pendingIds = ref([])
  const loaded = ref(false)
  const activeSimulationId = ref('')
  const activePlan = ref(null)

  const rows = computed(() => items.value.map(mapQuestResponse))

  function isPending(questId) {
    return pendingIds.value.includes(questId)
  }

  async function fetchQuests(
    simulationId = activeSimulationId.value,
    plan = activePlan.value,
  ) {
    if (!remoteEnabled) return []
    loading.value = true
    error.value = ''
    try {
      const result = await getQuestsApi()
      const nextSimulationId = String(simulationId || '')
      activeSimulationId.value = nextSimulationId
      activePlan.value = plan || null
      items.value = Array.isArray(result)
        ? dedupeQuests(result.filter((item) =>
            (!nextSimulationId || String(item?.simulationId || '') === nextSimulationId)
            && questMatchesPlan(item, activePlan.value),
          ))
        : []
      loaded.value = true
      return items.value
    } catch (requestError) {
      items.value = []
      pendingIds.value = []
      loaded.value = true

      if (requestError.status === 404 || requestError.code === 'QUEST_002') {
        error.value = ''
        return []
      }

      error.value = requestError.message
      return null
    } finally {
      loading.value = false
    }
  }

  function resetQuests() {
    items.value = []
    pendingIds.value = []
    error.value = ''
    loaded.value = false
    activeSimulationId.value = ''
    activePlan.value = null
  }

  async function toggleQuest(questId) {
    if (!remoteEnabled || !questId || isPending(questId)) return false

    const item = items.value.find((quest) => quest.questId === questId)
    if (!item) return false

    pendingIds.value = [...pendingIds.value, questId]
    error.value = ''
    const nextStatus = item.questStatus === 'COMPLETED' ? 'NOT_COMPLETED' : 'COMPLETED'

    try {
      if (nextStatus === 'COMPLETED') await completeQuestApi(questId)
      else await revertQuestApi(questId)

      item.questStatus = nextStatus
      try {
        await session.loadCurrentUser()
      } catch {
        // 퀘스트 상태 변경은 성공했으므로 프로필은 다음 조회 때 다시 동기화합니다.
      }
      return true
    } catch (requestError) {
      error.value = requestError.message
      if (requestError.code === 'QUEST_901') await fetchQuests()
      return false
    } finally {
      pendingIds.value = pendingIds.value.filter((id) => id !== questId)
    }
  }

  return {
    remoteEnabled,
    rows,
    loading,
    error,
    loaded,
    fetchQuests,
    resetQuests,
    toggleQuest,
    isPending,
  }
})
