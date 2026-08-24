<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  checkEmailDuplicateApi,
  checkNicknameDuplicateApi,
  createUserConsentApi,
  findEmailApi,
  signupApi,
} from '@/api/auth'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import { useIdentityVerification } from '@/features/auth/composables/useIdentityVerification'
import { IDENTITY_VERIFICATION_PURPOSE } from '@/features/auth/services/identityVerification'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

const step = ref(1)
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const verifiedUser = ref(null)
const identityVerificationToken = ref('')
const isSubmitting = ref(false)
const isSignupCompleted = ref(false)
const createdUserId = ref('')
const submissionError = ref('')
const activeAgreement = ref(null)
const isChecking = reactive({ email: false, nickname: false })
const {
  isVerifying,
  verificationError,
  verificationNotice,
  startIdentityVerification,
  restoreIdentityVerificationRedirect,
  resetIdentityVerification,
} = useIdentityVerification(IDENTITY_VERIFICATION_PURPOSE.SIGNUP)

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
  {
    key: 'terms',
    label: '[필수] 이용약관 동의',
    title: 'BUTTIE 서비스 이용약관',
    required: true,
    sections: [
      {
        heading: '제1조 목적',
        body: '본 약관은 BUTTIE가 제공하는 취업 준비 재정 관리, 정책 추천, 시뮬레이션 및 관련 서비스의 이용 조건과 회원의 권리·의무를 정하는 것을 목적으로 합니다.',
      },
      {
        heading: '제2조 서비스 이용',
        body: '회원은 본인 정보를 정확하게 입력해야 하며, 계정과 비밀번호를 안전하게 관리해야 합니다. 타인의 정보를 도용하거나 서비스 운영을 방해하는 행위는 금지됩니다.',
      },
      {
        heading: '제3조 서비스 제공 및 변경',
        body: 'BUTTIE는 자산 현황 분석, 취업 준비 기간 시뮬레이션, 맞춤형 정책 정보 등의 기능을 제공합니다. 안정적인 운영을 위해 서비스의 일부가 변경되거나 일시 중단될 수 있습니다.',
      },
      {
        heading: '제4조 정보의 활용',
        body: '서비스에서 제공하는 분석과 추천 결과는 취업 준비를 돕기 위한 참고 자료이며, 실제 금융·법률·행정 결과를 보장하지 않습니다. 중요한 결정은 관련 기관의 최신 정보를 함께 확인해 주세요.',
      },
    ],
  },
  {
    key: 'privacy',
    label: '[필수] 개인정보 처리방침 동의',
    title: '개인정보 수집 및 이용 안내',
    required: true,
    sections: [
      {
        heading: '수집 항목',
        body: '이름, 생년월일, 휴대전화 번호, 이메일, 닉네임, 본인인증 정보와 서비스 이용 중 회원이 입력하거나 연동한 재정·취업 준비 정보를 수집합니다.',
      },
      {
        heading: '이용 목적',
        body: '회원 식별과 가입 처리, 맞춤형 재정 분석 및 시뮬레이션 제공, 정책 추천, 문의 대응, 서비스 품질 개선과 부정 이용 방지를 위해 이용합니다.',
      },
      {
        heading: '보유 기간',
        body: '회원 탈퇴 시 지체 없이 삭제하는 것을 원칙으로 합니다. 다만 관계 법령에서 일정 기간 보관을 요구하는 정보는 해당 기간 동안 안전하게 분리 보관합니다.',
      },
      {
        heading: '동의 거부 권리',
        body: '개인정보 수집 및 이용에 동의하지 않을 수 있으나, 필수 정보에 대한 동의를 거부하면 회원가입과 핵심 서비스 이용이 제한될 수 있습니다.',
      },
    ],
  },
  {
    key: 'age',
    label: '[필수] 만 14세 이상 확인',
    title: '만 14세 이상 이용 확인',
    required: true,
    sections: [
      {
        heading: '연령 확인',
        body: 'BUTTIE는 만 14세 이상 사용자를 대상으로 제공됩니다. 회원가입을 진행하면 가입자 본인이 만 14세 이상임을 확인한 것으로 봅니다.',
      },
      {
        heading: '보호자 안내',
        body: '만 14세 미만 사용자의 개인정보는 법정대리인의 동의 없이 수집하지 않습니다. 연령 정보가 사실과 다른 것으로 확인되면 계정 이용이 제한될 수 있습니다.',
      },
    ],
  },
  {
    key: 'marketing',
    label: '[선택] 마케팅 정보 수신 동의',
    title: '마케팅 정보 수신 동의',
    required: false,
    sections: [
      {
        heading: '수신 내용',
        body: 'BUTTIE의 신규 기능, 취업 지원 정책, 재정 관리 팁, 이벤트와 혜택에 관한 안내를 이메일 또는 알림으로 보내드릴 수 있습니다.',
      },
      {
        heading: '이용 정보 및 기간',
        body: '안내 발송을 위해 이메일 주소와 알림 설정 정보를 회원 탈퇴 또는 마케팅 동의 철회 시까지 이용합니다.',
      },
      {
        heading: '동의 철회',
        body: '본 동의는 선택 사항이며 동의하지 않아도 기본 서비스를 이용할 수 있습니다. 동의 후에도 마이페이지의 알림 설정에서 언제든지 철회할 수 있습니다.',
      },
    ],
  },
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

const passwordFeedback = computed(() => {
  if (!form.password) return null

  return passwordIsValid.value
    ? { message: '사용 가능한 비밀번호입니다.', valid: true }
    : {
        message: '영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.',
        valid: false,
      }
})

const passwordConfirmFeedback = computed(() => {
  if (!form.confirm) return null

  const valid = form.password === form.confirm
  return {
    message: valid ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.',
    valid,
  }
})

const requiredAgreed = computed(() => {
  return agreements.terms && agreements.privacy && agreements.age
})

onMounted(async () => {
  window.addEventListener('keydown', handleTermsEscape)
  const verification = await restoreIdentityVerificationRedirect()
  await completeVerificationStep(verification)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleTermsEscape)
})

async function startVerification() {
  const result = await startIdentityVerification()
  await completeVerificationStep(result?.verification)
}

async function completeVerificationStep(verification) {
  if (!verification?.identityVerificationToken) return

  try {
    await findEmailApi(verification.identityVerificationToken)
    resetIdentityVerification()
    verificationError.value =
      '이미 가입된 전화번호입니다.\n로그인 또는 아이디 찾기를 이용해 주세요.'
    return
  } catch (error) {
    if (error.code !== 'AUTH_401') {
      resetIdentityVerification()
      verificationError.value = error.message
      return
    }
  }

  identityVerificationToken.value = verification.identityVerificationToken
  const customer = verification.verifiedCustomer || {}
  verifiedUser.value = {
    name: customer.name || '',
    birthDate: customer.birthDate || '',
    phone: customer.phoneNumber || '',
  }
  step.value = 2
}

function goBack() {
  resetIdentityVerification()

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

async function checkEmail() {
  duplicateChecked.email = false

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = '이메일 형식을 확인해 주세요.'
    return
  }

  isChecking.email = true
  try {
    const result = await checkEmailDuplicateApi(form.email.trim().toLowerCase())
    duplicateChecked.email = !result?.isDuplicate
    errors.email = result?.isDuplicate
      ? '이미 사용 중인 이메일입니다.'
      : '사용 가능한 이메일입니다.'
  } catch (error) {
    errors.email = error.message
  } finally {
    isChecking.email = false
  }
}

async function checkNickname() {
  duplicateChecked.nickname = false

  if (!/^[가-힣A-Za-z0-9]{2,10}$/.test(form.nickname)) {
    errors.nickname = '닉네임은 2~10자로 입력해 주세요.'
    return
  }

  isChecking.nickname = true
  try {
    const result = await checkNicknameDuplicateApi(form.nickname.trim())
    duplicateChecked.nickname = !result?.isDuplicate
    errors.nickname = result?.isDuplicate
      ? '이미 사용 중인 닉네임입니다.'
      : '사용 가능한 닉네임입니다.'
  } catch (error) {
    errors.nickname = error.message
  } finally {
    isChecking.nickname = false
  }
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

function showTerms(item) {
  activeAgreement.value = item
}

function closeTerms() {
  activeAgreement.value = null
}

function agreeToActiveTerms() {
  if (!activeAgreement.value) return

  agreements[activeAgreement.value.key] = true
  closeTerms()
}

function handleTermsEscape(event) {
  if (event.key === 'Escape' && activeAgreement.value) {
    closeTerms()
  }
}

async function completeSignup() {
  if (!requiredAgreed.value || isSubmitting.value) return

  if (!identityVerificationToken.value) {
    submissionError.value = '본인인증 정보가 없습니다. 처음 단계부터 다시 진행해 주세요.'
    return
  }

  isSubmitting.value = true
  submissionError.value = ''
  try {
    if (!isSignupCompleted.value) {
      const signupResult = await signupApi(
        {
          userEmail: form.email.trim().toLowerCase(),
          userPassword: form.password,
          userPasswordCheck: form.confirm,
          userNickname: form.nickname.trim(),
        },
        identityVerificationToken.value,
      )
      if (!signupResult?.userId) {
        throw new Error('회원가입 응답에서 사용자 ID를 확인하지 못했습니다.')
      }
      createdUserId.value = signupResult.userId
      isSignupCompleted.value = true
      resetIdentityVerification()
    }

    const loginResult = await session.authenticate(form.email, form.password)
    if (!loginResult.ok) {
      submissionError.value =
        '회원가입은 완료되었지만 자동 로그인에 실패했습니다. 동의 저장을 다시 시도해 주세요.'
      return
    }

    await createUserConsentApi(createdUserId.value)
    router.push('/onboarding')
  } catch (error) {
    submissionError.value = isSignupCompleted.value
      ? `회원가입은 완료되었지만 동의 저장에 실패했습니다. ${error.message}`
      : error.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="signup-page">
    <header class="signup-header">
      <BrandLogo />
      <RouterLink v-if="step !== 3" class="login-link" to="/auth/login">로그인</RouterLink>
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

        <button
          type="button"
          class="verification-card"
          :disabled="isVerifying"
          @click="startVerification"
        >
          <span>
            <strong>{{ isVerifying ? '본인인증 요청 중...' : '간편 본인인증' }}</strong>
            <small>간편하게 인증하세요.</small>
          </span>
          <b aria-hidden="true">›</b>
        </button>
        <p v-if="verificationError" class="verification-feedback error" role="alert">
          {{ verificationError }}
        </p>
        <p v-else-if="verificationNotice" class="verification-feedback" role="status">
          {{ verificationNotice }}
        </p>
      </section>

      <section v-else-if="step === 2" class="signup-step account-step">
        <h2>계정·기본 정보</h2>

        <div class="verified-information" aria-label="본인인증 정보">
          <div class="verified-row verified-row--half">
            <label>이름</label>
            <p>{{ verifiedUser?.name || '서버 확인 후 표시됩니다.' }}</p>
          </div>
          <div class="verified-row verified-row--half">
            <label>생년월일</label>
            <p>{{ verifiedUser?.birthDate || '서버 확인 후 표시됩니다.' }}</p>
          </div>
          <div class="verified-row verified-row--full">
            <label>휴대전화 번호</label>
            <p>{{ verifiedUser?.phone || '서버 확인 후 표시됩니다.' }}</p>
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
              <button
                type="button"
                class="check-button"
                :disabled="isChecking.email"
                @click="checkEmail"
              >
                <strong>{{ isChecking.email ? '확인 중...' : '중복확인' }}</strong>
              </button>
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
                :aria-invalid="Boolean(form.password) && !passwordIsValid"
                @input="clearPasswordErrors"
              />
              <button
                type="button"
                class="visibility-button"
                :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
                @click="showPassword = !showPassword"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"
                  />
                  <circle cx="12" cy="12" r="2.5" />
                  <path v-if="showPassword" d="m4 4 16 16" />
                </svg>
              </button>
            </div>
            <p
              v-if="errors.password || passwordFeedback"
              class="field-message"
              :class="{ success: !errors.password && passwordFeedback?.valid }"
              aria-live="polite"
            >
              {{ errors.password || passwordFeedback?.message }}
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
                :aria-invalid="Boolean(form.confirm) && form.password !== form.confirm"
                @input="errors.confirm = ''"
              />
              <button
                type="button"
                class="visibility-button"
                :aria-label="showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'"
                @click="showPasswordConfirm = !showPasswordConfirm"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"
                  />
                  <circle cx="12" cy="12" r="2.5" />
                  <path v-if="showPasswordConfirm" d="m4 4 16 16" />
                </svg>
              </button>
            </div>
            <p
              v-if="errors.confirm || passwordConfirmFeedback"
              class="field-message"
              :class="{
                success: !errors.confirm && passwordConfirmFeedback?.valid,
              }"
              aria-live="polite"
            >
              {{ errors.confirm || passwordConfirmFeedback?.message }}
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
              <button
                type="button"
                class="check-button"
                :disabled="isChecking.nickname"
                @click="checkNickname"
              >
                <strong>{{ isChecking.nickname ? '확인 중...' : '중복확인' }}</strong>
              </button>
            </div>
            <p
              v-if="errors.nickname"
              class="field-message"
              :class="{ success: duplicateChecked.nickname }"
            >
              {{ errors.nickname }}
            </p>
          </div>

          <button class="primary-button" type="submit"><strong>다음 단계</strong></button>
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
            <button type="button" @click="showTerms(item)">보기</button>
          </li>
        </ul>

        <button
          type="button"
          class="primary-button"
          :disabled="!requiredAgreed || isSubmitting"
          @click="completeSignup"
        >
          <strong>{{
            isSubmitting
              ? '가입 처리 중...'
              : isSignupCompleted
                ? '동의 저장 재시도'
                : '가입 완료'
          }}</strong>
        </button>
        <p v-if="submissionError" class="verification-feedback error" role="alert">
          {{ submissionError }}
        </p>
      </section>

      <p class="already-member">
        이미 계정이 있으신가요?
        <RouterLink to="/auth/login">로그인</RouterLink>
      </p>

      <Teleport to="body">
        <div
          v-if="activeAgreement"
          class="terms-modal-backdrop"
          role="presentation"
          @click.self="closeTerms"
        >
          <section
            class="terms-modal"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="`agreement-title-${activeAgreement.key}`"
          >
            <header class="terms-modal-header">
              <div>
                <span>{{ activeAgreement.required ? '필수 약관' : '선택 약관' }}</span>
                <h2 :id="`agreement-title-${activeAgreement.key}`">
                  {{ activeAgreement.title }}
                </h2>
              </div>
              <button type="button" aria-label="약관 상세 닫기" @click="closeTerms">×</button>
            </header>

            <div class="terms-modal-content">
              <article v-for="section in activeAgreement.sections" :key="section.heading">
                <h3>{{ section.heading }}</h3>
                <p>{{ section.body }}</p>
              </article>
              <small>시행일: 2026년 8월 20일</small>
            </div>

            <footer class="terms-modal-actions">
              <button type="button" class="terms-modal-close" @click="closeTerms">닫기</button>
              <button type="button" class="terms-modal-confirm" @click="agreeToActiveTerms">
                확인 및 동의
              </button>
            </footer>
          </section>
        </div>
      </Teleport>
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
  width: 76px;
  height: 40px;
  box-sizing: border-box;
  padding: 0;
  border: 1px solid #e2e6ef;
  border-radius: 999px;
  box-shadow: 0 1px 5px rgb(0 0 0 / 25%);
  color: #222222;
  font-family: Pretendard, sans-serif;
  font-size: var(--font-body);
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
  color: #222222;
  font-size: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.signup-heading p,
.section-description {
  margin: 10px 0 0;
  color: var(--color-text-secondary, #666666);
  font-size: var(--font-body);
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
  font-size: var(--font-body);
  font-weight: 700;
}

.progress .active span {
  border-color: #f2b544;
  background: #f2b544;
  color: #ffffff;
}

.progress .completed span {
  border-color: var(--color-accent-blue, #93b2f8);
  background: var(--color-accent-blue, #93b2f8);
  color: #ffffff;
}

.signup-step h2 {
  font-size: var(--font-section-title);
}

.verification-card {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 96px;
  margin-top: 28px;
  padding: 24px 30px;
  border: 1px solid #e2e6ef;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 1px 5px rgb(0 0 0 / 25%);
  color: var(--color-text-body, #222222);
  cursor: pointer;
  text-align: center;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.verification-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgb(34 34 34 / 12%);
}

.verification-card:disabled {
  cursor: wait;
  opacity: 0.65;
  transform: none;
}

.verification-feedback {
  margin-top: 16px;
  color: #566581;
  font-size: var(--font-small);
  line-height: 1.55;
  text-align: center;
}

.verification-feedback.error {
  color: #e65353;
  white-space: pre-line;
}

.verification-card span {
  display: grid;
  gap: 7px;
}

.verification-card strong {
  font-size: var(--font-section-title);
}

.verification-card small {
  display: none;
}

.verification-card b {
  display: none;
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
  color: #222222;
  font-size: var(--font-body);
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
  min-height: 46px;
  box-sizing: border-box;
  margin: 0;
  padding: 0 18px;
  border: 1px solid #dce2ee;
  border-radius: 10px;
  background: #f1f4f9;
  box-shadow: 0 1px 5px rgb(0 0 0 / 25%);
  color: #637087;
  font-size: var(--font-body);
}

.verified-row em {
  color: var(--color-primary, #0a1680);
  font-size: var(--font-body);
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
  height: 48px;
  box-sizing: border-box;
  padding: 0 17px;
  border: 1px solid #dce2ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: var(--shadow-figma);
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
  border-radius: 10px;
  background: var(--color-accent, #fbedb0);
  color: var(--color-text-body, #222222);
  cursor: pointer;
  font-size: var(--font-body);
  font-weight: 700;
}

.check-button {
  width: 92px;
  box-shadow: 0 1px 5px rgb(0 0 0 / 25%);
  font-family: Pretendard, sans-serif;
  font-weight: 700;
}

.visibility-button {
  z-index: 1;
  width: 48px;
  margin-left: -58px;
  background: transparent;
  color: #777777;
}

.visibility-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.field-message {
  margin: 0;
  color: #e5484d;
  font-size: var(--font-body);
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
  box-shadow: var(--shadow-figma);
  color: var(--color-text-body, #222222);
  cursor: pointer;
  font-family: Pretendard, sans-serif;
  font-size: var(--font-card-title);
  font-weight: 700;
}

.account-form > .primary-button,
.terms-step > .primary-button {
  font-weight: 800;
}

.check-button strong,
.primary-button strong {
  font-family: Pretendard, sans-serif;
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
  color: #222222;
  font-size: var(--font-card-title);
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
  font-size: var(--font-body);
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
  font-size: var(--font-body);
}

.terms-modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgb(17 24 39 / 52%);
}

.terms-modal {
  display: grid;
  width: min(100%, 640px);
  max-height: min(760px, calc(100dvh - 48px));
  overflow: hidden;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgb(15 23 42 / 24%);
}

.terms-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px 22px;
  border-bottom: 1px solid #e6e9ef;
}

.terms-modal-header span {
  color: #14238f;
  font-size: var(--font-caption);
  font-weight: 800;
}

.terms-modal-header h2 {
  margin: 6px 0 0;
  color: #1f2430;
  font-size: 24px;
  line-height: 1.35;
}

.terms-modal-header button {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f0f3f8;
  color: #4b5563;
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
}

.terms-modal-content {
  display: grid;
  gap: 24px;
  overflow-y: auto;
  padding: 26px 30px 30px;
}

.terms-modal-content article {
  display: grid;
  gap: 8px;
}

.terms-modal-content h3 {
  margin: 0;
  color: #1f2430;
  font-size: var(--font-card-title);
}

.terms-modal-content p {
  margin: 0;
  color: #5f6b7a;
  font-size: var(--font-body);
  line-height: 1.75;
  word-break: keep-all;
}

.terms-modal-content small {
  color: #8a94a6;
  font-size: var(--font-caption);
}

.terms-modal-actions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  padding: 20px 30px 26px;
  border-top: 1px solid #e6e9ef;
}

.terms-modal-actions button {
  height: 52px;
  border-radius: 14px;
  cursor: pointer;
  font-size: var(--font-body);
  font-weight: 800;
}

.terms-modal-close {
  border: 1px solid #d7ddea;
  background: #ffffff;
  color: #4b5563;
}

.terms-modal-confirm {
  border: 0;
  background: #ffbc42;
  color: #17235c;
}

input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: #777777;
}

.already-member {
  margin: 27px 0 0;
  color: var(--color-text-secondary, #666666);
  font-size: var(--font-body);
  text-align: center;
}

.already-member a {
  margin-left: 4px;
  color: #222222;
  font-weight: 800;
  text-decoration: none;
}

@media (max-width: 767px) {
  .terms-modal-backdrop {
    align-items: end;
    padding: 0;
  }

  .terms-modal {
    width: 100%;
    max-height: 86dvh;
    border-radius: 24px 24px 0 0;
  }

  .terms-modal-header {
    padding: 22px 20px 18px;
  }

  .terms-modal-header h2 {
    font-size: 20px;
  }

  .terms-modal-content {
    gap: 20px;
    padding: 22px 20px 26px;
  }

  .terms-modal-actions {
    padding: 16px 20px 22px;
  }
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
    font-size: var(--font-body);
    font-weight: 400;
  }

  .signup-heading {
    text-align: center;
  }

  .signup-heading h1 {
    color: var(--text, #222222);
    font-size: var(--font-page-title);
    letter-spacing: -0.04em;
  }

  .signup-heading p {
    margin-top: 5px;
    font-size: var(--font-body);
  }

  .progress {
    margin: 29px 8px 20px;
  }

  .progress span {
    width: 24px;
    height: 24px;
    font-size: var(--font-small);
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
    font-size: var(--font-card-title);
    letter-spacing: -0.03em;
  }

  .section-description {
    margin-top: 4px;
    font-size: var(--font-small);
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
    font-size: var(--font-card-title);
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
    font-size: var(--font-body);
  }

  .verified-row p {
    min-height: 52px;
    padding: 0 14px;
  }

  .verified-row em {
    font-size: var(--font-small);
  }

  .input-with-button,
  .password-input {
    gap: 8px;
  }

  .check-button {
    width: 82px;
    font-size: var(--font-body);
  }

  .primary-button {
    height: 54px;
  }

  .terms-step {
    gap: 20px;
  }

  .agreement-all {
    height: 46px;
    font-size: var(--font-body);
  }

  .agreement-list li {
    min-height: 52px;
  }

  .already-member {
    margin-top: 24px;
    color: var(--muted, #666666);
    font-size: var(--font-body);
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
    font-size: var(--font-body);
  }
}
</style>
