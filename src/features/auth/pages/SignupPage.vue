<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'

const router = useRouter()

const step = ref(1)
const showPassword = ref(false)
const showPasswordConfirm = ref(false)

const verifiedUser = {
  name: '김재준',
  birthDate: '2000.01.01',
  phone: '010-1234-5678',
}

const form = reactive({
  email: '',
  password: '',
  confirm: '',
  nickname: '',
})

const duplicateChecked = reactive({
  email: false,
  nickname: false,
})

const errors = reactive({
  email: '',
  password: '',
  confirm: '',
  nickname: '',
})

const agreements = reactive({
  terms: false,
  privacy: false,
  age: false,
  marketing: false,
})

const agreementItems = [
  { key: 'terms', label: '[필수] 이용약관 동의', required: true },
  { key: 'privacy', label: '[필수] 개인정보 처리방침 동의', required: true },
  { key: 'age', label: '[필수] 만 14세 이상 확인', required: true },
  { key: 'marketing', label: '[선택] 마케팅 정보 수신 동의', required: false },
]

const allAgreed = computed({
  get: () => Object.values(agreements).every(Boolean),
  set: (checked) => {
    Object.keys(agreements).forEach((key) => {
      agreements[key] = checked
    })
  },
})

const passwordIsValid = computed(() => {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/.test(form.password)
})

const requiredAgreed = computed(() => {
  return agreements.terms && agreements.privacy && agreements.age
})

function startVerification() {
  step.value = 2
}

function goBack() {
  if (step.value > 1) {
    step.value -= 1
    return
  }

  router.push('/auth/login')
}

function invalidate(field) {
  duplicateChecked[field] = false
  errors[field] = ''
}

function clearPasswordErrors() {
  errors.password = ''
  errors.confirm = ''
}

function checkEmail() {
  duplicateChecked.email = false

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = '이메일 형식을 확인해 주세요.'
    return
  }

  if (form.email.toLowerCase() === 'used@buttie.kr') {
    errors.email = '이미 사용 중인 이메일입니다.'
    return
  }

  duplicateChecked.email = true
  errors.email = '사용 가능한 이메일입니다.'
}

function checkNickname() {
  duplicateChecked.nickname = false

  if (!/^[가-힣A-Za-z0-9]{2,10}$/.test(form.nickname)) {
    errors.nickname = '닉네임은 2~10자로 입력해 주세요.'
    return
  }

  if (form.nickname === '버티') {
    errors.nickname = '이미 사용 중인 닉네임입니다.'
    return
  }

  duplicateChecked.nickname = true
  errors.nickname = '사용 가능한 닉네임입니다.'
}

function validateAccount() {
  if (!duplicateChecked.email) {
    errors.email = errors.email || '이메일 중복확인을 해주세요.'
  }

  if (!duplicateChecked.nickname) {
    errors.nickname = errors.nickname || '닉네임 중복확인을 해주세요.'
  }

  errors.password = passwordIsValid.value
    ? ''
    : '영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.'

  errors.confirm = form.password === form.confirm ? '' : '비밀번호가 일치하지 않습니다.'

  return (
    duplicateChecked.email &&
    duplicateChecked.nickname &&
    passwordIsValid.value &&
    form.password === form.confirm
  )
}

function goToTerms() {
  if (validateAccount()) {
    step.value = 3
  }
}

function showTerms(label) {
  window.alert(label + ' 약관 내용은 준비 중입니다.')
}

function completeSignup() {
  if (requiredAgreed.value) {
    router.push('/onboarding')
  }
}
</script>

<template>
  <main class="signup-page">
    <header class="signup-header">
      <BrandLogo />
      <RouterLink class="login-link" to="/auth/login">로그인</RouterLink>
    </header>

    <section class="signup-content" aria-labelledby="signup-title">
      <button type="button" class="mobile-back" @click="goBack">← 이전 단계</button>

      <div class="signup-heading">
        <h1 id="signup-title">회원가입</h1>
        <p>취업 준비, 버티로 시작해요</p>
      </div>

      <ol class="progress" :class="`progress--step-${step}`" aria-label="회원가입 진행 단계">
        <li
          v-for="number in 3"
          :key="number"
          :class="{ active: step === number, completed: step > number }"
        >
          <span>{{ step > number ? '✓' : number }}</span>
        </li>
      </ol>

      <section v-if="step === 1" class="signup-step verification-step">
        <h2>본인 인증</h2>
        <p class="section-description web-copy">간편 본인인증으로 본인 확인을 진행해주세요.</p>
        <p class="section-description app-copy">인증 수단을 선택하면 포트원 본인인증이 진행돼요</p>

        <button type="button" class="verification-card" @click="startVerification">
          <span>
            <strong>간편 본인인증</strong>
            <small>간편하게 인증하세요.</small>
          </span>
          <b aria-hidden="true">›</b>
        </button>
      </section>

      <section v-else-if="step === 2" class="signup-step account-step">
        <h2>계정·기본 정보</h2>

        <div class="verified-information" aria-label="본인인증 정보">
          <div class="verified-row verified-row--half">
            <label>이름</label>
            <p>{{ verifiedUser.name }}</p>
          </div>
          <div class="verified-row verified-row--half">
            <label>생년월일</label>
            <p>{{ verifiedUser.birthDate }}</p>
          </div>
          <div class="verified-row verified-row--full">
            <label>휴대전화 번호</label>
            <p>
              {{ verifiedUser.phone }}
              <em>본인인증 완료</em>
            </p>
          </div>
        </div>

        <form class="account-form" @submit.prevent="goToTerms">
          <div class="form-field">
            <label for="signup-email">이메일 <i>*</i></label>
            <div class="input-with-button">
              <input
                id="signup-email"
                v-model.trim="form.email"
                type="email"
                placeholder="hello@email.com"
                @input="invalidate('email')"
              />
              <button type="button" class="check-button" @click="checkEmail">중복확인</button>
            </div>
            <p
              v-if="errors.email"
              class="field-message"
              :class="{ success: duplicateChecked.email }"
            >
              {{ errors.email }}
            </p>
          </div>

          <div class="form-field">
            <label for="signup-password">비밀번호 <i>*</i></label>
            <div class="password-input">
              <input
                id="signup-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                @input="clearPasswordErrors"
              />
              <button
                type="button"
                class="visibility-button"
                :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '숨김' : '보기' }}
              </button>
            </div>
            <p v-if="errors.password" class="field-message">
              {{ errors.password }}
            </p>
          </div>

          <div class="form-field">
            <label for="signup-password-confirm">비밀번호 확인 <i>*</i></label>
            <div class="password-input">
              <input
                id="signup-password-confirm"
                v-model="form.confirm"
                :type="showPasswordConfirm ? 'text' : 'password'"
                placeholder="비밀번호를 다시 입력하세요"
                @input="errors.confirm = ''"
              />
              <button
                type="button"
                class="visibility-button"
                :aria-label="showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'"
                @click="showPasswordConfirm = !showPasswordConfirm"
              >
                {{ showPasswordConfirm ? '숨김' : '보기' }}
              </button>
            </div>
            <p v-if="errors.confirm" class="field-message">
              {{ errors.confirm }}
            </p>
          </div>

          <div class="form-field">
            <label for="signup-nickname">닉네임 <i>*</i></label>
            <div class="input-with-button">
              <input
                id="signup-nickname"
                v-model.trim="form.nickname"
                type="text"
                maxlength="10"
                placeholder="2~10자"
                @input="invalidate('nickname')"
              />
              <button type="button" class="check-button" @click="checkNickname">중복확인</button>
            </div>
            <p
              v-if="errors.nickname"
              class="field-message"
              :class="{ success: duplicateChecked.nickname }"
            >
              {{ errors.nickname }}
            </p>
          </div>

          <button class="primary-button" type="submit">다음 단계</button>
        </form>
      </section>

      <section v-else class="signup-step terms-step">
        <h2>약관 동의</h2>

        <label class="agreement-all">
          <input v-model="allAgreed" type="checkbox" />
          <span>전체 동의</span>
        </label>

        <ul class="agreement-list">
          <li v-for="item in agreementItems" :key="item.key">
            <label>
              <input v-model="agreements[item.key]" type="checkbox" />
              <span :class="{ required: item.required }">{{ item.label }}</span>
            </label>
            <button type="button" @click="showTerms(item.label)">보기</button>
          </li>
        </ul>

        <button
          type="button"
          class="primary-button"
          :disabled="!requiredAgreed"
          @click="completeSignup"
        >
          가입 완료
        </button>
      </section>

      <p class="already-member">
        이미 계정이 있으신가요?
        <RouterLink to="/auth/login">로그인</RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.signup-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 30px 60px 80px;
  background: #fafbfe;
  color: var(--color-text-body, #222222);
}

.signup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.login-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 40px;
  border: 1px solid #e2e6ef;
  border-radius: 999px;
  color: var(--color-primary, #0a1680);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.signup-content {
  width: min(100%, 500px);
  margin: 150px auto 0;
}

.mobile-back {
  display: none;
}

.app-copy {
  display: none;
}

.signup-heading h1,
.signup-step h2 {
  margin: 0;
  color: var(--color-primary, #0a1680);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.05em;
}

.signup-heading p,
.section-description {
  margin: 10px 0 0;
  color: var(--color-text-secondary, #666666);
  font-size: 15px;
}

.progress {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin: 42px 0 52px;
  padding: 0;
  list-style: none;
}

.progress::before,
.progress::after {
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 14px;
  height: 2px;
  transform: translateY(-50%);
  content: '';
}

.progress::before {
  right: 14px;
  background: #e0e3e9;
}

.progress::after {
  width: 0;
  background: var(--sky, #93b2f8);
  transition: width 0.2s ease;
}

.progress--step-2::after {
  width: calc(50% - 14px);
}

.progress--step-3::after {
  width: calc(100% - 28px);
}

.progress li {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}

.progress li:nth-child(2) {
  justify-content: center;
}

.progress li:last-child {
  justify-content: flex-end;
}

.progress span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #d9dee8;
  border-radius: 50%;
  background: #ffffff;
  color: #9ca3af;
  font-size: 13px;
  font-weight: 700;
}

.progress .active span {
  border-color: var(--color-primary, #0a1680);
  background: var(--color-primary, #0a1680);
  color: #ffffff;
}

.progress .completed span {
  border-color: var(--color-accent-blue, #93b2f8);
  background: var(--color-accent-blue, #93b2f8);
  color: #ffffff;
}

.signup-step h2 {
  font-size: 21px;
}

.verification-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 140px;
  margin-top: 28px;
  padding: 28px 30px;
  border: 0;
  border-radius: 18px;
  background: var(--color-accent, #fbedb0);
  color: var(--color-text-body, #222222);
  cursor: pointer;
  text-align: left;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.verification-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgb(34 34 34 / 12%);
}

.verification-card span {
  display: grid;
  gap: 7px;
}

.verification-card strong {
  font-size: 21px;
}

.verification-card small {
  color: #655f4e;
  font-size: 14px;
}

.verification-card b {
  color: var(--color-primary, #0a1680);
  font-size: 30px;
  font-weight: 500;
}

.verified-information {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 28px 0 32px;
}

.verified-row {
  display: grid;
  gap: 8px;
}

.verified-row--full {
  grid-column: 1 / -1;
}

.verified-row label,
.form-field > label {
  color: var(--color-primary, #0a1680);
  font-size: 14px;
  font-weight: 700;
}

.form-field > label i {
  color: #ef4444;
  font-style: normal;
}

.verified-row p {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  box-sizing: border-box;
  margin: 0;
  padding: 0 18px;
  border: 1px solid #dce2ee;
  border-radius: 12px;
  background: #f1f4f9;
  color: #637087;
  font-size: 15px;
}

.verified-row em {
  color: var(--color-primary, #0a1680);
  font-size: 13px;
  font-style: normal;
  font-weight: 700;
}

.account-form {
  display: grid;
  gap: 21px;
}

.form-field {
  display: grid;
  gap: 9px;
}

.input-with-button,
.password-input {
  display: flex;
  gap: 10px;
}

.form-field input {
  width: 100%;
  min-width: 0;
  height: 54px;
  box-sizing: border-box;
  padding: 0 17px;
  border: 1px solid #dce2ee;
  border-radius: 12px;
  background: #ffffff;
  color: var(--color-text-body, #222222);
  font: inherit;
  outline: none;
}

.form-field input:focus {
  border-color: var(--color-accent-blue, #93b2f8);
  box-shadow: 0 0 0 3px rgb(147 178 248 / 18%);
}

.form-field input::placeholder {
  color: var(--color-text-placeholder, #999999);
}

.check-button,
.visibility-button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 12px;
  background: var(--color-accent, #fbedb0);
  color: var(--color-text-body, #222222);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.check-button {
  width: 92px;
}

.visibility-button {
  width: 58px;
  background: #f2f4f8;
  color: var(--color-primary, #0a1680);
}

.field-message {
  margin: 0;
  color: #e5484d;
  font-size: 13px;
}

.field-message.success {
  color: #168059;
}

.primary-button {
  width: 100%;
  height: 56px;
  margin-top: 10px;
  border: 0;
  border-radius: 14px;
  background: var(--color-accent, #fbedb0);
  color: var(--color-text-body, #222222);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.terms-step {
  display: grid;
  gap: 22px;
}

.agreement-all {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 58px;
  padding: 0 18px;
  border-radius: 14px;
  background: #eef3ff;
  color: var(--color-primary, #0a1680);
  font-size: 16px;
  font-weight: 800;
}

.agreement-list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agreement-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  border-bottom: 1px solid #e6e9ef;
}

.agreement-list label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.agreement-list .required {
  color: #ef4444;
  font-weight: 700;
}

.agreement-list button {
  border: 0;
  background: transparent;
  color: var(--color-text-secondary, #666666);
  cursor: pointer;
  font-size: 13px;
}

input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary, #0a1680);
}

.already-member {
  margin: 27px 0 0;
  color: var(--color-text-secondary, #666666);
  font-size: 14px;
  text-align: center;
}

.already-member a {
  margin-left: 4px;
  color: var(--color-primary, #0a1680);
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 767px) {
  .signup-page {
    min-height: 100dvh;
    padding: 22px 16px 42px;
    background: var(--background, #fcfdff);
  }

  .signup-header {
    display: none;
  }

  .signup-content {
    width: min(100%, 393px);
    margin: 0 auto;
  }

  .mobile-back {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    margin: 0 0 20px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted, #666666);
    cursor: pointer;
    font-size: 15px;
    font-weight: 400;
  }

  .signup-heading {
    text-align: center;
  }

  .signup-heading h1 {
    color: var(--text, #222222);
    font-size: 24px;
    letter-spacing: -0.04em;
  }

  .signup-heading p {
    margin-top: 5px;
    font-size: 14px;
  }

  .progress {
    margin: 29px 8px 20px;
  }

  .progress span {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }

  .progress::before,
  .progress::after {
    left: 12px;
    height: 2px;
  }

  .progress::before {
    right: 12px;
  }

  .progress--step-2::after {
    width: calc(50% - 12px);
  }

  .progress--step-3::after {
    width: calc(100% - 24px);
  }

  .signup-step {
    padding: 23px;
    border: 1px solid #eceef3;
    border-radius: 17px;
    background: #ffffff;
    box-shadow: 0 2px 3px rgb(15 23 42 / 5%);
  }

  .signup-step h2 {
    color: var(--text, #222222);
    font-size: 16px;
    letter-spacing: -0.03em;
  }

  .section-description {
    margin-top: 4px;
    font-size: 12px;
  }

  .web-copy {
    display: none;
  }

  .app-copy {
    display: block;
  }

  .verification-card {
    justify-content: center;
    min-height: 90px;
    margin-top: 42px;
    padding: 20px;
    border: 1px solid #e5e7ec;
    border-radius: 13px;
    background: #ffffff;
    box-shadow: 0 3px 6px rgb(15 23 42 / 14%);
    text-align: center;
  }

  .verification-card strong {
    font-size: 18px;
  }

  .verification-card small,
  .verification-card b {
    display: none;
  }

  .verification-step {
    min-height: 246px;
  }

  .verified-information {
    gap: 13px;
    margin: 25px 0 28px;
  }

  .verified-row p,
  .form-field input {
    height: 52px;
    font-size: 14px;
  }

  .verified-row p {
    min-height: 52px;
    padding: 0 14px;
  }

  .verified-row em {
    font-size: 12px;
  }

  .input-with-button,
  .password-input {
    gap: 8px;
  }

  .check-button {
    width: 82px;
    font-size: 13px;
  }

  .primary-button {
    height: 54px;
  }

  .terms-step {
    gap: 20px;
  }

  .agreement-all {
    height: 46px;
    font-size: 14px;
  }

  .agreement-list li {
    min-height: 52px;
  }

  .already-member {
    margin-top: 24px;
    color: var(--muted, #666666);
    font-size: 14px;
  }

  .already-member a {
    color: var(--text, #222222);
  }
}

@media (max-width: 390px) {
  .signup-page {
    padding-right: 16px;
    padding-left: 16px;
  }

  .verified-information {
    grid-template-columns: 1fr;
  }

  .verified-row--half {
    grid-column: 1 / -1;
  }

  .agreement-list label {
    font-size: 13px;
  }
}
</style>
