<script setup>
import { computed, ref } from 'vue'
import { quests as initialQuests } from '@/data/mockData'

const items = ref(initialQuests.map((quest) => ({ ...quest })))
const filter = ref('전체')
const selected = ref(null)
const filters = ['전체', '시작 전', '진행 중', '완료']
const filtered = computed(() => (filter.value === '전체' ? items.value : items.value.filter((item) => item.status === filter.value)))

function advance(quest) {
  if (quest.status === '시작 전') quest.status = '진행 중'
  else if (quest.status === '진행 중') quest.status = '완료'
  selected.value = quest
}
</script>

<template>
  <section class="page">
    <header class="page-heading">
      <div>
        <h1 class="page-title">퀘스트함</h1>
        <p class="page-description">진행 중인 퀘스트와 완료 현황을 확인하세요.</p>
      </div>
      <span class="pill">완료 {{ items.filter((item) => item.status === '완료').length }}</span>
    </header>

    <div class="quest-filters card">
      <button v-for="item in filters" :key="item" :class="{ active: filter === item }" @click="filter = item">{{ item }}</button>
    </div>

    <div class="quest-layout">
      <div class="quest-list">
        <article v-for="quest in filtered" :key="quest.id" class="quest-card card">
          <span :class="['quest-dot', quest.status === '완료' && 'done']" />
          <div><small>{{ quest.status }}</small><h2>{{ quest.title }}</h2><p>{{ quest.detail }}</p></div>
          <div class="quest-action">
            <span>+{{ quest.reward }} EXP</span>
            <button type="button" @click="advance(quest)">{{ quest.status === '완료' ? '완료' : quest.status === '시작 전' ? '시작' : '완료하기' }}</button>
          </div>
        </article>
      </div>

      <aside class="quest-guide card">
        <template v-if="selected">
          <span class="quest-guide__check">✓</span>
          <h2>{{ selected.status === '완료' ? '퀘스트를 완료했어요!' : '퀘스트를 시작했어요!' }}</h2>
          <p>{{ selected.title }}</p>
          <strong>+{{ selected.reward }} EXP</strong>
        </template>
        <template v-else>
          <h2>퀘스트 안내</h2>
          <p>완료된 퀘스트는 실제 재정 결과 확인 후 자동으로 반영돼요.</p>
        </template>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.quest-filters {
  display: flex;
  gap: 14px;
  padding: 9px 12px;
  scrollbar-width: none;
}

.quest-filters::-webkit-scrollbar {
  display: none;
}

.quest-filters button {
  min-width: 96px;
  min-height: 36px;
  border-radius: 999px;
  color: var(--muted);
  font-size: 12px;
}

.quest-filters button.active {
  background: var(--primary);
  color: white;
  font-weight: 800;
}

.quest-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px;
  gap: 24px;
  margin-top: 22px;
}

.quest-list {
  display: grid;
  gap: 14px;
}

.quest-card {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 16px;
  min-height: 110px;
  padding: 20px 24px;
}

.quest-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--warning);
}

.quest-dot.done {
  background: var(--success);
}

.quest-card small,
.quest-card p {
  color: var(--muted);
  font-size: 11px;
}

.quest-card h2 {
  margin: 3px 0;
  color: var(--primary);
  font-size: 16px;
}

.quest-action {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.quest-action span {
  color: #20916c;
  font-size: 11px;
}

.quest-action button {
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.quest-guide {
  height: 430px;
  padding: 28px;
  background: var(--sky-soft);
}

.quest-guide h2 {
  color: var(--primary);
  font-size: 17px;
}

.quest-guide p {
  margin-top: 26px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.8;
}

.quest-guide strong {
  display: block;
  margin-top: 20px;
  color: #20916c;
}

.quest-guide__check {
  display: grid;
  width: 44px;
  height: 44px;
  margin-bottom: 16px;
  place-items: center;
  border-radius: 50%;
  background: var(--success);
  color: white;
}

@media (max-width: 800px) {
  .quest-filters {
    overflow-x: auto;
  }

  .quest-filters button {
    flex: none;
    min-width: 82px;
  }

  .quest-layout {
    grid-template-columns: 1fr;
  }

  .quest-guide {
    display: none;
  }

  .quest-card {
    grid-template-columns: 10px 1fr;
  }

  .quest-action {
    grid-column: 2;
    grid-template-columns: 1fr auto;
    width: 100%;
    justify-items: start;
  }
}
</style>
