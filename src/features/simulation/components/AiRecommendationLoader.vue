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
      <strong>
        AI 추천을 만들고 있어요
        <span class="ai-recommendation-loader__dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
      </strong>
      <span>내 정보와 재정 상태를 꼼꼼히 분석하고 있어요.</span>
    </div>

    <div class="ai-recommendation-loader__track" aria-hidden="true">
      <span></span>
    </div>
  </div>
</template>

<style scoped>
.ai-recommendation-loader {
  display: grid;
  justify-items: center;
  gap: 13px;
  padding: 22px 16px 20px;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(135deg, #f3f4fb 0%, #f8f8fc 52%, #f1f3ff 100%);
  color: #737b8b;
  text-align: center;
}

.ai-recommendation-loader__visual {
  position: relative;
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
}

.ai-recommendation-loader__visual::before {
  position: absolute;
  inset: 1px;
  border: 2px solid rgb(83 99 221 / 16%);
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
  width: 50px;
  height: 50px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  overflow: hidden;
  border: 1px solid rgb(244 173 29 / 22%);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 7px 18px rgb(21 35 156 / 16%);
  animation: ai-core-pulse 1.6s ease-in-out infinite;
}

.ai-recommendation-loader__symbol {
  display: block;
  width: 30px;
  height: 27px;
  object-fit: contain;
}

.ai-recommendation-loader__wordmark {
  display: block;
  width: 35px;
  height: 14px;
  object-fit: contain;
}

.ai-recommendation-loader__orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  margin: -2.5px;
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
  gap: 5px;
}

.ai-recommendation-loader__copy strong {
  color: #27304a;
  font-size: 13px;
  font-weight: 800;
}

.ai-recommendation-loader__copy > span {
  color: #80879a;
  font-size: 11px;
  line-height: 1.45;
}

.ai-recommendation-loader__dots {
  display: inline-flex;
  gap: 2px;
  width: 17px;
  margin-left: 2px;
  vertical-align: 2px;
}

.ai-recommendation-loader__dots i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  animation: ai-dot-bounce 1.1s ease-in-out infinite;
}

.ai-recommendation-loader__dots i:nth-child(2) {
  animation-delay: 0.16s;
}

.ai-recommendation-loader__dots i:nth-child(3) {
  animation-delay: 0.32s;
}

.ai-recommendation-loader__track {
  width: min(230px, 82%);
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #dfe2ed;
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
    transform: rotate(0deg) translateX(31px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(31px) rotate(-360deg);
  }
}

@keyframes ai-dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  30% {
    transform: translateY(-4px);
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

@media (prefers-reduced-motion: reduce) {
  .ai-recommendation-loader__visual::before,
  .ai-recommendation-loader__core,
  .ai-recommendation-loader__orbit,
  .ai-recommendation-loader__dots i,
  .ai-recommendation-loader__track span {
    animation-duration: 1.5s !important;
    animation-iteration-count: infinite !important;
  }
}
</style>
