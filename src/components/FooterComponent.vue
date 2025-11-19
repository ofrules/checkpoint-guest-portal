<script setup lang="ts">
import store from '@/store'
</script>

<template>
  <footer>
    <div class="footer">
      <p id="checkpoint-name" class="pb-0" style="display: none">
        {{ store?.checkpointData?.name }}
      </p>
      <p v-if="store.extUserActionId" class="opacity-text mb-1">{{ store.extUserActionId }}</p>
      <p class="opacity-text mb-0">powered by</p>
      <a href="https://www.ofrules.com" rel="noopener noreferrer">www.ofrules.com</a>
      <br />
    </div>
  </footer>
</template>

<style scoped>
.footer {
  text-align: center;
  padding-top: 0px;
  padding-bottom: 5px;
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
}
</style>
