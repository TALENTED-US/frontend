import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";

const STORAGE_KEY = "buttie-progression-v1";
const LEVEL_REQUIREMENTS = Object.freeze({
  1: 50,
  2: 100,
  3: 250,
  4: 500,
});

function loadProgression() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Number.isFinite(saved.level) && Number.isFinite(saved.exp)) {
      return {
        level: Math.min(5, Math.max(1, saved.level)),
        exp: Math.max(0, saved.exp),
        claimedQuestIds: Array.isArray(saved.claimedQuestIds) ? saved.claimedQuestIds : [],
      };
    }
  } catch {
    // Invalid local data falls back to the demo user's initial progression.
  }

  return { level: 1, exp: 5, claimedQuestIds: [] };
}

export function calculateQuestExp(amount) {
  return Math.abs(Number(amount) || 0) / 10000;
}

export function formatExp(value) {
  const amount = Math.max(0, Number(value) || 0);
  if (amount > 0 && amount < 0.001) return "0.001";
  return Number(amount.toFixed(3)).toString();
}

export const useProgressionStore = defineStore("progression", () => {
  const initial = loadProgression();
  const level = ref(initial.level);
  const exp = ref(initial.exp);
  const claimedQuestIds = ref(initial.claimedQuestIds);

  const nextLevelExp = computed(() => LEVEL_REQUIREMENTS[level.value] || 0);
  const remainingExp = computed(() => Math.max(0, nextLevelExp.value - exp.value));
  const progressPercent = computed(() => {
    if (level.value >= 5) return 100;
    return Math.min(100, (exp.value / nextLevelExp.value) * 100);
  });

  function addExp(reward) {
    exp.value += Math.max(0, Number(reward) || 0);

    while (level.value < 5 && exp.value >= LEVEL_REQUIREMENTS[level.value]) {
      exp.value -= LEVEL_REQUIREMENTS[level.value];
      level.value += 1;
    }
  }

  function claimQuest(questId, amount) {
    if (claimedQuestIds.value.includes(questId)) return false;
    claimedQuestIds.value = [...claimedQuestIds.value, questId];
    addExp(calculateQuestExp(amount));
    return true;
  }

  function removeExp(reward) {
    exp.value -= Math.max(0, Number(reward) || 0);

    while (level.value > 1 && exp.value < 0) {
      level.value -= 1;
      exp.value += LEVEL_REQUIREMENTS[level.value];
    }

    exp.value = Math.max(0, exp.value);
  }

  function cancelQuestClaim(questId, amount) {
    if (!claimedQuestIds.value.includes(questId)) return false;
    claimedQuestIds.value = claimedQuestIds.value.filter((id) => id !== questId);
    removeExp(calculateQuestExp(amount));
    return true;
  }

  function isQuestClaimed(questId) {
    return claimedQuestIds.value.includes(questId);
  }

  watch(
    [level, exp, claimedQuestIds],
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ level: level.value, exp: exp.value, claimedQuestIds: claimedQuestIds.value }),
      );
    },
    { deep: true },
  );

  return {
    level,
    exp,
    claimedQuestIds,
    nextLevelExp,
    remainingExp,
    progressPercent,
    claimQuest,
    cancelQuestClaim,
    isQuestClaimed,
  };
});
