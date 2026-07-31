<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const openPopover = ref('')
const titles = {
  dashboard: '홈',
  finance: '내 재정',
  simulation: '시뮬레이션',
  simulationCategory: '시뮬레이션',
  timeline: '내 재정',
  search: '검색',
  searchFilter: '정책 상세 필터',
  notifications: '알림',
  mypage: '마이페이지',
  myInfo: '내 정보',
  jobInfo: '취업 준비 정보 관리',
  notificationSettings: '알림 설정',
  security: '비밀번호·보안',
  passwordVerification: '비밀번호 찾기',
  passwordChange: '비밀번호 변경',
  dataManagement: '데이터 관리',
  withdraw: '회원 탈퇴',
}
const title = computed(() => titles[route.name] || '버티')
const isMyPageDetail = computed(() => route.path.startsWith('/mypage/'))
const mobileTitle = computed(() => (isMyPageDetail.value ? '마이페이지' : title.value))

function toggle(name) {
  openPopover.value = openPopover.value === name ? '' : name
}

function goBackFromMyPageDetail() {
  const securityRoutes = ['passwordVerification', 'passwordChange']
  router.push(securityRoutes.includes(route.name) ? '/mypage/security' : '/mypage')
}
</script>

<template>
  <header class="app-header">
    <button
      v-if="isMyPageDetail"
      class="app-header__back mobile-only"
      type="button"
      aria-label="마이페이지로 돌아가기"
      @click="goBackFromMyPageDetail"
    >
      ‹
    </button>
    <strong class="app-header__title mobile-only">{{ mobileTitle }}</strong>
    <div class="app-header__spacer" />
    <div class="popover-anchor">
      <button
        :class="['header-chip', { active: openPopover === 'notification' }]"
        type="button"
        aria-label="알림"
        @click="toggle('notification')"
      >
        <AppIcon class="mobile-only" name="bell" :size="19" /><span class="desktop-only"
          >알림 3</span
        ><b class="mobile-only header-badge">3</b>
      </button>
      <section v-if="openPopover === 'notification'" class="header-popover notification-popover">
        <header>
          <h2>새 알림 3</h2>
          <RouterLink to="/notifications" @click="openPopover = ''">알림함 들어가기</RouterLink>
        </header>
        <RouterLink
          v-for="item in [
            ['목표 재설정 경고', '목표 취업일을 다시 확인해 주세요.', '방금'],
            ['청년 월세 지원 마감', '신청 마감일이 7일 남았어요.', '오늘'],
            ['생존기간 변동 안내', '이번 달 지출을 반영해 준비 기간을 계산했어요.', '어제'],
          ]"
          :key="item[0]"
          to="/notifications"
          @click="openPopover = ''"
        >
          <i>•</i>
          <div>
            <strong>{{ item[0] }}</strong
            ><small>{{ item[1] }}</small>
          </div>
          <time>{{ item[2] }}</time>
        </RouterLink>
      </section>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  z-index: 40;
  top: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: var(--header-height);
  padding: 17px clamp(30px, 4vw, 62px);
  background: rgb(251 252 255 / 94%);
  backdrop-filter: blur(10px);
}
.app-header__spacer {
  flex: 1;
}
.app-header__back {
  margin-right: 5px;
  color: #222;
  font-size: 25px;
  line-height: 1;
}
.popover-anchor {
  position: relative;
}
.header-chip {
  position: relative;
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: white;
  color: var(--text);
  font-size: 12px;
}
.header-chip.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 800;
}
.header-popover {
  position: absolute;
  z-index: 60;
  top: 54px;
  right: 0;
  width: 360px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: white;
  box-shadow: var(--shadow-md);
}
.notification-popover {
  width: 420px;
  padding: 27px 28px 25px;
  border-radius: 20px;
}
.header-popover::before {
  position: absolute;
  top: -9px;
  right: 30px;
  width: 16px;
  height: 16px;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
  background: white;
  content: '';
  transform: rotate(45deg);
}
.header-popover > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.header-popover h2 {
  font-size: 17px;
}
.header-popover header a {
  color: #666;
  font-size: 10px;
}
.header-popover > a {
  display: grid;
  align-items: center;
  gap: 12px;
  min-height: 66px;
  padding: 10px 0;
}
.header-popover > a div {
  display: grid;
  gap: 4px;
}
.header-popover strong {
  color: var(--primary);
  font-size: 12px;
}
.header-popover small {
  color: #777;
  font-size: 9px;
}
.notification-popover > header {
  padding-bottom: 13px;
}
.notification-popover h2 {
  color: #242424;
  font-size: 22px;
}
.notification-popover header a {
  font-size: 12px;
}
.notification-popover > a {
  grid-template-columns: 8px minmax(0, 1fr) 34px;
  min-height: 73px;
  padding: 12px 14px;
  border-radius: 12px;
}
.notification-popover > a:first-of-type {
  margin-top: 16px;
  background: var(--primary-soft);
}
.notification-popover i {
  align-self: start;
  margin-top: 5px;
  color: var(--danger);
  font-size: 16px;
  line-height: 1;
}
.notification-popover strong {
  font-size: 14px;
}
.notification-popover small {
  font-size: 11px;
  line-height: 1.5;
}
.notification-popover time {
  align-self: start;
  padding-top: 3px;
  color: #777;
  text-align: right;
  font-size: 10px;
}

@media (max-width: 767px) {
  .app-header {
    min-height: 58px;
    padding: 10px 14px;
    border-bottom: 1px solid #e7e7e7;
  }
  .app-header__title {
    color: var(--primary);
    font-size: 14px;
    font-weight: 900;
  }
  .header-chip {
    min-height: 32px;
    padding: 6px;
    border: 0;
    background: transparent !important;
    color: #172035;
  }
  .header-badge {
    position: absolute;
    top: 0;
    right: -1px;
    display: grid;
    width: 16px;
    height: 16px;
    place-items: center;
    border-radius: 50%;
    background: #ef5f78;
    color: white;
    font-size: 9px;
  }
  .header-popover {
    position: fixed;
    top: 58px;
    right: 10px;
    left: 10px;
    width: auto;
    max-height: calc(100dvh - 80px);
    overflow: auto;
    padding: 18px;
    border-radius: 14px;
  }
  .notification-popover {
    width: auto;
  }
  .header-popover::before {
    display: none;
  }
}
</style>
