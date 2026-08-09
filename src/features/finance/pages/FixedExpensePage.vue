<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  financeTransactions,
  fixedExpenses,
  loadFixedExpenses,
  setFixed,
} from "@/features/finance/financeStore";

const route = useRoute();
const router = useRouter();
const selected = ref([]);
const query = ref("");
const dismissedSuggestion = ref(false);
const fixedCandidateCategories = new Set([
  "월세",
  "주거",
  "구독",
  "보험",
  "통신비",
  "공과금",
  "교통",
  "교육",
]);
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const fixedMonth = ref(currentMonth);
const money = (value) => new Intl.NumberFormat("ko-KR").format(Math.abs(value));
const fixedMonthLabel = computed(() => {
  const [year, month] = fixedMonth.value.split("-").map(Number);
  return `${year}년 ${month}월`;
});
const fixedPeriodLabel = computed(() =>
  fixedMonth.value === currentMonth
    ? "이번 달"
    : `${Number(fixedMonth.value.split("-")[1])}월`,
);
const mode = computed(() =>
  route.name === "fixedExpenseAdd"
    ? "add"
    : route.name === "fixedExpenseDelete"
      ? "delete"
      : "detail",
);
const fixedRows = computed(() =>
  fixedExpenses.value.filter((row) => row.date.startsWith(fixedMonth.value)),
);
const registeredFixedRows = computed(() => fixedExpenses.value);
const candidates = computed(() => {
  const recurringByRule = new Map();
  financeTransactions.value
    .filter(
      (row) =>
        row.amount < 0 &&
        !row.fixed &&
        fixedCandidateCategories.has(row.category),
    )
    .forEach((row) => {
      const key = `${row.title}|${row.category}`;
      const rows = recurringByRule.get(key) || [];
      rows.push(row);
      recurringByRule.set(key, rows);
    });

  return [...recurringByRule.values()]
    .filter((rows) => rows.length >= 2)
    .map((rows) => {
      const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
      return {
        ...sorted[0],
        recurringIds: sorted.map((row) => row.id),
        occurrenceCount: sorted.length,
      };
    })
    .filter((row) => row.title.includes(query.value.trim()))
    .sort(
      (a, b) =>
        b.occurrenceCount - a.occurrenceCount || b.date.localeCompare(a.date),
    )
    .slice(0, 15);
});
const suggestedRow = computed(() =>
  dismissedSuggestion.value ? null : candidates.value[0] || null,
);
const visibleRows = computed(() =>
  mode.value === "add"
    ? candidates.value
    : mode.value === "delete"
      ? registeredFixedRows.value
      : fixedRows.value,
);
const allSelected = computed(
  () =>
    visibleRows.value.length > 0 &&
    visibleRows.value.every((row) => selected.value.includes(row.id)),
);
const total = computed(() =>
  fixedRows.value.reduce((sum, row) => sum + Math.abs(row.amount), 0),
);
const grouped = computed(() => {
  const map = {};
  const categoryOrder = ["보험", "구독", "월세", "교통", "기타"];
  visibleRows.value.forEach((row) => {
    (map[row.category] ||= []).push(row);
  });
  return Object.entries(map).sort(
    ([a], [b]) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );
});
function categoryClass(category) {
  return (
    {
      보험: "category-insurance",
      구독: "category-subscription",
      월세: "category-rent",
      교통: "category-transport",
      기타: "category-other",
    }[category] || "category-other"
  );
}
function toggle(id) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((x) => x !== id)
    : [...selected.value, id];
}
function toggleAll() {
  selected.value = allSelected.value
    ? []
    : visibleRows.value.map((row) => row.id);
}
function changeFixedMonth(offset) {
  const [year, month] = fixedMonth.value.split("-").map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  const candidate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  if (candidate <= currentMonth) fixedMonth.value = candidate;
}
function submit() {
  if (mode.value === "delete") {
    setFixed(selected.value, false);
  } else {
    const selectedRules = candidates.value.filter((row) =>
      selected.value.includes(row.id),
    );
    setFixed(selectedRules.flatMap((row) => row.recurringIds), true);
  }
  router.push({ name: "fixedExpenses" });
}
function registerSuggestion() {
  if (!suggestedRow.value) return;
  setFixed(suggestedRow.value.recurringIds, true);
  dismissedSuggestion.value = true;
}
onMounted(async () => {
  try {
    await loadFixedExpenses();
  } catch {}
});
</script>
<template>
  <section :class="['fixed-page', `fixed-page--${mode}`]">
    <header>
      <button @click="router.back()">‹</button>
      <div>
        <h1>
          {{
            mode === "detail"
              ? "고정지출"
              : mode === "add"
                ? "고정지출 추가"
                : "고정지출 삭제"
          }}
        </h1>
        <p v-if="mode === 'add'">매월 반복되는 지출을 바로 등록할 수 있어요.</p>
        <p v-if="mode === 'delete'">
          삭제해도 지난 거래 내역은 그대로 유지돼요.
        </p>
      </div>
    </header>
    <template v-if="mode === 'detail'">
      <div class="month">
        <button type="button" aria-label="이전 달" @click="changeFixedMonth(-1)">‹</button>
        <b>{{ fixedMonthLabel }}</b>
        <button
          type="button"
          aria-label="다음 달"
          :disabled="fixedMonth === currentMonth"
          @click="changeFixedMonth(1)"
        >›</button>
      </div>
      <div class="total">
        <span>{{ fixedPeriodLabel }} 고정지출 합계</span
        ><small>총 {{ fixedRows.length }}건</small
        ><strong>총 {{ (total / 10000).toFixed(1) }}만원</strong>
      </div>
      <div v-if="suggestedRow" class="suggest">
        <b>고정지출 후보</b
        ><strong
          >{{ suggestedRow.title }} · 최근 {{ suggestedRow.occurrenceCount }}회
          {{ money(suggestedRow.amount) }}원대 결제</strong
        >
        <p>매달 비슷한 금액이 반복돼요. 고정지출로 등록할까요?</p>
        <button type="button" @click="dismissedSuggestion = true">아니에요</button
        ><button type="button" @click="registerSuggestion"
          ><strong>고정지출로 등록</strong></button
        >
      </div>
    </template>
    <div v-if="mode === 'add'" class="search">
      <input v-model="query" placeholder="거래명 검색 (예: 넷플릭스, 월세)" />
    </div>
    <div v-if="mode !== 'detail'" class="selection-head">
      <b>{{ selected.length }}건 선택됨</b
      ><button
        class="select-all-button"
        type="button"
        :aria-pressed="allSelected"
        @click="toggleAll"
      >
        <strong>{{ allSelected ? "전체 해제" : "전체 선택" }}</strong>
      </button>
    </div>
    <section class="expense-list">
      <p v-if="!visibleRows.length" class="empty-message">
        {{ mode === "delete" ? "삭제할 고정지출이 없어요." : "표시할 거래가 없어요." }}
      </p>
      <template v-for="[category, rows] in grouped" :key="category">
        <h2 :class="categoryClass(category)">
          <span>●</span>{{ category
          }}<b
            >{{
              (
                rows.reduce((s, r) => s + Math.abs(r.amount), 0) / 10000
              ).toFixed(1)
            }}만원</b
          >
        </h2>
        <button
          v-for="row in rows"
          :key="row.id"
          :class="[categoryClass(category), { chosen: selected.includes(row.id) }]"
          @click="mode !== 'detail' && toggle(row.id)"
        >
          <i>{{ row.title.slice(0, 1) }}</i
          ><span
            ><strong>{{ row.title }}</strong
            ><small
              ><template v-if="mode === 'detail'"
                >매월 {{ Number(row.date.slice(8, 10)) }}일 · {{ row.detail }}</template
              ><template v-else
                >{{ row.date.slice(5).replace('-', '월 ') }}일 · {{ row.detail }}</template
              ><template v-if="row.occurrenceCount">
                · {{ row.occurrenceCount }}회 반복</template
              ></small
            ></span
          ><b>{{ row.originalAmount || `-${money(row.amount)}원` }}</b
          ><em v-if="mode !== 'detail'">{{
            selected.includes(row.id) ? "✓" : ""
          }}</em>
        </button>
      </template>
    </section>
    <div v-if="mode === 'detail'" class="actions">
      <button @click="router.push({ name: 'fixedExpenseAdd' })">
        <strong>+ 고정지출 추가하기</strong></button
      ><button @click="router.push({ name: 'fixedExpenseDelete' })">
        <strong>- 고정지출 삭제하기</strong>
      </button>
    </div>
    <footer v-else>
      <b>{{ selected.length }}건 선택됨</b
      ><button :disabled="!selected.length" @click="submit">
        <strong>{{
          mode === "add" ? "고정지출로 추가하기" : "선택한 고정지출 삭제"
        }}</strong>
      </button>
    </footer>
  </section>
</template>
<style scoped>
.fixed-page {
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  padding-top: 18px;
  color: #222;
}
.fixed-page > header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin: 0 0 24px;
}
.fixed-page header button {
  border: 0;
  background: none;
  padding: 2px;
  font-weight: 700;
}
.fixed-page header button:last-child {
  margin-left: auto;
}
.fixed-page h1 {
  margin: 0;
  color: #222;
  font-size: 24px;
  line-height: 1.3;
}
.fixed-page header p {
  margin: 5px 0 0;
  color: #666;
  font-size: 13px;
}
.month {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 11px;
  border: 1px solid #d9dce3;
  border-radius: 14px;
  color: #475569;
}
.month button {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #475569;
  font-family: "Pretendard", sans-serif !important;
  font-size: 18px !important;
  font-weight: 700 !important;
  line-height: 1;
}
.month button:hover {
  background: #f0f2f7;
}
.total {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-bottom: 16px;
  padding: 20px 22px;
  border: 1px solid #d9dce3;
  border-radius: 18px;
  box-shadow: 0 2px 4px #0002;
}
.total span,
.total small {
  color: #666;
  font-size: 12px;
}
.total strong {
  grid-column: 1/-1;
  font-size: 28px;
}
.suggest {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 5px 8px;
  margin-bottom: 18px;
  padding: 16px 20px;
  border-radius: 16px;
  background: #e8efff;
}
.suggest > * {
  margin: 0;
}
.suggest > b {
  grid-column: 1/-1;
  width: max-content;
  padding: 5px 12px;
  border-radius: 16px;
  background: #93b2f8;
  color: #fff;
  font-size: 11px;
}
.suggest strong {
  grid-column: 1/-1;
  font-size: 13px;
}
.suggest p {
  color: #666;
  font-size: 11px;
}
.suggest button {
  border: 1px solid #d9dce3;
  border-radius: 20px;
  background: #fff;
  padding: 8px 18px;
  font-size: 11px;
}
.suggest button:last-child {
  border-color: #93b2f8;
  background: #93b2f8;
  font-weight: 700 !important;
}
.search input {
  width: 100%;
  height: 58px;
  padding: 0 20px;
  border: 1px solid #d9dce3;
  border-radius: 14px;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 2px 4px #0002;
  font: inherit;
}
.selection-head {
  display: flex;
  justify-content: space-between;
  padding: 18px 6px 10px;
  font-size: 13px;
}
.selection-head .select-all-button {
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #d9dce3;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px #0001;
  font-weight: 700 !important;
}
.expense-list {
  padding: 18px 20px;
  border: 1px solid #d9dce3;
  border-radius: 18px;
  box-shadow: 0 2px 4px #0002;
}
.empty-message {
  margin: 0;
  padding: 32px 12px;
  color: #666;
  text-align: center;
  font-size: 13px;
}
.expense-list h2 {
  display: flex;
  gap: 7px;
  margin: 14px 0 7px;
  font-size: 13px;
}
.expense-list h2:first-child {
  margin-top: 0;
}
.expense-list h2 b {
  margin-left: auto;
}
.expense-list h2 span {
  color: #8e7cc3;
}
.expense-list > button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 11px 14px;
  border: 1px solid #d9dce3;
  border-radius: 13px;
  background: #fff;
  text-align: left;
  box-shadow: 0 2px 4px #0002;
}
.expense-list > button.chosen {
  background: #fff5c8;
}
.expense-list i {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  background: #f0f1fa;
  color: #8e7cc3;
  font-style: normal;
}
.expense-list button span {
  display: grid;
}
.expense-list button strong {
  font-size: 13px;
}
.expense-list small {
  margin-top: 2px;
  color: #666;
  font-size: 10px;
}
.expense-list button > b {
  margin-left: auto;
  white-space: nowrap;
  font-size: 13px;
}
.expense-list em {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  flex: none;
  border: 1px solid #cfd4df;
  border-radius: 50%;
  background: #fff;
  color: #fff;
  font-style: normal;
}
.expense-list .chosen em {
  border-color: #ffb21c;
  background: #ffb21c;
}
.actions,
footer {
  display: flex;
  gap: 16px;
  margin-top: 18px;
}
.actions button,
footer button {
  flex: 1;
  border: 0;
  border-radius: 12px;
  padding: 15px;
  font-size: 13px;
  font-weight: 700 !important;
}
.fixed-page .suggest button:last-child,
.fixed-page .selection-head .select-all-button,
.fixed-page .actions button,
.fixed-page footer button,
.fixed-page .suggest button:last-child strong,
.fixed-page .selection-head .select-all-button strong,
.fixed-page .actions button strong,
.fixed-page footer button strong {
  font-family: "Pretendard", sans-serif !important;
  font-weight: 700 !important;
}
.actions button:first-child,
footer button {
  background: #ffeda7;
}
.actions button:last-child {
  background: #eee;
}
footer {
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
}
footer button {
  max-width: 420px;
}
footer button:disabled {
  opacity: 0.45;
}
.fixed-page--detail {
  max-width: 880px;
}
.fixed-page--detail .expense-list {
  margin-top: 18px;
}
@media (max-width: 767px) {
  .fixed-page {
    padding: 0 10px;
  }
  .fixed-page > header {
    margin: 0 -10px 14px;
    padding: 0 10px 10px;
    border-bottom: 1px solid #e5e8ee;
  }
  .fixed-page h1 {
    font-size: 18px;
  }
  .fixed-page header p {
    font-size: 11px;
  }
  .fixed-page > header button {
    font-size: 16px;
  }
  .month {
    padding: 12px;
    margin-bottom: 16px;
  }
  .total {
    padding: 16px;
    border-radius: 16px;
  }
  .total strong {
    font-size: 28px;
  }
  .suggest {
    display: block;
    padding: 16px;
    margin-bottom: 14px;
  }
  .suggest > * {
    display: block;
    margin: 5px 0;
  }
  .suggest button {
    display: inline-block;
  }
  .search input {
    height: 46px;
    font-size: 12px;
  }
  .selection-head {
    padding: 16px 0 8px;
    font-size: 12px;
  }
  .fixed-page .expense-list {
    border: 0;
    padding: 0 2px;
    box-shadow: none !important;
  }
  .expense-list h2 {
    font-size: 13px;
    line-height: 20px;
    margin: 28px 0 9px;
  }
  .expense-list h2:first-child {
    margin-top: 0;
  }
  .expense-list > button {
    min-height: 78px;
    margin-bottom: 10px;
    padding: 16px 22px;
    border-radius: 14px;
    box-shadow: 0 2px 4px #0002;
  }
  .expense-list > button:last-child {
    margin-bottom: 0;
  }
  .expense-list button strong,
  .expense-list button > b {
    font-size: 13px;
  }
  .expense-list small {
    font-size: 10px;
  }
  .actions {
    gap: 10px;
    margin: 12px 2px 0;
    padding: 2px 0 0;
    background: transparent;
  }
  .fixed-page--detail .expense-list {
    margin-top: 0;
  }
  .expense-list h2.category-subscription span {
    color: #222;
  }
  .expense-list h2.category-rent span {
    color: #f4cf63;
  }
  .expense-list h2.category-transport span {
    color: #f49a9a;
  }
  .expense-list h2.category-other span {
    color: #94a3b8;
  }
  .expense-list > button.category-subscription i {
    background: #eef0f7;
    color: #343a46;
  }
  .expense-list > button.category-rent i {
    background: #fff4d5;
    color: #e7ad21;
  }
  .expense-list > button.category-transport i {
    background: #fff0f0;
    color: #ef5350;
  }
  .expense-list > button.category-other i {
    background: #eef1f5;
    color: #8290a5;
  }
  .actions button {
    padding: 15px 7px;
    font-size: 12px;
  }
  footer {
    margin: 10px 0 0;
    padding: 8px 0;
    background: transparent;
    font-size: 12px;
  }
  footer button {
    max-width: 230px;
    padding: 15px 8px;
  }
  .fixed-page--add .expense-list,
  .fixed-page--delete .expense-list {
    padding-bottom: 2px;
  }
}
</style>
