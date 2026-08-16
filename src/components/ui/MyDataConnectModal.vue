<script setup>
defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'connect'])
</script>

<template>
  <div
    v-if="visible"
    class="mydata-connect-modal"
    role="presentation"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <section role="dialog" aria-modal="true" aria-labelledby="mydata-connect-title">
      <span class="mydata-connect-modal__icon" aria-hidden="true">!</span>
      <h2 id="mydata-connect-title">마이데이터 연결이 필요해요</h2>
      <p>
        마이데이터가 연결되어 있지 않아 자산과 거래 정보를 불러올 수 없어요.<br />지금
        연결하시겠어요?
      </p>
      <div>
        <button type="button" @click="emit('close')">닫기</button>
        <button
          class="mydata-connect-modal__primary"
          type="button"
          @click="emit('connect')"
        >
          마이데이터 연결하기
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.mydata-connect-modal {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
  background: rgb(18 22 30 / 48%);
}

.mydata-connect-modal > section {
  width: min(100%, 390px);
  padding: 28px 24px 22px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 18px 48px rgb(10 15 25 / 24%);
  text-align: center;
}

.mydata-connect-modal__icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin: 0 auto 16px;
  place-items: center;
  border-radius: 50%;
  background: #fff8dc;
  color: #e7a21b;
  font-size: 24px;
  font-weight: 900;
}

.mydata-connect-modal h2 {
  font-size: 19px;
}

.mydata-connect-modal p {
  margin-top: 12px;
  color: #737a87;
  font-size: 12px;
  line-height: 1.65;
}

.mydata-connect-modal section > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 24px;
}

.mydata-connect-modal section > div button {
  min-height: 48px;
  border-radius: 12px;
  background: #f2f3f6;
  color: #666d78;
  font-size: 14px;
  font-weight: 800;
}

.mydata-connect-modal__primary {
  background: #ffeca4 !important;
  color: #222 !important;
}
</style>
