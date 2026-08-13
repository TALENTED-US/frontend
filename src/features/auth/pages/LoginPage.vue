<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import buttieStable from '@/assets/images/dashboard/buttie-stable.png'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isSubmitting = ref(false)
const notice = ref(
  route.query.signup === 'success' ? '회원가입이 완료되었습니다. 로그인해 주세요.' : '',
)

async function submit() {
  if (!email.value || !password.value) {
    error.value = '이메일과 비밀번호를 모두 입력해 주세요.'
    return
  }

  isSubmitting.value = true
  const result = await session.authenticate(email.value, password.value)
  isSubmitting.value = false
  if (!result.ok) {
    error.value = result.message || '이메일 또는 비밀번호를 확인해 주세요.'
    return
  }

  error.value = ''
  router.push({ name: 'dashboard' })
}

function clearError() {
  error.value = ''
  notice.value = ''
}
</script>

<template>
  <div class="login-page">
    <aside class="login-visual desktop-only">
      <BrandLogo />
      <div class="visual-copy">
        <small><i></i> MYDATA FINANCIAL CARE</small>
        <h2><span>취준,</span> 감으로<br /><em>버티지 마세요.</em></h2>
        <p>
          소득 공백기의 자산을 분석하고 미래를 시뮬레이션해요.<br />내 상황에 맞는 현실적인 자산
          방어 전략을 만나보세요.
        </p>
      </div>
      <div class="visual-stage" aria-hidden="true">
        <i class="orbit orbit-large"></i>
        <i class="orbit orbit-small"></i>
        <span class="visual-chip chip-one">지금 자산 체크</span>
        <span class="visual-chip chip-two">정책 매칭 92%</span>
        <span class="buttie-speech">같이 버텨요!</span>
        <img :src="buttieStable" alt="" />
      </div>
    </aside>

    <main class="login-main">
      <BrandLogo class="mobile-only mobile-brand" />
      <section class="login-card">
        <img class="login-buttie" :src="buttieStable" alt="" aria-hidden="true" />
        <div class="desktop-only">
          <small class="welcome-badge">WELCOME BACK</small>
          <h1>다시 만나서 반가워요</h1>
          <p>버티와 함께 취업 준비 계획을 이어가세요.</p>
        </div>
        <div class="mobile-only">
          <h1>로그인</h1>
          <p>계속 이어가요</p>
        </div>

        <form @submit.prevent="submit">
          <label
            ><span>아이디</span
            ><input
              v-model="email"
              type="email"
              placeholder="hello@email.com"
              autocomplete="email"
              :aria-invalid="Boolean(error)"
              @input="clearError"
          /></label>
          <label
            ><span>비밀번호</span
            ><i
              ><input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="비밀번호를 입력하세요"
                autocomplete="current-password"
                :aria-invalid="Boolean(error)"
                @input="clearError" /><button type="button" @click="showPassword = !showPassword">
                <AppIcon name="eye" :size="18" /></button></i
          ></label>
          <p v-if="error" class="login-error" role="alert">{{ error }}</p>
          <p v-else-if="notice" class="login-success" role="status">{{ notice }}</p>
          <button class="login-submit" type="submit" :disabled="isSubmitting">
            <strong>{{ isSubmitting ? '로그인 중...' : '로그인' }}</strong>
          </button>
        </form>

        <div class="recovery">
          <RouterLink to="/auth/find-id">아이디 찾기</RouterLink><span>|</span
          ><RouterLink to="/auth/find-password">비밀번호 찾기</RouterLink>
        </div>
        <p class="signup-link">
          아직 계정이 없으신가요? <RouterLink to="/auth/signup">회원가입</RouterLink>
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: minmax(520px, 48%) minmax(0, 1fr);
  width: 100%;
  min-height: 100dvh;
  background: #fcfdff;
}
.login-visual {
  position: relative;
  padding: 34px 44px;
  overflow: hidden;
  border-right: 1px solid rgb(10 22 128 / 18%);
  background: #fbedb0;
}
.login-visual::after {
  position: absolute;
  right: -12%;
  bottom: -20%;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: rgb(147 178 248 / 32%);
  content: '';
}
.visual-copy {
  position: absolute;
  z-index: 2;
  top: 17%;
  right: 46px;
  left: 46px;
}
.visual-copy small {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
}
.visual-copy small i {
  width: 30px;
  height: 2px;
  background: #222;
}
.visual-copy h2 {
  max-width: 520px;
  margin-top: 24px;
  color: #0a1680;
  font-size: clamp(48px, 4.4vw, 72px);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: -0.065em;
}
.visual-copy h2 span,
.visual-copy h2 em {
  position: relative;
  z-index: 0;
  font-style: normal;
}
.visual-copy h2 span::after,
.visual-copy h2 em::after {
  position: absolute;
  z-index: -1;
  right: -3%;
  bottom: 1%;
  left: -3%;
  height: 16%;
  border-radius: 999px;
  background: #f1b94c;
  content: '';
}
.visual-copy p {
  max-width: 520px;
  margin-top: 26px;
  color: rgb(23 25 18 / 70%);
  font-size: 15px;
  line-height: 1.8;
}
.visual-stage {
  position: absolute;
  z-index: 1;
  right: -30px;
  bottom: -34px;
  width: 430px;
  height: 430px;
}
.visual-stage .orbit {
  position: absolute;
  border: 1px solid rgb(10 22 128 / 23%);
  border-radius: 50%;
}
.orbit-large {
  inset: 0;
}
.orbit-small {
  inset: 62px;
  border-style: dashed !important;
}
.visual-stage img {
  position: absolute;
  z-index: 3;
  right: 105px;
  bottom: 70px;
  width: 190px;
  filter: drop-shadow(12px 14px 0 rgb(23 25 18 / 13%));
  transform: rotate(-6deg);
}
.visual-chip,
.buttie-speech {
  position: absolute;
  z-index: 4;
  padding: 9px 13px;
  border: 1px solid #0a1680;
  border-radius: 999px;
  background: #fff;
  color: #0a1680;
  font-size: 11px;
  font-weight: 900;
  box-shadow: 5px 6px 0 rgb(10 22 128 / 10%);
}
.chip-one {
  top: 62px;
  left: 8px;
  transform: rotate(-7deg);
}
.chip-two {
  right: 16px;
  top: 145px;
  transform: rotate(6deg);
}
.buttie-speech {
  right: 232px;
  bottom: 193px;
  border-radius: 18px 18px 5px;
}
.login-visual :deep(.brand-logo__image) {
  width: 70px;
  height: 70px;
}
.mobile-brand :deep(.brand-logo__image) {
  width: 64px;
  height: 64px;
}
.login-visual :deep(.brand-logo__name) {
  color: #171717;
  font-size: 25px;
}
.login-main {
  position: relative;
  display: grid;
  place-items: center;
  padding: 48px;
  background: #fcfdff;
}
.login-card {
  position: relative;
  width: min(100% - 48px, 506px);
  padding: 44px;
  border: 1px solid rgb(10 22 128 / 20%);
  border-radius: 30px;
  background: #fff;
  box-shadow: 15px 17px 0 #dbe5ff;
}
.login-buttie {
  position: absolute;
  top: -55px;
  right: 24px;
  width: 100px;
  filter: drop-shadow(7px 8px 0 rgb(10 22 128 / 12%));
  transform: rotate(7deg);
}
.welcome-badge {
  display: inline-flex;
  padding: 7px 11px;
  border-radius: 999px;
  background: #fbedb0;
  color: #0a1680;
  font-size: var(--font-caption);
  font-weight: 900;
  letter-spacing: 0.08em;
}
.login-card h1 {
  margin-top: 16px;
  color: #0a1680;
  font-size: 36px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -0.045em;
}
.login-card > div:first-child p {
  margin-top: 5px;
  color: #777;
  font-size: var(--font-small);
}
.login-card form {
  display: grid;
  gap: 18px;
  margin-top: 34px;
}
.login-success {
  color: #1f9d68;
  font-size: var(--font-small);
}
.login-card label {
  display: grid;
  gap: 8px;
  color: #171717;
  font-size: var(--font-small);
  font-weight: 700;
}
.login-card label > input,
.login-card label i {
  height: 55px;
  border: 1px solid rgb(10 22 128 / 14%);
  border-radius: 14px;
  background: #fffbea;
  box-shadow: none;
}
.login-card label > input {
  width: 100%;
  min-width: 0;
  padding: 0 17px;
}
.login-card label i {
  display: flex;
  align-items: center;
  overflow: hidden;
  font-style: normal;
}
.login-card label i input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding: 0 17px;
  border: none !important;
  border-radius: 0;
  background: transparent;
  box-shadow: none !important;
}
.login-card label i button {
  padding: 12px;
  background: transparent;
  color: #777;
}
.login-card input:focus,
.login-card label i:focus-within {
  border-color: #93b2f8;
  background: #fff;
  box-shadow: 0 0 0 4px rgb(147 178 248 / 22%);
}
.login-submit {
  height: 54px;
  margin-top: 4px;
  border-radius: 999px;
  background: #0a1680;
  color: #fff;
  box-shadow: 0 8px 0 rgb(10 22 128 / 12%);
  font-size: 15px;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.login-submit:not(:disabled):hover {
  box-shadow: 0 11px 0 rgb(10 22 128 / 12%);
  transform: translateY(-3px);
}
.login-submit strong {
  font-weight: 800;
}
.login-submit:disabled {
  cursor: wait;
  opacity: 0.65;
}
.login-error {
  color: var(--danger);
  font-size: var(--font-caption);
}
.recovery {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 11px;
  color: #222;
  font-size: var(--font-small);
}
.recovery a {
  color: #222;
}
.recovery span {
  color: #777;
}
.signup-link {
  margin-top: 18px;
  color: #777;
  text-align: center;
  font-size: var(--font-small);
}
.signup-link a {
  color: #222;
  font-weight: 800;
}

@media (max-width: 767px) {
  .login-page {
    display: block;
    width: min(100%, 393px);
    max-width: 100%;
    min-height: 100dvh;
    margin: 0 auto;
    padding: 18px 16px;
    overflow-x: hidden;
    background: #fff;
  }
  .login-main {
    display: block;
    padding: 0;
    background: #fff;
  }
  .mobile-brand {
    margin-top: 2px;
  }
  .login-card {
    width: 100%;
    margin-top: 76px;
    padding: 30px 22px;
    border: 0;
    border-radius: 26px;
    background: #fff;
    box-shadow: 8px 10px 0 #dbe5ff;
  }
  .login-buttie {
    top: -62px;
    right: 14px;
    width: 94px;
  }
  .login-card h1 {
    margin: 0;
    font-size: var(--font-section-title);
  }
  .login-card > div:first-child p {
    font-size: var(--font-small);
  }
  .login-card form {
    gap: 10px;
    margin-top: 20px;
  }
  .login-card label {
    gap: 5px;
  }
  .login-card label > input,
  .login-card label i {
    min-height: 50px;
    height: auto;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: #fffbea;
  }
  .login-submit {
    min-height: 48px;
    height: auto;
    margin-top: 5px;
    border-radius: 999px;
  }
  .recovery {
    margin-top: 9px;
    color: #222;
  }
  .signup-link {
    margin-top: 28px;
  }
}
</style>
