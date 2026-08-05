import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

// 관리자 로그인 API가 준비되기 전까지 사용하는 임시 Mock 인증입니다.
// TODO: 관리자 로그인 API 연결 후 Mock 인증 로직 제거
const USE_MOCK_ADMIN_AUTH = true
const MOCK_ADMIN_CREDENTIALS = { id: 'admin', password: 'admin1234' }

const ADMIN_TOKEN_KEY = 'adminAccessToken'
const ADMIN_USER_KEY = 'adminUser'

export const useAdminAuthStore = defineStore('adminAuth', () => {
  const adminAccessToken = ref(localStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const adminUser = ref(JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || 'null'))

  const isAdminAuthenticated = computed(() => Boolean(adminAccessToken.value))

  async function loginAdmin(id, password) {
    // TODO: 관리자 로그인 API 연결 후 아래 Mock 분기 대신 실제 API 호출 결과로 대체
    if (USE_MOCK_ADMIN_AUTH) {
      if (id === MOCK_ADMIN_CREDENTIALS.id && password === MOCK_ADMIN_CREDENTIALS.password) {
        const token = 'mock-admin-token'
        adminAccessToken.value = token
        adminUser.value = { id }
        localStorage.setItem(ADMIN_TOKEN_KEY, token)
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser.value))
        return { ok: true }
      }
      return { ok: false, reason: 'invalid-credentials' }
    }

    return { ok: false, reason: 'invalid-credentials' }
  }

  function logoutAdmin() {
    adminAccessToken.value = ''
    adminUser.value = null
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
  }

  return {
    adminUser,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
  }
})
