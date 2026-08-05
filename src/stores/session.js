import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { loginApi, logoutApi } from '@/api/auth'
import { getAccessToken, setAccessToken, setUnauthorizedHandler } from '@/api/client'
import { getEmploymentPreparationApi, getMyProfileApi } from '@/api/user'
import { mockCredentials, myData, user } from '@/data/mockData'
import { useProgressionStore } from '@/stores/progression'

const AUTH_KEY = 'buttie-auth'
const API_PROFILE_KEY = 'buttie-api-profile'
const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true'
const LEVEL_REQUIREMENTS = { 1: 50, 2: 100, 3: 250, 4: 500 }

function readJson(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function normalizeDate(value) {
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value
    return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-')
  }
  return typeof value === 'string' ? value : ''
}

function mapProfile(profile) {
  return {
    name: profile.userName,
    nickname: profile.userNickname,
    email: profile.userEmail,
    phone: profile.userPhoneNumber,
    birth: normalizeDate(profile.birthDate),
    level: profile.buttieLevel,
    exp: profile.buttieTotalExp,
  }
}

function mapEmployment(employment) {
  const startDate = normalizeDate(employment.prepStartDate)
  const goalDate = normalizeDate(employment.targetEmploymentDate)
  return {
    jobType: employment.employmentPrepType === 'REEMPLOYMENT' ? 'again' : 'first',
    startDate,
    goalDate,
    targetDate: goalDate.replaceAll('-', '.'),
    region: employment.employmentPrepRegion,
    family: employment.familyCount,
  }
}

export const useSessionStore = defineStore('session', () => {
  const savedProfile = readJson(localStorage, 'buttie-profile')
  const cachedApiProfile = readJson(sessionStorage, API_PROFILE_KEY)
  const savedPassword = localStorage.getItem('buttie-mock-password')
  const savedMyData = readJson(localStorage, 'buttie-mydata')
  const legacyMyDataUpdated = localStorage.getItem('buttie-mydata-updated')

  if (savedProfile) Object.assign(user, savedProfile)
  if (savedPassword) mockCredentials.password = savedPassword
  if (savedMyData) Object.assign(myData, savedMyData)
  else if (legacyMyDataUpdated) myData.lastUpdated = legacyMyDataUpdated
  mockCredentials.email = user.email

  const isAuthenticated = ref(
    isMockMode ? sessionStorage.getItem(AUTH_KEY) === 'true' : Boolean(getAccessToken()),
  )
  const currentUser = ref({ ...user, ...(cachedApiProfile || {}) })
  const isRestoring = ref(false)
  const authError = ref('')
  const passwordChangeVerified = ref(false)
  const currentPassword = ref(mockCredentials.password)
  const myDataConnected = ref(myData.connected)
  const myDataLastUpdated = ref(myData.lastUpdated)
  const progression = useProgressionStore()

  const displayName = computed(() => currentUser.value.nickname || currentUser.value.name)

  function persistApiProfile() {
    sessionStorage.setItem(API_PROFILE_KEY, JSON.stringify(currentUser.value))
  }

  function clearAuthState() {
    isAuthenticated.value = false
    passwordChangeVerified.value = false
    authError.value = ''
    sessionStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(API_PROFILE_KEY)
    setAccessToken('')
  }

  function syncProgression(profile) {
    const level = Number(profile?.buttieLevel)
    const exp = Number(profile?.buttieTotalExp)
    const normalizedLevel = Math.min(5, Math.max(1, Math.trunc(level)))
    const maximum = LEVEL_REQUIREMENTS[normalizedLevel] || 0
    const isValid =
      Number.isFinite(level) &&
      Number.isFinite(exp) &&
      ((normalizedLevel === 5 && exp === 0) || (normalizedLevel < 5 && exp >= 0 && exp < maximum))

    if (isValid) {
      progression.level = normalizedLevel
      progression.exp = exp
    }
  }

  async function loadCurrentUser() {
    const profile = await getMyProfileApi()
    Object.assign(currentUser.value, mapProfile(profile))
    syncProgression(profile)

    try {
      const employment = await getEmploymentPreparationApi()
      Object.assign(currentUser.value, mapEmployment(employment))
    } catch (error) {
      if (error.status !== 404) throw error
    }

    persistApiProfile()
    return currentUser.value
  }

  function login() {
    isAuthenticated.value = true
    sessionStorage.setItem(AUTH_KEY, 'true')
  }

  async function authenticate(email, password) {
    const normalizedEmail = email.trim().toLowerCase()

    if (isMockMode) {
      if (normalizedEmail !== mockCredentials.email.toLowerCase()) {
        return { ok: false, reason: 'invalid-credentials' }
      }
      if (password !== currentPassword.value) {
        return { ok: false, reason: 'invalid-credentials' }
      }
      login()
      return { ok: true }
    }

    authError.value = ''
    try {
      await loginApi(normalizedEmail, password)
      await loadCurrentUser()
      isAuthenticated.value = true
      return { ok: true }
    } catch (error) {
      clearAuthState()
      const invalidCredentials = error.status === 401 || error.status === 404
      authError.value = invalidCredentials ? '이메일 또는 비밀번호를 확인해 주세요.' : error.message
      return {
        ok: false,
        reason: invalidCredentials ? 'invalid-credentials' : 'api-error',
        message: authError.value,
      }
    }
  }

  async function restoreSession() {
    if (isMockMode || !getAccessToken()) return
    isRestoring.value = true
    try {
      await loadCurrentUser()
      isAuthenticated.value = true
    } catch (error) {
      if (error.status === 401) clearAuthState()
      else authError.value = error.message
    } finally {
      isRestoring.value = false
    }
  }

  async function logout() {
    if (isMockMode) {
      clearAuthState()
      return { ok: true }
    }

    try {
      if (getAccessToken()) await logoutApi()
      return { ok: true }
    } catch (error) {
      return { ok: false, message: error.message }
    } finally {
      clearAuthState()
    }
  }

  function updateProfile(profile) {
    Object.assign(currentUser.value, profile)
    Object.assign(user, profile)
    if (profile.email) mockCredentials.email = profile.email
    localStorage.setItem('buttie-profile', JSON.stringify(currentUser.value))
    if (!isMockMode) persistApiProfile()
  }

  function verifyPasswordChange() {
    passwordChangeVerified.value = true
  }

  function clearPasswordChangeVerification() {
    passwordChangeVerified.value = false
  }

  function changePassword(password) {
    currentPassword.value = password
    mockCredentials.password = password
    localStorage.setItem('buttie-mock-password', password)
  }

  function verifyCurrentPassword(password) {
    return password === currentPassword.value
  }

  function refreshMyData() {
    myDataConnected.value = true
    myDataLastUpdated.value = new Date().toISOString()
    myData.connected = myDataConnected.value
    myData.lastUpdated = myDataLastUpdated.value
    localStorage.setItem('buttie-mydata', JSON.stringify(myData))
  }

  setUnauthorizedHandler(clearAuthState)

  return {
    isAuthenticated,
    isRestoring,
    isMockMode,
    authError,
    currentUser,
    displayName,
    passwordChangeVerified,
    myDataConnected,
    myDataLastUpdated,
    authenticate,
    restoreSession,
    loadCurrentUser,
    login,
    logout,
    updateProfile,
    verifyPasswordChange,
    clearPasswordChangeVerification,
    changePassword,
    verifyCurrentPassword,
    refreshMyData,
  }
})
