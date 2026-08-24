<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { findEmailApi } from '@/api/auth'
import { useSessionStore } from '@/stores/session'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useIdentityVerification } from '@/features/auth/composables/useIdentityVerification'
import { IDENTITY_VERIFICATION_PURPOSE } from '@/features/auth/services/identityVerification'

const router = useRouter()
const session = useSessionStore()
const {
  isVerifying,
  verificationError,
  startIdentityVerification,
  restoreIdentityVerificationRedirect,
  resetIdentityVerification,
} = useIdentityVerification(IDENTITY_VERIFICATION_PURPOSE.CHANGE_PASSWORD)
const isCheckingAccount = ref(false)
const accountVerificationError = ref('')

async function completeVerification() {
  accountVerificationError.value = ''
  const result = await startIdentityVerification({ accountId: session.currentUser.email })
  await handleCompletedVerification(result?.verification)
}

async function handleCompletedVerification(verification) {
  if (!verification?.identityVerificationToken) return

  const identityVerificationToken = verification.identityVerificationToken
  isCheckingAccount.value = true
  accountVerificationError.value = ''

  try {
    const result = await findEmailApi(identityVerificationToken)
    const verifiedEmail = String(result?.email || '')
      .trim()
      .toLowerCase()
    const currentEmail = String(session.currentUser.email || '')
      .trim()
      .toLowerCase()

    if (!verifiedEmail || !currentEmail || verifiedEmail !== currentEmail) {
      throw new Error('현재 로그인한 계정의 본인인증 정보와 일치하지 않습니다.')
    }

    session.verifyPasswordChange(identityVerificationToken)
    await router.push('/mypage/security/password')
  } catch (error) {
    session.clearPasswordChangeVerification()
    resetIdentityVerification()
    accountVerificationError.value =
      error?.status === 404
        ? '현재 로그인한 계정의 본인인증 정보와 일치하지 않습니다.'
        : error?.message || '계정 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  } finally {
    isCheckingAccount.value = false
  }
}

onMounted(async () => handleCompletedVerification(await restoreIdentityVerificationRedirect()))
</script>

<template>
  <section class="page password-verification-page">
    <button
      class="password-verification-page__back desktop-only"
      type="button"
      @click="router.push('/mypage/security')"
    >
      <AppIcon name="chevron-left" :size="22" />비밀번호·보안
    </button>

    <div class="verification-content">
      <h1>비밀번호 찾기</h1>
      <p>간편 본인인증으로 본인 확인을 진행해 주세요.</p>

      <button
        class="simple-verification"
        type="button"
        :disabled="isVerifying || isCheckingAccount"
        @click="completeVerification"
      >
        <span>{{ isVerifying || isCheckingAccount ? '인증 확인 중...' : '간편 본인인증' }}</span>
      </button>
      <small v-if="verificationError" class="password-error" role="alert">{{
        verificationError
      }}</small>
      <small v-else-if="accountVerificationError" class="password-error" role="alert">{{
        accountVerificationError
      }}</small>
      <small>인증 완료 후 다음 단계로 진행할 수 있어요.</small>
    </div>
  </section>
</template>

<style scoped>
.password-verification-page {
  padding-top: 38px;
}

.password-verification-page__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: var(--font-card-title);
  font-weight: 800;
}

.verification-content {
  width: min(100%, 640px);
  margin: clamp(78px, 12vh, 138px) auto 0;
}

.verification-content h1 {
  color: #111;
  font-size: var(--font-display);
  line-height: 1.25;
}

.verification-content > p {
  margin-top: 10px;
  color: #6d6d73;
  font-size: var(--font-card-title);
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
  font-size: var(--font-section-title);
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
  font-size: var(--font-body);
}

.verification-content > .password-error {
  color: #e34c4c;
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
    font-size: var(--font-page-title);
  }

  .verification-content > p {
    margin-top: 12px;
    font-size: var(--font-body);
  }

  .simple-verification {
    min-height: 104px;
    margin-top: 68px;
    border-radius: 14px;
  }

  .simple-verification span {
    font-size: var(--font-section-title);
  }

  .verification-content > small {
    margin-top: 32px;
    font-size: var(--font-body);
  }
}
</style>
