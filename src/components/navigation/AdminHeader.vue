<!-- src/components/navigation/AdminHeader.vue -->
<template>
  <header class="admin-header">
    <div class="admin-header__title-area">
      <h1 class="admin-header__title">{{ title }}</h1>
      <p v-if="description" class="admin-header__description">{{ description }}</p>
    </div>

    <button class="admin-header__account" @click="$emit('account-click')">
      {{ adminName }} <span class="admin-header__caret">▾</span>
    </button>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  adminName: {
    type: String,
    default: '관리자',
  },
})

defineEmits(['account-click'])
</script>

<style scoped>
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  min-height: 60px;
}

.admin-header__title-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-header__title {
  font-family: 'Pretendard', sans-serif;
  font-weight: 700;
  font-size: 25px;
  color: #f0f2fa;
  margin: 0;
}

.admin-header__description {
  font-family: 'Pretendard', sans-serif;
  font-weight: 400;
  font-size: 13px;
  color: #5e6e87;
  margin: 0;
}

.admin-header__account {
  flex-shrink: 0;
  font-family: 'Pretendard', sans-serif;
  font-weight: 500;
  font-size: 13px;
  color: #5e6e87;
  white-space: nowrap;
}

.admin-header__caret {
  font-size: 11px;
  margin-left: 2px;
}
</style>
