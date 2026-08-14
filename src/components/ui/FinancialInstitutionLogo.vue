<script setup>
import { computed } from 'vue'
import nhLogo from '@/assets/logos/financial/nh.svg'
import kbLogo from '@/assets/logos/financial/kb.svg'
import shinhanLogo from '@/assets/logos/financial/shinhan.svg'
import wooriLogo from '@/assets/logos/financial/woori.svg'
import hanaLogo from '@/assets/logos/financial/hana.svg'
import ibkLogo from '@/assets/logos/financial/ibk.svg'
import scLogo from '@/assets/logos/financial/sc.svg'
import citiLogo from '@/assets/logos/financial/citi.svg'
import dgbLogo from '@/assets/logos/financial/dgb.svg'
import regionalLogo from '@/assets/logos/financial/gwangju-jeonbuk.svg'
import postLogo from '@/assets/logos/financial/post.svg'
import creditUnionLogo from '@/assets/logos/financial/cu.svg'
import bnkLogo from '@/assets/logos/financial/bnk.svg'
import suhyupLogo from '@/assets/logos/financial/suhyup.svg'
import kakaoLogo from '@/assets/logos/financial/kakao.svg'
import kbankLogo from '@/assets/logos/financial/kbank.svg'
import tossbankLogo from '@/assets/logos/financial/tossbank.svg'
import forestryLogo from '@/assets/logos/financial/forestry.svg'
import bcCardLogo from '@/assets/logos/financial/bc-card.svg'
import samsungCardLogo from '@/assets/logos/financial/samsung-card.svg'
import lotteCardLogo from '@/assets/logos/financial/lotte-card.svg'
import hyundaiCardLogo from '@/assets/logos/financial/hyundai-card.svg'

const props = defineProps({
  name: { type: String, default: '' },
  kind: { type: String, default: 'bank' },
  size: { type: Number, default: 42 },
})

const normalizedName = computed(() => props.name.replace(/\s+/g, '').toLowerCase())
const logo = computed(() => {
  const name = normalizedName.value
  if (props.kind === 'card' || name.includes('카드')) {
    if (name.includes('비씨') || name.includes('bc')) return bcCardLogo
    if (name.includes('삼성')) return samsungCardLogo
    if (name.includes('롯데')) return lotteCardLogo
    if (name.includes('현대')) return hyundaiCardLogo
  }
  if (name.includes('국민') || name.includes('kb')) return kbLogo
  if (name.includes('신한')) return shinhanLogo
  if (name.includes('우리')) return wooriLogo
  if (name.includes('하나') || name.includes('keb')) return hanaLogo
  if (name.includes('농협') || name.includes('nh')) return nhLogo
  if (name.includes('기업') || name.includes('ibk')) return ibkLogo
  if (name.includes('sc') || name.includes('제일')) return scLogo
  if (name.includes('씨티') || name.includes('citi')) return citiLogo
  if (name.includes('대구') || name.includes('dgb')) return dgbLogo
  if (name.includes('광주') || name.includes('전북')) return regionalLogo
  if (name.includes('부산') || name.includes('경남') || name.includes('bnk')) return bnkLogo
  if (name.includes('우체국')) return postLogo
  if (name.includes('신협')) return creditUnionLogo
  if (name.includes('수협')) return suhyupLogo
  if (name.includes('카카오')) return kakaoLogo
  if (name.includes('케이뱅크') || name.includes('kbank')) return kbankLogo
  if (name.includes('토스')) return tossbankLogo
  if (name.includes('산림')) return forestryLogo
  return ''
})

const fallback = computed(() => {
  const compact = props.name.replace(/은행|카드|증권|저축/g, '').trim()
  return (compact || '금융').slice(0, 2)
})
</script>

<template>
  <span
    class="financial-logo"
    :style="{ '--financial-logo-size': `${size}px` }"
    aria-hidden="true"
  >
    <img v-if="logo" :src="logo" alt="" />
    <b v-else>{{ fallback }}</b>
  </span>
</template>

<style scoped>
.financial-logo {
  display: grid;
  width: var(--financial-logo-size);
  height: var(--financial-logo-size);
  flex: 0 0 var(--financial-logo-size);
  place-items: center;
  overflow: hidden;
  border: 1px solid #e7eaf0;
  border-radius: 13px;
  background: #fff;
}
.financial-logo img {
  display: block;
  width: calc(var(--financial-logo-size) - 10px);
  height: calc(var(--financial-logo-size) - 10px);
  object-fit: contain;
}
.financial-logo b {
  color: #596275;
  font-size: 11px;
  font-weight: 800;
}
</style>
