<script setup lang="ts">
import { computed, watch, ref } from 'vue'

import store from '@/store'
import CheckpointHeader from './CheckpointHeader.vue'
import { gsToHttps } from '@/helpers/firebase-storage'

const texts = computed(() => store.selectedView?.texts?.[store.chosenLang])
const selectedViewListItems = ref([] as any[])
const expandedCardIndex = ref<number | null>(null)

watch(
  () => store.selectedView,
  () => {
    selectedViewListItems.value = store.selectedView?.actions.map(
      (id: any) =>
        store.actionsData.find((action: any) => action.id === id) ??
        store.viewsData.find((action: any) => action.id === id)
    )
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
    } else if (item?.type === 'review') {
      store.selectedActionId = 'review'
    } else {
      store.selectedActionId = item.id
    }
  } else if (item?.viewType) {
    store.selectedView = item
  }
}

const selectItemSecondary = (item: any) => {
  let url = item.urlSecondary
  window.open(url, '_blank')
}

const toggleCardExpansion = (index: number) => {
  if (expandedCardIndex.value === index) {
    expandedCardIndex.value = null
  } else {
    expandedCardIndex.value = index
  }
}

function handleLanguageChange(language: string) {
  console.log('Language changed to:', language)
}

// Compute header data from store
const headerTitle = computed(() => store.buildingData?.info[store.chosenLang]?.welcome)

const headerImage = computed(() => {
  return store.buildingData?.headerImage || ''
})

const headerTags = computed(() => {
  return store.buildingData?.headerTags || []
})

// Icon mapping for simple view types
const getIconForType = (type: string, iconType?: string): string => {
  const iconMap: Record<string, string> = {
    question: 'mdi-help-circle',
    review: 'mdi-comment-text'
  }
  return iconMap[type] || 'mdi-' + (iconType || 'information-outline')
}
</script>

<template>
  <div :data-view-id="store.selectedView?.id" class="action-list-container">
    <!-- Tile View - Figma "Hlavná stránka V1" Design -->
    <div v-if="store.selectedView?.viewType === 'tile'" id="action-menu-view">
      <v-list class="mt-0 py-0">
        <!-- Checkpoint Header (scrollable with content) -->
        <CheckpointHeader
          :title="headerTitle"
          :checkpoint-name="store.checkpointData?.name"
          :image-url="headerImage"
          :tags="headerTags"
          :show-language-selector="true"
          :show-info-button="true"
          @language-change="handleLanguageChange"
        />

        <!-- Action Cards Grid -->
        <v-row class="m-0">
          <v-col
            v-for="(item, index) in selectedViewListItems"
            :cols="item?.viewType !== 'simple' ? 6 : 12"
            class="pa-0"
            :key="index"
          >
            <!-- Simple Icon Card (viewType === 'simple') -->
            <v-card
              v-if="item?.viewType === 'simple'"
              :id="item?.id"
              :data-action-id="item?.viewType ? item?.id : ''"
              :class="'simple-tile-card py-2 mb-3 mx-0'"
              :hover="true"
              @click="selectItem(item)"
            >
              <div class="simple-tile-content">
                <!-- Icon on the left -->
                <v-icon
                  :icon="getIconForType(item?.type, item?.iconType)"
                  size="32"
                  class="simple-tile-icon"
                />

                <!-- Title on the right -->
                <span class="simple-tile-title">
                  {{ item?.texts?.[store.chosenLang]?.listTitle }}
                </span>
              </div>
            </v-card>

            <!-- Regular Card with Image -->
            <v-card
              v-else-if="item?.type !== 'info'"
              :id="item?.id"
              :data-action-id="item?.type ? item?.id : ''"
              :class="'tile-card mb-4 px-0' + (index % 2 == 0 ? ' mr-2' : ' ml-2')"
              :hover="true"
              @click="selectItem(item)"
            >
              <!-- Card Image -->
              <v-img
                v-if="item?.listImage"
                :src="gsToHttps(item.listImage)"
                height="96"
                cover
                class="tile-card-image"
              >
                <template v-slot:placeholder>
                  <div class="card-image-loading">
                    <div class="card-skeleton-shimmer"></div>
                  </div>
                </template>
              </v-img>
              <div v-else class="tile-card-placeholder"></div>

              <!-- Card Content -->
              <v-card-text class="tile-card-content pa-2">
                <v-card-title class="tile-card-title pa-0 mb-1">
                  {{ item?.texts?.[store.chosenLang]?.listTitle }}
                </v-card-title>
                <v-card-text class="tile-card-text pa-0">
                  {{ item?.texts?.[store.chosenLang]?.listText }}
                </v-card-text>

                <!-- Filter Chips/Tags -->
                <div
                  v-if="item?.texts?.[store.chosenLang]?.listTags?.length"
                  class="tile-card-tags mt-2"
                >
                  <v-chip
                    v-for="(tag, tagIndex) in item?.texts?.[store.chosenLang]?.listTags"
                    :key="tagIndex"
                    size="small"
                    class="tile-tag mr-1"
                  >
                    {{ tag }}
                  </v-chip>
                </div>

                <!-- Optional CTA Button -->
                <v-btn
                  v-if="item?.texts?.[store.chosenLang]?.listCTAButton"
                  class="tile-cta-button mt-2"
                  size="small"
                  variant="text"
                  :ripple="false"
                  @click.stop
                >
                  {{ item?.texts?.[store.chosenLang]?.listCTAButton }}
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Info Card (Full Width) -->
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
    <!-- Expansion View - Figma "Čo robiť v okolí" Design -->
    <div v-else-if="store.selectedView?.viewType === 'expansion'" id="action-list-view">
      <v-list class="mt-0 py-0 expansion-view">
        <h1 class="pt-1 expansion-title">{{ texts?.title }}</h1>

        <div v-for="(item, index) in selectedViewListItems" :key="index">
          <!-- Expansion Card with Image -->
          <v-card
            :id="item?.id"
            :data-action-id="item?.type ? item?.id : ''"
            class="expansion-card mb-4"
            :hover="item?.type !== 'text'"
            @click="item?.type !== 'text' && toggleCardExpansion(index)"
          >
            <!-- Card Image -->
            <v-img
              v-if="item?.listImage"
              :src="gsToHttps(item.listImage)"
              :height="expandedCardIndex === index ? '221' : '115'"
              cover
              class="expansion-card-image"
            >
              <template v-slot:placeholder>
                <div class="card-image-loading">
                  <div class="card-skeleton-shimmer"></div>
                </div>
              </template>
            </v-img>

            <!-- Card Content -->
            <v-card-text class="expansion-card-content pa-3">
              <v-card-title class="expansion-card-title pa-0 mb-2">
                {{ item?.texts?.[store.chosenLang]?.listTitle }}
              </v-card-title>

              <!-- Description Text -->
              <v-card-text
                class="expansion-card-text pa-0 mb-2"
                :class="{ expanded: expandedCardIndex === index }"
              >
                <template v-if="item?.texts?.[store.chosenLang]?.listTexts?.length">
                  <span
                    v-for="(text, textIndex) in item?.texts?.[store.chosenLang]?.listTexts"
                    :key="textIndex"
                  >
                    {{ text }}
                    <span v-if="textIndex < item?.texts?.[store.chosenLang]?.listTexts.length - 1">
                    </span>
                  </span>
                </template>
                <template v-else>
                  {{ item?.texts?.[store.chosenLang]?.listText }}
                </template>
              </v-card-text>

              <!-- Bottom Section: Tags + Button -->
              <div class="expansion-card-bottom d-flex align-center justify-space-between">
                <!-- Filter Chips/Tags -->
                <div class="expansion-card-tags">
                  <v-chip
                    v-for="(tag, tagIndex) in item?.texts?.[store.chosenLang]?.listTags"
                    :key="tagIndex"
                    size="small"
                    class="expansion-tag mr-1"
                  >
                    {{ tag }}
                  </v-chip>
                  <v-chip
                    v-if="item?.texts?.[store.chosenLang]?.listBottomText"
                    size="small"
                    class="expansion-tag"
                  >
                    {{ item?.texts?.[store.chosenLang]?.listBottomText }}
                  </v-chip>
                  <v-chip
                    v-if="item?.texts?.[store.chosenLang]?.listBottomText2"
                    size="small"
                    class="expansion-tag mr-1"
                  >
                    {{ item?.texts?.[store.chosenLang]?.listBottomText2 }}
                  </v-chip>
                </div>

                <!-- Action Buttons -->
                <v-btn
                  v-if="
                    item?.texts?.[store.chosenLang]?.listCTASecondaryButton && item?.type !== 'text'
                  "
                  variant="text"
                  class="expansion-action-secondary-button mr-1"
                  @click.stop="selectItemSecondary(item)"
                >
                  {{ item?.texts?.[store.chosenLang]?.listCTASecondaryButton }}
                </v-btn>
                <v-btn
                  v-if="item?.texts?.[store.chosenLang]?.listCTAButton && item?.type !== 'text'"
                  variant="flat"
                  class="expansion-action-button"
                  @click.stop="selectItem(item)"
                >
                  {{ item?.texts?.[store.chosenLang]?.listCTAButton }}
                </v-btn>
              </div>

              <!-- External Links -->
              <div
                v-if="item?.texts?.[store.chosenLang]?.listLinks?.length"
                class="expansion-card-links mt-3"
              >
                <a
                  v-for="(link, linkIndex) in item?.texts?.[store.chosenLang]?.listLinks"
                  :key="linkIndex"
                  :href="link?.url"
                  class="expansion-link"
                  target="_blank"
                  @click.stop
                >
                  {{ link?.text }}
                </a>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Upsell Section -->
        <div v-if="texts?.buttonCTA" class="text-center px-5 mt-4">
          <p v-if="texts?.ctaText" class="pt-5">
            {{ texts?.ctaText }}
          </p>
          <v-btn
            id="upsell-button"
            class="checkpoint-button"
            @click="() => (store.selectedActionId = store.selectedView?.upsellId)"
          >
            {{ texts?.buttonCTA }}
          </v-btn>
        </div>
      </v-list>
    </div>
    <!-- <div v-else>
      <h1 class="pt-1">{{ texts?.title }}</h1>
      <h4 class="pb-0">
        {{ store?.checkpointData?.name }}
      </h4>
      <div v-for="(action, index) in store.selectedView?.actionsData" class="py-4" :key="index">
        <v-btn variant="flat" class="checkpoint-button w-100" @click="selectItem(action.type)">
          {{ action.texts?.[store.chosenLang]?.title }}
        </v-btn>
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.action-list-container {
  padding-bottom: 80px;
}
</style>
