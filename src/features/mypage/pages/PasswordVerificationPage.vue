<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const isVerifying = ref(false)
let verificationTimer

onBeforeUnmount(() => {
  window.clearTimeout(verificationTimer)
})

function completeVerification() {
  if (isVerifying.value) return

  isVerifying.value = true
  verificationTimer = window.setTimeout(() => {
    session.verifyPasswordChange()
    router.push('/mypage/security/password')
  }, 450)
}
</script>

<template>
  <section class="page password-verification-page">
    <button
      class="password-verification-page__back desktop-only"
      type="button"
      @click="router.push('/mypage/security')"
    >
      ‹ 비밀번호·보안
    </button>

    <div class="verification-content">
      <h1>비밀번호 찾기</h1>
      <p>간편 본인인증으로 본인 확인을 진행해 주세요.</p>

      <button
        class="simple-verification"
        type="button"
        :disabled="isVerifying"
        @click="completeVerification"
      >
        <span>{{ isVerifying ? '인증 확인 중...' : '간편 본인인증' }}</span>
      </button>
      <small>인증 완료 후 다음 단계로 진행할 수 있어요.</small>
    </div>
  </section>
</template>

<style scoped>
.password-verification-page {
  padding-top: 38px;
}

.password-verification-page__back {
  color: #666;
  font-size: 17px;
  font-weight: 800;
}

.verification-content {
  width: min(100%, 640px);
  margin: clamp(78px, 12vh, 138px) auto 0;
}

.verification-content h1 {
  color: #111;
  font-size: 36px;
  line-height: 1.25;
}

.verification-content > p {
  margin-top: 10px;
  color: #6d6d73;
  font-size: 16px;
}

.simple-verification {
  display: grid;
  width: 100%;
  min-height: 120px;
  margin-top: 54px;
  place-items: center;
  border: 1px solid #d9dce5;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 6px rgb(15 23 42 / 10%);
  color: #222;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.simple-verification span {
  font-size: 22px;
  font-weight: 800;
}

.simple-verification:hover:not(:disabled) {
  border-color: #06178f;
  box-shadow: 0 5px 12px rgb(15 23 42 / 13%);
  transform: translateY(-1px);
}

.simple-verification:disabled {
  cursor: wait;
  opacity: 0.7;
}

.verification-content > small {
  display: block;
  margin-top: 34px;
  color: #6d6d73;
  text-align: center;
  font-size: 14px;
}

@media (max-width: 767px) {
  .password-verification-page {
    min-height: calc(100dvh - var(--header-height) - var(--bottom-nav-height) - 34px);
    padding: 26px 6px 38px;
  }

  .verification-content {
    width: 100%;
    margin: 0;
  }

  .verification-content h1 {
    color: #111;
    font-size: 28px;
  }

  .verification-content > p {
    margin-top: 12px;
    font-size: 13px;
  }

  .simple-verification {
    min-height: 104px;
    margin-top: 68px;
    border-radius: 14px;
  }

  .simple-verification span {
    font-size: 20px;
  }

  .verification-content > small {
    margin-top: 32px;
    font-size: 13px;
  }
}
</style>
