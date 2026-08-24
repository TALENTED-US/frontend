<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findEmailApi, resetPasswordApi } from '@/api/auth'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import recoverySuccessCheck from '@/assets/auth-recovery-success-check.svg'
import { useIdentityVerification } from '@/features/auth/composables/useIdentityVerification'
import { IDENTITY_VERIFICATION_PURPOSE } from '@/features/auth/services/identityVerification'

const route = useRoute()
const router = useRouter()

const isId = computed(() => route.name === 'find-id')
const verificationPurpose = computed(() =>
  isId.value
    ? IDENTITY_VERIFICATION_PURPOSE.FIND_EMAIL
    : IDENTITY_VERIFICATION_PURPOSE.RESET_PASSWORD,
)
const step = ref(1)
const idResultStatus = ref('success')
const isIdResult = computed(() => isId.value && step.value === 2)
const isIdNotFound = computed(() => isIdResult.value && idResultStatus.value === 'not-found')
const isIdLookupError = computed(() => isIdResult.value && idResultStatus.value === 'error')
const accountId = ref('')
const foundEmail = ref('')
const identityVerificationToken = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const accountError = ref('')
const passwordError = ref('')
const recoveryError = ref('')
const isSubmitting = ref(false)
const isMobileViewport = ref(false)
const {
  isVerifying,
  verificationError,
  verificationNotice,
  startIdentityVerification,
  restoreIdentityVerificationRedirect,
  resetIdentityVerification,
} = useIdentityVerification(verificationPurpose)

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
const canChangePassword = computed(
  () =>
    Boolean(identityVerificationToken.value) &&
    password.value.length > 0 &&
    passwordConfirm.value.length > 0 &&
    !isSubmitting.value,
)
let mobileMediaQuery

function syncViewport(event) {
  isMobileViewport.value = event.matches
}

onMounted(async () => {
  mobileMediaQuery = window.matchMedia('(max-width: 767px)')
  syncViewport(mobileMediaQuery)
  mobileMediaQuery.addEventListener('change', syncViewport)

  const verification = await restoreIdentityVerificationRedirect()
  await handleCompletedVerification(verification)
})

onBeforeUnmount(() => {
  mobileMediaQuery?.removeEventListener('change', syncViewport)
})

function resetFlow() {
  step.value = 1
  idResultStatus.value = 'success'
  accountId.value = ''
  foundEmail.value = ''
  identityVerificationToken.value = ''
  password.value = ''
  passwordConfirm.value = ''
  showPassword.value = false
  showPasswordConfirm.value = false
  accountError.value = ''
  passwordError.value = ''
  recoveryError.value = ''
}

watch(
  () => route.name,
  () => {
    resetIdentityVerification()
    resetFlow()
  },
)

function goBack() {
  if (step.value > 1) {
    resetIdentityVerification()
    identityVerificationToken.value = ''
    recoveryError.value = ''
    step.value -= 1
    return
  }

  router.push('/auth/login')
}

async function completeSimpleVerification() {
  recoveryError.value = ''
  const result = await startIdentityVerification(
    isId.value
      ? {}
      : {
          accountId: accountId.value,
        },
  )
  await handleCompletedVerification(result?.verification)
}

async function handleCompletedVerification(verification) {
  if (!verification?.identityVerificationToken) return

  identityVerificationToken.value = verification.identityVerificationToken
  isSubmitting.value = true

  try {
    const result = await findEmailApi(identityVerificationToken.value)
    const verifiedEmail = String(result?.email || '').trim()

    if (isId.value) {
      foundEmail.value = verifiedEmail
      idResultStatus.value = foundEmail.value ? 'success' : 'not-found'
      step.value = 2
      return
    }

    const requestedEmail = String(verification.context?.accountId || accountId.value)
      .trim()
      .toLowerCase()

    if (!verifiedEmail || verifiedEmail.toLowerCase() !== requestedEmail) {
      identityVerificationToken.value = ''
      resetIdentityVerification()
      recoveryError.value =
        '본인인증 정보와 입력한 계정이 일치하지 않습니다. 본인 명의로 가입한 계정을 확인해 주세요.'
      step.value = 2
      return
    }

    accountId.value = verifiedEmail
    resetIdentityVerification()
    step.value = 3
  } catch (error) {
    identityVerificationToken.value = ''
    resetIdentityVerification()

    if (isId.value) {
      idResultStatus.value = error.status === 404 ? 'not-found' : 'error'
      accountError.value = error.message
      step.value = 2
      return
    }

    recoveryError.value =
      error.status === 404
        ? '본인인증 정보와 일치하는 계정을 찾을 수 없습니다.'
        : error.message || '본인인증된 계정을 확인하지 못했습니다. 다시 시도해 주세요.'
    step.value = 2
  } finally {
    isSubmitting.value = false
  }
}

function retryIdLookup() {
  resetIdentityVerification()
  idResultStatus.value = 'success'
  step.value = 1
  router.replace('/auth/find-id')
}

function nextPassword() {
  const normalizedAccount = accountId.value.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedAccount)) {
    accountError.value = '이메일 형식을 확인해 주세요.'
    return
  }

  accountId.value = normalizedAccount
  accountError.value = ''
  recoveryError.value = ''
  identityVerificationToken.value = ''
  step.value = 2
}

async function resetPassword() {
  if (!passwordPattern.test(password.value)) {
    passwordError.value = '영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.'
    return
  }

  if (password.value !== passwordConfirm.value) {
    passwordError.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  if (!identityVerificationToken.value) {
    passwordError.value = '본인인증 정보가 없습니다. 다시 인증해 주세요.'
    return
  }

  isSubmitting.value = true
  passwordError.value = ''
  try {
    await resetPasswordApi(
      {
        userEmail: accountId.value,
        password: password.value,
        passwordCheck: passwordConfirm.value,
      },
      identityVerificationToken.value,
    )
    resetIdentityVerification()
    router.push('/auth/login')
  } catch (error) {
    passwordError.value = error.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="recovery-page">
    <header v-if="!isMobileViewport" class="desktop-header">
      <BrandLogo />
      <nav>
        <RouterLink to="/auth/login">로그인</RouterLink>
        <RouterLink class="join" to="/auth/signup">회원가입</RouterLink>
      </nav>
    </header>

    <header
      v-else
      class="mobile-header"
      :class="{ 'result-mobile-header': isIdResult, 'id-mobile-header': isId }"
    >
      <button type="button" class="mobile-back" aria-label="뒤로가기" @click="goBack">
        <AppIcon name="chevron-left" :size="22" />
      </button>
      <strong>{{ isId ? '아이디 찾기' : '비밀번호 찾기' }}</strong>
    </header>

    <section
      class="recovery-content"
      :class="{
        'id-result-content': isIdResult,
        'password-content': !isId,
        'password-entry-content': !isId && step === 1,
      }"
    >
      <div v-if="isIdResult && !isMobileViewport" class="desktop-recovery-titlebar">
        <strong>아이디 찾기</strong>
      </div>

      <p class="eyebrow">ACCOUNT RECOVERY</p>

      <template v-if="isId && step === 1">
        <h1>아이디 찾기</h1>
        <p class="description">간편 본인인증을 완료하면 아이디를 안내해 드려요.</p>

        <button
          type="button"
          class="simple-verification"
          :disabled="isVerifying || isSubmitting"
          @click="completeSimpleVerification"
        >
          <span>{{ isVerifying || isSubmitting ? '본인인증 확인 중...' : '간편 본인인증' }}</span>
        </button>
        <small class="verification-note">인증 완료 후 다음 단계로 진행할 수 있어요.</small>
        <p v-if="verificationError" class="verification-feedback error" role="alert">
          {{ verificationError }}
        </p>
        <p v-else-if="verificationNotice" class="verification-feedback" role="status">
          {{ verificationNotice }}
        </p>
      </template>

      <template v-else-if="isId">
        <template v-if="isIdNotFound || isIdLookupError">
          <h1 class="failure-title">
            {{ isIdLookupError ? '아이디를 불러오지 못했습니다' : '일치하는 계정이 없습니다' }}
          </h1>
          <p class="description failure-description">
            <template v-if="isIdLookupError">잠시 후 다시 시도해 주세요.</template>
            <template v-else>입력하신 정보와 일치하는 계정을<br />찾을 수 없어요.</template>
          </p>

          <div class="result-failure-icon" aria-hidden="true">?</div>

          <article v-if="isIdNotFound" class="failure-guide">
            <strong>이런 경우를 확인해보세요</strong>
            <p>· 입력한 정보가 정확한가요?</p>
            <p>· 아직 회원가입을 하지 않으셨나요?</p>
          </article>
          <article v-else class="failure-guide">
            <strong>요청 처리 중 오류가 발생했습니다.</strong>
            <p>{{ accountError }}</p>
          </article>

          <div class="result-actions">
            <RouterLink v-if="isIdNotFound" class="primary-button" to="/auth/signup">
              회원가입하기
            </RouterLink>
            <button type="button" class="secondary-button retry-button" @click="retryIdLookup">
              다시 시도하기
            </button>
          </div>
        </template>

        <template v-else>
          <h1>아이디 찾기 결과</h1>
          <p class="description">본인 확인이 완료되었습니다.</p>

          <div class="result-success-icon" aria-hidden="true">
            <img :src="recoverySuccessCheck" alt="" />
          </div>

          <article class="result-box">
            <small>아이디</small>
            <strong>{{ foundEmail }}</strong>
          </article>

          <div class="result-actions">
            <RouterLink class="primary-button" to="/auth/login">로그인하기</RouterLink>
            <RouterLink class="secondary-button" to="/auth/find-password">비밀번호 찾기</RouterLink>
          </div>
        </template>
      </template>

      <template v-else-if="step === 1">
        <h1>비밀번호 찾기</h1>
        <p class="description">비밀번호를 재설정할 계정 아이디를 입력해 주세요.</p>

        <label class="recovery-field">
          <span>아이디</span>
          <input
            v-model="accountId"
            :class="{ invalid: accountError }"
            autocomplete="username"
            placeholder="아이디 또는 이메일을 입력하세요"
            @input="accountError = ''"
            @keyup.enter="nextPassword"
          />
          <small v-if="accountError" class="field-error" role="alert">{{ accountError }}</small>
        </label>
        <small class="helper-text">
          소셜 계정으로 가입했다면 해당 서비스에서 비밀번호를 재설정해 주세요.
        </small>
        <button type="button" class="primary-button next-button" @click="nextPassword">
          <strong>다음</strong>
        </button>
        <RouterLink class="text-link password-id-link" to="/auth/find-id">
          <span>아이디가 기억나지 않으세요?</span>
          <strong>아이디 찾기 ›</strong>
        </RouterLink>
      </template>

      <template v-else-if="step === 2">
        <h1>비밀번호 찾기</h1>
        <p class="description">간편 본인인증으로 본인 확인을 진행해 주세요.</p>

        <button
          type="button"
          class="simple-verification"
          :disabled="isVerifying || isSubmitting"
          @click="completeSimpleVerification"
        >
          <span>{{ isVerifying || isSubmitting ? '본인인증 확인 중...' : '간편 본인인증' }}</span>
        </button>
        <small class="verification-note">인증 완료 후 다음 단계로 진행할 수 있어요.</small>
        <p
          v-if="recoveryError || verificationError"
          class="verification-feedback error"
          role="alert"
        >
          {{ recoveryError || verificationError }}
        </p>
        <p v-else-if="verificationNotice" class="verification-feedback" role="status">
          {{ verificationNotice }}
        </p>
      </template>

      <template v-else>
        <h1>새 비밀번호 설정</h1>
        <p class="description">영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.</p>

        <div class="verified-account">
          <span>ID</span>
          <strong>{{ accountId }}</strong>
        </div>
        <label class="recovery-field password-field">
          <span>새 비밀번호</span>
          <span class="password-input-wrap">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="8자 이상 입력하세요"
              @input="passwordError = ''"
            />
            <button
              type="button"
              class="password-visibility"
              :aria-label="showPassword ? '새 비밀번호 숨기기' : '새 비밀번호 보기'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.6" />
              </svg>
            </button>
          </span>
        </label>
        <label class="recovery-field password-field">
          <span>비밀번호 확인</span>
          <span class="password-input-wrap">
            <input
              v-model="passwordConfirm"
              :type="showPasswordConfirm ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="한 번 더 입력하세요"
              @input="passwordError = ''"
              @keyup.enter="canChangePassword && resetPassword()"
            />
            <button
              type="button"
              class="password-visibility"
              :aria-label="showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'"
              :aria-pressed="showPasswordConfirm"
              @click="showPasswordConfirm = !showPasswordConfirm"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.6" />
              </svg>
            </button>
          </span>
          <small v-if="passwordError" class="field-error" role="alert">{{ passwordError }}</small>
        </label>
        <button
          type="button"
          class="primary-button password-change-button"
          :disabled="!canChangePassword || isSubmitting"
          @click="resetPassword"
        >
          <strong>{{ isSubmitting ? '변경 중...' : '비밀번호 변경' }}</strong>
        </button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.recovery-page {
  min-height: 100dvh;
  padding: 36px clamp(36px, 5vw, 72px);
  background: var(--background);
}

.desktop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.desktop-header nav {
  display: flex;
  gap: 10px;
}

.desktop-header nav a {
  padding: 9px 17px;
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow-figma);
  color: #222;
  font-size: var(--font-caption);
  font-weight: 800;
}

.desktop-header nav .join {
  border-color: var(--accent);
  background: var(--accent);
}

.mobile-header {
  display: none;
}

.recovery-content {
  width: min(100%, 500px);
  margin: clamp(130px, 18vh, 190px) auto 0;
}

.recovery-content.id-result-content {
  width: min(100%, 430px);
  min-height: 660px;
  margin-top: clamp(82px, 10vh, 112px);
}

.desktop-recovery-titlebar {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 22px;
  border-bottom: 1px solid #eef0f4;
}

.desktop-recovery-titlebar button {
  width: 16px;
  color: #222;
  font-family: inherit;
  font-size: 24px;
  line-height: 1;
}

.desktop-recovery-titlebar strong {
  color: #222 !important;
  font-size: 16px;
  font-weight: 700;
}

.id-result-content .eyebrow {
  margin-top: 34px;
}

.recovery-content.id-result-content h1 {
  color: #222;
}

.recovery-content.password-content h1 {
  color: #222;
}

.eyebrow {
  color: #e6a518;
  font-size: var(--font-small);
  font-weight: 700;
}

.recovery-content h1 {
  margin-top: 8px;
  color: var(--primary);
  font-size: var(--font-page-title);
  line-height: 1.25;
}

.description {
  margin-top: 8px;
  color: #777;
  font-size: var(--font-body);
}

.simple-verification {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 96px;
  margin-top: 42px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: #222;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.simple-verification span {
  display: block;
  color: #222;
  font-size: var(--font-section-title);
  font-weight: 800;
  line-height: 1;
}

.simple-verification:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.simple-verification:disabled {
  cursor: wait;
  opacity: 0.65;
  transform: none;
}

.simple-verification:focus-visible {
  outline: 3px solid rgb(6 23 143 / 18%);
  outline-offset: 2px;
}

.verification-note {
  display: block;
  margin-top: 30px;
  color: #777;
  text-align: center;
  font-size: var(--font-small);
}

.verification-feedback {
  margin-top: 14px;
  color: #566581;
  font-size: var(--font-small);
  line-height: 1.55;
  text-align: center;
}

.verification-feedback.error {
  color: #e65353;
}

.recovery-field {
  display: grid;
  gap: 8px;
  margin-top: 36px;
  color: var(--primary);
  font-size: var(--font-caption);
  font-weight: 800;
}

.recovery-field + .recovery-field {
  margin-top: 14px;
}

.recovery-field input {
  width: 100%;
  height: 47px;
  padding: 0 15px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-figma);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 400;
}

.recovery-field input:focus {
  border-color: var(--primary);
  outline: 3px solid rgb(6 23 143 / 10%);
}

.recovery-field input.invalid {
  border-color: var(--danger);
}

.password-content .password-field {
  color: #222;
}

.password-input-wrap {
  position: relative;
  display: block;
}

.password-input-wrap input {
  padding-right: 52px;
}

.password-visibility {
  position: absolute;
  top: 50%;
  right: 15px;
  display: grid;
  width: 34px;
  height: 34px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #777;
  transform: translateY(-50%);
  cursor: pointer;
}

.password-visibility:hover {
  background: #f4f5f8;
  color: #222;
}

.password-visibility:focus-visible {
  outline: 2px solid rgb(6 23 143 / 24%);
  outline-offset: 1px;
}

.password-visibility svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.field-error {
  color: var(--danger);
  font-size: var(--font-caption);
  font-weight: 600;
}

.helper-text {
  display: block;
  margin-top: 12px;
  color: #777;
  font-size: var(--font-caption);
}

.verified-account {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: center;
  min-height: 47px;
  margin-top: 36px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--primary-soft);
  color: #747b8d;
  font-size: var(--font-small);
}

.verified-account strong {
  overflow: hidden;
  color: var(--text);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-button {
  display: grid;
  width: 100%;
  min-height: 48px;
  margin-top: 27px;
  place-items: center;
  border-radius: 10px;
  background: var(--accent);
  box-shadow: var(--shadow-figma);
  color: #222;
  font-size: var(--font-small);
  font-weight: 800;
}

.password-content .password-change-button {
  font-weight: 800;
}

.password-change-button strong {
  font-weight: 800;
}

.next-button,
.next-button strong {
  font-weight: 800;
}

.password-change-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.result-success-icon {
  display: grid;
  width: 76px;
  height: 76px;
  margin: 43px auto 0;
  place-items: center;
  border-radius: 50%;
  background: #fdf2df;
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
}

.result-success-icon img {
  display: block;
  width: 37px;
  height: 28px;
}

.result-failure-icon {
  display: grid;
  width: 76px;
  height: 76px;
  margin: 43px auto 0;
  place-items: center;
  border-radius: 50%;
  background: #f0f2f7;
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
  color: #999;
  font-size: 34px;
  font-weight: 800;
  line-height: 1;
}

.failure-guide {
  min-height: 90px;
  margin-top: 38px;
  padding: 14px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #f0f2f7;
  box-shadow: 0 1px 5px rgb(0 0 0 / 25%);
  color: #666;
  font-size: 12px;
  line-height: 20px;
}

.failure-guide strong {
  display: block;
  color: #222;
  font-size: 13px;
  font-weight: 700;
}

.id-result-content .secondary-button.retry-button {
  font-family: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.result-actions {
  margin-top: 26px;
}

.result-actions .primary-button {
  margin-top: 0;
}

.secondary-button {
  display: grid;
  width: 100%;
  min-height: 50px;
  margin-top: 12px;
  place-items: center;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fcfdff;
  box-shadow: 0 1px 5px rgb(0 0 0 / 25%);
  color: #222;
  font-size: 15px;
  font-weight: 700;
}

.text-link {
  display: block;
  margin-top: 17px;
  color: var(--primary);
  text-align: center;
  font-size: var(--font-caption);
}

.text-link.left {
  text-align: left;
}

.password-id-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #444;
  text-align: left;
}

.password-id-link span {
  font-weight: 400;
}

.password-id-link strong {
  color: #222;
  font-weight: 800;
}

.result-box {
  display: grid;
  gap: 6px;
  min-height: 70px;
  margin-top: 40px;
  padding: 14px 16px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #f0f2f7;
  box-shadow: 0 1px 4px rgb(0 0 0 / 25%);
}

.result-box small {
  color: #737a8a;
  font-size: 13px;
  line-height: 1;
}

.result-box strong {
  color: #222;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

@media (min-width: 768px) {
  .recovery-content.password-entry-content {
    width: min(100%, 580px);
    margin-top: clamp(190px, 22vh, 240px);
  }

  .password-entry-content .recovery-field {
    margin-top: 82px;
    color: #222;
    font-size: 14px;
    font-weight: 500;
  }

  .password-entry-content .recovery-field input {
    height: 60px;
    padding: 0 20px;
    border-radius: 12px;
    font-size: 14px;
  }

  .password-entry-content .helper-text {
    margin-top: 14px;
    font-size: 12px;
  }

  .password-entry-content .primary-button {
    min-height: 58px;
    margin-top: 42px;
    border-radius: 12px;
    font-size: 16px;
  }

  .password-entry-content .password-id-link {
    margin-top: 28px;
    font-size: 13px;
  }
}

@media (max-width: 767px) {
  .recovery-page {
    width: 100%;
    margin: 0;
    padding: 0;
    background: var(--surface);
  }

  .mobile-header {
    display: grid;
    grid-template-columns: 32px 1fr 32px;
    align-items: center;
    min-height: 56px;
    padding: 0 12px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .mobile-header::after {
    content: '';
  }

  .mobile-header.result-mobile-header {
    grid-template-columns: 9px 1fr;
    gap: 24px;
    padding: 0 20px;
  }

  .mobile-header.result-mobile-header::after {
    content: none;
  }

  .mobile-header.result-mobile-header strong {
    text-align: left;
  }

  .mobile-header.result-mobile-header .mobile-back {
    width: 9px;
  }

  .mobile-header strong {
    color: #222;
    text-align: center;
    font-size: var(--font-card-title);
    font-weight: 800;
  }

  .mobile-back {
    display: flex;
    width: 32px;
    height: 44px;
    align-items: center;
    justify-content: flex-start;
    color: #222;
    font-size: var(--font-page-title);
    line-height: 1;
  }

  .recovery-content {
    width: 100%;
    margin: 0;
    padding: 38px 24px 40px;
  }

  .recovery-content.id-result-content {
    position: relative;
    width: 100%;
    min-height: calc(100dvh - 56px);
    margin: 0;
    padding: 20px;
  }

  .eyebrow {
    font-size: var(--font-small);
  }

  .recovery-content h1 {
    margin-top: 8px;
    color: #222;
    font-size: var(--font-page-title);
  }

  .id-result-content .eyebrow {
    margin-top: 0;
  }

  .id-result-content h1 {
    margin-top: 13px;
    font-size: 24px;
    line-height: 29px;
  }

  .id-result-content .description {
    margin-top: 4px;
    color: #666;
    font-size: 13px;
    line-height: 15px;
  }

  .id-result-content .failure-title {
    margin-top: 18px;
    font-size: 22px;
    line-height: 26px;
  }

  .id-result-content .failure-description {
    margin-top: 5px;
    line-height: 20px;
  }

  .description {
    font-size: var(--font-small);
  }

  .simple-verification {
    min-height: 90px;
    margin-top: 168px;
    border-radius: 12px;
  }

  .simple-verification span {
    font-size: var(--font-card-title);
  }

  .verification-note {
    margin-top: 28px;
    font-size: var(--font-small);
  }

  .recovery-field {
    margin-top: 42px;
    color: #222;
    font-size: var(--font-body);
  }

  .recovery-field input {
    height: 48px;
    border-radius: 24px;
    font-size: var(--font-body);
  }

  .field-error,
  .helper-text {
    font-size: var(--font-small);
  }

  .primary-button {
    min-height: 50px;
    border-radius: 25px;
    font-size: var(--font-body);
  }

  .text-link {
    font-size: var(--font-small);
  }

  .password-entry-content .password-id-link {
    justify-content: center;
    margin-top: 24px;
  }

  .verified-account {
    min-height: 46px;
    margin-top: 42px;
    font-size: var(--font-body);
  }

  .result-box {
    margin-top: 42px;
  }

  .id-result-content .result-success-icon {
    position: absolute;
    top: 243px;
    left: 50%;
    width: 68px;
    height: 68px;
    margin: 0;
    transform: translateX(-50%);
  }

  .id-result-content .result-success-icon img {
    width: 32px;
    height: 23px;
  }

  .id-result-content .result-failure-icon {
    position: absolute;
    top: 242px;
    left: 50%;
    width: 68px;
    height: 68px;
    margin: 0;
    transform: translateX(-50%);
  }

  .id-result-content .failure-guide {
    position: absolute;
    top: 342px;
    right: 20px;
    left: 20px;
    min-height: 90px;
    margin: 0;
  }

  .id-result-content .result-box {
    position: absolute;
    top: 345px;
    right: 20px;
    left: 20px;
    margin: 0;
  }

  .id-result-content .result-actions {
    position: absolute;
    right: 20px;
    bottom: 76px;
    left: 20px;
    margin: 0;
  }

  .id-result-content .primary-button,
  .id-result-content .secondary-button {
    min-height: 50px;
    border-radius: 20px;
    font-size: 15px;
    font-weight: 700;
  }
}
</style>
