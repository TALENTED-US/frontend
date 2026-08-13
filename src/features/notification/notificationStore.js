import { computed, reactive, ref, watch } from 'vue'
import {
  getNotificationsApi,
  getUnreadNotificationCheckApi,
  markNotificationReadApi,
} from '@/api/notifications'
import { notifications as initialNotifications } from '@/data/mockData'

const STORAGE_KEY = 'buttie-notification-items-v1'
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

function loadMockItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (Array.isArray(saved)) return saved
  } catch {
    // 저장 데이터가 손상된 경우 기본 알림을 사용합니다.
  }
  return initialNotifications.map((item) => ({ ...item }))
}

function formatNotificationTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const difference = now.getTime() - date.getTime()
  const minutes = Math.floor(difference / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`

  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date)
}

function mapNotification(item = {}) {
  return {
    id: item.notificationId,
    type: item.notificationType,
    title: item.notificationTitle || '',
    message: item.notificationContent || '',
    createdAt: item.notificationCreatedAt || '',
    time: formatNotificationTime(item.notificationCreatedAt),
    url: item.notificationUrl || '',
    read: Boolean(item.isRead),
  }
}

export const notificationItems = ref(USE_MOCK_API ? loadMockItems() : [])
export const notificationState = reactive({
  loading: false,
  loaded: USE_MOCK_API,
  error: '',
  hasUnread: USE_MOCK_API ? notificationItems.value.some((item) => !item.read) : false,
})
export const unreadNotificationCount = computed(
  () => notificationItems.value.filter((item) => !item.read).length,
)

if (USE_MOCK_API) {
  watch(notificationItems, (items) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items)), {
    deep: true,
  })
}

export async function loadNotifications(force = false) {
  if (USE_MOCK_API || (notificationState.loaded && !force)) return notificationItems.value

  notificationState.loading = true
  notificationState.error = ''
  try {
    const result = await getNotificationsApi(false)
    notificationItems.value = Array.isArray(result?.notifications)
      ? result.notifications.map(mapNotification)
      : []
    notificationState.loaded = true
    notificationState.hasUnread = Number(result?.unreadCount) > 0
    return notificationItems.value
  } catch (error) {
    notificationState.error = error.message || '알림을 불러오지 못했습니다.'
    throw error
  } finally {
    notificationState.loading = false
  }
}

export async function refreshUnreadNotificationCheck() {
  if (USE_MOCK_API) {
    notificationState.hasUnread = unreadNotificationCount.value > 0
    return notificationState.hasUnread
  }

  try {
    const result = await getUnreadNotificationCheckApi()
    notificationState.hasUnread = Boolean(result?.hasUnread)
    return notificationState.hasUnread
  } catch (error) {
    notificationState.error = error.message || '새 알림 여부를 확인하지 못했습니다.'
    return notificationState.hasUnread
  }
}

export async function markNotificationRead(id) {
  const item = notificationItems.value.find((entry) => entry.id === id)
  if (!item || item.read) return true

  item.read = true
  notificationState.hasUnread = unreadNotificationCount.value > 0
  if (USE_MOCK_API) return true

  try {
    await markNotificationReadApi(id)
    return true
  } catch (error) {
    item.read = false
    notificationState.hasUnread = true
    notificationState.error = error.message || '알림을 읽음 처리하지 못했습니다.'
    return false
  }
}

export async function markAllNotificationsRead() {
  const unreadItems = notificationItems.value.filter((item) => !item.read)
  if (USE_MOCK_API) {
    unreadItems.forEach((item) => (item.read = true))
    notificationState.hasUnread = false
    return true
  }

  notificationState.loading = true
  notificationState.error = ''
  try {
    const results = await Promise.all(unreadItems.map((item) => markNotificationRead(item.id)))
    if (results.some((result) => !result)) throw new Error('일부 알림을 읽음 처리하지 못했습니다.')
    notificationState.hasUnread = false
    return true
  } catch (error) {
    notificationState.error = error.message || '알림을 모두 읽음 처리하지 못했습니다.'
    await loadNotifications(true)
    return false
  } finally {
    notificationState.loading = false
  }
}

export function clearNotifications() {
  if (USE_MOCK_API) return
  notificationItems.value = []
  notificationState.loading = false
  notificationState.loaded = false
  notificationState.error = ''
  notificationState.hasUnread = false
}
