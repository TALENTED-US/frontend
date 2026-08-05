<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'

const router = useRouter()
const adminAuth = useAdminAuthStore()

const adminId = ref('')
const adminPassword = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function handleSubmit() {
  if (isSubmitting.value) return
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    const result = await adminAuth.loginAdmin(adminId.value.trim(), adminPassword.value)
    if (result.ok) {
      router.push({ name: 'adminDashboard' })
    } else {
      errorMessage.value = '아이디 또는 비밀번호가 올바르지 않습니다.'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="admin-login">
    <div class="admin-login__card">
      <div class="admin-login__brand">
        <span class="admin-login__logo" aria-hidden="true" />
        <strong>버티 Admin</strong>
      </div>
      <h1>관리자 로그인</h1>
      <p>관리자 계정으로 로그인해 주세요.</p>

      <form class="admin-login__form" @submit.prevent="handleSubmit">
        <label>
          관리자 아이디
          <input v-model="adminId" type="text" autocomplete="username" placeholder="아이디를 입력하세요" />
        </label>
        <label>
          비밀번호
          <input v-model="adminPassword" type="password" autocomplete="current-password" placeholder="비밀번호를 입력하세요" />
        </label>

        <p v-if="errorMessage" class="admin-login__error">{{ errorMessage }}</p>

        <button type="submit" class="admin-login__submit" :disabled="isSubmitting">
          {{ isSubmitting ? '로그인 중...' : '로그인' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.admin-login {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 1440px;
  min-height: 1000px;
  background: #f4f4f4;
}

.admin-login__card {
  width: 400px;
  padding: 40px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: #ffffff;
  box-shadow: var(--shadow-md);
}

.admin-login__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-login__logo {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--accent-strong);
}

.admin-login__brand strong {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-login__card h1 {
  margin-top: 28px;
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-login__card p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-login__form {
  display: grid;
  gap: 16px;
  margin-top: 28px;
}

.admin-login__form label {
  display: block;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-login__form input {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-login__error {
  margin-top: -4px;
  color: #ef4444;
  font-size: var(--font-caption);
}

.admin-login__submit {
  margin-top: 8px;
  padding: 12px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-login__submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
