import level1Stable from '@/assets/images/dashboard/levels/buttie-l1-stable.png'
import level2Stable from '@/assets/images/dashboard/levels/buttie-l2-stable.png'
import level3Stable from '@/assets/images/dashboard/levels/buttie-l3-stable.png'
import level4Stable from '@/assets/images/dashboard/levels/buttie-l4-stable.png'
import level5Stable from '@/assets/images/dashboard/levels/buttie-l5-stable.png'
import level1Caution from '@/assets/images/dashboard/levels/buttie-l1-caution.png'
import level2Caution from '@/assets/images/dashboard/levels/buttie-l2-caution.png'
import level3Caution from '@/assets/images/dashboard/levels/buttie-l3-caution.png'
import level4Caution from '@/assets/images/dashboard/levels/buttie-l4-caution.png'
import level5Caution from '@/assets/images/dashboard/levels/buttie-l5-caution.png'
import level1Danger from '@/assets/images/dashboard/levels/buttie-l1-danger.png'
import level2Danger from '@/assets/images/dashboard/levels/buttie-l2-danger.png'
import level3Danger from '@/assets/images/dashboard/levels/buttie-l3-danger.png'
import level4Danger from '@/assets/images/dashboard/levels/buttie-l4-danger.png'
import level5Danger from '@/assets/images/dashboard/levels/buttie-l5-danger.png'

const levelImages = {
  stable: [level1Stable, level2Stable, level3Stable, level4Stable, level5Stable],
  caution: [level1Caution, level2Caution, level3Caution, level4Caution, level5Caution],
  danger: [level1Danger, level2Danger, level3Danger, level4Danger, level5Danger],
}

const statusAliases = {
  stable: 'stable',
  caution: 'caution',
  danger: 'danger',
  risk: 'danger',
  안정: 'stable',
  주의: 'caution',
  위험: 'danger',
}

export function getButtieLevelImage(level, status) {
  const normalizedLevel = Math.min(5, Math.max(1, Math.trunc(Number(level) || 1)))
  const normalizedStatus = statusAliases[status] || 'caution'

  return levelImages[normalizedStatus][normalizedLevel - 1]
}
