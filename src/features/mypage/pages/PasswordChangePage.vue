<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import AppIcon from '@/components/ui/AppIcon.vue'

const router = useRouter()
const session = useSessionStore()
const password = ref('')
const passwordConfirm = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)

async function changePassword() {
  if (isSubmitting.value) return
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

  if (!passwordPattern.test(password.value)) {
    errorMessage.value = '영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.'
    return
  }

  if (password.value !== passwordConfirm.value) {
    errorMessage.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await session.changePassword(password.value, passwordConfirm.value)
    session.clearPasswordChangeVerification()
    await router.replace('/mypage/security')
  } catch (error) {
    errorMessage.value = error.message || '비밀번호를 변경하지 못했습니다.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="page password-change-page">
    <button
      class="password-change-page__back desktop-only"
      type="button"
      @click="router.push('/mypage/security')"
    >
      <AppIcon name="chevron-left" :size="22" />비밀번호·보안
    </button>

    <div class="password-change-form">
      <h1>새 비밀번호 설정</h1>
      <p>영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.</p>

      <div class="verified-account">
        <span>ID</span>
        <strong>{{ session.currentUser.email }}</strong>
      </div>

      <label>
        <span>새 비밀번호</span>
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="8자 이상 입력하세요"
          @input="errorMessage = ''"
        />
      </label>

      <label>
        <span>비밀번호 확인</span>
        <input
          v-model="passwordConfirm"
          type="password"
          autocomplete="new-password"
          placeholder="한 번 더 입력하세요"
          @input="errorMessage = ''"
          @keyup.enter="changePassword"
        />
      </label>

      <small v-if="errorMessage" class="password-error" role="alert">{{ errorMessage }}</small>
      <button
        class="password-submit"
        type="button"
        :disabled="isSubmitting"
        @click="changePassword"
      >
        {{ isSubmitting ? '변경 중...' : '비밀번호 변경' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.password-change-page {
  padding-top: 38px;
}

.password-change-page__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 54px;
  color: #666;
  font-size: var(--font-card-title);
  font-weight: 800;
}

.password-change-form {
  width: min(100%, 640px);
  margin: 0 auto;
}

.password-change-form h1 {
  color: #111;
  font-size: var(--font-display);
  line-height: 1.25;
}

.password-change-form > p {
  margin-top: 10px;
  color: #6d6d73;
  font-size: var(--font-card-title);
}

.verified-account {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 26px;
  margin-top: 48px;
  padding: 0 20px;
  border: 1px solid #d9deeb;
  border-radius: 12px;
  background: #eef2ff;
}

.verified-account span {
  color: #666;
}

.verified-account strong {
  color: #111;
  font-size: var(--font-body);
}

.password-change-form label {
  display: grid;
  gap: 10px;
  margin-top: 38px;
  color: #111;
  font-size: var(--font-body);
  font-weight: 800;
}

.password-change-form label + label {
  margin-top: 18px;
}

.password-change-form input {
  width: 100%;
  height: 60px;
  padding: 0 20px;
  border: 1px solid #d9dce5;
  border-radius: 12px;
  background: #fff;
  color: #111;
  font-size: var(--font-body);
}

.password-error {
  display: block;
  margin-top: 10px;
  color: #e34c4c;
  font-size: var(--font-small);
}

.password-submit {
  width: 100%;
  min-height: 60px;
  margin-top: 34px;
  border-radius: 12px;
  background: #ffeba0;
  color: #111;
  font-size: var(--font-body);
  font-weight: 800;
}

@media (max-width: 767px) {
  .password-change-page {
    padding-top: 28px;
  }

  .password-change-form h1 {
    font-size: var(--font-page-title);
  }

  .password-change-form > p {
    font-size: var(--font-body);
    line-height: 1.5;
  }

  .verified-account {
    min-height: 52px;
    margin-top: 32px;
    padding: 0 16px;
    border-radius: 14px;
  }

  .password-change-form label {
    margin-top: 28px;
  }

  .password-change-form input,
  .password-submit {
    height: 52px;
    min-height: 52px;
    border-radius: 14px;
  }

  .password-submit {
    margin-top: 26px;
  }
}
</style>
