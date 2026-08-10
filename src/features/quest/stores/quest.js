import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { completeQuestApi, getQuestsApi, revertQuestApi } from '@/api/quest'
import { useSessionStore } from '@/stores/session'

const CATEGORY_META = Object.freeze({
  EXPENSE: { kind: 'expense', icon: '🍚' },
  INCOME: { kind: 'income', icon: '💼' },
  POLICY: { kind: 'policy', icon: '🏛️' },
})

const EXPENSE_ICONS = Object.freeze({
  FOOD: '🍚',
  TRANSPORT: '🚌',
  HOUSING: '🏠',
  COMMUNICATION: '📱',
  SUBSCRIPTION: '📺',
  EDUCATION: '📚',
  CERTIFICATE: '📄',
  ETC_EXPENSE: '🧾',
})

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
    recurrence: item?.recurrenceType === 'MONTHLY' ? 'monthly' : 'once',
    completed: item?.questStatus === 'COMPLETED',
    questUrl: item?.questUrl || '',
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

  const rows = computed(() => items.value.map(mapQuestResponse))

  function isPending(questId) {
    return pendingIds.value.includes(questId)
  }

  async function fetchQuests() {
    if (!remoteEnabled) return []
    loading.value = true
    error.value = ''
    try {
      const result = await getQuestsApi()
      items.value = Array.isArray(result) ? result : []
      loaded.value = true
      return items.value
    } catch (requestError) {
      error.value = requestError.message
      return null
    } finally {
      loading.value = false
    }
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
    toggleQuest,
    isPending,
  }
})
