<script setup lang="ts">
import { reactive, computed } from 'vue'
import axios from 'axios'

import store from '@/store'
import * as types from '@/types'

const isScoreFilled = computed(() => state.inputScore > 0)

const state = reactive({
  activeItem: 0,
  successPage: false,
  loadingBtn: false,
  inputScore: 0,
  inputNote: '',
  error: '',
  showError: false,
  inputScoreError: false
})

const text = computed(() => store.selectedAction?.texts?.[store.chosenLang] as types.ReviewAction)

const endpointUrl = `${__API_URL__}/createExtUserReview`

const pushData = () => {
  const rules = [validateInputScore]
  if (!rules.every((rule) => rule())) {
    return
  }
  state.loadingBtn = true
  axios
    .post(endpointUrl, {
      buildingId: store.buildingId,
      checkpointId: store.userRoomId ?? store.checkpointId,
      extActionPath: store.selectedAction?.path,
      score: state.inputScore,
      note: state.inputNote
    })
    .then(function (response) {
      store.extUserActionId = response.data
      if (state.inputScore < 4) {
        state.successPage = false
      } else {
        state.successPage = true
      }
      state.activeItem = 1
    })
    .catch(function (error) {
      state.error = error.response.data
      state.showError = true
      console.log(error)
    })
    .finally(() => {
      state.loadingBtn = false
    })
}

const validateInputScore = () => {
  const value = state.inputScore
  if (value === null || value === undefined || isNaN(value)) {
    state.inputScoreError = true
    return false
  }
  state.inputScoreError = false
  return true
}

const previousPage = () => {
  if (state.activeItem > 0) {
    state.activeItem--
  } else {
    if (store.hasViewsData) {
      store.selectedActionId = null
    }
  }
}
const goToPage = (url: string | undefined) => {
  window.location.href = url ?? '/'
}

const ctaClick = () => {
  if (store.buildingData?.googleUrl) {
    goToPage(store.buildingData?.googleUrl)
  } else {
    goToPage(store.buildingData?.website)
  }
}

const backToMenuClick = () => {
  store.selectedActionId = null
}
</script>

<template>
  <v-carousel
    v-model="state.activeItem"
    id="review-action"
    :data-action-id="store.selectedAction?.id"
    :show-arrows="false"
    :hide-delimiter-background="true"
    color="#705D0D"
    height="75vh"
  >
    <v-carousel-item :value="0" :disabled="!!state.activeItem">
      <h1 class="pb-5">{{ text?.title }}</h1>
      <p class="pb-1">
        {{ text?.text }}
      </p>
      <div class="text-center py-2">
        <v-rating v-model="state.inputScore" density="default" hover></v-rating>
      </div>
      <span v-if="state.inputScoreError" class="error">*{{ text?.requiredScore }}</span>
      <v-text-field
        v-model="state.inputNote"
        :label="text?.inputText"
        :hint="text?.typeText"
        class="py-5"
        variant="outlined"
        type="text"
        :maxlength="1000"
      ></v-text-field>
      <div class="text-end">
        <v-btn
          v-if="store.hasViewsData"
          id="back-button"
          variant="text"
          class="checkpoint-secondary-button"
          @click="previousPage"
          :disabled="state.loadingBtn"
        >
          {{ text?.buttonBack }}
        </v-btn>
        <v-btn
          id="submit-button"
          variant="flat"
          class="checkpoint-button"
          :loading="state.loadingBtn"
          @click="pushData"
          :disabled="!isScoreFilled"
        >
          <strong>{{ text?.buttonOk }}</strong>
        </v-btn>
      </div>
    </v-carousel-item>

    <v-carousel-item :value="1" :disabled="!state.activeItem">
      <div v-if="state.successPage" id="success-page">
        <h1 class="py-10">{{ text?.successTitle }}</h1>
        <p class="pb-10">
          {{ text?.successText }}
        </p>
        <div class="text-center">
          <v-btn id="upsell-button" class="checkpoint-button" @click="ctaClick">
            {{ text?.buttonCTA }}
          </v-btn>
        </div>
      </div>
      <div v-else>
        <h1 class="py-10">{{ text?.cancelTitle }}</h1>
        <p>
          {{ text?.cancelText }}
        </p>
      </div>
      <div v-if="store.hasViewsData" class="text-center">
        <v-btn
          id="back-to-menu-button"
          variant="text"
          class="checkpoint-secondary-button mt-5"
          @click="backToMenuClick"
        >
          {{ text?.buttonBackMenu }}
        </v-btn>
      </div>
    </v-carousel-item>
  </v-carousel>
  <v-snackbar v-model="state.showError" rounded="pill">{{ state.error }}</v-snackbar>
</template>

<style lang="scss">
.v-rating__wrapper {
  padding: 5px;
}

.v-rating__item .v-btn .v-icon {
  color: #705d0d;
}
</style>
