<script setup>
import loadingSymbol from '@/assets/images/simulation/buttie-loading-symbol.png'
import loadingWordmark from '@/assets/images/simulation/buttie-loading-wordmark.png'
</script>

<template>
  <div class="ai-recommendation-loader" role="status" aria-live="polite">
    <div class="ai-recommendation-loader__visual" aria-hidden="true">
      <span class="ai-recommendation-loader__core">
        <img
          class="ai-recommendation-loader__symbol"
          :src="loadingSymbol"
          alt=""
        />
        <img
          class="ai-recommendation-loader__wordmark"
          :src="loadingWordmark"
          alt=""
        />
      </span>
      <span class="ai-recommendation-loader__orbit ai-recommendation-loader__orbit--one"></span>
      <span class="ai-recommendation-loader__orbit ai-recommendation-loader__orbit--two"></span>
      <span class="ai-recommendation-loader__orbit ai-recommendation-loader__orbit--three"></span>
    </div>

    <div class="ai-recommendation-loader__copy">
      <span class="ai-recommendation-loader__eyebrow">BUTTIE AI ANALYSIS</span>
      <strong>맞춤 재정 계획을 준비하고 있어요</strong>
      <p>
        내 재정 상태와 취업 준비 정보를 바탕으로<br />
        지금 가장 필요한 계획을 찾고 있어요.
      </p>
    </div>

    <div class="ai-recommendation-loader__steps" aria-hidden="true">
      <span><i></i>재정 현황 확인</span>
      <span><i></i>맞춤 추천 생성</span>
      <span><i></i>결과 정리</span>
    </div>

    <div class="ai-recommendation-loader__track" aria-hidden="true">
      <span></span>
    </div>

    <small>분석이 끝나면 결과가 자동으로 표시돼요.</small>
  </div>
</template>

<style scoped>
.ai-recommendation-loader {
  --ai-orbit-distance: 50px;

  display: grid;
  justify-items: center;
  gap: 22px;
  padding: 38px 36px 32px;
  overflow: hidden;
  border-radius: 20px;
  background:
    radial-gradient(circle at 50% 16%, rgb(255 205 82 / 13%), transparent 26%),
    linear-gradient(145deg, #fafbff 0%, #f5f7ff 100%);
  color: #737b8b;
  text-align: center;
}

.ai-recommendation-loader__visual {
  position: relative;
  display: grid;
  width: 106px;
  height: 106px;
  place-items: center;
}

.ai-recommendation-loader__visual::before {
  position: absolute;
  inset: 2px;
  border: 3px solid rgb(83 99 221 / 13%);
  border-top-color: #5363dd;
  border-right-color: #f4ad1d;
  border-radius: 50%;
  animation: ai-ring-spin 1s linear infinite;
  content: '';
}

.ai-recommendation-loader__core {
  position: relative;
  z-index: 2;
  display: flex;
  width: 80px;
  height: 80px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  overflow: hidden;
  border: 1px solid rgb(244 173 29 / 22%);
  border-radius: 23px;
  background: #fff;
  box-shadow: 0 7px 18px rgb(21 35 156 / 16%);
  animation: ai-core-pulse 1.6s ease-in-out infinite;
}

.ai-recommendation-loader__symbol {
  display: block;
  width: 47px;
  height: 42px;
  object-fit: contain;
}

.ai-recommendation-loader__wordmark {
  display: block;
  width: 52px;
  height: 19px;
  object-fit: contain;
}

.ai-recommendation-loader__orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px;
  border-radius: 50%;
  background: #f4ad1d;
  box-shadow: 0 0 0 3px rgb(244 173 29 / 13%);
  animation: ai-orbit 1.5s linear infinite;
}

.ai-recommendation-loader__orbit--two {
  background: #6b76dc;
  animation-delay: -0.5s;
}

.ai-recommendation-loader__orbit--three {
  background: #ffcf54;
  animation-delay: -1s;
}

.ai-recommendation-loader__copy {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.ai-recommendation-loader__eyebrow {
  color: #15239c;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.ai-recommendation-loader__copy strong {
  color: #1f2942;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: -0.03em;
}

.ai-recommendation-loader__copy p {
  margin: 0;
  color: #747e91;
  font-size: 14px;
  line-height: 1.65;
}

.ai-recommendation-loader__steps {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.ai-recommendation-loader__steps span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 11px;
  border: 1px solid #e3e7f2;
  border-radius: 999px;
  background: rgb(255 255 255 / 76%);
  color: #6d7689;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.ai-recommendation-loader__steps i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5363dd;
  box-shadow: 0 0 0 4px rgb(83 99 221 / 10%);
  animation: ai-step-pulse 1.8s ease-in-out infinite;
}

.ai-recommendation-loader__steps span:nth-child(2) i {
  animation-delay: 0.6s;
}

.ai-recommendation-loader__steps span:nth-child(3) i {
  animation-delay: 1.2s;
}

.ai-recommendation-loader__track {
  width: min(360px, 92%);
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #dfe2ed;
}

.ai-recommendation-loader > small {
  margin-top: -10px;
  color: #8b93a3;
  font-size: 12px;
  line-height: 1.5;
}

.ai-recommendation-loader__track span {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #15239c, #5363dd, #f4ad1d);
  animation: ai-progress 1.55s ease-in-out infinite;
}

@keyframes ai-core-pulse {
  0%,
  100% {
    transform: scale(0.96);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes ai-ring-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ai-orbit {
  from {
    transform: rotate(0deg) translateX(var(--ai-orbit-distance)) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(var(--ai-orbit-distance)) rotate(-360deg);
  }
}

@keyframes ai-step-pulse {
  0%,
  100% {
    transform: scale(0.82);
    opacity: 0.45;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}

@keyframes ai-progress {
  0% {
    transform: translateX(-110%);
  }
  55% {
    transform: translateX(85%);
  }
  100% {
    transform: translateX(245%);
  }
}

@media (max-width: 560px) {
  .ai-recommendation-loader {
    --ai-orbit-distance: 43px;

    gap: 18px;
    padding: 30px 20px 26px;
    border-radius: 18px;
  }

  .ai-recommendation-loader__visual {
    width: 92px;
    height: 92px;
  }

  .ai-recommendation-loader__core {
    width: 70px;
    height: 70px;
    border-radius: 20px;
  }

  .ai-recommendation-loader__symbol {
    width: 41px;
    height: 36px;
  }

  .ai-recommendation-loader__wordmark {
    width: 47px;
    height: 17px;
  }

  .ai-recommendation-loader__copy strong {
    font-size: 19px;
  }

  .ai-recommendation-loader__copy p {
    font-size: 13px;
  }

  .ai-recommendation-loader__steps {
    gap: 6px;
  }

  .ai-recommendation-loader__steps span {
    gap: 5px;
    padding: 7px 8px;
    font-size: 11px;
  }

  .ai-recommendation-loader__steps i {
    width: 5px;
    height: 5px;
  }

  .ai-recommendation-loader__track {
    height: 7px;
  }

  .ai-recommendation-loader > small {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-recommendation-loader__visual::before,
  .ai-recommendation-loader__core,
  .ai-recommendation-loader__orbit,
  .ai-recommendation-loader__steps i,
  .ai-recommendation-loader__track span {
    animation-duration: 1.5s !important;
    animation-iteration-count: infinite !important;
  }
}
</style>
