<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminPolicyCategories, adminPolicyRegions } from '@/features/admin/data/adminMockData'
import { createAdminPolicy, getAdminPolicy, updateAdminPolicy } from '@/features/admin/api/policyApi'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => Boolean(route.params.policyId))

const form = reactive({
  name: '',
  category: adminPolicyCategories[0],
  region: adminPolicyRegions[0],
  target: '',
  amount: '',
  period: '',
  sourceUrl: '',
  status: 'open',
  recommendStatus: 'active',
  ageCondition: '',
  incomeCondition: '',
  requiredDocs: '',
  applyMethod: '',
})

async function load() {
  if (!isEdit.value) return
  const policy = await getAdminPolicy(route.params.policyId)
  Object.assign(form, policy)
}

async function save() {
  if (isEdit.value) {
    await updateAdminPolicy(route.params.policyId, { ...form })
  } else {
    await createAdminPolicy({ ...form })
  }
  router.push('/admin/policies')
}

onMounted(load)
</script>

<template>
  <section class="admin-policy-form">
    <RouterLink to="/admin/policies" class="admin-policy-form__back">‹ 정부지원정책 관리</RouterLink>
    <header class="admin-policy-form__header">
      <div>
        <h1>정책 등록·수정</h1>
        <p>정책 정보를 입력하고 저장하세요.</p>
      </div>
      <button type="button" class="admin-policy-form__save" @click="save">저장하기</button>
    </header>

    <article class="admin-card">
      <h2>기본 정보</h2>
      <p class="admin-policy-form__caption">사용자에게 노출될 정책의 기본 정보를 입력하세요.</p>

      <div class="admin-policy-form__grid">
        <label>
          정책명
          <input v-model="form.name" type="text" placeholder="예: 청년내일저축계좌" />
        </label>
        <label>
          카테고리
          <select v-model="form.category">
            <option v-for="option in adminPolicyCategories" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label>
          대상
          <input v-model="form.target" type="text" placeholder="예: 만 19~34세 근로소득 청년" />
        </label>
        <label>
          지원금액
          <input v-model="form.amount" type="text" placeholder="예: 일시 60만원" />
        </label>
        <label>
          신청기간
          <input v-model="form.period" type="text" placeholder="예: 2026.07.01 ~ 2026.08.31" />
        </label>
        <label>
          출처 URL
          <input v-model="form.sourceUrl" type="text" placeholder="https://..." />
        </label>
        <label>
          상태
          <select v-model="form.status">
            <option value="open">모집중</option>
            <option value="closing-soon">마감임박</option>
            <option value="closed">마감</option>
          </select>
        </label>
        <label>
          추천 여부
          <select v-model="form.recommendStatus">
            <option value="active">추천중</option>
            <option value="auto-excluded">자동 제외(마감)</option>
            <option value="manual-excluded">수동 제외(오류)</option>
          </select>
        </label>
      </div>
    </article>

    <div class="admin-policy-form__columns">
      <article class="admin-card">
        <h2>자격 조건</h2>
        <p class="admin-policy-form__caption">연령·소득 기준을 입력하세요.</p>
        <div class="admin-policy-form__grid admin-policy-form__grid--single">
          <label>
            연령 조건
            <input v-model="form.ageCondition" type="text" placeholder="예: 만 19~34세" />
          </label>
          <label>
            소득 조건
            <input v-model="form.incomeCondition" type="text" placeholder="예: 연소득 2,600만원 이하" />
          </label>
        </div>
      </article>

      <article class="admin-card">
        <h2>신청 정보</h2>
        <p class="admin-policy-form__caption">필요 서류와 신청 방법을 입력하세요.</p>
        <div class="admin-policy-form__grid admin-policy-form__grid--single">
          <label>
            필요 서류
            <input v-model="form.requiredDocs" type="text" placeholder="예: 소득 증빙서류, 신분증" />
          </label>
          <label>
            신청 방법
            <input v-model="form.applyMethod" type="text" placeholder="예: 복지로 온라인 신청" />
          </label>
        </div>
      </article>
    </div>

    <div class="admin-policy-form__warning">
      <p>⚠ 상태를 "마감"으로 저장하면 이 정책은 자동으로 추천 목록에서 제외됩니다.</p>
      <small>추천 제외 여부는 저장 후 정책 목록에서 다시 변경할 수 있어요.</small>
    </div>
  </section>
</template>

<style scoped>
.admin-policy-form__back {
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-policy-form__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-top: 10px;
}

.admin-policy-form__header h1 {
  color: var(--text);
  font-size: 28px;
  font-weight: 800;
}

.admin-policy-form__header p {
  margin-top: 6px;
  color: var(--muted);
  font-size: var(--font-small);
}

.admin-policy-form__save {
  padding: 10px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--accent-strong);
  color: var(--text);
  font-weight: 700 !important;
}

.admin-card {
  margin-top: 20px;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-figma);
}

.admin-card h2 {
  color: var(--text);
  font-size: var(--font-body);
  font-weight: 800;
}

.admin-policy-form__caption {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--font-caption);
}

.admin-policy-form__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.admin-policy-form__grid--single {
  grid-template-columns: 1fr;
}

.admin-policy-form__grid label {
  display: block;
  color: var(--text);
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-policy-form__grid input,
.admin-policy-form__grid select {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--font-small);
  font-weight: 400;
}

.admin-policy-form__grid select {
  padding-right: 36px;

  /* 브라우저 기본 토글 화살표 제거 */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* 커스텀 토글 아이콘(▾) 넣기 및 위치 조절 */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.admin-policy-form__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.admin-policy-form__warning {
  margin-top: 16px;
  padding: 18px 20px;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  background: #fef3c7;
}

.admin-policy-form__warning p {
  color: #b45309;
  font-size: var(--font-small);
  font-weight: 700;
}

.admin-policy-form__warning small {
  display: block;
  margin-top: 4px;
  color: #92400e;
  font-size: var(--font-caption);
}
</style>
