import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { user } from '@/data/mockData'

export const useSessionStore = defineStore('session', () => {
  const isAuthenticated = ref(sessionStorage.getItem('buttie-auth') === 'true')
  const savedProfile = JSON.parse(localStorage.getItem('buttie-profile') || 'null')
  const currentUser = ref({ ...user, ...savedProfile })

  const displayName = computed(() => currentUser.value.nickname || currentUser.value.name)

  function login() {
    isAuthenticated.value = true
    sessionStorage.setItem('buttie-auth', 'true')
  }

  function logout() {
    isAuthenticated.value = false
    sessionStorage.removeItem('buttie-auth')
  }

  function updateProfile(profile) {
    currentUser.value = { ...currentUser.value, ...profile }
    localStorage.setItem('buttie-profile', JSON.stringify(currentUser.value))
  }

  return { isAuthenticated, currentUser, displayName, login, logout, updateProfile }
})
