<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationItems,
  notificationState,
  unreadNotificationCount,
} from '@/features/notification/notificationStore'

const router = useRouter()
const unreadOnly = ref(false)
const visible = computed(() =>
  unreadOnly.value ? notificationItems.value.filter((item) => !item.read) : notificationItems.value,
)

function notificationCategory(item) {
  const categoryByType = {
    POLICY: { label: '정책', tone: 'policy' },
    QUEST: { label: '퀘스트', tone: 'quest' },
    REWARD: { label: '리워드', tone: 'reward' },
    FINANCIAL_CHANGE: { label: '재정 변화', tone: 'finance' },
  }
  if (categoryByType[item.type]) return categoryByType[item.type]

  const text = `${item.title} ${item.message}`
  if (/정책|지원|월세/.test(text)) return { label: '정책', tone: 'policy' }
  if (/퀘스트|기간|목표/.test(text)) return { label: '퀘스트', tone: 'quest' }
  if (/리워드|보상|경험치/.test(text)) return { label: '리워드', tone: 'reward' }
  if (/재정|금액|경고/.test(text)) return { label: '재정 변화', tone: 'finance' }
  return { label: '서비스 공지', tone: 'service' }
}

async function openNotification(item) {
  if (!(await markNotificationRead(item.id))) return
  if (item.url?.startsWith('/')) router.push(item.url)
}

onMounted(() => loadNotifications(true).catch(() => {}))
</script>

<template>
  <section class="page notification-page">
    <header class="page-heading desktop-only">
      <p class="app-page-heading__eyebrow">NOTIFICATIONS</p>
      <h1 class="page-title">알림</h1>
      <p class="app-page-heading__description">알림을 한 곳에서 확인하세요.</p>
    </header>

    <div class="notification-tools">
      <div class="notification-filter" role="group" aria-label="알림 표시 범위">
        <button
          :class="{ active: !unreadOnly }"
          :aria-pressed="!unreadOnly"
          @click="unreadOnly = false"
        >
          전체 {{ notificationItems.length }}
        </button>
        <button
          :class="{ active: unreadOnly }"
          :aria-pressed="unreadOnly"
          @click="unreadOnly = true"
        >
          읽지 않음 {{ unreadNotificationCount }}
        </button>
      </div>
      <button
        class="notification-read-all"
        type="button"
        :disabled="unreadNotificationCount === 0 || notificationState.loading"
        @click="markAllNotificationsRead"
      >
        {{ notificationState.loading ? '처리 중' : '모두 읽음' }}
      </button>
    </div>

    <p v-if="notificationState.error" class="notification-error" role="alert">
      {{ notificationState.error }}
    </p>
    <p v-if="notificationState.loading && !notificationItems.length" class="notification-empty">
      알림을 불러오는 중이에요.
    </p>
    <p v-else-if="!notificationState.loading && !visible.length" class="notification-empty">
      {{ unreadOnly ? '읽지 않은 알림이 없어요.' : '도착한 알림이 없어요.' }}
    </p>
    <div class="notification-list">
      <button
        v-for="item in visible"
        :key="item.id"
        :class="['notification-item', { unread: !item.read }]"
        @click="openNotification(item)"
      >
        <span class="notification-item__top">
          <small :class="`tag--${notificationCategory(item).tone}`">
            {{ notificationCategory(item).label }}
          </small>
          <time>{{ item.read ? '읽음' : '안 읽음' }}</time>
        </span>
        <strong>{{ item.title }}</strong>
        <span class="notification-item__bottom">
          <span>{{ item.message }}</span>
          <b aria-hidden="true">›</b>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.notification-page {
  width: min(100%, 760px);
  margin: 0 auto;
}

.notification-description {
  margin: 8px 0 16px;
  color: #999;
  font-size: 14px;
}

.notification-error,
.notification-empty {
  margin: 18px 0;
  padding: 20px;
  border-radius: 14px;
  background: #f7f8fa;
  color: #858b97;
  text-align: center;
}

.notification-error {
  background: #fff2f2;
  color: #d94f55;
}

.notification-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.notification-filter {
  display: flex;
  gap: 10px;
}

.notification-filter button,
.notification-read-all {
  min-height: 32px;
  padding: 0 15px;
  border-radius: 999px;
  background: #f1f2f6;
  color: #222;
  font-size: 13px;
  font-weight: 700;
}

.notification-filter button.active {
  background: #fbedb0;
}

.notification-read-all {
  padding: 0 17px;
}

.notification-read-all:disabled {
  color: #999;
}

.notification-list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.notification-item {
  display: grid;
  gap: 10px;
  min-height: 102px;
  padding: 13px 20px 17px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: var(--shadow-figma);
  text-align: left;
}

.notification-item.unread {
  outline: 1px solid #8799e8;
  box-shadow: 0 1px 5px rgb(10 22 128 / 100%);
}

.notification-item__top,
.notification-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.notification-item__top small {
  padding: 4px 10px;
  border-radius: 999px;
  color: #222;
  font-size: 11px;
  font-weight: 700;
}

.notification-item time {
  color: #677080;
  font-size: 11px;
}

.notification-item > strong {
  color: #222;
  font-size: 15px;
  font-weight: 800;
}

.notification-item__bottom > span {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-item__bottom b {
  flex: none;
  color: #000;
  font-size: 24px;
  line-height: 0.7;
}

.tag--finance {
  background: #ecfdf5;
}
.tag--policy {
  background: #fdecec;
}
.tag--quest {
  background: #eceefd;
}
.tag--reward {
  background: #fafdec;
}
.tag--service {
  background: #f5ecfd;
}

@media (max-width: 800px) {
  .notification-page {
    padding: 0 1px;
  }

  .notification-description {
    margin-top: 0;
  }

  .notification-filter button {
    padding: 0 14px;
  }

  .notification-list {
    gap: 14px;
    margin-top: 18px;
  }
}
</style>
