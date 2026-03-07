<script setup lang="ts">
import { computed, watch, ref } from 'vue'

import store from '@/store'
import ActionListExpandItem from './ActionListExpandItem.vue'
import { pushAnalyticsEvent } from '@/helpers/analytics'

const texts = computed(() => store.selectedView?.texts?.[store.chosenLang])
const selectedViewListItems = ref([] as any[])

watch(
  () => store.selectedView,
  () => {
    selectedViewListItems.value = store.selectedView?.actions.map(
      (id: any) =>
        store.actionsData.find((action: any) => action.id === id) ??
        store.viewsData.find((action: any) => action.id === id)
    )

    if (store.selectedView) {
      pushAnalyticsEvent('content_viewed', {
        building_id: store.buildingId,
        view_id: store.selectedView.id,
        view_title: store.selectedView.texts?.[store.chosenLang]?.title || store.selectedView.id
      })
    }
  },
  { immediate: true }
)

const selectItem = (item: any) => {
  if (item?.type) {
    if (item?.type === 'link') {
      let url = item.url
      if (url.startsWith('sms:')) {
        const smsBody = item.texts[store.chosenLang]?.smsBody
        url += `?&body=${store?.checkpointData?.name}:%0D%0A${smsBody}`
      }
      window.open(url, '_blank')
    } else {
      store.selectedActionId = item.id
    }
  } else if (item?.viewType) {
    store.selectedView = item
  }
}
</script>

<template>
  <div :data-view-id="store.selectedView?.id">
    <div v-if="store.selectedView?.viewType === 'tile'" id="action-menu-view">
      <v-list max-height="75vh" class="mt-0 py-0">
        <h1 class="pt-1">{{ texts?.title }}</h1>
        <h4 class="pb-0">
          {{ store?.checkpointData?.name }}
        </h4>
        <v-row class="m-0">
          <v-col
            v-for="(item, index) in selectedViewListItems"
            :cols="item?.type !== 'info' ? 6 : 12"
            class="pa-0"
            :key="index"
          >
            <v-card
              v-if="item?.type !== 'info'"
              :id="item?.id"
              :data-action-id="item?.type ? item?.id : ''"
              :class="'action-menu mb-4 px-0 pt-1 pb-0' + (index % 2 == 0 ? ' mr-2' : ' ml-2')"
              height="170"
              :hover="true"
              :title="item?.texts?.[store.chosenLang]?.listTitle"
              :text="item?.texts?.[store.chosenLang]?.listText"
              @click="selectItem(item)"
            ></v-card>
            <v-card
              v-else
              :class="'mb-4 pt-1 pb-0 text-center'"
              height="60"
              :hover="false"
              :title="item?.texts?.[store.chosenLang]?.listTitle"
              :text="item?.texts?.[store.chosenLang]?.listText"
              flat
            ></v-card>
          </v-col>
        </v-row>
      </v-list>
    </div>
    <div v-else-if="store.selectedView?.viewType === 'expansion'" id="action-list-view">
      <v-list max-height="70vh" class="mt-0 py-0">
        <h1 class="pt-1">{{ texts?.title }}</h1>

        <div v-for="(item, index) in selectedViewListItems" :key="index">
          <ActionListExpandItem :item="item" @selectItem="selectItem" />
        </div>

        <div v-if="texts?.buttonCTA" class="text-center px-5">
          <p v-if="texts?.buttonCTA" class="pt-5">
            {{ texts?.ctaText }}
          </p>
          <v-btn
            v-if="texts?.buttonCTA"
            id="upsell-button"
            class="checkpoint-button"
            @click="() => (store.selectedActionId = store.selectedView?.upsellId)"
          >
            {{ texts?.buttonCTA }}
          </v-btn>
        </div>
      </v-list>
    </div>
    <div v-else>
      <h1 class="pt-1">{{ texts?.title }}</h1>
      <h4 class="pb-0">
        {{ store?.checkpointData?.name }}
      </h4>
      <div v-for="(action, index) in store.selectedView?.actionsData" class="py-4" :key="index">
        <v-btn variant="flat" class="checkpoint-button w-100" @click="selectItem(action.type)">
          {{ action.texts?.[store.chosenLang]?.title }}
        </v-btn>
      </div>
    </div>
  </div>
</template>
