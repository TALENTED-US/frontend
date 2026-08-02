import { computed, ref, watch } from 'vue'
import { notifications as initialNotifications } from '@/data/mockData'

const STORAGE_KEY = 'buttie-notification-items-v1'

function loadItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch {
    // 저장 데이터가 손상된 경우 기본 알림을 사용합니다.
  }
  return initialNotifications.map((item) => ({ ...item }))
}

export const notificationItems = ref(loadItems())
export const unreadNotificationCount = computed(
  () => notificationItems.value.filter((item) => !item.read).length,
)

watch(
  notificationItems,
  (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items)),
  { deep: true },
)

export function markNotificationRead(id) {
  const item = notificationItems.value.find((entry) => entry.id === id)
  if (item) item.read = true
}

export function markAllNotificationsRead() {
  notificationItems.value.forEach((item) => { item.read = true })
}
