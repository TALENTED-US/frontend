import { apiClient, normalizeApiError, unwrapApiResponse } from '@/api/client'

async function request(config) {
  try {
    return unwrapApiResponse(await apiClient(config))
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export function getNotificationsApi(unreadOnly = false) {
  return request({ method: 'get', url: 'notifications', params: { unreadOnly } })
}

export function getNotificationSettingsApi() {
  return request({ method: 'get', url: 'notifications/settings' })
}

export function updateNotificationSettingsApi(payload) {
  return request({ method: 'patch', url: 'notifications/settings', data: payload })
}

export function getUnreadNotificationCheckApi() {
  return request({ method: 'get', url: 'notifications/unread-check' })
}

export function markNotificationReadApi(notificationId) {
  return request({
    method: 'patch',
    url: `notifications/${encodeURIComponent(notificationId)}/read`,
  })
}
