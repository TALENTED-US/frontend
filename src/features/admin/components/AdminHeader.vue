<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()
const menuOpen = ref(false)
const menuAnchor = ref(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function handleLogout() {
  menuOpen.value = false
  session.logout()
  router.push({ name: 'login' })
}

function closeOnOutsideClick(event) {
  if (menuOpen.value && !menuAnchor.value?.contains(event.target)) menuOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOnOutsideClick))
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__spacer" />
    <div ref="menuAnchor" class="admin-header__profile">
      <button type="button" class="admin-header__profile-button" @click="toggleMenu">
        관리자 {{ session.currentUser.name }} ▾
      </button>
      <div v-if="menuOpen" class="admin-header__menu">
        <button type="button" @click="handleLogout">로그아웃</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  position: sticky;
  z-index: 30;
  top: 0;
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 0 32px;
  background: rgb(251 252 255 / 94%);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

.admin-header__spacer {
  flex: 1;
}

.admin-header__profile {
  position: relative;
}

.admin-header__profile-button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-header__profile-button:hover {
  color: var(--primary);
}

.admin-header__menu {
  position: absolute;
  z-index: 40;
  top: 34px;
  right: 0;
  display: grid;
  min-width: 140px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-header__menu button {
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font-size: var(--font-small);
  text-align: left;
}

.admin-header__menu button:hover {
  background: var(--primary-soft);
  color: var(--primary);
}
</style>
