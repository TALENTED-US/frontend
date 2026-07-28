<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'

const router = useRouter()
const step = ref(1)
const form = ref({ email: '', password: '', confirm: '', nickname: '', terms: true })
const selectedMethod = ref('')

function next() {
  if (step.value < 3) step.value += 1
  else router.push('/onboarding')
}
</script>

<template>
  <main class="signup-page">
    <header><BrandLogo /><RouterLink to="/auth/login">로그인</RouterLink></header>
    <section class="signup-content">
      <button class="back" @click="step === 1 ? router.push('/auth/login') : step--">‹ 뒤로가기</button>
      <h1>회원가입</h1><p>취업 준비, 버티로 시작해요</p>
      <div class="stepper"><span v-for="number in 3" :key="number" :class="{ active: step >= number }">{{ number }}</span></div>

      <template v-if="step === 1">
        <h2>계정·기본 정보</h2>
        <label><span>이메일 *</span><div><input v-model="form.email" placeholder="hello@email.com" /><button>중복확인</button></div></label>
        <label><span>비밀번호 *</span><input v-model="form.password" type="password" placeholder="영문 대·소문자, 숫자, 특수문자 포함 8자 이상" /></label>
        <label><span>비밀번호 확인 *</span><input v-model="form.confirm" type="password" placeholder="비밀번호를 다시 입력하세요" /></label>
        <label><span>닉네임 *</span><div><input v-model="form.nickname" placeholder="2~10자" /><button>중복확인</button></div></label>
        <button class="next" @click="next">다음 단계</button>
      </template>

      <template v-else-if="step === 2">
        <h2>본인 인증</h2><p class="step-description">인증 방법을 선택해 본인 확인을 진행해주세요.</p>
        <div class="signup-methods">
          <button :class="{ selected: selectedMethod === '휴대폰' }" @click="selectedMethod = '휴대폰'"><span><strong>휴대폰 본인인증</strong><small>본인 명의 휴대폰으로 인증합니다.</small></span><b>›</b></button>
          <button :class="{ selected: selectedMethod === '아이핀' }" @click="selectedMethod = '아이핀'"><span><strong>아이핀 본인인증</strong><small>아이핀 계정으로 인증합니다.</small></span><b>›</b></button>
        </div>
        <button class="next" :disabled="!selectedMethod" @click="next">인증 완료</button>
      </template>

      <template v-else>
        <h2>약관 동의</h2>
        <div class="terms">
          <label class="all"><input v-model="form.terms" type="checkbox" /> 전체 동의</label>
          <label><input :checked="form.terms" type="checkbox" /><span><b>[필수]</b> 이용약관 동의</span><button>보기</button></label>
          <label><input :checked="form.terms" type="checkbox" /><span><b>[필수]</b> 개인정보 처리방침 동의</span><button>보기</button></label>
          <label><input :checked="form.terms" type="checkbox" /><span><b>[필수]</b> 만 14세 이상 확인</span><button>보기</button></label>
          <label><input :checked="form.terms" type="checkbox" /><span>[선택] 마케팅 정보 수신 동의</span><button>보기</button></label>
        </div>
        <button class="next" @click="next">가입 완료</button>
      </template>
      <p class="login-link">이미 계정이 있으신가요? <RouterLink to="/auth/login">로그인</RouterLink></p>
    </section>
  </main>
</template>

<style scoped>
.signup-page { min-height: 100dvh; padding: 28px clamp(28px, 5vw, 62px); background: var(--background); }
.signup-page > header { display: flex; align-items: center; justify-content: space-between; }
.signup-page > header > a:last-child { padding: 8px 16px; border: 1px solid var(--border); border-radius: 999px; color: var(--primary); font-size: 10px; font-weight: 800; }
.signup-content { width: min(100%, 440px); margin: 65px auto 0; }
.back { margin-bottom: 15px; color: var(--primary); font-size: 10px; font-weight: 800; }
.signup-content h1 { color: var(--primary); font-size: 24px; }
.signup-content > p { margin-top: 6px; color: #777; font-size: 10px; }
.stepper { position: relative; display: flex; justify-content: space-between; margin: 17px 12px 20px; }
.stepper::before { position: absolute; z-index: 0; top: 10px; right: 0; left: 0; height: 1px; background: #d9d9d9; content: ''; }
.stepper span { z-index: 1; display: grid; width: 21px; height: 21px; place-items: center; border: 1px solid #d9d9d9; border-radius: 50%; background: white; color: #888; font-size: 8px; }
.stepper span.active { border-color: var(--primary); background: var(--primary); color: white; }
.signup-content h2 { margin-bottom: 15px; color: var(--primary); font-size: 14px; }
.signup-content > label { display: grid; gap: 6px; margin-top: 10px; color: var(--primary); font-size: 9px; font-weight: 800; }
.signup-content input { width: 100%; height: 40px; padding: 0 13px; border-radius: 9px; background: #fff9df; font-size: 10px; font-weight: 400; }
.signup-content label > div { display: grid; grid-template-columns: 1fr 82px; gap: 9px; }
.signup-content label > div button { border-radius: 9px; background: var(--accent); color: var(--primary); font-size: 9px; font-weight: 800; }
.next { width: 100%; min-height: 42px; margin-top: 17px; border-radius: 9px; background: var(--accent); font-size: 11px; font-weight: 800; }
.next:disabled { opacity: .5; }
.login-link { text-align: center; }
.login-link a { color: var(--primary); font-weight: 800; }
.step-description { margin-top: -10px !important; }
.signup-methods { display: grid; gap: 11px; margin-top: 30px; }
.signup-methods button { display: flex; min-height: 62px; align-items: center; justify-content: space-between; padding: 13px 17px; border-radius: 11px; background: #fff2b6; text-align: left; }
.signup-methods button.selected { outline: 2px solid var(--primary); }
.signup-methods span { display: grid; gap: 3px; }
.signup-methods strong { color: #483c27; font-size: 12px; }
.signup-methods small { color: #777; font-size: 8px; }
.terms { display: grid; }
.terms label { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; min-height: 42px; border-bottom: 1px solid #e3e3e3; font-size: 10px; }
.terms .all { grid-template-columns: 18px 1fr; padding: 0 12px; border: 0; border-radius: 8px; background: var(--primary-soft); color: var(--primary); font-weight: 800; }
.terms input { width: 13px; height: 13px; padding: 0; accent-color: var(--primary); }
.terms b { color: var(--danger); }
.terms button { color: #777; font-size: 8px; }

@media (max-width: 767px) {
  .signup-page { width: min(100%, 393px); margin: 0 auto; padding: 15px; }
  .signup-page > header > a:last-child { display: none; }
  .signup-content { margin-top: 28px; padding: 0 14px; }
  .signup-content h1 { font-size: 21px; }
  .signup-content input { height: 43px; }
}
</style>
