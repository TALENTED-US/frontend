<template>
  <a class="skip-link" href="#main-content">본문으로 바로가기</a>
</template>

<style scoped>
.skip-link {
  position: fixed;
  z-index: 10000;
  top: 12px;
  left: 12px;
  padding: 12px 18px;
  border-radius: 10px;
  background: #0a1680;
  box-shadow: 0 5px 0 rgb(10 22 128 / 18%);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  transform: translateY(-160%);
  transition: transform .18s ease;
}

.skip-link:focus {
  transform: translateY(0);
}
</style>
