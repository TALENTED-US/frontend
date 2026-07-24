<!-- components/navigation/AppHeader.vue -->
<template>
  <header class="app-header">
    <!-- 왼쪽: 뒤로가기 or 없음 -->
    <div class="app-header__left">
      <button
        v-if="variant === 'sub'"
        class="app-header__back-btn"
        aria-label="뒤로가기"
        @click="handleBack"
      >
        <span class="app-header__back-icon">‹</span>
      </button>
    </div>

    <!-- 타이틀: 패턴에 따라 위치/스타일 다름 -->
    <h1 class="app-header__title" :class="{ 'app-header__title--sub': variant === 'sub' }">
      {{ title }}
    </h1>

    <!-- 오른쪽: 탭 루트일 때만 퀘스트/알림 노출 -->
    <div class="app-header__actions">
      <template v-if="variant === 'tab'">
        <button class="app-header__icon-btn" aria-label="퀘스트함" @click="$emit('quest-click')">
          <img :src="questIcon" alt="" class="app-header__icon-img" />
        </button>
        <button class="app-header__icon-btn" aria-label="알림" @click="$emit('notification-click')">
          <img :src="bellIcon" alt="" class="app-header__icon-img app-header__icon-img--bell" />
          <span v-if="notificationCount > 0" class="app-header__badge">
            {{ notificationCount }}
          </span>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import questIcon from '@/assets/icons/quest-button.svg'
import bellIcon from '@/assets/icons/bell.svg'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  variant: {
    type: String,
    default: 'tab', // 'tab' | 'sub'
    validator: (v) => ['tab', 'sub'].includes(v),
  },
  notificationCount: {
    type: Number,
    default: 0,
  },
})

defineEmits(['quest-click', 'notification-click'])

const router = useRouter()
function handleBack() {
  router.back()
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 16px;
  background-color: #fcfdff;
  border-bottom: 0.829px solid rgba(30, 58, 138, 0.1);
}

.app-header__left {
  display: flex;
  align-items: center;
  min-width: 24px;
}

.app-header__back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.app-header__back-icon {
  font-size: 22px;
  color: #222;
  line-height: 1;
}

.app-header__title {
  font-family: 'Pretendard', sans-serif;
  font-weight: 700;
  font-size: 16px;
  line-height: 24px;
  color: #222;
  flex: 1;
}

.app-header__title--sub {
  margin-left: 8px;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
}

.app-header__icon-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 20px;
}

.app-header__icon-img {
  width: 36px;
  height: 36px;
}

.app-header__icon-img--bell {
  width: 19.99px;
  height: 19.99px;
}

.app-header__badge {
  position: absolute;
  top: 2px;
  right: 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 2px;
  background-color: #fb7185;
  border-radius: 999px;
  font-family: 'Pretendard', sans-serif;
  font-weight: 900;
  font-size: 9px;
  line-height: 9px;
  color: #0a1680;
  text-align: center;
}
</style>
