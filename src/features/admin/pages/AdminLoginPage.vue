<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '@/stores/adminAuth'
import buttieLogo from '@/assets/images/brand/buttie-logo.png'

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
    <div class="admin-login__brand">
      <img class="admin-login__logo" :src="buttieLogo" alt="" />
      <span>버티</span>
    </div>

    <main class="admin-login__main">
      <section class="admin-login__form-wrap">
        <p class="admin-login__eyebrow">BUTTIE ADMIN LOGIN</p>
        <h1>관리자 로그인</h1>
        <p class="admin-login__desc">버티와 함께 쉬운 준비 계획을 이어가세요.</p>

        <form class="admin-login__form" @submit.prevent="handleSubmit">
          <label>
            관리자 아이디
            <input v-model="adminId" type="text" autocomplete="username" placeholder="admin" />
          </label>
          <label>
            비밀번호
            <input
              v-model="adminPassword"
              type="password"
              autocomplete="current-password"
              placeholder="비밀번호를 입력하세요"
            />
          </label>

          <p v-if="errorMessage" class="admin-login__error">{{ errorMessage }}</p>

          <button type="submit" class="admin-login__submit" :disabled="isSubmitting">
            {{ isSubmitting ? '로그인 중...' : '로그인' }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.admin-login {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: var(--background);
}

.admin-login__brand {
  position: absolute;
  top: 32px;
  left: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-login__logo {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.admin-login__brand span {
  color: var(--text);
  font-size: 22px;
  font-weight: 700;
}

.admin-login__main {
  display: flex;
  justify-content: center;
  width: 100%;
  padding-top: 18vh;
}

.admin-login__form-wrap {
  width: 100%;
  max-width: 540px;
}

.admin-login__eyebrow {
  color: #e4a514;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.admin-login__form-wrap h1 {
  margin-top: 8px;
  color: #111827;
  font-size: 28px !important;
  font-weight: 700;
}

.admin-login__desc {
  margin-top: 8px;
  color: #6b7280;
  font-size: 14px;
}

.admin-login__form {
  margin-top: 44px;
}

.admin-login__form label {
  display: grid;
  gap: 10px;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
}

.admin-login__form label + label {
  margin-top: 24px;
}

.admin-login__form input {
  box-sizing: border-box;
  height: 56px;
  padding: 0 16px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
  font-size: 14px !important;
  font-weight: 400;
}

.admin-login__form input::placeholder {
  color: #9ca3af;
}

.admin-login__form input:focus {
  outline: 0;
  border-color: #f5c242;
  box-shadow: 0 0 0 3px rgb(245 194 66 / 15%);
}

.admin-login__error {
  margin-top: 12px;
  color: #ef4444;
  font-size: 13px;
}

.admin-login__submit {
  width: 100%;
  height: 56px;
  margin-top: 36px;
  border: 0;
  border-radius: 10px;
  background: #fde9a9;
  color: #1f2937;
  font-size: 14px !important;
  font-weight: 700;
  transition:
    background-color 0.15s ease,
    transform 0.05s ease;
}

.admin-login__submit:hover:not(:disabled) {
  background: #fbdd85;
}

.admin-login__submit:active:not(:disabled) {
  transform: scale(0.99);
}

.admin-login__submit:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 768px) {
  .admin-login__brand {
    top: 24px;
    left: 24px;
  }

  .admin-login__main {
    padding-top: 22vh;
  }

  .admin-login__form-wrap {
    max-width: 100%;
    padding: 0 24px;
  }

  .admin-login__form-wrap h1 {
    font-size: 26px;
  }
}
</style>
