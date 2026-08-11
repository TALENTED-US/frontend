import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'buttie-progression-v1'
const JAEJUN_EXP_RESET_KEY = 'buttie-progression-jaejun-exp-reset-v1'
const JAEJUN_EMAIL = 'jaejun.kim@email.com'
export const LEVEL_REQUIREMENTS = Object.freeze({
  1: 50,
  2: 100,
  3: 250,
  4: 500,
})

export function normalizeButtieProgression(totalExp) {
  const normalizedTotalExp = Math.max(0, Number(totalExp) || 0)
  let level = 1
  let exp = normalizedTotalExp

  while (level < 5 && exp >= LEVEL_REQUIREMENTS[level]) {
    exp -= LEVEL_REQUIREMENTS[level]
    level += 1
  }

  return {
    level,
    exp: level === 5 ? 0 : exp,
    requiredExp: LEVEL_REQUIREMENTS[level] || 0,
    totalExp: normalizedTotalExp,
  }
}
const DEFAULT_PROGRESSION = Object.freeze({ level: 1, exp: 5, claimedQuestIds: [] })

function isJaejunAccount() {
  try {
    const savedProfile = JSON.parse(localStorage.getItem('buttie-profile') || 'null')
    const email = savedProfile?.email || JAEJUN_EMAIL
    return String(email).trim().toLowerCase() === JAEJUN_EMAIL
  } catch {
    return true
  }
}

function loadProgression() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (isJaejunAccount() && localStorage.getItem(JAEJUN_EXP_RESET_KEY) !== 'done') {
      const restored = {
        ...DEFAULT_PROGRESSION,
        claimedQuestIds: Array.isArray(saved?.claimedQuestIds) ? saved.claimedQuestIds : [],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored))
      localStorage.setItem(JAEJUN_EXP_RESET_KEY, 'done')
      return restored
    }

    if (saved && Number.isFinite(saved.level) && Number.isFinite(saved.exp)) {
      const level = Math.min(5, Math.max(1, Math.trunc(saved.level)))
      const exp = Math.max(0, saved.exp)
      const hasInvalidExp = level === 5 ? exp > 0 : exp >= LEVEL_REQUIREMENTS[level]

      if (hasInvalidExp) {
        const restored = { ...DEFAULT_PROGRESSION, claimedQuestIds: [] }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored))
        return restored
      }

      return {
        level,
        exp: level === 5 ? 0 : exp,
        claimedQuestIds: Array.isArray(saved.claimedQuestIds) ? saved.claimedQuestIds : [],
      }
    }
  } catch {
    // Invalid local data falls back to the demo user's initial progression.
  }

  return { ...DEFAULT_PROGRESSION, claimedQuestIds: [] }
}

export function calculateQuestExp(amount) {
  return Math.abs(Number(amount) || 0) / 10000
}

export function formatExp(value) {
  const amount = Math.max(0, Number(value) || 0)
  return Math.round(amount).toString()
}

export const useProgressionStore = defineStore('progression', () => {
  const initial = loadProgression()
  const level = ref(initial.level)
  const exp = ref(initial.exp)
  const claimedQuestIds = ref(initial.claimedQuestIds)

  const nextLevelExp = computed(() => LEVEL_REQUIREMENTS[level.value] || 0)
  const remainingExp = computed(() => Math.max(0, nextLevelExp.value - exp.value))
  const progressPercent = computed(() => {
    if (level.value >= 5) return 100
    return Math.min(100, (exp.value / nextLevelExp.value) * 100)
  })

  function addExp(reward) {
    if (level.value >= 5) {
      exp.value = 0
      return
    }

    exp.value += Math.max(0, Number(reward) || 0)

    while (level.value < 5 && exp.value >= LEVEL_REQUIREMENTS[level.value]) {
      exp.value -= LEVEL_REQUIREMENTS[level.value]
      level.value += 1
    }

    if (level.value >= 5) exp.value = 0
  }

  function claimQuest(questId, amount) {
    if (claimedQuestIds.value.includes(questId)) return false
    claimedQuestIds.value = [...claimedQuestIds.value, questId]
    addExp(calculateQuestExp(amount))
    return true
  }

  function removeExp(reward) {
    exp.value -= Math.max(0, Number(reward) || 0)

    while (level.value > 1 && exp.value < 0) {
      level.value -= 1
      exp.value += LEVEL_REQUIREMENTS[level.value]
    }

    exp.value = Math.max(0, exp.value)
  }

  function cancelQuestClaim(questId, amount) {
    if (!claimedQuestIds.value.includes(questId)) return false
    claimedQuestIds.value = claimedQuestIds.value.filter((id) => id !== questId)
    removeExp(calculateQuestExp(amount))
    return true
  }

  function isQuestClaimed(questId) {
    return claimedQuestIds.value.includes(questId)
  }

  function migrateRecurringQuestClaims(ids, monthKey) {
    if (!monthKey || !Array.isArray(ids) || !ids.length) return
    const recurringIds = new Set(ids)
    let changed = false
    const migrated = claimedQuestIds.value.map((id) => {
      if (!recurringIds.has(id)) return id
      changed = true
      return `${id}@${monthKey}`
    })
    if (changed) claimedQuestIds.value = [...new Set(migrated)]
  }

  watch(
    [level, exp, claimedQuestIds],
    () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          level: level.value,
          exp: exp.value,
          claimedQuestIds: claimedQuestIds.value,
        }),
      )
    },
    { deep: true },
  )

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
    migrateRecurringQuestClaims,
  }
})
