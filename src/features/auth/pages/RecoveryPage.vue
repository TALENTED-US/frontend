<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/navigation/BrandLogo.vue'

const route = useRoute()
const isId = computed(() => route.name === 'find-id')
const step = ref(isId.value ? 1 : 1)
const method = ref('')
const accountId = ref('')
const verification = ref('')
const password = ref('')

function choose(value) {
  method.value = value
  step.value = isId.value ? 2 : 3
}

function nextPassword() {
  if (!accountId.value) return
  step.value = 2
}
</script>

<template>
  <main class="recovery-page">
    <header><BrandLogo /><nav><RouterLink to="/auth/login">로그인</RouterLink><RouterLink class="join" to="/auth/signup">회원가입</RouterLink></nav></header>
    <section class="recovery-content">
      <RouterLink class="back" :to="step === 1 ? '/auth/login' : ''" @click="step > 1 && (step -= 1)">‹ 뒤로가기</RouterLink>
      <p class="eyebrow">ACCOUNT RECOVERY</p>

      <template v-if="isId && step === 1">
        <h1>아이디 찾기</h1><p class="description">아이디를 찾기 위한 본인인증 방법을 선택해 주세요.</p>
        <div class="method-list">
          <button @click="choose('휴대폰')"><i>▣</i><span><strong>휴대폰 인증</strong><small>문자 메시지로 본인인증을 진행해요.</small></span><b>›</b></button>
          <button @click="choose('아이핀')"><i>◆</i><span><strong>아이핀 인증</strong><small>아이핀으로 본인인증을 진행해요.</small></span><b>›</b></button>
        </div>
        <small class="note">인증 완료 후 다음 단계로 진행할 수 있어요.</small>
      </template>

      <template v-else-if="isId">
        <h1>아이디를 찾았어요</h1><p class="description">{{ method }} 인증으로 확인된 계정입니다.</p>
        <article class="result-box"><small>가입 아이디</small><strong>buttie@example.com</strong><span>가입일 2026.07.01</span></article>
        <RouterLink class="primary-button" to="/auth/login">로그인하기</RouterLink>
        <RouterLink class="text-link" to="/auth/find-password">비밀번호도 찾을까요? ›</RouterLink>
      </template>

      <template v-else-if="step === 1">
        <h1>비밀번호 찾기</h1><p class="description">비밀번호를 재설정할 계정 아이디를 입력해 주세요.</p>
        <label class="recovery-field"><span>아이디</span><input v-model="accountId" placeholder="아이디 또는 이메일을 입력하세요" /></label>
        <small class="note left">소셜 계정으로 가입했다면 해당 서비스에서 비밀번호를 재설정해 주세요.</small>
        <button class="primary-button" @click="nextPassword">다음</button>
        <RouterLink class="text-link left" to="/auth/find-id">아이디가 기억나지 않으세요? 아이디 찾기 ›</RouterLink>
      </template>

      <template v-else-if="step === 2">
        <h1>비밀번호 찾기</h1><p class="description">본인확인 방법을 선택해 주세요.</p>
        <div class="method-list">
          <button @click="choose('이메일')"><i>✉</i><span><strong>이메일 인증</strong><small>등록된 이메일로 인증번호를 받아요.</small></span><b>›</b></button>
          <button @click="choose('휴대폰')"><i>▣</i><span><strong>휴대폰 인증</strong><small>등록된 휴대폰으로 인증해요.</small></span><b>›</b></button>
        </div>
        <small class="note">인증 완료 후 다음 단계로 진행할 수 있어요.</small>
      </template>

      <template v-else-if="step === 3">
        <h1>{{ method }} 인증</h1><p class="description">인증번호를 입력하면 비밀번호를 재설정할 수 있어요.</p>
        <label class="recovery-field"><span>인증번호</span><input v-model="verification" placeholder="6자리 인증번호" /></label>
        <button class="primary-button" @click="step = 4">인증 확인</button>
      </template>

      <template v-else>
        <h1>새 비밀번호 설정</h1><p class="description">영문·숫자·특수문자를 포함해 8자 이상 입력해 주세요.</p>
        <label class="recovery-field"><span>새 비밀번호</span><input v-model="password" type="password" placeholder="새 비밀번호" /></label>
        <label class="recovery-field"><span>새 비밀번호 확인</span><input type="password" placeholder="한 번 더 입력하세요" /></label>
        <RouterLink class="primary-button" to="/auth/login">비밀번호 변경</RouterLink>
      </template>
    </section>
  </main>
</template>

<style scoped>
.recovery-page { min-height: 100dvh; padding: 28px clamp(28px, 5vw, 62px); background: var(--background); }
.recovery-page > header { display: flex; align-items: center; justify-content: space-between; }
.recovery-page nav { display: flex; gap: 10px; }
.recovery-page nav a { padding: 9px 17px; border: 1px solid var(--border); border-radius: 999px; color: var(--primary); font-size: 10px; font-weight: 800; }
.recovery-page nav .join { border-color: var(--accent); background: var(--accent); }
.recovery-content { width: min(100%, 470px); margin: 80px auto 0; }
.back { display: block; margin-bottom: 62px; color: var(--primary); font-size: 11px; font-weight: 800; }
.eyebrow { color: #e6a518; font-size: 9px; }
.recovery-content h1 { margin-top: 7px; color: var(--primary); font-size: 25px; }
.description { margin-top: 7px; color: #777; font-size: 11px; }
.method-list { display: grid; gap: 11px; margin-top: 36px; }
.method-list button { display: grid; grid-template-columns: 34px 1fr 15px; align-items: center; gap: 12px; min-height: 62px; padding: 11px 15px; border-radius: 11px; background: #fff6cf; text-align: left; }
.method-list i { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 8px; background: white; color: var(--primary); font-style: normal; }
.method-list span { display: grid; gap: 2px; }
.method-list strong { color: var(--primary); font-size: 12px; }
.method-list small, .note { color: #777; font-size: 8px; }
.method-list b { color: var(--primary); }
.note { display: block; margin-top: 22px; text-align: center; }
.note.left { margin: 12px 0 0; text-align: left; }
.recovery-field { display: grid; gap: 8px; margin-top: 36px; color: var(--primary); font-size: 10px; font-weight: 800; }
.recovery-field + .recovery-field { margin-top: 14px; }
.recovery-field input { height: 47px; padding: 0 15px; border: 1px solid var(--border); border-radius: 10px; background: white; font-size: 11px; font-weight: 400; }
.primary-button { display: grid; width: 100%; min-height: 45px; margin-top: 27px; place-items: center; border-radius: 10px; background: var(--accent); color: #222; font-size: 11px; font-weight: 800; }
.text-link { display: block; margin-top: 17px; color: var(--primary); text-align: center; font-size: 9px; }
.text-link.left { text-align: left; }
.result-box { display: grid; gap: 6px; margin-top: 30px; padding: 20px; border-radius: 11px; background: var(--primary-soft); }
.result-box small, .result-box span { color: #777; font-size: 9px; }
.result-box strong { color: var(--primary); font-size: 17px; }

@media (max-width: 767px) {
  .recovery-page { width: min(100%, 393px); margin: 0 auto; padding: 15px; }
  .recovery-page nav { display: none; }
  .recovery-content { margin-top: 42px; padding: 0 14px; }
  .back { margin-bottom: 48px; }
  .eyebrow { display: none; }
  .recovery-content h1 { font-size: 20px; }
  .method-list { margin-top: 25px; }
  .method-list button { min-height: 58px; }
}
</style>
