<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import { user } from '@/data/mockData'

const route = useRoute()
const router = useRouter()

const isId = computed(() => route.name === 'find-id')
const step = ref(1)
const accountId = ref('')
const password = ref('')
const passwordConfirm = ref('')
const accountError = ref('')
const passwordError = ref('')
const isMobileViewport = ref(false)

const normalizedMockEmail = user.email.toLowerCase()
let mobileMediaQuery

function syncViewport(event) {
  isMobileViewport.value = event.matches
}

onMounted(() => {
  mobileMediaQuery = window.matchMedia('(max-width: 767px)')
  syncViewport(mobileMediaQuery)
  mobileMediaQuery.addEventListener('change', syncViewport)
})

onBeforeUnmount(() => {
  mobileMediaQuery?.removeEventListener('change', syncViewport)
})

function resetFlow() {
  step.value = 1
  accountId.value = ''
  password.value = ''
  passwordConfirm.value = ''
  accountError.value = ''
  passwordError.value = ''
}

watch(() => route.name, resetFlow)

function goBack() {
  if (step.value > 1) {
    step.value -= 1
    return
  }

  router.push('/auth/login')
}

function completeSimpleVerification() {
  step.value = isId.value ? 2 : 3
}

function nextPassword() {
  const normalizedAccount = accountId.value.trim().toLowerCase()

  if (normalizedAccount !== normalizedMockEmail) {
    accountError.value = '없는 ID입니다.'
    return
  }

  accountError.value = ''
  step.value = 2
}

function resetPassword() {
  const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

  if (!passwordPattern.test(password.value)) {
    passwordError.value = '영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.'
    return
  }

  if (password.value !== passwordConfirm.value) {
    passwordError.value = '비밀번호가 일치하지 않습니다.'
    return
  }

  passwordError.value = ''
  router.push('/auth/login')
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

    <header v-else class="mobile-header">
      <button type="button" class="mobile-back" aria-label="뒤로가기" @click="goBack">‹</button>
      <strong>{{ isId ? '아이디 찾기' : '비밀번호 찾기' }}</strong>
    </header>

    <section class="recovery-content">
      <p class="eyebrow">ACCOUNT RECOVERY</p>

      <template v-if="isId && step === 1">
        <h1>아이디 찾기</h1>
        <p class="description">간편 본인인증을 완료하면 아이디를 안내해 드려요.</p>

        <button type="button" class="simple-verification" @click="completeSimpleVerification">
          <span>간편 본인인증</span>
        </button>
        <small class="verification-note">인증 완료 후 다음 단계로 진행할 수 있어요.</small>
      </template>

      <template v-else-if="isId">
        <h1>아이디를 찾았어요</h1>
        <p class="description">간편 본인인증으로 확인된 계정입니다.</p>

        <article class="result-box">
          <small>가입 아이디</small>
          <strong>{{ user.email }}</strong>
          <span>가입일 2026.07.01</span>
        </article>
        <RouterLink class="primary-button" to="/auth/login">로그인하기</RouterLink>
        <RouterLink class="text-link" to="/auth/find-password">비밀번호도 찾을까요? ›</RouterLink>
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
        <button type="button" class="primary-button" @click="nextPassword">다음</button>
        <RouterLink class="text-link left" to="/auth/find-id">
          아이디가 기억나지 않으세요? 아이디 찾기 ›
        </RouterLink>
      </template>

      <template v-else-if="step === 2">
        <h1>비밀번호 찾기</h1>
        <p class="description">간편 본인인증으로 본인 확인을 진행해 주세요.</p>

        <button type="button" class="simple-verification" @click="completeSimpleVerification">
          <span>간편 본인인증</span>
        </button>
        <small class="verification-note">인증 완료 후 다음 단계로 진행할 수 있어요.</small>
      </template>

      <template v-else>
        <h1>새 비밀번호 설정</h1>
        <p class="description">영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.</p>

        <div class="verified-account">
          <span>ID</span>
          <strong>{{ accountId }}</strong>
        </div>
        <label class="recovery-field">
          <span>새 비밀번호</span>
          <input
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="8자 이상 입력하세요"
            @input="passwordError = ''"
          />
        </label>
        <label class="recovery-field">
          <span>비밀번호 확인</span>
          <input
            v-model="passwordConfirm"
            type="password"
            autocomplete="new-password"
            placeholder="한 번 더 입력하세요"
            @input="passwordError = ''"
            @keyup.enter="resetPassword"
          />
          <small v-if="passwordError" class="field-error" role="alert">{{ passwordError }}</small>
        </label>
        <button type="button" class="primary-button" @click="resetPassword">비밀번호 변경</button>
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
  color: var(--primary);
  font-size: 10px;
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

.eyebrow {
  color: #e6a518;
  font-size: 11px;
  font-weight: 700;
}

.recovery-content h1 {
  margin-top: 8px;
  color: var(--primary);
  font-size: 28px;
  line-height: 1.25;
}

.description {
  margin-top: 8px;
  color: #777;
  font-size: 13px;
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
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

.simple-verification:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
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
  font-size: 12px;
}

.recovery-field {
  display: grid;
  gap: 8px;
  margin-top: 36px;
  color: var(--primary);
  font-size: 10px;
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
  color: var(--text);
  font-size: 11px;
  font-weight: 400;
}

.recovery-field input:focus {
  border-color: var(--primary);
  outline: 3px solid rgb(6 23 143 / 10%);
}

.recovery-field input.invalid {
  border-color: var(--danger);
}

.field-error {
  color: var(--danger);
  font-size: 10px;
  font-weight: 600;
}

.helper-text {
  display: block;
  margin-top: 12px;
  color: #777;
  font-size: 9px;
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
  font-size: 12px;
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
  color: #222;
  font-size: 11px;
  font-weight: 800;
}

.text-link {
  display: block;
  margin-top: 17px;
  color: var(--primary);
  text-align: center;
  font-size: 9px;
}

.text-link.left {
  text-align: left;
}

.result-box {
  display: grid;
  gap: 6px;
  margin-top: 30px;
  padding: 20px;
  border-radius: 11px;
  background: var(--primary-soft);
}

.result-box small,
.result-box span {
  color: #777;
  font-size: 9px;
}

.result-box strong {
  color: var(--primary);
  font-size: 17px;
}

@media (max-width: 767px) {
  .recovery-page {
    width: min(100%, 393px);
    margin: 0 auto;
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

  .mobile-header strong {
    color: #222;
    text-align: center;
    font-size: 16px;
    font-weight: 800;
  }

  .mobile-back {
    display: flex;
    width: 32px;
    height: 44px;
    align-items: center;
    justify-content: flex-start;
    color: #222;
    font-size: 27px;
    line-height: 1;
  }

  .recovery-content {
    width: 100%;
    margin: 0;
    padding: 38px 24px 40px;
  }

  .eyebrow {
    font-size: 12px;
  }

  .recovery-content h1 {
    margin-top: 8px;
    color: #222;
    font-size: 24px;
  }

  .description {
    font-size: 12px;
  }

  .simple-verification {
    min-height: 90px;
    margin-top: 168px;
    border-radius: 12px;
  }

  .simple-verification span {
    font-size: 18px;
  }

  .verification-note {
    margin-top: 28px;
    font-size: 12px;
  }

  .recovery-field {
    margin-top: 42px;
    color: #222;
    font-size: 14px;
  }

  .recovery-field input {
    height: 48px;
    border-radius: 24px;
    font-size: 13px;
  }

  .field-error,
  .helper-text {
    font-size: 12px;
  }

  .primary-button {
    min-height: 50px;
    border-radius: 25px;
    font-size: 14px;
  }

  .text-link {
    font-size: 12px;
  }

  .verified-account {
    min-height: 46px;
    margin-top: 42px;
    font-size: 14px;
  }

  .result-box {
    margin-top: 42px;
  }
}
</style>
