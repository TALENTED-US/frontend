<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ButtieImage from '@/components/ui/ButtieImage.vue'
import { getNotificationSettingsApi, updateNotificationSettingsApi } from '@/api/notifications'
import { clearTransactions, loadTransactions } from '@/features/finance/financeStore'
import {
  disconnectMyDataAsset,
  loadMyDataCatalog,
  selectedMyDataAccounts,
  selectedMyDataCards,
  syncMyData,
} from '@/features/mydata/mydataStore'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { useSessionStore } from '@/stores/session'
import { useProgressionStore } from '@/stores/progression'
import { getButtieLevelImage } from '@/data/buttieLevelAssets'
import profileImage from '@/assets/images/mypage/buttie-profile.png'
import { enableDeviceNotifications } from '@/features/notification/notificationService'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const progression = useProgressionStore()
const simulation = useSimulationStore()
const profileExp = computed(() => Number(session.currentUser.exp ?? progression.exp))
const profileRequiredExp = computed(() =>
  Number(session.currentUser.requiredExp ?? progression.nextLevelExp),
)
const profileLevel = computed(() => Number(session.currentUser.level ?? progression.level))

const fallbackProfileImage = computed(() => {
  const apiRisk = session.currentUser.riskLevel
  const key =
    apiRisk === 'DANGER'
      ? 'danger'
      : apiRisk === 'CAUTION'
        ? 'caution'
        : apiRisk === 'STABLE'
          ? 'stable'
          : simulation.currentStatus?.key
  if (key === 'danger' || key === 'risk') return getButtieLevelImage(profileLevel.value, 'danger')
  if (key === 'caution') return getButtieLevelImage(profileLevel.value, 'caution')
  return getButtieLevelImage(profileLevel.value, 'stable')
})
const profileState = computed(
  () => session.currentUser.buttieImageUrl || fallbackProfileImage.value,
)

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
const profileMessageError = ref(false)
const profileSaving = ref(false)
const dataRefreshMessage = ref('')
const dataLoading = ref(false)
const disconnectingAssetId = ref('')
const notificationSettingsLoading = ref(false)
const notificationSettingsError = ref('')
const withdrawError = ref('')
const withdrawVerified = ref(false)
const withdrawSubmitting = ref(false)
const notificationDefaults = {
  all: true,
  policy: true,
  finance: true,
  plan: true,
  notice: true,
}
let savedNotificationSettings = {}
try {
  savedNotificationSettings = JSON.parse(localStorage.getItem('buttie-notification-settings')) || {}
} catch {}
const notificationSettings = reactive({
  ...notificationDefaults,
  ...savedNotificationSettings,
})
const twoFactorEnabled = ref(localStorage.getItem('buttie-two-factor') === 'true')

onMounted(async () => {
  const focusTarget = route.query.focus
  if (!['goal-date', 'risk-amount'].includes(focusTarget)) return
  await nextTick()
  document
    .getElementById(`${focusTarget}-field`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
  financialRiskAlertAmount: Number(session.currentUser.financialRiskAlertAmount) || 600000,
  password: '',
})

const notificationRows = [
  ['policy', '정책 마감', '신청 가능한 정책 마감 안내'],
  ['finance', '재정 변화', '큰 수입·지출 감지 시 알림'],
  ['plan', '계획 이탈', '월 예산 초과 감지 시 알림'],
  ['notice', '서비스 공지', '업데이트·이벤트 소식'],
]

const defaultAccounts = [
  { type: '계좌', name: 'KB국민은행 입출금', number: '****-****-2847', amount: '320만원' },
  { type: '계좌', name: 'KB국민은행 적금', number: '****-****-5931', amount: '150만원' },
  { type: '계좌', name: '신한은행 입출금', number: '****-****-7702', amount: '' },
  { type: '카드', name: 'KB국민카드', number: '****-****-4821', amount: '' },
]
let savedAccounts = null
try {
  savedAccounts = JSON.parse(localStorage.getItem('buttie-linked-accounts'))
} catch {}
const accounts = ref(
  session.isMockMode ? (Array.isArray(savedAccounts) ? savedAccounts : defaultAccounts) : [],
)
const accountGroups = computed(() =>
  ['계좌', '카드'].map((type) => ({
    type,
    rows: accounts.value.filter((account) => account.type === type),
  })),
)

watch(
  notificationSettings,
  (value) => {
    if (session.isMockMode) {
      localStorage.setItem('buttie-notification-settings', JSON.stringify(value))
    }
  },
  { deep: true },
)
watch(twoFactorEnabled, (value) => localStorage.setItem('buttie-two-factor', String(value)))
if (session.isMockMode) {
  watch(
    accounts,
    (value) => localStorage.setItem('buttie-linked-accounts', JSON.stringify(value)),
    {
      deep: true,
    },
  )
}

watch(
  () => route.name,
  (name) => {
    if (name === 'dataManagement' && !session.isMockMode) loadLinkedAssets()
    if (name === 'notificationSettings' && !session.isMockMode) loadNotificationSettings()
  },
  { immediate: true },
)

function applyNotificationSettings(settings = {}) {
  notificationSettings.policy = Boolean(settings.policyDeadlineEnabled)
  notificationSettings.finance = Boolean(settings.financialChangeEnabled)
  notificationSettings.plan = Boolean(settings.planDeviationEnabled)
  notificationSettings.notice = Boolean(settings.serviceNoticeEnabled)
  notificationSettings.all = notificationRows.every(([key]) => notificationSettings[key])
}

function notificationSettingsPayload() {
  return {
    policyDeadlineEnabled: notificationSettings.policy,
    financialChangeEnabled: notificationSettings.finance,
    planDeviationEnabled: notificationSettings.plan,
    serviceNoticeEnabled: notificationSettings.notice,
  }
}

async function loadNotificationSettings() {
  notificationSettingsLoading.value = true
  notificationSettingsError.value = ''
  try {
    applyNotificationSettings(await getNotificationSettingsApi())
  } catch (error) {
    notificationSettingsError.value = error.message || '알림 설정을 불러오지 못했습니다.'
  } finally {
    notificationSettingsLoading.value = false
  }
}

async function saveNotificationSettings(previousSettings) {
  if (session.isMockMode) return true

  notificationSettingsLoading.value = true
  notificationSettingsError.value = ''
  try {
    await updateNotificationSettingsApi(notificationSettingsPayload())
    return true
  } catch (error) {
    Object.assign(notificationSettings, previousSettings)
    notificationSettingsError.value = error.message || '알림 설정을 저장하지 못했습니다.'
    return false
  } finally {
    notificationSettingsLoading.value = false
  }
}

function mapLinkedAssets() {
  accounts.value = [
    ...selectedMyDataAccounts.value.map((account) => ({
      id: String(account.accountId),
      assetType: 'ACCOUNT',
      type: '계좌',
      name: `${account.institutionName} ${account.accountName}`.trim(),
      number: account.accountNumberMasked,
      amount: `${Number(account.balance || 0).toLocaleString()}원`,
    })),
    ...selectedMyDataCards.value.map((card) => ({
      id: String(card.cardId),
      assetType: 'CARD',
      type: '카드',
      name: `${card.institutionName} ${card.cardName}`.trim(),
      number: card.cardNumberMasked,
      amount: '',
    })),
  ]
}

async function loadLinkedAssets() {
  dataLoading.value = true
  dataRefreshMessage.value = ''
  try {
    await loadMyDataCatalog()
    mapLinkedAssets()
  } catch (error) {
    dataRefreshMessage.value = error.message || '연결된 마이데이터 자산을 불러오지 못했습니다.'
  } finally {
    dataLoading.value = false
  }
}

function startNicknameEdit() {
  nicknameDraft.value = session.displayName
  nicknameEditing.value = true
  profileMessage.value = ''
}

async function saveProfile() {
  const nickname = nicknameDraft.value.trim()
  if (nickname.length < 2 || nickname.length > 10) {
    profileMessageError.value = true
    profileMessage.value = '닉네임은 2~10자로 입력해 주세요.'
    return
  }

  profileSaving.value = true
  profileMessageError.value = false
  profileMessage.value = ''
  try {
    await session.saveNickname(nickname)
    nicknameEditing.value = false
    profileMessage.value = '수정한 정보가 저장되었습니다.'
    router.push('/mypage')
  } catch (error) {
    profileMessageError.value = true
    profileMessage.value = error.message || '닉네임을 저장하지 못했습니다.'
  } finally {
    profileSaving.value = false
  }
}

async function saveJobProfile() {
  if (!form.start || !form.goal || form.start > form.goal) {
    profileMessageError.value = true
    profileMessage.value = '목표 취업일은 준비 시작일 이후로 설정해 주세요.'
    return
  }

  profileSaving.value = true
  profileMessageError.value = false
  profileMessage.value = ''
  try {
    await session.saveEmploymentPreparation({
      jobType: form.jobType,
      startDate: form.start,
      goalDate: form.goal,
      region: form.region,
      family: Number(form.family),
      financialRiskAlertAmount: Math.max(0, Math.round(Number(form.financialRiskAlertAmount) || 0)),
    })
    profileMessage.value = '취업 준비 정보가 저장되었습니다.'
    router.push('/mypage')
  } catch (error) {
    profileMessageError.value = true
    profileMessage.value = error.message || '취업 준비 정보를 저장하지 못했습니다.'
  } finally {
    profileSaving.value = false
  }
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

async function refreshMyData() {
  if (session.isMockMode) {
    session.refreshMyData()
    dataRefreshMessage.value = `마이데이터를 ${formatDateTime(session.myDataLastUpdated)}에 갱신했습니다.`
    return
  }

  dataLoading.value = true
  dataRefreshMessage.value = ''
  try {
    const result = await syncMyData()
    await loadTransactions(true)
    session.refreshMyData(result?.lastSyncedAt)
    dataRefreshMessage.value = `마이데이터를 ${formatDateTime(session.myDataLastUpdated)}에 갱신했습니다. 새 거래 ${result?.insertedTransactionCount || 0}건을 반영했습니다.`
  } catch (error) {
    dataRefreshMessage.value = error.message || '마이데이터를 갱신하지 못했습니다.'
  } finally {
    dataLoading.value = false
  }
}

function resetWithdrawVerification() {
  withdrawVerified.value = false
  withdrawError.value = ''
}

function verifyWithdrawalPassword() {
  if (session.isMockMode && !session.verifyCurrentPassword(form.password)) {
    withdrawVerified.value = false
    withdrawError.value = '인증 실패: 비밀번호가 일치하지 않습니다.'
    return
  }

  withdrawError.value = ''
  withdrawVerified.value = true
}

async function withdrawAccount() {
  if (!withdrawVerified.value) return
  withdrawSubmitting.value = true
  withdrawError.value = ''
  try {
    await session.withdrawAccount(form.password)
    router.replace('/auth/login')
  } catch (error) {
    withdrawVerified.value = false
    withdrawError.value = error.message || '회원 탈퇴를 처리하지 못했습니다.'
  } finally {
    withdrawSubmitting.value = false
  }
}

async function logout() {
  await session.logout()
  router.replace('/auth/login')
}

async function setAllNotifications(value) {
  const previousSettings = {
    all: !value,
    policy: notificationSettings.policy,
    finance: notificationSettings.finance,
    plan: notificationSettings.plan,
    notice: notificationSettings.notice,
  }
  notificationRows.forEach(([key]) => (notificationSettings[key] = value))
  if ((await saveNotificationSettings(previousSettings)) && value) {
    await enableDeviceNotifications()
  }
}

async function syncAllNotifications(changedKey) {
  const previousSettings = {
    ...notificationSettings,
    [changedKey]: !notificationSettings[changedKey],
  }
  previousSettings.all = notificationRows.every(([key]) => previousSettings[key])
  notificationSettings.all = notificationRows.every(([key]) => notificationSettings[key])
  if ((await saveNotificationSettings(previousSettings)) && notificationSettings[changedKey]) {
    await enableDeviceNotifications()
  }
}

async function disconnectAccount(account) {
  if (session.isMockMode) {
    accounts.value = accounts.value.filter((item) => item !== account)
    dataRefreshMessage.value = `${account.name} 연결을 해제했습니다.`
    return
  }

  if (!window.confirm(`${account.name} 연결을 해제할까요?`)) return
  disconnectingAssetId.value = `${account.assetType}:${account.id}`
  dataRefreshMessage.value = ''
  try {
    await disconnectMyDataAsset(account.assetType, account.id)
    accounts.value = accounts.value.filter((item) => item !== account)
    dataRefreshMessage.value = `${account.name} 연결을 해제했습니다.`
  } catch (error) {
    dataRefreshMessage.value = error.message || '연결을 해제하지 못했습니다.'
  } finally {
    disconnectingAssetId.value = ''
  }
}

function addMockAccount(type) {
  const next =
    type === '계좌'
      ? { type, name: '카카오뱅크 입출금', number: '****-****-1024', amount: '84만원' }
      : { type, name: '신한카드', number: '****-****-1357', amount: '' }
  if (!accounts.value.some((account) => account.name === next.name)) accounts.value.push(next)
  dataRefreshMessage.value = `${next.name} 연결을 추가했습니다. (목 데이터)`
}

function clearMockData() {
  if (!window.confirm('연결된 마이데이터 목 정보를 모두 삭제할까요?')) return
  accounts.value = []
  clearTransactions()
  localStorage.removeItem('buttie-mydata')
  dataRefreshMessage.value = '거래 내역과 연결된 마이데이터 목 정보를 모두 삭제했습니다.'
}

async function disconnectAllAssets() {
  if (session.isMockMode) {
    clearMockData()
    return
  }
  if (!accounts.value.length) return
  if (!window.confirm('연결된 계좌와 카드를 모두 해제할까요?')) return

  dataLoading.value = true
  dataRefreshMessage.value = ''
  try {
    for (const account of [...accounts.value]) {
      await disconnectMyDataAsset(account.assetType, account.id)
    }
    accounts.value = []
    dataRefreshMessage.value = '연결된 금융 자산을 모두 해제했습니다.'
  } catch (error) {
    mapLinkedAssets()
    dataRefreshMessage.value = error.message || '일부 금융 자산의 연결을 해제하지 못했습니다.'
  } finally {
    dataLoading.value = false
  }
}
</script>

<template>
  <section class="page detail-page">
    <button class="detail-back desktop-only" type="button" @click="router.push('/mypage')">
      ‹ 마이페이지
    </button>
    <h1 class="desktop-only">{{ info[0] }}</h1>
    <p class="desktop-only detail-description">{{ info[1] }}</p>
    <h1
      class="mobile-only mobile-section-title"
      :class="{
        'mobile-section-title--flat':
          route.name === 'notificationSettings' || route.name === 'dataManagement',
      }"
    >
      {{ info[0] }}
    </h1>

    <template v-if="route.name === 'myInfo'">
      <div class="identity-row">
        <div class="detail-avatar">
          <span
            ><ButtieImage
              :src="profileState"
              :fallback="fallbackProfileImage"
              alt="버티 프로필" /></span
          ><b>{{ profileLevel }}</b>
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
        <p class="info-note">
          ✓ 이름·생년월일·휴대폰 번호·이메일은 본인인증 정보로 변경할 수 없어요.
        </p>
        <label><span>이름</span><input v-model="form.name" disabled /></label>
        <label><span>생년월일</span><input v-model="form.birth" disabled /></label>
      </article>

      <article class="form-card contact-card">
        <label>
          <span>휴대폰 번호</span>
          <input v-model="form.phone" disabled />
        </label>
        <label>
          <span>이메일</span>
          <input v-model="form.email" disabled />
        </label>
      </article>

      <p
        v-if="profileMessage"
        :class="['save-message', { 'save-message--error': profileMessageError }]"
        aria-live="polite"
      >
        {{ profileMessage }}
      </p>
      <button class="primary-action" type="button" :disabled="profileSaving" @click="saveProfile">
        {{ profileSaving ? '저장 중...' : '저장하기' }}
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
        <label
          ><span>준비 시작일</span><input v-model="form.start" type="date" :max="form.goal"
        /></label>
        <label id="goal-date-field"
          ><span>목표 취업일</span><input v-model="form.goal" type="date" :min="form.start"
        /></label>
        <label>
          <span>거주지</span>
          <select v-model="form.region">
            <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
          </select>
        </label>
        <label>
          <span>세대원 수</span>
          <input v-model.number="form.family" type="number" min="1" max="99" inputmode="numeric" />
        </label>
        <label id="risk-amount-field" class="risk-alert-field">
          <span>재정 위험 알림 금액</span>
          <small>설정한 금액에 도달하면 알려드려요</small>
          <input
            v-model.number="form.financialRiskAlertAmount"
            type="number"
            min="1"
            step="10000"
            inputmode="numeric"
          />
        </label>
        <p
          v-if="profileMessage"
          :class="['save-message', { 'save-message--error': profileMessageError }]"
          aria-live="polite"
        >
          {{ profileMessage }}
        </p>
        <button
          class="primary-action"
          type="button"
          :disabled="profileSaving"
          @click="saveJobProfile"
        >
          {{ profileSaving ? '저장 중...' : '저장하기' }}
        </button>
      </article>
    </template>

    <template v-else-if="route.name === 'notificationSettings'">
      <p v-if="notificationSettingsLoading" class="save-message" aria-live="polite">
        알림 설정을 저장하고 있어요.
      </p>
      <p v-if="notificationSettingsError" class="save-message save-message--error" role="alert">
        {{ notificationSettingsError }}
      </p>
      <label class="toggle-card">
        <span><strong>전체 알림</strong><small>모든 알림을 한번에 켜고 끕니다</small></span>
        <input
          v-model="notificationSettings.all"
          type="checkbox"
          :disabled="notificationSettingsLoading"
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
          <input
            v-model="notificationSettings[row[0]]"
            type="checkbox"
            :disabled="notificationSettingsLoading"
            @change="syncAllNotifications(row[0])"
          />
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
        <input v-model="twoFactorEnabled" type="checkbox" />
      </label>
      <article class="devices-card">
        <header>
          <h2>최근 로그인 기기</h2>
          <button type="button" @click="logout">전체 로그아웃</button>
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
          <button type="button" :disabled="dataLoading" @click="refreshMyData">
            {{ dataLoading ? '갱신 중...' : '⟳ 새로고침' }}
          </button>
        </header>
        <p v-if="dataLoading && !accounts.length" class="refresh-status">
          연결 자산을 불러오는 중...
        </p>
        <template v-for="group in accountGroups" :key="group.type">
          <p class="account-count">{{ group.type }} · {{ group.rows.length }}</p>
          <div
            v-for="account in group.rows"
            :key="`${account.assetType || account.type}:${account.id || account.name}`"
            class="account-row"
          >
            <i><AppIcon :name="account.type === '카드' ? 'wallet' : 'briefcase'" :size="17" /></i>
            <span>
              <strong>{{ account.name }}</strong>
              <small
                >{{ account.number
                }}<template v-if="account.amount"> · {{ account.amount }}</template
                ><br />갱신: {{ formatDateTime(session.myDataLastUpdated) }}</small
              >
            </span>
            <button
              type="button"
              :disabled="disconnectingAssetId === `${account.assetType}:${account.id}`"
              @click="disconnectAccount(account)"
            >
              {{
                disconnectingAssetId === `${account.assetType}:${account.id}` ? '해제 중' : '해제'
              }}
            </button>
          </div>
          <button
            v-if="session.isMockMode"
            class="add-account"
            type="button"
            @click="addMockAccount(group.type)"
          >
            ＋ {{ group.type }} 추가 연결
          </button>
        </template>
        <p v-if="dataRefreshMessage" class="refresh-status" aria-live="polite">
          {{ dataRefreshMessage }}
        </p>
      </article>
      <article class="delete-data desktop-only">
        <h2>⚠ 금융 자산 연결 해제</h2>
        <p>연결한 계좌와 카드의 마이데이터 동기화를 중단합니다.</p>
        <button
          type="button"
          :disabled="dataLoading || !accounts.length"
          @click="disconnectAllAssets"
        >
          전체 연결 해제
        </button>
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
        ><span>비밀번호를 다시 입력해주세요</span>
        <div class="withdraw-password__row">
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
        비밀번호가 입력되었습니다. 최종 탈퇴 시 서버에서 확인합니다.
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
        :disabled="withdrawSubmitting"
        @click="withdrawAccount"
      >
        {{ withdrawSubmitting ? '탈퇴 처리 중...' : '그래도 탈퇴할게요' }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.detail-back {
  color: #666;
  font-size: var(--font-section-title);
  font-weight: 800;
}
.detail-page > h1.desktop-only {
  margin-top: 26px;
  font-size: var(--font-section-title);
}
.detail-description {
  margin-top: 2px;
  color: #777;
  font-size: var(--font-small);
}
.mobile-section-title {
  padding: 12px 15px;
  border: 1px solid #e2e3e8;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 2px 4px rgb(15 23 42 / 12%);
  font-size: var(--font-body);
}

.mobile-section-title--flat {
  box-shadow: none !important;
  font-size: var(--font-small);
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
  font-size: var(--font-caption);
}
.nickname-control {
  display: flex;
  align-items: center;
  gap: 9px;
}
.nickname-control strong {
  color: #0a1680;
  font-size: var(--font-card-title);
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
  font-size: var(--font-card-title);
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
  font-size: var(--font-small);
}
.form-card label,
.job-card label,
.withdraw-password {
  display: grid;
  gap: 5px;
  color: #555;
  font-size: var(--font-small);
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
  font-size: var(--font-body);
}
.form-card input:disabled {
  color: #8b8d97;
  background: #fff;
  opacity: 1;
}
.contact-card label {
  max-width: 820px;
}
.primary-action {
  width: 100%;
  min-height: 54px;
  margin-top: 22px;
  border-radius: 13px;
  background: #ffeca4;
  box-shadow: 0 3px 4px rgb(15 23 42 / 12%);
  font-size: var(--font-card-title);
  font-weight: 900;
}
.save-message {
  margin: 12px 3px -10px;
  color: #0f9d66;
  font-size: var(--font-small);
}
.save-message--error {
  color: #e5484d;
}
.job-card select {
  appearance: none;
  padding-right: 58px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='8' viewBox='0 0 14 8'%3E%3Cpath d='m1 1 6 6 6-6' fill='none' stroke='%23222' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 28px center;
  background-size: 12px 7px;
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
  font-size: var(--font-small);
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
  font-weight: 900;
}
.segmented-control button.active {
  border-color: #f1b94c;
  background: #ffefac;
}
.job-card .primary-action {
  margin-top: 4px;
}

.job-card .risk-alert-field {
  position: relative;
}

.job-card .risk-alert-field small {
  position: absolute;
  top: 0;
  right: 0;
  color: var(--type-supporting-color);
  font-size: var(--type-meta-size);
  font-weight: 400;
}

.toggle-card {
  display: flex;
  min-height: 76px;
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
  font-size: var(--font-body);
}
.toggle-card small,
.toggle-list small {
  color: #777;
  font-size: var(--font-caption);
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
  min-height: 76px;
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
  font-size: var(--font-caption);
}

.security-card,
.devices-card {
  margin-top: 20px;
  padding: 20px;
}
.security-card h2,
.devices-card h2,
.accounts-card h2 {
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.password-button {
  width: 100%;
  min-height: 50px;
  margin-top: 38px;
  border-radius: 14px;
  background: #e7e7e7;
  box-shadow: 0 3px 4px rgb(15 23 42 / 10%);
  font-weight: 900;
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
  font-size: var(--font-small);
}
.device-row,
.account-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
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
  font-size: var(--font-body);
}
.device-row small,
.account-row small {
  color: #777;
  font-size: var(--font-caption);
}
.device-row b {
  padding: 3px 9px;
  border-radius: 999px;
  background: #def7e8;
  color: #15925f;
  font-size: var(--font-caption);
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
  font-size: var(--font-small);
  font-weight: 700;
  text-align: right;
}
.account-count {
  margin-top: 13px;
  color: #888;
  font-size: var(--font-caption);
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
  grid-template-columns: 32px minmax(0, 1fr) auto;
}
.account-row > button {
  color: #ff5e61;
  font-size: var(--font-small);
}
.add-account {
  width: 100%;
  min-height: 42px;
  color: #555;
  font-size: var(--font-small);
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
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.delete-data p {
  margin-top: 4px;
  font-size: var(--font-caption);
}
.delete-data button {
  margin-top: 18px;
  font-size: var(--font-small);
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
  font-size: var(--font-caption);
}
.withdraw-warning h2 {
  margin-top: 14px;
  font-size: var(--font-card-title);
}
.withdraw-warning p,
.withdraw-warning small {
  display: block;
  margin-top: 6px;
  color: #777;
  font-size: var(--font-caption);
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
  font-size: var(--font-body);
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
  font-size: var(--font-body);
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
  font-size: var(--font-card-title);
}
.withdraw-character p {
  margin-top: 4px;
  color: #777;
  font-size: var(--font-small);
}
.withdraw-confirm {
  display: block;
  margin: 18px auto 0;
  color: #727b8c;
  text-decoration: underline;
  font-size: var(--font-body);
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
    font-size: var(--font-body);
  }
  .nickname-control input {
    width: 170px;
    height: 38px;
  }
  .nickname-control button {
    font-size: var(--font-body);
  }
  .form-card {
    gap: 9px;
    margin-top: 14px;
    padding: 16px 18px;
    border-radius: 17px;
  }
  .info-note {
    font-size: var(--font-small);
  }
  .form-card input,
  .job-card input,
  .job-card select {
    height: 43px;
    border-radius: 22px;
  }
  .form-card label,
  .job-card label {
    font-size: var(--font-small);
  }
  .job-card select {
    padding-right: 48px;
    background-position: right 22px center;
  }
  .primary-action {
    min-height: 49px;
    margin-top: 16px;
    border-radius: 18px;
    font-size: var(--font-body);
  }
  .save-message {
    font-size: var(--font-caption);
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
    font-size: var(--font-body);
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
    font-size: var(--font-body);
  }
  .toggle-card small,
  .toggle-list small {
    font-size: var(--font-caption);
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
    font-size: var(--font-small);
  }
  .devices-card {
    margin-top: 14px;
  }
  .devices-card h2 {
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
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
    font-size: var(--font-small);
  }
  .account-row small {
    font-size: var(--font-caption);
  }
  .withdraw-warning {
    margin-top: 10px;
    padding: 18px;
    border-radius: 17px;
  }
  .withdraw-warning h2 {
    font-size: var(--font-card-title);
  }
  .withdraw-password {
    margin-top: 20px;
    font-size: var(--font-small);
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
    font-size: var(--font-small);
  }
  .withdraw-confirm {
    font-size: var(--font-body);
  }
  .withdraw-character {
    margin-top: 40px;
  }
}
</style>
