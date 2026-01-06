<script setup lang="ts">
import { watch, computed, nextTick } from 'vue'

import store from '@/store'
import NotificationPermission from './NotificationPermission.vue'

const isDefaultSelectedView = computed(
  () => store.extFeedbackId && store.selectedView?.id === store.extFeedbackId
)
const showCloseButton = computed(
  () => !store.isOnlySimpleAction && (!isDefaultSelectedView.value || store.selectedActionId)
)

const notificationTrigger = computed(() => {
  if (!store.notificationsEnabledForBuilding) return null
  // Order success notification takes priority if set
  if (store.showOrderSuccessNotification) return 'order-success'
  // Otherwise show main notification
  return 'main'
})

watch(
  () => store.selectedActionId,
  () => {
    store.selectedAction = null
    store.extUserActionId = null
    nextTick(() => {
      if (store.selectedActionId) {
        const selectedAction = (store.selectedAction = store.actionsData?.find(
          (action: any) => action.id === store.selectedActionId
        ))
        if (selectedAction) {
          store.selectedAction = selectedAction
        } else {
          store.selectedView = store.viewsData?.find(
            (view: any) => view.id === store.selectedActionId
          )
          store.selectedActionId = null
        }
      }
    })
  }
)

function closeAction() {
  store.selectedActionId = null
  store.showOrderSuccessNotification = false
  store.selectedView = store.viewsData?.find((view: any) => view.id === store.extFeedbackId)
}
</script>

<template>
  <div id="main-view">
    <!-- Notification permission prompt -->
    <NotificationPermission v-if="notificationTrigger" :trigger="notificationTrigger" />

    <!-- Close Button (shown when viewing action details) -->
    <div v-if="showCloseButton" class="panel-container">
      <div class="panel-content">
        <v-btn
          class="close-button"
          density="default"
          @click="closeAction"
          style="--v-btn-size: 1.3rem"
          icon
          flat
        >
          <v-icon color="text">mdi-close</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Action List or Specific Action Views -->
    <ActionListView v-if="!store.selectedActionId" />
    <OccurrenceAction v-else-if="store.selectedAction?.type === 'occurrence'" />
    <OrderAction v-else-if="store.selectedAction?.type === 'order'" />
    <QuestionAction v-else-if="store.selectedAction?.type === 'question'" />
    <div v-else-if="store.selectedAction?.type === 'review'">
      <ReviewComplexAction v-if="store.selectedAction?.options?.complex" />
      <ReviewAction v-else />
    </div>
  </div>
</template>

<style scoped>
.panel-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  user-select: none;
  position: relative;
  top: 5px;
  right: 0px;
}
.panel-container .panel-content {
  display: flex;
  align-items: center;
  justify-content: right;
  height: 100%;
  width: 100%;
  border-radius: 50%;
}
</style>
