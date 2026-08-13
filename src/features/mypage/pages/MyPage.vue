<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import ButtieImage from '@/components/ui/ButtieImage.vue'
import { useSessionStore } from '@/stores/session'
import { formatExp, useProgressionStore } from '@/stores/progression'
import { useSimulationStore } from '@/features/simulation/stores/simulation'
import { getButtieLevelImage } from '@/data/buttieLevelAssets'
import { formatKoreanDateTime } from '@/utils/dateTime'

const router = useRouter()
const session = useSessionStore()
const progression = useProgressionStore()
const simulation = useSimulationStore()
const profileExp = computed(() => Number(session.currentUser.exp ?? progression.exp))
const profileRequiredExp = computed(() =>
  Number(session.currentUser.requiredExp ?? progression.nextLevelExp),
)
const profileLevel = computed(() => Number(session.currentUser.level ?? progression.level))
const profileRemainingExp = computed(() => Math.max(0, profileRequiredExp.value - profileExp.value))
const profileProgressPercent = computed(() =>
  profileRequiredExp.value > 0
    ? Math.min(100, Math.max(0, (profileExp.value / profileRequiredExp.value) * 100))
    : 100,
)

const profileState = computed(() => {
  const apiRisk = session.currentUser.riskLevel
  const key =
    apiRisk === 'DANGER'
      ? 'danger'
      : apiRisk === 'CAUTION'
        ? 'caution'
        : apiRisk === 'STABLE'
          ? 'stable'
          : simulation.currentStatus?.key
  const apiImage = session.currentUser.buttieImageUrl
  if (key === 'danger' || key === 'risk') {
    const fallbackImage = getButtieLevelImage(profileLevel.value, 'danger')
    return { label: '위험', image: apiImage || fallbackImage, fallbackImage }
  }
  if (key === 'caution') {
    const fallbackImage = getButtieLevelImage(profileLevel.value, 'caution')
    return { label: '주의', image: apiImage || fallbackImage, fallbackImage }
  }
  const fallbackImage = getButtieLevelImage(profileLevel.value, 'stable')
  return { label: '안정', image: apiImage || fallbackImage, fallbackImage }
})

function formatDate(value) {
  return value ? value.replaceAll('-', '.') : '-'
}

function formatDateTime(value) {
  return formatKoreanDateTime(value)
}

const menuItems = [
  { label: '내 정보', description: '개인정보를 확인하고 수정해요', to: '/mypage/info' },
  {
    label: '취업 준비 정보 관리',
    description: '준비 유형·일정·거주 정보를 관리해요',
    to: '/mypage/job',
  },
  {
    label: '알림 설정',
    description: '정책과 재정 변화 알림을 관리해요',
    to: '/mypage/notifications',
  },
  {
    label: '비밀번호·보안',
    description: '비밀번호와 로그인 기록을 관리해요',
    to: '/mypage/security',
  },
  { label: '데이터 관리', description: '금융 연결과 계좌 데이터를 관리해요', to: '/mypage/data' },
]

async function logout() {
  await session.logout()
  router.replace('/auth/login')
}
</script>

<template>
  <section class="page mypage">
    <h1 class="mypage__title desktop-only">마이페이지</h1>

    <article class="profile-card">
      <div class="profile-card__identity">
        <div class="profile-avatar">
          <span class="profile-avatar__ring"
            ><ButtieImage
              :src="profileState.image"
              :fallback="profileState.fallbackImage"
              alt="버티 프로필"
          /></span>
          <b>{{ profileLevel }}</b>
        </div>
        <div class="profile-card__user">
          <h2>{{ session.displayName }}</h2>
          <p>{{ session.currentUser.email }}</p>
        </div>
      </div>

      <div class="profile-card__progress">
        <div class="profile-card__level">
          <span v-if="profileLevel < 5">
            Lv {{ profileLevel }} · 다음 레벨까지 {{ formatExp(profileRemainingExp) }} EXP
          </span>
          <span v-else>Lv 5 · 최고 레벨</span>
          <em>{{ profileState.label }}</em>
        </div>
        <strong v-if="profileLevel < 5">
          {{ formatExp(profileExp) }} / {{ formatExp(profileRequiredExp) }} EXP
        </strong>
        <strong v-else>MAX EXP</strong>
        <div class="progress-row">
          <i><span :style="{ width: `${profileProgressPercent}%` }" /></i>
          <small>{{ Math.round(profileProgressPercent) }}%</small>
        </div>
      </div>

      <dl class="profile-card__summary">
        <div>
          <dt>취업 준비 유형</dt>
          <dd>{{ session.currentUser.jobType === 'first' ? '첫취업 준비' : '재취업 준비' }}</dd>
        </div>
        <div>
          <dt>준비 시작일</dt>
          <dd>{{ formatDate(session.currentUser.startDate) }}</dd>
        </div>
        <div>
          <dt>목표 취업 시점</dt>
          <dd>{{ formatDate(session.currentUser.goalDate) }}</dd>
        </div>
        <div>
          <dt>마이데이터 연결 상태</dt>
          <dd>
            {{ session.myDataConnected ? '연결됨' : '연결 안 됨' }} · 마지막 갱신
            {{ formatDateTime(session.myDataLastUpdated) }}
          </dd>
        </div>
      </dl>
    </article>

    <h2 class="settings-title">계정 및 설정</h2>
    <article class="settings-card">
      <button v-for="item in menuItems" :key="item.to" type="button" @click="router.push(item.to)">
        <span
          ><strong>{{ item.label }}</strong
          ><small>{{ item.description }}</small></span
        >
        <AppIcon name="chevron" :size="15" />
      </button>
    </article>

    <button class="logout-button" type="button" @click="logout">로그아웃</button>
    <button class="withdraw-button" type="button" @click="router.push('/mypage/withdraw')">
      <AppIcon name="trash" :size="19" />
      회원탈퇴
    </button>
  </section>
</template>

<style scoped>
.mypage__title {
  margin-bottom: 28px;
  font-size: var(--font-page-title);
}

.profile-card,
.settings-card,
.logout-button {
  border: 1px solid #e2e3e8;
  background: #fff;
  box-shadow: 0 3px 4px rgb(15 23 42 / 12%);
}

.profile-card {
  display: grid;
  grid-template-columns: minmax(165px, 0.28fr) minmax(0, 1fr);
  gap: 18px 32px;
  min-height: 350px;
  padding: 28px 30px;
  border-radius: 18px;
}

.profile-card__identity {
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-avatar {
  position: relative;
  width: 82px;
}

.profile-avatar__ring {
  display: grid;
  width: 82px;
  height: 82px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: #ffefac;
}

.profile-avatar img {
  width: 66px;
  height: 66px;
  object-fit: cover;
}

.profile-avatar b {
  position: absolute;
  right: -2px;
  bottom: -4px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 50%;
  background: #49362c;
  color: #fff;
  font-size: var(--font-small);
}

.profile-card__user h2 {
  font-size: var(--font-section-title);
}
.profile-card__user p {
  margin-top: 4px;
  color: #6b707d;
  font-size: var(--font-small);
}

.profile-card__progress {
  align-self: start;
}
.profile-card__level {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-body);
  font-weight: 800;
}
.profile-card__level em {
  min-width: 84px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #def7e8;
  color: #14a669;
  text-align: center;
  font-size: var(--font-small);
  font-style: normal;
}
.profile-card__progress > strong {
  display: block;
  margin-top: 3px;
  font-size: var(--font-page-title);
}
.progress-row {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 7px;
}
.progress-row i {
  flex: 1;
  height: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e2e2;
}
.progress-row i span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #4d352a;
  transition: width 0.25s ease;
}
.progress-row small {
  color: #73747e;
  font-size: var(--font-small);
}

.profile-card__summary {
  align-self: end;
  display: grid;
  gap: 10px;
}

.profile-card__summary div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-width: 0;
}
.profile-card__summary dt {
  color: #6b707d;
  font-size: var(--font-body);
}
.profile-card__summary dd {
  min-width: 0;
  max-width: 62%;
  overflow-wrap: anywhere;
  font-size: var(--font-body);
  font-weight: 800;
  text-align: right;
}

.settings-title {
  margin: 28px 0 12px;
  font-size: var(--type-section-title-size);
  font-weight: var(--type-section-title-weight);
}
.settings-card {
  padding: 0 24px;
  border-radius: 18px;
}
.settings-card button {
  display: flex;
  width: 100%;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e5e5;
  text-align: left;
}
.settings-card button:last-child {
  border-bottom: 0;
}
.settings-card button > span {
  display: grid;
  gap: 4px;
}
.settings-card strong {
  font-size: var(--font-card-title);
}
.settings-card small {
  color: #666;
  font-size: var(--font-small);
}
.settings-card .app-icon {
  color: #7a8497;
}
.logout-button {
  width: 100%;
  min-height: 56px;
  margin-top: 28px;
  border-radius: 14px;
  color: #666;
  font-size: var(--font-body);
  font-weight: 800;
}

.withdraw-button {
  display: flex;
  width: 100%;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  border: 1px solid #ffaaa9;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 4px rgb(15 23 42 / 10%);
  color: #f0574f;
  font-size: var(--font-body);
  font-weight: 800;
}

@media (max-width: 767px) {
  .profile-card {
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 14px 12px;
    min-height: auto;
    padding: 18px 16px 20px;
    border-radius: 18px;
  }

  .profile-card__identity {
    display: contents;
  }

  .profile-avatar {
    grid-row: 1 / 3;
    width: 62px;
    height: 62px;
    align-self: start;
    transform: translateY(18px);
  }
  .profile-avatar__ring {
    width: 62px;
    height: 62px;
  }
  .profile-avatar img {
    width: 50px;
    height: 50px;
  }
  .profile-avatar b {
    width: 22px;
    height: 22px;
    font-size: var(--font-caption);
  }
  .profile-card__user {
    grid-column: 1 / -1;
    grid-row: 3;
    margin-top: 2px;
  }
  .profile-card__user h2 {
    font-size: var(--font-body);
  }
  .profile-card__user p {
    font-size: var(--font-small);
  }
  .profile-card__progress {
    grid-column: 2;
    grid-row: 1 / 3;
  }
  .profile-card__level {
    font-size: var(--font-caption);
  }
  .profile-card__level em {
    min-width: 56px;
    padding: 4px 8px;
    font-size: var(--font-caption);
  }
  .profile-card__progress > strong {
    font-size: var(--font-section-title);
  }
  .progress-row {
    gap: 8px;
    margin-top: 3px;
  }
  .progress-row i {
    height: 7px;
  }
  .progress-row small {
    font-size: var(--font-caption);
  }
  .profile-card__summary {
    grid-column: 1 / -1;
    gap: 10px;
    margin-top: 3px;
  }
  .profile-card__summary dt,
  .profile-card__summary dd {
    font-size: var(--font-small);
  }
  .profile-card__summary dd {
    max-width: 61%;
  }
  .settings-title {
    margin: 14px 0 8px 3px;
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }
  .settings-card {
    padding: 0 16px;
    border-radius: 18px;
  }
  .settings-card button {
    min-height: 78px;
    gap: 14px;
    padding: 10px 0;
  }
  .settings-card strong {
    font-size: var(--font-body);
  }
  .settings-card small {
    font-size: var(--font-caption);
  }
  .logout-button {
    min-height: 48px;
    margin-top: 14px;
    border-radius: 18px;
    font-size: var(--font-body);
  }
  .withdraw-button {
    min-height: 48px;
    margin-top: 10px;
    border-radius: 18px;
    font-size: var(--font-body);
  }
}
</style>
