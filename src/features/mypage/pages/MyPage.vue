<script setup>
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useSessionStore } from '@/stores/session'
import profileImage from '@/assets/images/mypage/buttie-profile.png'

const router = useRouter()
const session = useSessionStore()

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

function logout() {
  session.logout()
  router.replace('/auth/login')
}
</script>

<template>
  <section class="page mypage">
    <h1 class="mypage__title desktop-only">마이페이지</h1>

    <article class="profile-card">
      <div class="profile-card__identity">
        <div class="profile-avatar">
          <span class="profile-avatar__ring"><img :src="profileImage" alt="버티 프로필" /></span>
          <b>5</b>
        </div>
        <div class="profile-card__user">
          <h2>{{ session.displayName }}</h2>
          <p>{{ session.currentUser.email }}</p>
        </div>
      </div>

      <div class="profile-card__progress">
        <div class="profile-card__level">
          <span>Lv 5 · 다음 레벨까지 160 EXP</span>
          <em>안정</em>
        </div>
        <strong>1,240 EXP</strong>
        <div class="progress-row">
          <i><span /></i><small>68%</small>
        </div>
      </div>

      <dl class="profile-card__summary">
        <div>
          <dt>취업 준비 유형</dt>
          <dd>{{ session.currentUser.jobType === 'first' ? '첫취업 준비' : '재취업 준비' }}</dd>
        </div>
        <div>
          <dt>준비 시작일</dt>
          <dd>{{ session.currentUser.startDate.replaceAll('-', '.') }}</dd>
        </div>
        <div>
          <dt>목표 취업 시점</dt>
          <dd>{{ session.currentUser.goalDate.replaceAll('-', '.') }}</dd>
        </div>
        <div>
          <dt>마이데이터 연결 상태</dt>
          <dd>마지막 갱신 · 2026.07.29 09:12</dd>
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
  font-size: 26px;
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
  grid-template-columns: 165px minmax(300px, 1fr);
  gap: 12px 28px;
  min-height: 330px;
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
  font-size: 11px;
}

.profile-card__user h2 {
  font-size: 19px;
}
.profile-card__user p {
  margin-top: 4px;
  color: #6b707d;
  font-size: 12px;
}

.profile-card__progress {
  align-self: start;
}
.profile-card__level {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 800;
}
.profile-card__level em {
  min-width: 84px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #def7e8;
  color: #14a669;
  text-align: center;
  font-size: 12px;
  font-style: normal;
}
.profile-card__progress > strong {
  display: block;
  margin-top: 3px;
  font-size: 28px;
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
  width: 68%;
  height: 100%;
  border-radius: inherit;
  background: #4d352a;
}
.progress-row small {
  color: #73747e;
  font-size: 12px;
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
}
.profile-card__summary dt {
  color: #6b707d;
  font-size: 14px;
}
.profile-card__summary dd {
  font-size: 14px;
  font-weight: 800;
  text-align: right;
}

.settings-title {
  margin: 28px 0 12px;
  font-size: 20px;
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
  font-size: 17px;
}
.settings-card small {
  color: #666;
  font-size: 12px;
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
  font-size: 15px;
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
  font-size: 15px;
  font-weight: 800;
}

@media (max-width: 767px) {
  .profile-card {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px 10px;
    min-height: auto;
    padding: 14px 16px 18px;
    border-radius: 18px;
  }

  .profile-card__identity {
    display: contents;
  }

  .profile-avatar {
    grid-row: 1 / 3;
    width: 62px;
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
    font-size: 9px;
  }
  .profile-card__user {
    grid-column: 1 / -1;
    grid-row: 3;
    margin-top: 2px;
  }
  .profile-card__user h2 {
    font-size: 15px;
  }
  .profile-card__user p {
    font-size: 11px;
  }
  .profile-card__progress {
    grid-column: 2;
    grid-row: 1 / 3;
  }
  .profile-card__level {
    font-size: 10px;
  }
  .profile-card__level em {
    min-width: 56px;
    padding: 4px 8px;
    font-size: 9px;
  }
  .profile-card__progress > strong {
    font-size: 22px;
  }
  .progress-row {
    gap: 8px;
    margin-top: 3px;
  }
  .progress-row i {
    height: 7px;
  }
  .progress-row small {
    font-size: 10px;
  }
  .profile-card__summary {
    grid-column: 1 / -1;
    gap: 10px;
    margin-top: 3px;
  }
  .profile-card__summary dt,
  .profile-card__summary dd {
    font-size: 12px;
  }
  .profile-card__summary dd {
    max-width: 61%;
  }
  .settings-title {
    margin: 14px 0 8px 3px;
    font-size: 13px;
  }
  .settings-card {
    padding: 0 16px;
    border-radius: 18px;
  }
  .settings-card button {
    min-height: 68px;
  }
  .settings-card strong {
    font-size: 14px;
  }
  .settings-card small {
    font-size: 10px;
  }
  .logout-button {
    min-height: 48px;
    margin-top: 14px;
    border-radius: 18px;
    font-size: 14px;
  }
  .withdraw-button {
    min-height: 48px;
    margin-top: 10px;
    border-radius: 18px;
    font-size: 14px;
  }
}
</style>
