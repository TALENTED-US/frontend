<script setup>
import { onMounted, ref } from 'vue'
import {
  createAdminFinancePersonaDataset,
  deleteAdminFinancePersonaDataset,
  duplicateAdminFinancePersonaDataset,
  getAdminFinancePersonaDatasets,
} from '@/features/admin/api/financeDataApi'

const datasets = ref([])

async function loadDatasets() {
  datasets.value = await getAdminFinancePersonaDatasets()
}

async function addDataset() {
  const created = await createAdminFinancePersonaDataset()
  datasets.value.push(created)
}

async function duplicateDataset(dataset) {
  const copy = await duplicateAdminFinancePersonaDataset(dataset.key)
  const index = datasets.value.findIndex((item) => item.key === dataset.key)
  datasets.value.splice(index + 1, 0, copy)
}

async function removeDataset(dataset) {
  if (!window.confirm(`"${dataset.name}" 데이터 세트를 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return
  await deleteAdminFinancePersonaDataset(dataset.key)
  datasets.value = datasets.value.filter((item) => item.key !== dataset.key)
}

onMounted(loadDatasets)
</script>

<template>
  <section class="admin-finance">
    <div class="admin-finance__content">
      <p class="admin-finance__breadcrumb">관리자 &gt; 금융데이터 관리</p>

      <header class="admin-finance__header">
        <h1>금융데이터 관리</h1>
        <p>취준생 페르소나별 Mock 금융 데이터 세트를 관리하세요.</p>
      </header>

      <div class="admin-finance__section-head">
        <h2>데이터 세트 관리</h2>
        <button type="button" class="admin-finance__add" @click="addDataset">+ 새 데이터 세트</button>
      </div>

      <div class="admin-finance__grid">
        <article v-for="dataset in datasets" :key="dataset.key" class="admin-finance__dataset">
          <h3>{{ dataset.name }}</h3>
          <p class="admin-finance__dataset-desc">{{ dataset.description }}</p>
          <p class="admin-finance__dataset-stats">
            계좌 {{ dataset.accountCount }} · 카드 {{ dataset.cardCount }} · 거래 {{ dataset.transactionCount }}
          </p>
          <div class="admin-finance__dataset-actions">
            <RouterLink :to="`/admin/finance-data/${dataset.key}`" class="primary">상세보기</RouterLink>
            <button type="button" class="ghost" @click="duplicateDataset(dataset)">복사</button>
            <button type="button" class="danger" @click="removeDataset(dataset)">삭제</button>
          </div>
        </article>

        <p v-if="datasets.length === 0" class="admin-finance__empty">등록된 데이터 세트가 없어요.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-finance__breadcrumb {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance__header {
  margin-top: 24px;
}

.admin-finance__header h1 {
  color: var(--text);
  font-size: var(--font-page-title);
  font-weight: 800;
}

.admin-finance__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-body);
}

.admin-finance__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 32px;
}

.admin-finance__section-head h2 {
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
}

.admin-finance__add {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
  white-space: nowrap;
}

.admin-finance__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 24px;
}

@media (max-width: 900px) {
  .admin-finance__grid {
    grid-template-columns: 1fr;
  }
}

.admin-finance__dataset {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-finance__dataset h3 {
  color: var(--text);
  font-size: 20px;
  font-weight: 800;
}

.admin-finance__dataset-desc {
  margin-top: 12px;
  color: var(--muted);
  font-size: var(--font-small);
  line-height: var(--line-height-body);
}

.admin-finance__dataset-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance__dataset-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.admin-finance__dataset-actions button,
.admin-finance__dataset-actions a {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.admin-finance__dataset-actions .primary {
  border: 0;
  background: var(--accent-strong);
  color: var(--text);
}

.admin-finance__dataset-actions .ghost {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.admin-finance__dataset-actions .danger {
  border: 1px solid #ef4444;
  background: var(--surface);
  color: #ef4444;
}

.admin-finance__empty {
  grid-column: 1 / -1;
  padding: 32px 0;
  color: var(--subtle);
  text-align: center;
}

.admin-finance__detail-backdrop {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
}

.admin-finance__detail {
  width: 420px;
  padding: 32px;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
}

.admin-finance__detail h2 {
  color: var(--text);
  font-size: var(--font-card-title);
  font-weight: 800;
}

.admin-finance__detail p {
  margin-top: 12px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-finance__detail .admin-finance__dataset-stats {
  margin-top: 16px;
}

.admin-finance__detail button {
  margin-top: 24px;
  padding: 10px 24px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700;
}
</style>
