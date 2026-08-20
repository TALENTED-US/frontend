<script setup>
import loadingButtie from '@/assets/images/simulation/buttie-ai-loading-default.png'
</script>

<template>
  <div class="simulation-entry-loader" role="status" aria-live="polite">
    <div class="simulation-entry-loader__scene" aria-hidden="true">
      <span class="simulation-entry-loader__halo"></span>
      <span class="simulation-entry-loader__flash"></span>
      <span class="simulation-entry-loader__orbit simulation-entry-loader__orbit--one"></span>
      <span class="simulation-entry-loader__orbit simulation-entry-loader__orbit--two"></span>
      <span class="simulation-entry-loader__spark simulation-entry-loader__spark--one">✦</span>
      <span class="simulation-entry-loader__spark simulation-entry-loader__spark--two">✦</span>
      <span class="simulation-entry-loader__spark simulation-entry-loader__spark--three">•</span>
      <img :src="loadingButtie" alt="" />
      <span class="simulation-entry-loader__shadow"></span>
    </div>

    <div class="simulation-entry-loader__copy">
      <span>PERSONALIZED SIMULATION</span>
      <strong>버티가 맞춤 계획을 만들고 있어요</strong>
      <p>AI가 재정 상태와 취업 준비 정보를 분석 중이에요.</p>
    </div>

    <div class="simulation-entry-loader__loading" aria-hidden="true">
      <b>Loading</b>
      <span><i></i><i></i><i></i></span>
    </div>
  </div>
</template>

<style scoped>
.simulation-entry-loader {
  display: grid;
  width: min(560px, 100%);
  justify-items: center;
  color: #1d2742;
  text-align: center;
}

.simulation-entry-loader__scene {
  position: relative;
  width: 300px;
  height: 270px;
}

.simulation-entry-loader__scene img {
  position: absolute;
  z-index: 3;
  top: 12px;
  left: 50%;
  width: 230px;
  height: 230px;
  object-fit: contain;
  filter: drop-shadow(0 18px 18px rgb(165 123 22 / 20%));
  transform: translateX(-50%);
  animation:
    butttie-ai-float 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite,
    butttie-ai-character-flash 4.2s ease-out infinite;
}

.simulation-entry-loader__halo {
  position: absolute;
  z-index: 1;
  top: -8px;
  left: 50%;
  width: 278px;
  height: 278px;
  border: 1px solid rgb(244 173 29 / 24%);
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 221 130 / 30%) 0%, rgb(255 229 157 / 14%) 48%, transparent 76%);
  transform: translateX(-50%);
  animation: butttie-ai-halo 2.2s ease-in-out infinite;
}

.simulation-entry-loader__flash {
  position: absolute;
  z-index: 2;
  top: 114px;
  left: 50%;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgb(255 255 255 / 98%) 0 7%, rgb(255 238 176 / 82%) 20%, rgb(255 198 57 / 30%) 44%, rgb(255 221 130 / 12%) 62%, transparent 80%);
  filter: blur(7px);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
  animation: butttie-ai-flash 4.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.simulation-entry-loader__flash::before,
.simulation-entry-loader__flash::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 118%;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgb(255 242 194 / 92%), transparent);
  content: '';
  transform: translate(-50%, -50%);
}

.simulation-entry-loader__flash::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.simulation-entry-loader__orbit {
  position: absolute;
  z-index: 2;
  top: 101px;
  left: 50%;
  width: 276px;
  height: 76px;
  border: 2px solid transparent;
  border-top-color: rgb(21 35 156 / 48%);
  border-bottom-color: rgb(244 173 29 / 64%);
  border-radius: 50%;
  transform: translateX(-50%) rotate(-8deg);
  animation: butttie-ai-orbit 3.6s linear infinite;
}

.simulation-entry-loader__orbit--two {
  width: 250px;
  height: 96px;
  border-top-color: rgb(244 173 29 / 38%);
  border-bottom-color: rgb(82 102 222 / 42%);
  transform: translateX(-50%) rotate(22deg);
  animation-direction: reverse;
  animation-duration: 4.8s;
}

.simulation-entry-loader__spark {
  position: absolute;
  z-index: 4;
  color: #f4ad1d;
  font-weight: 900;
  animation: butttie-ai-spark 1.5s ease-in-out infinite;
}

.simulation-entry-loader__spark--one {
  top: 40px;
  left: 18px;
  font-size: 22px;
}

.simulation-entry-loader__spark--two {
  top: 74px;
  right: 10px;
  color: #5266de;
  font-size: 15px;
  animation-delay: 0.55s;
}

.simulation-entry-loader__spark--three {
  right: 32px;
  bottom: 55px;
  font-size: 28px;
  animation-delay: 1s;
}

.simulation-entry-loader__shadow {
  position: absolute;
  bottom: 12px;
  left: 50%;
  width: 120px;
  height: 18px;
  border-radius: 50%;
  background: rgb(70 78 120 / 14%);
  filter: blur(6px);
  transform: translateX(-50%);
  animation: butttie-ai-shadow 2.2s ease-in-out infinite;
}

.simulation-entry-loader__copy {
  display: grid;
  justify-items: center;
  gap: 9px;
}

.simulation-entry-loader__copy > span {
  color: #15239c;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.17em;
}

.simulation-entry-loader__copy strong {
  font-size: 25px;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: -0.035em;
}

.simulation-entry-loader__copy p {
  margin: 0;
  color: #737d91;
  font-size: 15px;
  line-height: 1.6;
}

.simulation-entry-loader__loading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 26px;
  color: #5363dd;
}

.simulation-entry-loader__loading b {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.simulation-entry-loader__loading > span {
  display: flex;
  gap: 4px;
}

.simulation-entry-loader__loading i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: butttie-ai-dot 1.05s ease-in-out infinite;
}

.simulation-entry-loader__loading i:nth-child(2) {
  animation-delay: 0.15s;
}

.simulation-entry-loader__loading i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes butttie-ai-float {
  0%,
  100% {
    transform: translate(-50%, 8px) rotate(-1.5deg) scale(0.98);
  }
  50% {
    transform: translate(-50%, -13px) rotate(1.5deg) scale(1.02);
  }
}

@keyframes butttie-ai-halo {
  0%,
  100% {
    opacity: 0.55;
    transform: translateX(-50%) scale(0.92);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.06);
  }
}

@keyframes butttie-ai-flash {
  0%,
  12% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.35);
  }
  18% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.02);
  }
  32% {
    opacity: 0.52;
    transform: translate(-50%, -50%) scale(1.2);
  }
  72% {
    opacity: 0.08;
    transform: translate(-50%, -50%) scale(1.52);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.68);
  }
}

@keyframes butttie-ai-character-flash {
  0%,
  12%,
  100% {
    filter: drop-shadow(0 18px 18px rgb(165 123 22 / 20%)) brightness(1);
  }
  18% {
    filter:
      drop-shadow(0 0 16px rgb(255 255 255 / 100%))
      drop-shadow(0 0 34px rgb(255 197 48 / 82%))
      brightness(1.32);
  }
  42% {
    filter: drop-shadow(0 12px 25px rgb(255 190 43 / 45%)) brightness(1.1);
  }
  78% {
    filter: drop-shadow(0 18px 20px rgb(165 123 22 / 24%)) brightness(1.02);
  }
}

@keyframes butttie-ai-orbit {
  to {
    transform: translateX(-50%) rotate(352deg);
  }
}

@keyframes butttie-ai-spark {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.65) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.15) rotate(25deg);
  }
}

@keyframes butttie-ai-shadow {
  0%,
  100% {
    opacity: 0.7;
    transform: translateX(-50%) scaleX(1);
  }
  50% {
    opacity: 0.3;
    transform: translateX(-50%) scaleX(0.72);
  }
}

@keyframes butttie-ai-dot {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-5px);
  }
}

@media (min-width: 561px) {
  .simulation-entry-loader__flash {
    width: clamp(920px, 58vw, 1400px);
    height: clamp(920px, 58vw, 1400px);
    background: radial-gradient(
      circle,
      rgb(255 255 255 / 98%) 0 4%,
      rgb(255 238 176 / 80%) 13%,
      rgb(255 198 57 / 25%) 30%,
      rgb(255 225 151 / 12%) 48%,
      rgb(240 244 255 / 8%) 64%,
      transparent 84%
    );
    filter: blur(18px);
  }
}

@media (max-width: 560px) {
  .simulation-entry-loader__scene {
    width: 250px;
    height: 232px;
  }

  .simulation-entry-loader__scene img {
    width: 195px;
    height: 195px;
  }

  .simulation-entry-loader__halo {
    top: -5px;
    width: 235px;
    height: 235px;
  }

  .simulation-entry-loader__flash {
    top: 98px;
    width: 340px;
    height: 340px;
  }

  .simulation-entry-loader__orbit {
    top: 86px;
    width: 232px;
    height: 66px;
  }

  .simulation-entry-loader__orbit--two {
    width: 215px;
    height: 82px;
  }

  .simulation-entry-loader__copy > span {
    font-size: 10px;
  }

  .simulation-entry-loader__copy strong {
    max-width: 320px;
    font-size: 21px;
  }

  .simulation-entry-loader__copy p {
    max-width: 300px;
    font-size: 14px;
  }

  .simulation-entry-loader__loading {
    margin-top: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .simulation-entry-loader__scene img,
  .simulation-entry-loader__halo,
  .simulation-entry-loader__flash,
  .simulation-entry-loader__orbit,
  .simulation-entry-loader__spark,
  .simulation-entry-loader__shadow,
  .simulation-entry-loader__loading i {
    animation-duration: 6s !important;
  }
}
</style>
