<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { getPoliciesApi } from '@/api/policy'
import { mapPolicyPage } from '@/mappers/policy'

const route = useRoute()
const router = useRouter()
const policy = ref(null)
const loading = ref(true)
const error = ref('')
const policyId = computed(() => String(route.params.policyId || ''))
const statusLabel = computed(() => (policy.value?.status === 'CLOSED' ? '신청 마감' : '신청 가능'))

async function loadPolicy() {
  loading.value = true
  error.value = ''
  try {
    const saved = sessionStorage.getItem(`buttie-policy:${policyId.value}`)
    if (saved) policy.value = JSON.parse(saved)
    if (!policy.value) {
      const response = await getPoliciesApi({ page: 1, size: 1000 })
      policy.value = mapPolicyPage(response).content.find((item) => item.id === policyId.value) || null
    }
    if (!policy.value) error.value = '정책 상세 내용을 찾지 못했습니다.'
  } catch (loadError) {
    error.value = loadError.message || '정책 상세 내용을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadPolicy)
</script>

<template>
  <section class="page policy-detail-page">
    <button class="policy-detail__back" type="button" aria-label="정책 목록으로 돌아가기" @click="router.back()">
      <AppIcon name="chevron" :size="20" /><span>정책 목록</span>
    </button>

    <div v-if="loading" class="policy-detail__state">정책 상세 내용을 불러오는 중이에요.</div>
    <div v-else-if="error" class="policy-detail__state policy-detail__state--error">
      <p>{{ error }}</p><button type="button" @click="loadPolicy">다시 시도</button>
    </div>

    <template v-else-if="policy">
      <header class="policy-detail__heading">
        <span :class="['policy-detail__status', { 'is-closed': policy.status === 'CLOSED' }]">{{ statusLabel }}</span>
        <h1 :title="policy.title">{{ policy.title }}</h1>
        <p>지원 내용과 신청에 필요한 정보를 한눈에 확인하세요.</p>
      </header>

      <div class="policy-detail__metrics">
        <article>
          <span class="policy-detail__metric-icon"><AppIcon name="wallet" :size="18" /></span>
          <small>지원 금액</small><strong>{{ policy.benefit }}</strong>
        </article>
        <article>
          <span class="policy-detail__metric-icon"><AppIcon name="calendar" :size="18" /></span>
          <small>지원 기간</small><strong>{{ policy.supportPeriod }}</strong>
        </article>
        <article>
          <span class="policy-detail__metric-icon"><AppIcon name="clock" :size="18" /></span>
          <small>신청 마감</small><strong>{{ policy.deadline }}</strong>
        </article>
      </div>

      <article class="policy-detail__content">
        <h2>신청 안내</h2>
        <div class="policy-detail__row"><h3>지원 내용</h3><p>{{ policy.detail }}</p></div>
        <div class="policy-detail__row">
          <h3>필요 서류</h3>
          <p>{{ policy.requiredDocument || '원문 정책 페이지에서 제출 서류를 확인해 주세요.' }}</p>
        </div>
        <div class="policy-detail__row">
          <h3>신청 상태</h3>
          <p><span :class="['policy-detail__status-dot', { 'is-closed': policy.status === 'CLOSED' }]"></span>{{ statusLabel }}</p>
        </div>
      </article>

      <a v-if="policy.url" class="policy-detail__cta" :href="policy.url" target="_blank" rel="noopener noreferrer">
        정책 바로가기 <span aria-hidden="true">↗</span>
      </a>
      <p v-else class="policy-detail__no-link">현재 제공된 정책 원문 링크가 없습니다.</p>
    </template>
  </section>
</template>

<style scoped>
.policy-detail-page { max-width: 960px; margin: 0 auto; }
.policy-detail__back { display: inline-flex; min-height: 44px; align-items: center; gap: 8px; margin-bottom: 20px; color: var(--muted); font-size: 14px; font-weight: 700; transition: color .15s; }
.policy-detail__back:hover { color: var(--text); }
.policy-detail__back :deep(svg) { transform: rotate(180deg); }
.policy-detail__heading { padding: 34px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-figma); }
.policy-detail__status { display: inline-flex; padding: 7px 12px; border-radius: 999px; background: var(--success-soft); color: #15865a; font-size: 13px; font-weight: 700; }
.policy-detail__status.is-closed { background: var(--danger-soft); color: var(--danger); }
.policy-detail__heading h1 { display: -webkit-box; overflow: hidden; margin-top: 16px; color: var(--text); font-size: var(--type-page-title-size); font-weight: 800; line-height: 1.35; letter-spacing: -.01em; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.policy-detail__heading p { margin-top: 8px; color: var(--muted); font-size: 14px; }
.policy-detail__metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
.policy-detail__metrics article { display: grid; min-height: 112px; align-content: center; gap: 6px; padding: 20px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); }
.policy-detail__metric-icon { display: inline-flex; width: 32px; height: 32px; align-items: center; justify-content: center; border-radius: 10px; background: var(--primary-soft); color: var(--primary); margin-bottom: 2px; }
.policy-detail__metrics small { color: var(--muted); font-size: 13px; }
.policy-detail__metrics strong { color: var(--text); font-size: 20px; font-weight: 800; }
.policy-detail__content { margin-top: 12px; padding: 30px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-figma); }
.policy-detail__content h2 { margin-bottom: 4px; font-size: 18px; font-weight: 800; color: var(--text); }
.policy-detail__row { display: grid; grid-template-columns: 120px 1fr; gap: 24px; padding: 20px 0; border-bottom: 1px solid var(--border); }
.policy-detail__row:last-child { border-bottom: 0; padding-bottom: 4px; }
.policy-detail__row h3 { font-size: 14px; font-weight: 800; color: var(--text); }
.policy-detail__row p { display: flex; align-items: center; color: var(--muted); font-size: 14px; line-height: 1.7; white-space: pre-line; }
.policy-detail__status-dot { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; background: var(--success); }
.policy-detail__status-dot.is-closed { background: var(--danger); }
.policy-detail__cta { display: flex; width: fit-content; min-width: 200px; min-height: 52px; align-items: center; justify-content: center; gap: 8px; margin: 20px 0 0 auto; padding: 0 24px; border-radius: var(--radius-sm); background: var(--primary); color: white; font-size: 16px; font-weight: 800; box-shadow: var(--shadow-md); transition: transform .15s, box-shadow .15s; }
.policy-detail__cta:hover { transform: translateY(-1px); box-shadow: 0 22px 48px rgb(10 22 128 / 20%); }
.policy-detail__no-link, .policy-detail__state { padding: 32px; border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border); color: var(--muted); text-align: center; }
.policy-detail__state--error { color: var(--danger); }
.policy-detail__state button { margin-top: 12px; font-weight: 800; color: var(--primary); }
@media (max-width: 767px) {
  .policy-detail__heading { padding: 24px 20px; }
  .policy-detail__heading h1 { font-size: 20px; }
  .policy-detail__metrics { grid-template-columns: 1fr; }
  .policy-detail__metrics article { min-height: auto; grid-template-columns: 32px 1fr; align-items: center; gap: 4px 12px; padding: 16px 18px; }
  .policy-detail__metric-icon { grid-row: span 2; margin-bottom: 0; }
  .policy-detail__content { padding: 24px 20px; }
  .policy-detail__row { grid-template-columns: 1fr; gap: 6px; padding: 16px 0; }
  .policy-detail__cta { width: 100%; }
}
</style>
