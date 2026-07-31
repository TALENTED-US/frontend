<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useSessionStore } from '@/stores/session'
import profileImage from '@/assets/images/mypage/buttie-profile.png'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const details = {
  myInfo: ['내 정보', '개인정보를 확인하고 수정해요'],
  jobInfo: ['취업 준비 정보 관리', '정확한 추천과 준비 기간 계산에 사용돼요.'],
  notificationSettings: ['알림 설정', '정책과 재정 변화 알림을 관리해요.'],
  security: ['비밀번호·보안', '비밀번호와 로그인 기기를 관리해요.'],
  dataManagement: ['데이터 관리', '금융 연결과 저장 데이터를 관리해요.'],
  withdraw: ['회원 탈퇴', '탈퇴 전 꼭 확인해주세요'],
}

const info = computed(() => details[route.name] || details.myInfo)
const nicknameEditing = ref(false)
const nicknameDraft = ref(session.displayName)
const profileMessage = ref('')
const dataRefreshMessage = ref('')
const withdrawError = ref('')
const withdrawVerified = ref(false)
const notificationSettings = reactive({
  all: true,
  policy: true,
  finance: true,
  plan: true,
  notice: true,
})

const regions = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
]

const form = reactive({
  name: session.currentUser.name,
  birth: session.currentUser.birth,
  phone: session.currentUser.phone,
  email: session.currentUser.email,
  jobType: session.currentUser.jobType,
  start: session.currentUser.startDate,
  goal: session.currentUser.goalDate,
  region: session.currentUser.region,
  family: session.currentUser.family,
  password: '',
})

const notificationRows = [
  ['policy', '정책 마감', '신청 가능한 정책 마감 안내'],
  ['finance', '재정 변화', '큰 수입·지출 감지 시 알림'],
  ['plan', '계획 이탈', '월 예산 초과 감지 시 알림'],
  ['notice', '서비스 공지', '업데이트·이벤트 소식'],
]

const accounts = [
  { type: '계좌', name: 'KB국민은행 입출금', number: '****-****-2847', amount: '320만원' },
  { type: '계좌', name: 'KB국민은행 적금', number: '****-****-5931', amount: '150만원' },
  { type: '계좌', name: '신한은행 입출금', number: '****-****-7702', amount: '' },
  { type: '카드', name: 'KB국민카드', number: '****-****-4821', amount: '' },
]

function startNicknameEdit() {
  nicknameDraft.value = session.displayName
  nicknameEditing.value = true
  profileMessage.value = ''
}

function saveProfile() {
  const nickname = nicknameDraft.value.trim()
  if (nickname.length < 2 || nickname.length > 10) {
    profileMessage.value = '닉네임은 2~10자로 입력해 주세요.'
    return
  }

  session.updateProfile({ nickname, phone: form.phone, email: form.email })
  nicknameEditing.value = false
  profileMessage.value = '수정한 정보가 저장되었습니다.'
  router.push('/mypage')
}

function saveJobProfile() {
  session.updateProfile({
    jobType: form.jobType,
    startDate: form.start,
    goalDate: form.goal,
    region: form.region,
    family: Number(form.family),
  })
  router.push('/mypage')
}

function formatDateTime(value) {
  if (!value) return '기록 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\.$/, '')
}

function refreshMyData() {
  session.refreshMyData()
  dataRefreshMessage.value = `마이데이터를 ${formatDateTime(session.myDataLastUpdated)}에 갱신했습니다.`
}

function resetWithdrawVerification() {
  withdrawVerified.value = false
  withdrawError.value = ''
}

function verifyWithdrawalPassword() {
  if (!session.verifyCurrentPassword(form.password)) {
    withdrawVerified.value = false
    withdrawError.value = '인증 실패: 비밀번호가 일치하지 않습니다.'
    return
  }

  withdrawError.value = ''
  withdrawVerified.value = true
}

function withdrawAccount() {
  if (!withdrawVerified.value) return
  session.logout()
  router.replace('/auth/login')
}

function logout() {
  session.logout()
  router.replace('/auth/login')
}

function setAllNotifications(value) {
  Object.keys(notificationSettings).forEach((key) => {
    notificationSettings[key] = value
  })
}
</script>

<template>
  <section class="page detail-page">
    <button class="detail-back desktop-only" type="button" @click="router.push('/mypage')">
      ‹ 마이페이지
    </button>
    <h1 class="desktop-only">{{ info[0] }}</h1>
    <p class="desktop-only detail-description">{{ info[1] }}</p>
    <h1 class="mobile-only mobile-section-title">{{ info[0] }}</h1>

    <template v-if="route.name === 'myInfo'">
      <div class="identity-row">
        <div class="detail-avatar">
          <span><img :src="profileImage" alt="버티 프로필" /></span><b>5</b>
        </div>
        <div class="nickname-control">
          <input
            v-if="nicknameEditing"
            v-model="nicknameDraft"
            maxlength="10"
            aria-label="닉네임"
            @keyup.enter="saveProfile"
          />
          <strong v-else>{{ session.displayName }}</strong>
          <button
            type="button"
            :aria-label="nicknameEditing ? '닉네임 수정 취소' : '닉네임 수정'"
            @click="nicknameEditing ? (nicknameEditing = false) : startNicknameEdit()"
          >
            {{ nicknameEditing ? '취소' : '✎' }}
          </button>
        </div>
      </div>

      <article class="form-card readonly-card">
        <p class="info-note">✓ 이름·생년월일은 본인인증 정보로 변경할 수 없어요.</p>
        <label><span>이름</span><input v-model="form.name" disabled /></label>
        <label><span>생년월일</span><input v-model="form.birth" disabled /></label>
      </article>

      <article class="form-card contact-card">
        <label>
          <span>휴대폰 번호</span>
          <div class="verify-row">
            <input v-model="form.phone" /><button type="button">인증</button>
          </div>
        </label>
        <label>
          <span>이메일</span>
          <div class="verify-row">
            <input v-model="form.email" /><button type="button">인증</button>
          </div>
        </label>
      </article>

      <p v-if="profileMessage" class="save-message" aria-live="polite">{{ profileMessage }}</p>
      <button class="primary-action" type="button" @click="saveProfile">저장하기</button>
      <button class="info-logout desktop-only" type="button" @click="logout">로그아웃</button>
      <button
        class="info-withdraw desktop-only"
        type="button"
        @click="router.push('/mypage/withdraw')"
      >
        <AppIcon name="trash" :size="19" /> 회원탈퇴
      </button>
    </template>

    <template v-else-if="route.name === 'jobInfo'">
      <article class="job-card">
        <fieldset>
          <legend>취업 준비 유형</legend>
          <div class="segmented-control">
            <button
              :class="{ active: form.jobType === 'first' }"
              type="button"
              @click="form.jobType = 'first'"
            >
              첫취업
            </button>
            <button
              :class="{ active: form.jobType === 'again' }"
              type="button"
              @click="form.jobType = 'again'"
            >
              재취업
            </button>
          </div>
        </fieldset>
        <label><span>준비 시작일</span><input v-model="form.start" type="date" /></label>
        <label><span>목표 취업일</span><input v-model="form.goal" type="date" /></label>
        <label>
          <span>거주지</span>
          <select v-model="form.region">
            <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
          </select>
        </label>
        <label>
          <span>세대원 수</span>
          <input
            v-model.number="form.family"
            type="number"
            min="1"
            max="99"
            inputmode="numeric"
          />
        </label>
        <button class="primary-action" type="button" @click="saveJobProfile">저장하기</button>
      </article>
    </template>

    <template v-else-if="route.name === 'notificationSettings'">
      <label class="toggle-card">
        <span><strong>전체 알림</strong><small>모든 알림을 한번에 켜고 끕니다</small></span>
        <input
          v-model="notificationSettings.all"
          type="checkbox"
          @change="setAllNotifications(notificationSettings.all)"
        />
      </label>
      <article class="toggle-list">
        <p class="mobile-only toggle-list__caption">알림 유형</p>
        <label v-for="row in notificationRows" :key="row[0]">
          <span
            ><strong>{{ row[1] }}</strong
            ><small>{{ row[2] }}</small></span
          >
          <input v-model="notificationSettings[row[0]]" type="checkbox" />
        </label>
      </article>
    </template>

    <template v-else-if="route.name === 'security'">
      <article class="security-card">
        <h2>비밀번호 변경</h2>
        <button
          class="password-button"
          type="button"
          @click="router.push('/mypage/security/password/verify')"
        >
          비밀번호 변경하기
        </button>
      </article>
      <label class="toggle-card two-factor desktop-only">
        <span
          ><strong>2단계 인증</strong><small>로그인 시 인증번호를 추가로 입력합니다</small></span
        >
        <input type="checkbox" />
      </label>
      <article class="devices-card">
        <header>
          <h2>최근 로그인 기기</h2>
          <button type="button">전체 로그아웃</button>
        </header>
        <div class="device-row">
          <i /><span><strong>Chrome / MacOS</strong><small>서울 · 2026-07-15 10:32</small></span
          ><b>현재</b>
        </div>
        <div class="device-row">
          <i /><span><strong>Safari / iPhone</strong><small>서울 · 2026-07-14 18:20</small></span>
        </div>
      </article>
    </template>

    <template v-else-if="route.name === 'dataManagement'">
      <article class="accounts-card">
        <header>
          <h2>마이데이터 연결</h2>
          <button type="button" @click="refreshMyData">⟳ 새로고침</button>
        </header>
        <p class="account-count">계좌 · 3</p>
        <template v-for="(account, index) in accounts" :key="account.name">
          <p v-if="index === 3" class="account-count">카드 · 1</p>
          <div class="account-row">
            <i><AppIcon :name="account.type === '카드' ? 'wallet' : 'briefcase'" :size="17" /></i>
            <span>
              <strong>{{ account.name }}</strong>
              <small
                >{{ account.number
                }}<template v-if="account.amount"> · {{ account.amount }}</template
                ><br />갱신: {{ formatDateTime(session.myDataLastUpdated) }}</small
              >
            </span>
            <button type="button">해제</button>
          </div>
          <button v-if="index === 2" class="add-account" type="button">＋ 계좌 추가 연결</button>
        </template>
        <button class="add-account" type="button">＋ 카드 추가 연결</button>
        <p v-if="dataRefreshMessage" class="refresh-status" aria-live="polite">
          {{ dataRefreshMessage }}
        </p>
      </article>
      <article class="delete-data desktop-only">
        <h2>⚠ 전체 데이터 삭제</h2>
        <p>모든 거래 내역, 시뮬레이션, 저장 데이터가 영구 삭제됩니다.</p>
        <button type="button">데이터 전체 삭제</button>
      </article>
    </template>

    <template v-else>
      <article class="withdraw-warning">
        <span>주의</span>
        <h2>계정과 모든 기록이 삭제돼요.</h2>
        <p>거래 내역과 시뮬레이션 데이터가 삭제됩니다.</p>
        <small>일부 정보는 법령상 보관 기준에 따라 처리돼요.</small>
      </article>
      <label class="withdraw-password"
        ><span>비밀번호를 다시 입력해주세요</span
        ><div class="withdraw-password__row">
          <input
            v-model="form.password"
            type="password"
            placeholder="비밀번호 입력"
            autocomplete="current-password"
            :aria-invalid="Boolean(withdrawError)"
            @input="resetWithdrawVerification"
            @keyup.enter="verifyWithdrawalPassword"
          />
          <button type="button" :disabled="!form.password" @click="verifyWithdrawalPassword">
            인증하기
          </button>
        </div></label
      >
      <p v-if="withdrawError" class="withdraw-error" role="alert">{{ withdrawError }}</p>
      <p v-if="withdrawVerified" class="withdraw-success" aria-live="polite">
        비밀번호 인증에 성공했습니다.
      </p>
      <div class="withdraw-character">
        <img :src="profileImage" alt="" />
        <h2>버티 키우러 돌아갈까요?</h2>
        <p>지금까지 쌓은 취준 기록이 사라져요</p>
      </div>
      <button class="primary-action" type="button" @click="router.push('/')">
        홈으로 돌아가기
      </button>
      <button
        v-if="withdrawVerified"
        class="withdraw-confirm"
        type="button"
        @click="withdrawAccount"
      >
        그래도 탈퇴할게요
      </button>
    </template>
  </section>
</template>

<style scoped>
.detail-back {
  color: #666;
  font-size: 20px;
  font-weight: 800;
}
.detail-page > h1.desktop-only {
  margin-top: 26px;
  font-size: 22px;
}
.detail-description {
  margin-top: 2px;
  color: #777;
  font-size: 12px;
}
.mobile-section-title {
  padding: 12px 15px;
  border: 1px solid #e2e3e8;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 2px 4px rgb(15 23 42 / 12%);
  font-size: 14px;
}

.identity-row {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 12px 0 16px;
}
.detail-avatar {
  position: relative;
  width: 72px;
}
.detail-avatar > span {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: #ffefac;
}
.detail-avatar img {
  width: 58px;
  height: 58px;
  object-fit: cover;
}
.detail-avatar b {
  position: absolute;
  right: 0;
  bottom: -3px;
  display: grid;
  width: 23px;
  height: 23px;
  place-items: center;
  border-radius: 50%;
  background: #49362c;
  color: #fff;
  font-size: 9px;
}
.nickname-control {
  display: flex;
  align-items: center;
  gap: 9px;
}
.nickname-control strong {
  color: #0a1680;
  font-size: 18px;
}
.nickname-control input {
  width: 190px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #93b2f8;
  border-radius: 10px;
  background: white;
}
.nickname-control button {
  color: #666;
  font-size: 16px;
}

.form-card,
.job-card,
.toggle-card,
.toggle-list,
.security-card,
.devices-card,
.accounts-card,
.withdraw-warning {
  border: 1px solid #e2e3e8;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 4px rgb(15 23 42 / 12%);
}

.form-card {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 20px 22px;
}
.readonly-card {
  grid-template-columns: minmax(0, 560px);
}
.info-note {
  grid-column: 1 / -1;
  margin-bottom: 5px;
  color: #52d2a1;
  font-size: 12px;
}
.form-card label,
.job-card label,
.withdraw-password {
  display: grid;
  gap: 5px;
  color: #555;
  font-size: 12px;
  font-weight: 800;
}
.form-card input,
.job-card input,
.job-card select,
.withdraw-password input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #ececef;
  border-radius: 12px;
  background: white;
  box-shadow: 0 3px 4px rgb(15 23 42 / 10%);
  color: #222;
  font-size: 14px;
}
.form-card input:disabled {
  color: #8b8d97;
  background: #fff;
  opacity: 1;
}
.contact-card label {
  max-width: 820px;
}
.verify-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px;
  gap: 12px;
}
.verify-row button {
  border-radius: 999px;
  background: #fff1b9;
  font-weight: 800;
}
.primary-action {
  width: 100%;
  min-height: 54px;
  margin-top: 22px;
  border-radius: 13px;
  background: #ffeca4;
  box-shadow: 0 3px 4px rgb(15 23 42 / 12%);
  font-size: 16px;
  font-weight: 800;
}
.save-message {
  margin: 12px 3px -10px;
  color: #0f9d66;
  font-size: 12px;
}
.info-logout,
.info-withdraw {
  width: 100%;
  min-height: 56px;
  margin-top: 14px;
  border: 1px solid #e2e3e8;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 4px rgb(15 23 42 / 10%);
  font-size: 15px;
  font-weight: 800;
}
.job-card select {
  appearance: none;
  padding-right: 58px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='8' viewBox='0 0 14 8'%3E%3Cpath d='m1 1 6 6 6-6' fill='none' stroke='%23222' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 28px center;
  background-size: 12px 7px;
}

.info-logout {
  color: #666;
}

.info-withdraw {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-color: #ffaaa9;
  color: #f0574f;
}

.job-card {
  display: grid;
  gap: 15px;
  margin-top: 24px;
  padding: 24px;
}
.job-card fieldset {
  border: 0;
}
.job-card legend {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
}
.segmented-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.segmented-control button {
  min-height: 48px;
  border: 1px solid #e2e3e8;
  border-radius: 12px;
  background: white;
  box-shadow: 0 3px 4px rgb(15 23 42 / 10%);
  font-weight: 800;
}
.segmented-control button.active {
  border-color: #f1b94c;
  background: #ffefac;
}
.job-card .primary-action {
  margin-top: 4px;
}

.toggle-card {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding: 14px 20px;
}
.toggle-card span,
.toggle-list label > span {
  display: grid;
  gap: 2px;
}
.toggle-card strong,
.toggle-list strong {
  font-size: 14px;
}
.toggle-card small,
.toggle-list small {
  color: #777;
  font-size: 10px;
}
.toggle-card input,
.toggle-list input {
  position: relative;
  width: 43px;
  height: 24px;
  appearance: none;
  border-radius: 999px;
  background: #d9d9d9;
  cursor: pointer;
  transition: background 0.2s;
}
.toggle-card input::after,
.toggle-list input::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgb(0 0 0 / 20%);
  content: '';
  transition: transform 0.2s;
}
.toggle-card input:checked,
.toggle-list input:checked {
  background: #4d352a;
}
.toggle-card input:checked::after,
.toggle-list input:checked::after {
  transform: translateX(19px);
}
.toggle-list {
  margin-top: 16px;
  padding: 0 20px;
}
.toggle-list label {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e5e5;
}
.toggle-list label:last-child {
  border-bottom: 0;
}
.toggle-list__caption {
  padding-top: 12px;
  color: #777;
  font-size: 10px;
}

.security-card,
.devices-card {
  margin-top: 20px;
  padding: 20px;
}
.security-card h2,
.devices-card h2,
.accounts-card h2 {
  font-size: 15px;
}
.password-button {
  width: 100%;
  min-height: 50px;
  margin-top: 38px;
  border-radius: 14px;
  background: #e7e7e7;
  box-shadow: 0 3px 4px rgb(15 23 42 / 10%);
  font-weight: 800;
}
.security-card {
  min-height: 176px;
}
.two-factor {
  margin-top: 18px;
}
.devices-card header,
.accounts-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.devices-card header button,
.accounts-card header button {
  color: #ff5e61;
  font-size: 11px;
}
.device-row,
.account-row {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  border-bottom: 1px solid #e6e6e6;
}
.device-row:last-child {
  border-bottom: 0;
}
.device-row i {
  width: 16px;
  height: 16px;
  border: 1px solid #9aa3b2;
  border-radius: 2px;
}
.device-row span,
.account-row span {
  display: grid;
}
.device-row strong,
.account-row strong {
  font-size: 13px;
}
.device-row small,
.account-row small {
  color: #777;
  font-size: 10px;
}
.device-row b {
  padding: 3px 9px;
  border-radius: 999px;
  background: #def7e8;
  color: #15925f;
  font-size: 9px;
}

.accounts-card {
  margin-top: 20px;
  padding: 22px 24px;
}
.accounts-card header button {
  color: #666;
}
.refresh-status {
  margin-top: 14px;
  color: #16986a;
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}
.account-count {
  margin-top: 13px;
  color: #888;
  font-size: 10px;
}
.account-row i {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 8px;
  background: #eef2ff;
  color: #0a1680;
}
.account-row {
  grid-template-columns: 32px 1fr auto;
}
.account-row > button {
  color: #ff5e61;
  font-size: 11px;
}
.add-account {
  width: 100%;
  min-height: 42px;
  color: #555;
  font-size: 12px;
  font-weight: 700;
}
.delete-data {
  margin-top: 20px;
  padding: 22px;
  border: 1px solid #ffaaa9;
  border-radius: 16px;
  background: #fff0f1;
  color: #ff5e61;
}
.delete-data h2 {
  font-size: 15px;
}
.delete-data p {
  margin-top: 4px;
  font-size: 10px;
}
.delete-data button {
  margin-top: 18px;
  font-size: 11px;
  font-weight: 800;
}

.withdraw-warning {
  margin-top: 26px;
  padding: 30px;
}
.withdraw-warning > span {
  display: inline-block;
  padding: 5px 15px;
  border-radius: 999px;
  background: #fff0f1;
  color: #f0574f;
  font-size: 10px;
}
.withdraw-warning h2 {
  margin-top: 14px;
  font-size: 18px;
}
.withdraw-warning p,
.withdraw-warning small {
  display: block;
  margin-top: 6px;
  color: #777;
  font-size: 10px;
}
.withdraw-password {
  margin-top: 20px;
}
.withdraw-password__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 108px;
  gap: 10px;
}
.withdraw-password__row button {
  border-radius: 12px;
  background: var(--accent);
  color: #262626;
  font-size: 13px;
  font-weight: 800;
}
.withdraw-password__row button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.withdraw-password input[aria-invalid='true'] {
  border-color: #f0574f;
}
.withdraw-error,
.withdraw-success {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 700;
}
.withdraw-error {
  color: #e5484d;
}
.withdraw-success {
  color: #16986a;
}
.withdraw-character {
  margin-top: 24px;
  text-align: center;
}
.withdraw-character img {
  width: 100px;
  height: 76px;
  margin: 0 auto;
  object-fit: contain;
  filter: grayscale(0.35);
}
.withdraw-character h2 {
  margin-top: 8px;
  font-size: 17px;
}
.withdraw-character p {
  margin-top: 4px;
  color: #777;
  font-size: 11px;
}
.withdraw-confirm {
  display: block;
  margin: 18px auto 0;
  color: #727b8c;
  text-decoration: underline;
  font-size: 14px;
  font-weight: 700;
}

@media (min-width: 768px) {
  .detail-page {
    max-width: 1036px;
  }
  .identity-row {
    margin-top: 8px;
  }
  .readonly-card {
    margin-top: 0;
  }
  .form-card {
    padding: 22px;
  }
  .contact-card {
    margin-top: 18px;
  }
  .job-card {
    max-width: none;
  }
}

@media (max-width: 767px) {
  .detail-page {
    padding-bottom: 18px;
  }
  .mobile-section-title {
    margin-bottom: 12px;
  }
  .identity-row {
    margin: 8px 8px 16px;
  }
  .detail-avatar {
    width: 66px;
  }
  .detail-avatar > span {
    width: 66px;
    height: 66px;
  }
  .detail-avatar img {
    width: 53px;
    height: 53px;
  }
  .nickname-control strong {
    color: #222;
    font-size: 14px;
  }
  .nickname-control input {
    width: 170px;
    height: 38px;
  }
  .nickname-control button {
    font-size: 14px;
  }
  .form-card {
    gap: 9px;
    margin-top: 14px;
    padding: 16px 18px;
    border-radius: 17px;
  }
  .info-note {
    font-size: 11px;
  }
  .form-card input,
  .job-card input,
  .job-card select {
    height: 43px;
    border-radius: 22px;
  }
  .form-card label,
  .job-card label {
    font-size: 11px;
  }
  .job-card select {
    padding-right: 48px;
    background-position: right 22px center;
  }
  .verify-row {
    grid-template-columns: minmax(0, 1fr) 48px;
    gap: 8px;
  }
  .verify-row button {
    font-size: 11px;
  }
  .primary-action {
    min-height: 49px;
    margin-top: 16px;
    border-radius: 18px;
    font-size: 14px;
  }
  .save-message {
    font-size: 10px;
  }
  .job-card {
    gap: 15px;
    margin-top: 0;
    padding: 18px 14px 26px;
    border-radius: 17px;
  }
  .segmented-control {
    gap: 8px;
  }
  .segmented-control button {
    min-height: 43px;
    border-radius: 12px;
    font-size: 13px;
  }
  .toggle-card {
    min-height: 62px;
    margin-top: 0;
    padding: 13px 16px;
    border-radius: 17px;
  }
  .toggle-list {
    margin-top: 13px;
    padding: 0 16px;
    border-radius: 17px;
  }
  .toggle-list label {
    min-height: 59px;
  }
  .toggle-card strong,
  .toggle-list strong {
    font-size: 13px;
  }
  .toggle-card small,
  .toggle-list small {
    font-size: 10px;
  }
  .security-card,
  .devices-card {
    margin-top: 0;
    padding: 20px;
    border-radius: 17px;
  }
  .security-card {
    min-height: 108px;
  }
  .password-button {
    min-height: 44px;
    margin-top: 25px;
    border-radius: 22px;
    font-size: 12px;
  }
  .devices-card {
    margin-top: 14px;
  }
  .devices-card h2 {
    font-size: 14px;
  }
  .device-row {
    min-height: 65px;
  }
  .accounts-card {
    margin-top: 0;
    padding: 18px 16px;
    border-radius: 17px;
  }
  .account-row {
    min-height: 68px;
  }
  .account-row strong {
    font-size: 12px;
  }
  .account-row small {
    font-size: 9px;
  }
  .withdraw-warning {
    margin-top: 10px;
    padding: 18px;
    border-radius: 17px;
  }
  .withdraw-warning h2 {
    font-size: 16px;
  }
  .withdraw-password {
    margin-top: 20px;
    font-size: 11px;
  }
  .withdraw-password input {
    height: 48px;
    border-radius: 14px;
  }
  .withdraw-password__row {
    grid-template-columns: minmax(0, 1fr) 90px;
    gap: 8px;
  }
  .withdraw-password__row button {
    border-radius: 14px;
    font-size: 11px;
  }
  .withdraw-confirm {
    font-size: 13px;
  }
  .withdraw-character {
    margin-top: 40px;
  }
}
</style>
