<script setup lang="ts">
import { reactive } from 'vue'
import store from '@/store'

const state = reactive({
  buttonLang: '',
  filteredLangs: [...store.languages],
  speedDial: store.languages.length > 2,
  changingSpeedDial: false
})

const changeLang = (newLang: string) => {
  if (state.speedDial) {
    state.changingSpeedDial = true
    store.chosenLang = newLang
    state.buttonLang = store.chosenLang
    state.filteredLangs = store.languages.filter((lang) => lang !== newLang)
    setTimeout(() => {
      state.changingSpeedDial = false
    }, 10)
  } else {
    if (store.languages.length <= 1) {
      return
    } else if (store.languages.length <= 2) {
      store.chosenLang = newLang
      state.buttonLang = store.languages.find((lang) => lang !== newLang)!
    }
  }
  localStorage.setItem('userLanguage', store.chosenLang)
}
changeLang(store.chosenLang)
</script>

<template>
  <div v-if="store.languages.length > 1" class="fab-container">
    <p id="active-language" style="display: none; visibility: hidden">{{ store.chosenLang }}</p>
    <div class="fab">
      <div v-if="!state.speedDial" class="fab-content">
        <v-btn
          v-if="state.buttonLang !== ''"
          @click="() => changeLang(state.buttonLang)"
          class="checkpoint-lang-button"
          >{{ state.buttonLang }}</v-btn
        >
      </div>
      <div v-else>
        <v-speed-dial
          v-if="!state.changingSpeedDial"
          location="bottom center"
          direction="up"
          transition="fade-transition"
        >
          <template v-slot:activator="{ props: activatorProps }">
            <v-btn v-bind="activatorProps" class="checkpoint-lang-button">{{
              state.buttonLang
            }}</v-btn>
          </template>

          <v-btn
            v-for="lang in state.filteredLangs"
            :key="lang"
            @click="() => changeLang(lang)"
            class="checkpoint-lang-secondary-button"
            >{{ lang }}</v-btn
          >
        </v-speed-dial>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fab-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  user-select: none;
  position: absolute;
  bottom: 30px;
  z-index: 1000;
}
.fab-container .fab .fab-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  border-radius: 50%;
}
</style>
