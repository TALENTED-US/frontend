<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ButtieAvatar from '@/components/ui/ButtieAvatar.vue'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const menuItems = [
  ['내 정보', '개인정보를 확인하고 수정해요', '/mypage/info'],
  ['취업 준비 정보 관리', '준비 유형·일정·거주 정보를 관리해요', '/mypage/job'],
  ['알림 설정', '퀘스트와 재정 변화 알림을 관리해요', '/mypage/notifications'],
  ['비밀번호·보안', '비밀번호와 로그인 기록을 관리해요', '/mypage/security'],
  ['데이터 관리', '금융 연결과 저장 데이터를 관리해요', '/mypage/data'],
]

function logout() {
  session.logout()
  router.push('/auth/login')
}
</script>

<template>
  <section class="page mypage">
    <h1 class="page-title desktop-only">마이페이지</h1>

    <article class="profile-card card">
      <ButtieAvatar :size="70" crown />
      <div class="profile-copy"><h2>김재준</h2><strong>Lv 5</strong><p>레벨이 오르면 열 만의 버티 모습이 달라져요.</p></div>
      <div class="profile-progress"><span><b>340 / 500 (68%)</b></span></div>
    </article>

    <h2 class="settings-title">계정 및 설정</h2>
    <article class="settings-card card">
      <button v-for="item in menuItems" :key="item[0]" @click="router.push(item[2])">
        <span><strong>{{ item[0] }}</strong><small>{{ item[1] }}</small></span><AppIcon name="chevron" :size="15" />
      </button>
    </article>

    <button class="account-button logout-button" @click="logout"><AppIcon name="logout" :size="18" />로그아웃</button>
    <button class="account-button withdraw-button" @click="router.push('/mypage/withdraw')"><AppIcon name="trash" :size="18" />회원탈퇴</button>
  </section>
</template>

<style scoped>
.mypage > .page-title { margin-bottom: 26px; }
.profile-card { display: grid; grid-template-columns: 90px 1fr minmax(260px, 1.8fr); align-items: center; gap: 18px; padding: 23px 28px; }
.profile-copy { display: grid; gap: 4px; }
.profile-copy h2 { color: var(--primary); font-size: 18px; }
.profile-copy strong { color: var(--primary); font-size: 12px; }
.profile-copy p { color: #777; font-size: 9px; }
.profile-progress { height: 10px; border-radius: 999px; background: #e7e7e7; }
.profile-progress span { position: relative; display: block; width: 68%; height: 100%; border-radius: inherit; background: var(--primary); }
.profile-progress b { position: absolute; right: -175px; bottom: 24px; width: 165px; color: #777; font-size: 10px; font-weight: 500; text-align: right; }
.settings-title { margin: 30px 0 12px; font-size: 17px; }
.settings-card { padding: 0 20px; }
.settings-card > button { display: flex; width: 100%; min-height: 69px; align-items: center; justify-content: space-between; padding: 11px 5px; border-bottom: 1px solid #e3e3e3; text-align: left; }
.settings-card > button:last-child { border-bottom: 0; }
.settings-card span { display: grid; gap: 3px; }
.settings-card strong { color: var(--primary); font-size: 14px; }
.settings-card small { color: #777; font-size: 9px; }
.account-button { display: flex; width: 100%; min-height: 48px; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; border: 1px solid var(--border); border-radius: 12px; color: #666; font-size: 12px; }
.withdraw-button { margin-top: 12px; border-color: #ffaaa9; color: var(--danger); }
.panel-backdrop { position: fixed; z-index: 70; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(4 15 95 / 35%); }
.settings-panel { width: min(100%, 470px); padding: 23px; box-shadow: var(--shadow-md); }
.settings-panel header { display: grid; grid-template-columns: 30px 1fr 30px; align-items: center; margin-bottom: 18px; }
.settings-panel header h2 { color: var(--primary); text-align: center; font-size: 18px; }
.settings-panel > label { display: flex; min-height: 62px; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid #e5e5e5; }
.settings-panel label > span { display: grid; gap: 2px; }
.settings-panel label strong { color: var(--primary); font-size: 12px; }
.settings-panel label small { color: #777; font-size: 9px; }
.settings-panel label > .field { width: 62%; }
.settings-panel input[type='checkbox'] { width: 38px; height: 20px; accent-color: var(--primary); }
.save-button, .danger-submit { width: 100%; margin-top: 20px; padding: 12px; border-radius: 9px; background: var(--accent); color: var(--primary); font-size: 11px; font-weight: 800; }
.warning-box { padding: 16px; border-radius: 10px; background: var(--danger-soft); color: var(--danger); }
.warning-box p { margin-top: 5px; font-size: 10px; }
.settings-panel > .field { margin-top: 16px; }
.danger-submit { background: var(--danger); color: white; }

@media (max-width: 767px) {
  .profile-card { grid-template-columns: 54px 1fr; gap: 12px; margin-top: 12px; padding: 13px 15px; border-radius: 13px; box-shadow: var(--shadow-sm); }
  .profile-card :deep(.buttie-avatar) { width: 50px !important; height: 50px !important; }
  .profile-copy h2 { font-size: 13px; }
  .profile-copy strong { font-size: 10px; }
  .profile-copy p { display: none; }
  .profile-progress { grid-column: 2; height: 6px; margin-top: -15px; }
  .profile-progress b { right: 0; bottom: 17px; width: 120px; font-size: 8px; }
  .settings-title { margin: 15px 0 8px; color: var(--primary); font-size: 12px; }
  .settings-card { padding: 0 13px; box-shadow: var(--shadow-sm); }
  .settings-card > button { min-height: 58px; }
  .settings-card strong { font-size: 11px; }
  .settings-card small { font-size: 8px; }
  .account-button { min-height: 44px; margin-top: 16px; }
  .withdraw-button { margin-top: 9px; }
  .panel-backdrop { align-items: end; padding: 0; }
  .settings-panel { width: 100%; padding: 20px; border-radius: 20px 20px 0 0; }
}
</style>
