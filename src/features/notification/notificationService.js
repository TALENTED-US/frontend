export async function requestDeviceNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export async function showDeviceNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  const notificationOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await registration.showNotification(title, notificationOptions)
      return true
    } catch {
      // 일반 브라우저 알림으로 한 번 더 시도합니다.
    }
  }

  new Notification(title, notificationOptions)
  return true
}

export async function enableDeviceNotifications() {
  const permission = await requestDeviceNotificationPermission()
  if (permission === 'granted') {
    await showDeviceNotification('버티 알림이 켜졌어요', {
      body: '중요한 재정 변화와 정책 소식을 이 기기로 알려드릴게요.',
      tag: 'buttie-notification-enabled',
    })
  }
  return permission
}
