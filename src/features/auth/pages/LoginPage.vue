<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const isSubmitting = ref(false)

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
  router.push('/')
}

function clearError() {
  error.value = ''
}
</script>

<template>
  <div class="login-page">
    <aside class="login-visual desktop-only">
      <BrandLogo />
      <div>
        <small>취업 준비, 막막하지 않게</small>
        <h2>내 재정으로 취업 준비를 설계하세요.</h2>
        <p>수입·지출·청년 정책을 함께 살펴보고 목표 취업일까지의 계획을 보여드려요.</p>
      </div>
    </aside>

    <main class="login-main">
      <BrandLogo class="mobile-only mobile-brand" />
      <section class="login-card">
        <div class="desktop-only">
          <small>WELCOME BACK</small>
          <h1>다시 만나서 반가워요</h1>
          <p>버티와 함께 취업 준비 계획을 이어가세요.</p>
        </div>
        <div class="mobile-only">
          <h1>로그인</h1>
          <p>계속 이어가요</p>
        </div>

        <form @submit.prevent="submit">
          <label
            ><span>이메일</span
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
  grid-template-columns: 35% 65%;
  width: min(100%, 1440px);
  min-height: 100dvh;
  margin: 0 auto;
  background: #fff;
}
.login-visual {
  position: relative;
  padding: 38px 42px;
  border-right: 1px solid #eceef3;
  background: #fff;
}
.login-visual > div {
  position: absolute;
  top: 23%;
  right: 58px;
  left: 58px;
}
.login-visual small {
  color: #222;
  font-size: var(--font-body);
  font-weight: 800;
}
.login-visual h2 {
  max-width: 380px;
  margin-top: 18px;
  font-size: clamp(32px, 2.45vw, 39px);
  line-height: 1.12;
  letter-spacing: -0.035em;
}
.login-visual p {
  max-width: 390px;
  margin-top: 24px;
  color: #586174;
  font-size: var(--font-body);
  line-height: 1.75;
}
.login-main {
  position: relative;
  display: grid;
  place-items: start center;
  padding-top: 13.5vh;
  background: var(--background);
}
.login-card {
  width: min(100% - 48px, 506px);
}
.login-card > div:first-child small {
  color: #e9a818;
  font-size: var(--font-caption);
  font-weight: 700;
}
.login-card h1 {
  margin-top: 10px;
  color: #171717;
  font-size: var(--font-page-title);
  line-height: 1.3;
}
.login-card > div:first-child p {
  margin-top: 5px;
  color: #777;
  font-size: var(--font-small);
}
.login-card form {
  display: grid;
  gap: 17px;
  margin-top: 39px;
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
  height: 52px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  box-shadow: var(--shadow-figma);
}
.login-card label > input {
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
}
.login-card label i button {
  padding: 12px;
  color: #777;
}
.login-submit {
  height: 50px;
  border-radius: 10px;
  background: var(--accent);
  color: #1c1c1c;
  box-shadow: var(--shadow-figma);
  font-size: var(--font-small);
  font-weight: 800;
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
    min-height: 100dvh;
    margin: 0 auto;
    padding: 14px 16px;
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
    margin-top: 125px;
    padding: 0 28px;
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
    background: #fff;
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
