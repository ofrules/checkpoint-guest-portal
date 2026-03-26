<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useRoute, type LocationQuery } from 'vue-router'
import axios from 'axios'
import store from '@/store'
import MainView from './MainView.vue'
import { trackAnalyticsQrScanned } from '@/helpers/analytics'

const oneWeekMs = 1000 * 60 * 60 * 24 * 7

const route = useRoute()

const state = reactive({
  loading: true,
  hasData: false,
  errorCheckpoint: false
})

const endpointUrl = `${__API_URL__}/extFeedbackActionData`

const getData = (query: LocationQuery) => {
  axios
    .get(endpointUrl, {
      params: query
    })
    .then((response) => {
      state.hasData = true
      store.buildingId = query.buildingId
      store.checkpointId = query.checkpointId
      store.extFeedbackId = query.extFeedbackId
      store.selectedActionId = query.extActionId

      store.checkpointData = response.data?.checkpoint
      store.simpleActionData = response.data?.actionData
      store.viewsData = response.data?.viewsDataList
      store.actionsData = response.data?.actionsDataList
      store.buildingData = response.data?.building
      store.notificationsEnabledForBuilding = response.data?.building?.configuration?.notifications

      trackAnalyticsQrScanned(query.buildingId, query.checkpointId, query.extFeedbackId)

      // Set buildingID for notifications
      store.buildingID = query.buildingId as string

      store.hasViewsData = !!store.viewsData
      store.isOnlySimpleAction = !!store.simpleActionData && !store.hasViewsData

      if (store.simpleActionData) {
        store.selectedActionId = store.simpleActionData.id
        store.selectedAction = store.simpleActionData
        store.languages = Object.keys(store.simpleActionData.texts)
      }

      if (store.hasViewsData) {
        store.selectedView = store.viewsData.find((view: any) => view.id == query.extFeedbackId)
        store.languages = Object.keys(store.selectedView.texts) //.sort((a, b) => a.localeCompare(b))
      }

      const userLanguage = localStorage.getItem('userLanguage')
      if (userLanguage && store.languages.includes(userLanguage)) {
        store.chosenLang = userLanguage
      } else {
        store.chosenLang = response.data?.building?.language ?? 'sk'
        localStorage.setItem('userLanguage', store.chosenLang)
      }

      if (store.checkpointData?.isRoom) {
        localStorage.setItem('userBuildingId', store.buildingId)
        localStorage.setItem('userRoomId', store.checkpointId)
      }

      var lastScanDuringStay = localStorage.getItem('lastScanDuringStay')
      if (lastScanDuringStay && Date.now() - parseInt(lastScanDuringStay) > oneWeekMs) {
        localStorage.removeItem('userBuildingId')
        localStorage.removeItem('userRoomId')
        localStorage.removeItem('lastScanDuringStay')
      }

      if (localStorage.getItem('userBuildingId') === store.buildingId) {
        localStorage.setItem('lastScanDuringStay', Date.now().toString())
        store.userRoomId = localStorage.getItem('userRoomId')
      }
    })
    .catch(function (error) {
      // handle error
      if (error?.response?.data == 'Checkpoint not found') {
        state.errorCheckpoint = true
      } else {
        console.log(error)
      }
    })
    .finally(() => {
      state.loading = false
    })
}

watch(
  () => route.query,
  (query) => Object.keys(query).length && getData(query),
  { immediate: true }
)

// if query params not present
setTimeout(() => {
  if (!Object.keys(route.query).length) state.loading = false
}, 1000)
</script>

<template>
  <main>
    <div class="text-center">
      <v-progress-circular v-if="state.loading" indeterminate />
    </div>
    <ErrorCheckpoint v-if="state.errorCheckpoint" :query="route.query" />
    <MainView v-if="!state.loading && state.hasData" />
    <!-- <LangChooser v-if="!state.loading && state.hasData" /> -->
  </main>
</template>

<style lang="scss">
.v-btn--icon {
  width: initial !important;
  height: initial !important;
}

.v-btn--active > .v-btn__overlay {
  opacity: 0 !important;
}

.v-btn--active.v-carousel__controls__item .v-icon {
  opacity: 1 !important;
}

.error {
  color: #66380d;
}
</style>
