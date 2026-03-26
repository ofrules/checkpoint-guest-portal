<script setup lang="ts">
import { computed, reactive } from 'vue'
import axios from 'axios'

import store from '@/store'
import * as types from '@/types'
import { trackAnalyticsActionCompleted } from '@/helpers/analytics'

const state = reactive({
  activeItem: 0,
  successPage: false,
  loadingBtn: false,
  error: '',
  showError: false
})

const text = computed(
  () => store.selectedAction?.texts?.[store.chosenLang] as types.OccurenceAction
)

const endpointUrl = `${__API_URL__}/createOccurrenceExt`

const pushData = () => {
  state.loadingBtn = true
  axios
    .post(endpointUrl, {
      buildingId: store.buildingId,
      checkpointId: store.userRoomId ?? store.checkpointId,
      extActionPath: store.selectedAction?.path
    })
    .then(function (response) {
      store.extUserActionId = response.data
      trackAnalyticsActionCompleted('occurrence', store.selectedAction?.id)
      state.successPage = true
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

const cancel = () => {
  if (store.hasViewsData) {
    state.activeItem = 0
    store.selectedActionId = null
  } else {
    state.successPage = false
    state.activeItem = 1
  }
}

const goToPage = (url: string | undefined) => {
  window.location.href = url ?? '/'
}

const ctaClick = () => {
  if (store.hasViewsData) {
    store.selectedActionId = 'review'
  } else {
    if (store.buildingData?.website) {
      goToPage(store.buildingData?.building?.website)
    }
  }
}

const backToMenuClick = () => {
  store.selectedActionId = null
}
</script>

<template>
  <v-carousel
    v-model="state.activeItem"
    id="occurrence-action"
    :data-action-id="store.selectedAction?.id"
    :show-arrows="false"
    :hide-delimiter-background="true"
    color="#705D0D"
    height="420px"
  >
    <v-carousel-item :value="0" :disabled="!!state.activeItem">
      <h1 class="pb-5">{{ text?.title }}</h1>
      <h5 class="pb-1">{{ store?.checkpointData?.name }}</h5>
      <p class="pb-1">{{ text?.text }}</p>
      <div class="text-end">
        <v-btn
          id="back-button"
          variant="text"
          class="checkpoint-secondary-button"
          @click="cancel"
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
        >
          {{ text?.buttonOk }}
        </v-btn>
      </div>
    </v-carousel-item>

    <v-carousel-item :value="1" :disabled="!state.activeItem">
      <div v-if="state.successPage" id="success-page">
        <h1 class="pb-5">{{ text?.successTitle }}</h1>
        <p>
          {{ text?.successText }}
        </p>
        <p v-if="store.hasViewsData" class="pb-5">
          {{ text?.successText2 }}
        </p>
      </div>
      <div v-else>
        <h1 class="pb-1">{{ text?.cancelTitle }}</h1>
        <p>
          {{ text?.cancelText }}
        </p>
      </div>
      <div v-if="store.hasViewsData" class="text-center">
        <v-btn id="upsell-button" class="checkpoint-button" @click="ctaClick">
          {{ text?.buttonCTA }}
        </v-btn>
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
