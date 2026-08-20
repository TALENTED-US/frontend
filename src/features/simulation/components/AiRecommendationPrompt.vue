<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  category: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit'])
const prompt = ref('')

const copy = computed(
  () =>
    ({
      expense: {
        label: 'AI 지출 절약 추천 요청',
        placeholder: '예: 카페와 배달비를 줄이고 싶어요',
        guide: '줄이고 싶은 소비나 월 절약 목표를 입력해 주세요.',
      },
      income: {
        label: 'AI 수입 늘리기 추천 요청',
        placeholder: '예: 주말 저녁 카페 알바를 찾고 싶어요',
        guide: '희망 지역, 요일 또는 근무 조건을 입력해 주세요.',
      },
      policy: {
        label: 'AI 맞춤 정책 추천 요청',
        placeholder: '예: 자격증 준비 비용을 지원받고 싶어요',
        guide: '필요한 지원이나 준비 목적을 입력해 주세요.',
      },
    })[props.category],
)

const canSubmit = computed(() => prompt.value.trim().length > 0 && !props.loading)

function submit() {
  const value = prompt.value.trim()
  if (!value || props.loading) return
  emit('submit', value)
}
</script>

<template>
  <form class="ai-recommendation-prompt" @submit.prevent="submit">
    <div class="ai-recommendation-prompt__field">
      <input
        v-model="prompt"
        type="text"
        maxlength="500"
        :placeholder="copy.placeholder"
        :aria-label="copy.label"
        :disabled="loading"
      />
      <button type="submit" :disabled="!canSubmit" :aria-label="`${copy.label} 보내기`">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 19V5M6.5 10.5 12 5l5.5 5.5" />
        </svg>
      </button>
    </div>
    <small>{{ loading ? 'AI가 입력한 조건을 분석하고 있어요.' : copy.guide }}</small>
  </form>
</template>

<style scoped>
.ai-recommendation-prompt {
  display: grid;
  gap: 7px;
  width: 100%;
  margin-top: 18px;
}

.ai-recommendation-prompt__field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
  align-items: center;
  padding: 6px 7px 6px 16px;
  border: 1px solid #dfe3ee;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 7px 20px rgb(25 39 115 / 7%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.ai-recommendation-prompt__field:focus-within {
  border-color: #9aa7ee;
  box-shadow: 0 0 0 3px rgb(32 49 169 / 9%), 0 8px 22px rgb(25 39 115 / 9%);
}

.ai-recommendation-prompt input {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #20263a;
  font: inherit;
  font-size: 13px;
}

.ai-recommendation-prompt input::placeholder {
  color: #9aa2b3;
}

.ai-recommendation-prompt button {
  display: grid;
  width: 38px;
  height: 38px;
  min-width: 38px;
  min-height: 38px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #17269e;
  color: #fff;
  cursor: pointer;
}

.ai-recommendation-prompt button:disabled {
  background: #e9ecf3;
  color: #aeb5c4;
  cursor: default;
}

.ai-recommendation-prompt svg {
  width: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.ai-recommendation-prompt small {
  padding: 0 10px;
  color: #929bad;
  font-size: 10px;
  line-height: 1.45;
  text-align: center;
}

@media (min-width: 1280px) {
  .ai-recommendation-prompt {
    grid-column: 1 / -1;
  }

  .ai-recommendation-prompt__field {
    border-radius: 20px;
  }

  .ai-recommendation-prompt input {
    font-size: 15px;
  }
}
</style>
