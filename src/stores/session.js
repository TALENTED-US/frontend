import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { user } from '@/data/mockData'

export const useSessionStore = defineStore('session', () => {
  const isAuthenticated = ref(sessionStorage.getItem('buttie-auth') === 'true')
  const currentUser = ref(user)

  const displayName = computed(() => currentUser.value.nickname || currentUser.value.name)

  function login() {
    isAuthenticated.value = true
    sessionStorage.setItem('buttie-auth', 'true')
  }

  function logout() {
    isAuthenticated.value = false
    sessionStorage.removeItem('buttie-auth')
  }

  return { isAuthenticated, currentUser, displayName, login, logout }
})
