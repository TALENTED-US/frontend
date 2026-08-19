import { computed, ref } from 'vue'
import { defineStore, getActivePinia } from 'pinia'
import { loginApi, logoutApi, reissueAccessTokenApi, resetPasswordApi } from '@/api/auth'
import {
  getAccessToken,
  setAccessToken,
  setAccessTokenReissueHandler,
  setUnauthorizedHandler,
} from '@/api/client'
import {
  getEmploymentPreparationApi,
  getMyProfileApi,
  getMyProfileSummaryApi,
  updateEmploymentPreparationApi,
  updateNicknameApi,
  withdrawUserApi,
} from '@/api/user'
import { mockCredentials, myData, user } from '@/data/mockData'
import { normalizeButtieProgression, useProgressionStore } from '@/stores/progression'
import { clearCalendar } from '@/features/finance/calendarStore'
import { clearTransactions } from '@/features/finance/financeStore'
import { clearNotifications } from '@/features/notification/notificationStore'
import { resetMyDataConnectionState } from '@/features/mydata/mydataStore'

const AUTH_KEY = 'buttie-auth'
const API_PROFILE_KEY = 'buttie-api-profile'
const isMockMode = import.meta.env.VITE_USE_MOCK_API === 'true'

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
  }
}

function mapProfileSummary(profile) {
  const startDate = normalizeDate(profile.prepStartDate)
  const goalDate = normalizeDate(profile.targetEmploymentDate)
  const totalExp = Number(profile.buttieTotalExp)
  const requiredExp = Number(profile.requiredExp)
  const level = Number(profile.buttieLevel)
  return {
    nickname: profile.userNickname,
    email: profile.userEmail,
    level: Number.isFinite(level) ? level : null,
    exp: Number.isFinite(totalExp) ? totalExp : null,
    totalExp: Number.isFinite(totalExp) ? totalExp : null,
    requiredExp: Number.isFinite(requiredExp) ? requiredExp : null,
    buttieImageUrl: profile.buttieImageUrl,
    riskLevel: profile.riskLevel,
    mydataStatus: profile.mydataStatus,
    lastSyncedAt: profile.lastSyncedAt,
    jobType: profile.employmentPrepType === 'REEMPLOYMENT' ? 'again' : 'first',
    startDate,
    goalDate,
    targetDate: goalDate.replaceAll('-', '.'),
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
    financialRiskAlertAmount: Number(employment.minimumLivingFund) || 0,
  }
}

export const useSessionStore = defineStore('session', () => {
  const savedProfile = readJson(localStorage, 'buttie-profile')
  const cachedApiProfile = readJson(sessionStorage, API_PROFILE_KEY)
  const savedPassword = localStorage.getItem('buttie-mock-password')
  const savedMyData = readJson(localStorage, 'buttie-mydata')
  const legacyMyDataUpdated = localStorage.getItem('buttie-mydata-updated')

  if (isMockMode) {
    if (savedProfile) Object.assign(user, savedProfile)
    if (savedPassword) mockCredentials.password = savedPassword
    if (savedMyData) Object.assign(myData, savedMyData)
    else if (legacyMyDataUpdated) myData.lastUpdated = legacyMyDataUpdated
    mockCredentials.email = user.email
  } else {
    // 이전 버전이 실 API 사용자도 localStorage에 저장했던 프로필을 정리한다.
    localStorage.removeItem('buttie-profile')
  }

  const isAuthenticated = ref(
    isMockMode ? sessionStorage.getItem(AUTH_KEY) === 'true' : Boolean(getAccessToken()),
  )
  const currentUser = ref(
    isMockMode ? { ...user } : getAccessToken() ? { ...(cachedApiProfile || {}) } : {},
  )
  const isRestoring = ref(false)
  const authError = ref('')
  const passwordChangeVerified = ref(false)
  const passwordChangeIdentityToken = ref('')
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
    passwordChangeIdentityToken.value = ''
    authError.value = ''
    sessionStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(API_PROFILE_KEY)
    if (!isMockMode) localStorage.removeItem('buttie-profile')
    setAccessToken('')
    clearCalendar()
    clearTransactions()
    clearNotifications()
    resetMyDataConnectionState()
    progression.resetProgression()

    const pinia = getActivePinia()
    pinia?._s.get('simulation')?.resetScenario({ clearFinancialData: true })
    pinia?._s.get('quest')?.resetQuests()
    localStorage.removeItem('buttie-simulation-v4')
    sessionStorage.removeItem('buttie-simulation-confirmed-snapshot-v1')
    myDataConnected.value = false
    myDataLastUpdated.value = ''
    currentUser.value = {}
  }

  function handleUnauthorized() {
    clearAuthState()

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
    const loginPath = `${basePath}/auth/login`
    if (window.location.pathname !== loginPath) window.location.assign(loginPath)
  }

  async function loadCurrentUser() {
    const [summary, profile] = await Promise.all([getMyProfileSummaryApi(), getMyProfileApi()])
    const nextUser = {
      ...mapProfileSummary(summary),
      ...mapProfile(profile),
    }
    if (isMockMode) {
      const normalized = normalizeButtieProgression(summary?.buttieTotalExp)
      progression.level = normalized.level
      progression.exp = normalized.exp
    }
    myDataConnected.value = summary.mydataStatus === 'CONNECTED'
    myDataLastUpdated.value = summary.lastSyncedAt || ''

    try {
      const employment = await getEmploymentPreparationApi()
      Object.assign(nextUser, mapEmployment(employment), {
        employmentPreparationRegistered: true,
      })
    } catch (error) {
      if (error.status !== 404) throw error
      Object.assign(nextUser, {
        employmentPreparationRegistered: false,
        jobType: '',
        startDate: '',
        goalDate: '',
        targetDate: '',
        region: '',
        family: null,
        financialRiskAlertAmount: null,
      })
    }

    currentUser.value = nextUser
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

  async function restoreSession({ reissueIfMissing = false } = {}) {
    if (isMockMode) return
    if (!getAccessToken() && !reissueIfMissing) return

    isRestoring.value = true
    try {
      if (!getAccessToken()) await reissueAccessTokenApi()
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
    if (isMockMode) {
      Object.assign(user, profile)
      if (profile.email) mockCredentials.email = profile.email
      localStorage.setItem('buttie-profile', JSON.stringify(currentUser.value))
    } else {
      persistApiProfile()
    }
  }

  async function saveNickname(nickname) {
    if (!isMockMode) await updateNicknameApi(nickname)
    updateProfile({ nickname })
  }

  async function saveEmploymentPreparation(profile) {
    const payload = {
      employmentPrepType: profile.jobType === 'again' ? 'REEMPLOYMENT' : 'FIRST_JOB',
      prepStartDate: profile.startDate,
      targetEmploymentDate: profile.goalDate,
      region: profile.region,
      familyCount: Number(profile.family),
      minimumLivingFund: Number(profile.financialRiskAlertAmount),
    }

    if (!isMockMode) await updateEmploymentPreparationApi(payload)

    updateProfile({
      ...profile,
      family: Number(profile.family),
      financialRiskAlertAmount: Number(profile.financialRiskAlertAmount),
      targetDate: profile.goalDate.replaceAll('-', '.'),
      employmentPreparationRegistered: true,
    })
  }

  async function withdrawAccount(password) {
    if (!isMockMode) await withdrawUserApi(password)
    clearAuthState()
  }

  function verifyPasswordChange(identityVerificationToken = '') {
    passwordChangeVerified.value = true
    passwordChangeIdentityToken.value = identityVerificationToken
  }

  function clearPasswordChangeVerification() {
    passwordChangeVerified.value = false
    passwordChangeIdentityToken.value = ''
  }

  async function changePassword(password, passwordCheck = password) {
    if (!isMockMode) {
      if (!passwordChangeIdentityToken.value) {
        throw new Error('본인인증 정보가 없습니다. 다시 인증해 주세요.')
      }
      await resetPasswordApi(
        {
          password,
          passwordCheck,
        },
        passwordChangeIdentityToken.value,
      )
      return
    }
    currentPassword.value = password
    mockCredentials.password = password
    localStorage.setItem('buttie-mock-password', password)
  }

  function verifyCurrentPassword(password) {
    return password === currentPassword.value
  }

  function refreshMyData(lastSyncedAt = new Date().toISOString()) {
    myDataConnected.value = true
    myDataLastUpdated.value = lastSyncedAt || new Date().toISOString()
    currentUser.value.mydataStatus = 'CONNECTED'
    currentUser.value.lastSyncedAt = myDataLastUpdated.value
    myData.connected = myDataConnected.value
    myData.lastUpdated = myDataLastUpdated.value
    if (isMockMode) localStorage.setItem('buttie-mydata', JSON.stringify(myData))
    else persistApiProfile()
  }

  function clearMyDataConnection() {
    myDataConnected.value = false
    myDataLastUpdated.value = ''
    currentUser.value.mydataStatus = 'DISCONNECTED'
    currentUser.value.lastSyncedAt = ''
    myData.connected = false
    myData.lastUpdated = ''
    if (isMockMode) localStorage.removeItem('buttie-mydata')
    else persistApiProfile()
  }

  setAccessTokenReissueHandler(reissueAccessTokenApi)
  setUnauthorizedHandler(handleUnauthorized)

  return {
    isAuthenticated,
    isRestoring,
    isMockMode,
    authError,
    currentUser,
    displayName,
    passwordChangeVerified,
    passwordChangeIdentityToken,
    myDataConnected,
    myDataLastUpdated,
    authenticate,
    restoreSession,
    loadCurrentUser,
    login,
    logout,
    updateProfile,
    saveNickname,
    saveEmploymentPreparation,
    withdrawAccount,
    verifyPasswordChange,
    clearPasswordChangeVerification,
    changePassword,
    verifyCurrentPassword,
    refreshMyData,
    clearMyDataConnection,
  }
})
