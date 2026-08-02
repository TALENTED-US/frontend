<script setup>
import { computed, ref } from 'vue'
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationItems,
  unreadNotificationCount,
} from '@/features/notification/notificationStore'

const unreadOnly = ref(false)
const visible = computed(() =>
  unreadOnly.value
    ? notificationItems.value.filter((item) => !item.read)
    : notificationItems.value,
)
</script>

<template>
  <section class="page">
    <header class="page-heading">
      <div>
        <h1 class="page-title">알림함</h1>
        <p class="page-description">중요한 알림을 한 곳에서 확인하세요.</p>
      </div>
      <button
        class="btn btn-outline"
        type="button"
        :disabled="unreadNotificationCount === 0"
        @click="markAllNotificationsRead"
      >모두 읽음</button>
    </header>

    <div class="notification-tools">
      <div class="notification-filter" role="group" aria-label="알림 표시 범위">
        <button :class="{ active: !unreadOnly }" :aria-pressed="!unreadOnly" @click="unreadOnly = false">전체</button>
        <button :class="{ active: unreadOnly }" :aria-pressed="unreadOnly" @click="unreadOnly = true">읽지 않음</button>
      </div>
      <span>{{ unreadNotificationCount }}개의 새 알림</span>
    </div>

    <div class="notification-layout">
      <div class="notification-list">
        <button
          v-for="item in visible"
          :key="item.id"
          :class="['notification-item', 'card', { unread: !item.read }]"
          @click="markNotificationRead(item.id)"
        >
          <span class="notification-dot" />
          <div><small>알림</small><h2>{{ item.title }}</h2><p>{{ item.message }}</p></div>
          <time>{{ item.time }}</time>
        </button>
      </div>
      <aside class="card notification-guide">
        <h2>알림 안내</h2>
        <p>읽지 않은 알림을 확인하면 상태가 자동으로 변경돼요.</p>
        <RouterLink to="/mypage">알림 설정 ›</RouterLink>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.notification-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  padding: 0;
}

.notification-filter {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  min-width: 230px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #f3f5f8;
}

.notification-filter button {
  min-width: 108px;
  min-height: 38px;
  border-radius: 999px;
  color: var(--muted);
  font-size: var(--font-small);
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.notification-filter button.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 7px rgb(10 22 128 / 20%);
}

.notification-tools span {
  padding: 7px 12px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--muted);
  font-size: var(--font-small);
}

.notification-layout {
  display: grid;
  grid-template-columns: 1fr 230px;
  gap: 24px;
  margin-top: 22px;
}

.notification-list {
  display: grid;
  gap: 14px;
}

.notification-item {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 16px;
  min-height: 108px;
  padding: 20px 24px;
  text-align: left;
}

.notification-item.unread {
  border-color: var(--sky);
  background: #fcfdff;
}

.notification-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
}

.unread .notification-dot {
  background: var(--warning);
}

.notification-item small,
.notification-item p,
.notification-item time {
  color: var(--muted);
  font-size: var(--font-small);
}

.notification-item h2 {
  margin: 3px 0;
  color: var(--primary);
  font-size: var(--font-card-title);
}

.notification-guide {
  min-height: 430px;
  padding: 28px;
  background: var(--sky-soft);
}

.notification-guide h2 {
  color: var(--primary);
  font-size: var(--font-card-title);
}

.notification-guide p {
  margin-top: 26px;
  color: var(--muted);
  font-size: var(--font-body);
  line-height: 1.8;
}

.notification-guide a {
  display: inline-block;
  margin-top: 30px;
  color: var(--primary);
  font-size: var(--font-small);
  font-weight: 800;
}

@media (max-width: 800px) {
  .notification-tools {
    align-items: stretch;
    gap: 10px;
  }

  .notification-filter {
    min-width: 0;
    flex: 1;
  }

  .notification-filter button {
    min-width: 0;
  }

  .notification-tools span {
    display: grid;
    flex: none;
    place-items: center;
    padding: 5px 10px;
  }

  .notification-layout {
    grid-template-columns: 1fr;
  }

  .notification-guide {
    display: none;
  }
}
</style>
