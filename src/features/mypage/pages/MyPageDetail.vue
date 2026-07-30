<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ButtieAvatar from '@/components/ui/ButtieAvatar.vue'

const route = useRoute()
const router = useRouter()
const settings = ref({ all: true, policy: true, finance: true, plan: true, reward: true, notice: true })
const twoFactor = ref(false)
const details = {
  myInfo: ['내 정보', '개인정보를 확인하고 수정해요'],
  jobInfo: ['취업 준비 정보 관리', '정확한 추천과 준비 기간 계산에 사용돼요.'],
  notificationSettings: ['알림 설정', '정책과 재정 변화 알림을 관리해요.'],
  security: ['비밀번호·보안', '비밀번호와 로그인 기기를 관리해요.'],
  dataManagement: ['데이터 관리', '금융 연결과 저장 데이터를 관리해요.'],
  withdraw: ['회원 탈퇴', '탈퇴 전 꼭 확인해 주세요'],
}
const info = computed(() => details[route.name] || details.myInfo)
const form = ref({ name: '김재준', birth: '1998-03-15', phone: '010-1234-5678', email: 'skadngus1128@gmail.com', type: 'IT/개발', start: '2026.07.01', goal: '2027.01.01', region: '서울특별시', family: '1명', password: '', reason: '서비스가 기대와 달랐어요' })
</script>

<template>
  <section class="page detail-page">
    <button class="detail-back" @click="router.push('/mypage')">‹ 마이페이지</button>
    <h1>{{ info[0] }}</h1><p>{{ info[1] }}</p>

    <template v-if="route.name === 'myInfo'">
      <div class="identity"><ButtieAvatar :size="58" crown /><strong>김재준</strong><button>✎</button></div>
      <div class="info-note">◎ 이름·생년월일은 본인인증 정보로 변경할 수 없어요.</div>
      <form class="detail-form">
        <label><span>이름</span><input v-model="form.name" disabled /></label><label><span>생년월일</span><input v-model="form.birth" disabled /></label>
      </form>
      <form class="detail-form verify-form">
        <label><span>휴대폰 번호</span><div><input v-model="form.phone" /><button>인증</button></div></label>
        <label><span>이메일</span><div><input v-model="form.email" /><button>인증</button></div></label>
      </form>
      <button class="save-detail">저장하기</button>
    </template>

    <template v-else-if="route.name === 'jobInfo'">
      <form class="detail-form job-form">
        <label><span>취업 준비 유형</span><select v-model="form.type"><option>IT/개발</option><option>디자인</option><option>금융</option></select></label>
        <label><span>준비 시작일</span><input v-model="form.start" /></label><label><span>목표 취업일</span><input v-model="form.goal" /></label>
        <label><span>거주지</span><input v-model="form.region" /></label><label><span>세대원 수</span><select v-model="form.family"><option>1명</option><option>2명</option></select></label>
        <button class="save-detail">저장하기</button>
      </form>
    </template>

    <template v-else-if="route.name === 'notificationSettings'">
      <label class="toggle-card card"><span><strong>전체 알림</strong><small>모든 알림을 한번에 켜고 끕니다.</small></span><input v-model="settings.all" type="checkbox" /></label>
      <article class="toggle-list card">
        <label v-for="(value, key) in settings" v-show="key !== 'all'" :key="key"><span><strong>{{ { policy: '정책 마감', finance: '재정 변화', plan: '계획 이탈', reward: '리워드 획득', notice: '서비스 공지' }[key] }}</strong><small>중요한 변화를 알려드려요.</small></span><input v-model="settings[key]" type="checkbox" /></label>
      </article>
    </template>

    <template v-else-if="route.name === 'security'">
      <article class="security-card card"><h2>비밀번호 변경</h2><label><span>현재 비밀번호</span><input type="password" /></label><label><span>새 비밀번호</span><input type="password" /></label><label><span>새 비밀번호 확인</span><input type="password" /></label><button class="save-detail">비밀번호 변경</button></article>
      <label class="toggle-card card"><span><strong>2단계 인증</strong><small>로그인 시 인증번호를 추가로 입력합니다.</small></span><input v-model="twoFactor" type="checkbox" /></label>
      <article class="devices card"><header><h2>최근 로그인 기기</h2><button>전체 로그아웃</button></header><div><i /><span><strong>Chrome / MacOS</strong><small>서울 · 2026-07-15 10:32</small></span><b>현재</b></div><div><i /><span><strong>Safari / iPhone</strong><small>서울 · 2026-07-14 18:20</small></span></div></article>
    </template>

    <template v-else-if="route.name === 'dataManagement'">
      <article class="accounts card"><header><h2>마이데이터 연결</h2><button>⟳ 새로고침</button></header><div v-for="account in [['KB국민은행 입출금','****-****-2847 · 320만원'],['KB국민은행 적금','****-****-5931 · 150만원'],['KB국민카드','****-****-4821 · 30만원']]" :key="account[0]"><i>▭</i><span><strong>{{ account[0] }}</strong><small>{{ account[1] }}<br />갱신: 2026-07-15 10:32</small></span><button>해제</button></div><button class="add-account">＋ 계좌 추가 연결</button></article>
      <article class="delete-data"><h2>⚠ 전체 데이터 삭제</h2><p>모든 거래 내역과 시뮬레이션 데이터가 영구 삭제됩니다.</p><button>데이터 전체 삭제</button></article>
    </template>

    <template v-else>
      <article class="withdraw-warning card"><span>주의</span><h2>계정과 모든 기록이 삭제돼요.</h2><p>거래 내역, 시뮬레이션 및 리워드 데이터가 삭제됩니다.<br />일부 정보는 법령상 보관 기준에 따라 처리돼요.</p></article>
      <form class="withdraw-form"><label><span>비밀번호를 다시 입력해주세요</span><input v-model="form.password" type="password" /></label><label><span>탈퇴 사유 (선택)</span><select v-model="form.reason"><option>서비스가 기대와 달랐어요</option><option>더 이상 사용하지 않아요</option></select></label><button>회원 탈퇴</button><small>탈퇴 후에는 같은 계정으로 바로 복구할 수 없어요.</small></form>
    </template>
  </section>
</template>

<style scoped>
.detail-back { color: #666; font-size: 14px; font-weight: 800; }
.detail-page > h1 { margin-top: 28px; color: var(--primary); font-size: 22px; }
.detail-page > p { color: #777; font-size: 10px; }
.identity { display: flex; align-items: center; gap: 18px; margin: 15px 0 20px; color: var(--primary); }
.identity strong { font-size: 16px; }.identity button { font-size: 15px; }
.info-note { padding: 17px; border: 1px solid var(--border); border-radius: 11px; color: var(--success); font-size: 9px; }
.detail-form { display: grid; gap: 8px; margin-top: 16px; padding: 18px; border: 1px solid var(--border); border-radius: 12px; }
.detail-form label, .security-card label, .withdraw-form label { display: grid; gap: 5px; color: var(--primary); font-size: 9px; font-weight: 800; }
.detail-form input, .detail-form select, .security-card input, .withdraw-form input, .withdraw-form select { width: 100%; height: 42px; padding: 0 14px; border-radius: 9px; background: #fff9df; color: var(--primary); font-size: 10px; }
.verify-form label > div { display: grid; grid-template-columns: 1fr 70px; gap: 10px; }
.verify-form label button { border-radius: 999px; background: var(--accent); font-size: 9px; font-weight: 800; }
.save-detail { width: 100%; min-height: 42px; margin-top: 15px; border-radius: 9px; background: var(--accent); font-size: 10px; font-weight: 800; }
.job-form { margin-top: 25px; }.job-form .save-detail { margin-top: 4px; }
.toggle-card, .toggle-list, .security-card, .devices, .accounts { margin-top: 20px; padding: 18px; }
.toggle-card, .toggle-list label { display: flex; align-items: center; justify-content: space-between; }
.toggle-card span, .toggle-list span { display: grid; gap: 3px; }
.toggle-card strong, .toggle-list strong, .security-card h2, .devices h2, .accounts h2 { color: var(--primary); font-size: 13px; }
.toggle-card small, .toggle-list small { color: #777; font-size: 8px; }
.toggle-card input, .toggle-list input { width: 40px; height: 22px; accent-color: var(--primary); }
.toggle-list label { min-height: 57px; border-bottom: 1px solid var(--border); }
.security-card { display: grid; gap: 12px; }
.devices header, .accounts header { display: flex; justify-content: space-between; }
.devices header button { color: var(--danger); font-size: 9px; }
.devices > div, .accounts > div { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 10px; min-height: 58px; }
.devices span, .accounts span { display: grid; gap: 3px; }
.devices strong, .accounts strong { color: var(--primary); font-size: 10px; }
.devices small, .accounts small { color: #777; font-size: 8px; }
.devices b { padding: 4px 10px; border-radius: 999px; background: var(--primary-soft); color: var(--primary); font-size: 8px; }
.accounts > div { border-bottom: 1px solid var(--border); }.accounts > div > button { color: var(--danger); font-size: 8px; }
.add-account { width: 100%; padding-top: 16px; color: #555; font-size: 10px; }
.delete-data { margin-top: 20px; padding: 20px; border: 1px solid #ffabab; border-radius: 12px; background: var(--danger-soft); color: var(--danger); }
.delete-data h2 { font-size: 13px; }.delete-data p { margin-top: 5px; font-size: 8px; }.delete-data button { margin-top: 16px; font-size: 9px; font-weight: 800; }
.withdraw-warning { margin-top: 25px; padding: 24px; }.withdraw-warning > span { padding: 5px 12px; border-radius: 999px; background: var(--danger-soft); color: var(--danger); font-size: 8px; }
.withdraw-warning h2 { margin-top: 13px; color: var(--primary); font-size: 17px; }.withdraw-warning p { margin-top: 7px; color: #777; font-size: 9px; }
.withdraw-form { display: grid; gap: 16px; margin-top: 28px; }.withdraw-form button { min-height: 45px; border-radius: 9px; background: #f27673; color: white; font-size: 10px; font-weight: 800; }.withdraw-form small { color: #777; text-align: center; font-size: 8px; }

@media (max-width: 767px) {
  .detail-page > h1 { margin-top: 18px; font-size: 18px; }
  .detail-form, .toggle-card, .toggle-list, .security-card, .devices, .accounts { padding: 14px; }
}
</style>
