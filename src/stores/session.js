import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mockCredentials, myData, user } from '@/data/mockData'

export const useSessionStore = defineStore('session', () => {
  const isAuthenticated = ref(sessionStorage.getItem('buttie-auth') === 'true')
  const savedProfile = JSON.parse(localStorage.getItem('buttie-profile') || 'null')
  const savedPassword = localStorage.getItem('buttie-mock-password')
  const savedMyData = JSON.parse(localStorage.getItem('buttie-mydata') || 'null')
  const legacyMyDataUpdated = localStorage.getItem('buttie-mydata-updated')

  if (savedProfile) Object.assign(user, savedProfile)
  if (savedPassword) mockCredentials.password = savedPassword
  if (savedMyData) Object.assign(myData, savedMyData)
  else if (legacyMyDataUpdated) myData.lastUpdated = legacyMyDataUpdated
  mockCredentials.email = user.email

  const currentUser = ref(user)
  const passwordChangeVerified = ref(false)
  const currentPassword = ref(mockCredentials.password)
  const myDataConnected = ref(myData.connected)
  const myDataLastUpdated = ref(myData.lastUpdated)

  const displayName = computed(() => currentUser.value.nickname || currentUser.value.name)

  function login() {
    isAuthenticated.value = true
    sessionStorage.setItem('buttie-auth', 'true')
  }

  function authenticate(email, password) {
    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedEmail !== mockCredentials.email.toLowerCase()) {
      return { ok: false, reason: 'user-not-found' }
    }

    if (password !== currentPassword.value) {
      return { ok: false, reason: 'invalid-password' }
    }

    login()
    return { ok: true }
  }

  function logout() {
    isAuthenticated.value = false
    passwordChangeVerified.value = false
    sessionStorage.removeItem('buttie-auth')
  }

  function updateProfile(profile) {
    Object.assign(currentUser.value, profile)
    Object.assign(user, profile)
    if (profile.email) mockCredentials.email = profile.email
    localStorage.setItem('buttie-profile', JSON.stringify(currentUser.value))
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

  return {
    isAuthenticated,
    currentUser,
    displayName,
    passwordChangeVerified,
    myDataConnected,
    myDataLastUpdated,
    authenticate,
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
