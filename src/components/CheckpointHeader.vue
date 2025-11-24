<script setup lang="ts">
import { computed, ref } from 'vue'
import store from '@/store'
import { gsToHttps } from '@/helpers/firebase-storage'

interface CheckpointHeaderProps {
  title?: string
  checkpointName?: string
  imageUrl?: string
  tags?: string[]
  showLanguageSelector?: boolean
  showInfoButton?: boolean
}

const props = withDefaults(defineProps<CheckpointHeaderProps>(), {
  title: '',
  checkpointName: '',
  imageUrl: '',
  tags: () => [],
  showLanguageSelector: true,
  showInfoButton: true
})

const emit = defineEmits<{
  infoClick: []
  languageChange: [language: string]
}>()

// WiFi panel state
const showWifiPanel = ref(false)
const showInfoDialog = ref(false)

// Check if Wifi tag exists
const hasWifiTag = computed(() => {
  return props.tags.some((tag) => tag.toLowerCase().includes('wifi'))
})

// Get info sections for current language
const infoSections = computed(() => {
  return store.buildingData?.info?.[store.chosenLang]?.sections || []
})

// Get languages from store (loaded from Firestore)
const availableLanguages = computed(() => {
  if (!store.languages || store.languages.length === 0) {
    return ['sk', 'en', 'cz'] // Fallback if not loaded yet
  }
  return store.languages
})

const currentLanguageLabel = computed(() => {
  const lang = store.chosenLang
  // Convert language codes to display labels
  const labelMap: Record<string, string> = {
    sk: 'SK',
    en: 'ENG',
    cz: 'CZ',
    cs: 'CZ' // Czech alternative code
  }
  return labelMap[lang] || lang.toUpperCase()
})

const currentLangWifi = computed(() => {
  return store.buildingData?.wifi?.[store.chosenLang]
})

const handleLanguageClick = () => {
  // Cycle through available languages from store
  const langs = availableLanguages.value
  if (langs.length <= 1) return // Don't cycle if only one language

  const currentIndex = langs.findIndex((l: string) => l === store.chosenLang)
  const nextIndex = (currentIndex + 1) % langs.length
  const nextLang = langs[nextIndex]

  store.chosenLang = nextLang
  localStorage.setItem('userLanguage', nextLang)
  emit('languageChange', nextLang)
}

const handleInfoClick = () => {
  showInfoDialog.value = true
}

const handleImageClick = () => {
  if (hasWifiTag.value) {
    showWifiPanel.value = !showWifiPanel.value
  }
}
</script>

<template>
  <div class="checkpoint-header">
    <!-- Top Navigation Bar -->
    <div class="checkpoint-header-top">
      <h1 class="checkpoint-header-title">{{ title }}</h1>

      <div
        v-if="store.buildingData?.info || store.languages.length > 1"
        class="checkpoint-header-actions"
      >
        <!-- Language Selector Button -->
        <v-btn
          v-if="showLanguageSelector && store.languages.length > 1"
          class="checkpoint-lang-button"
          @click="handleLanguageClick"
        >
          {{ currentLanguageLabel }}
        </v-btn>

        <!-- Info Button -->
        <v-btn
          v-if="showInfoButton && store.buildingData?.info"
          class="checkpoint-info-button"
          prepend-icon="mdi-information-outline"
          @click="handleInfoClick"
        >
          Info
        </v-btn>
      </div>
    </div>

    <!-- Checkpoint Image Section -->
    <div
      class="checkpoint-header-image-container"
      :class="{ clickable: hasWifiTag }"
      @click="handleImageClick"
    >
      <v-img
        v-if="imageUrl"
        :src="gsToHttps(imageUrl)"
        height="173"
        cover
        class="checkpoint-header-image"
      >
        <!-- Loading Placeholder -->
        <template v-slot:placeholder>
          <div class="checkpoint-image-loading">
            <div class="skeleton-shimmer"></div>
          </div>
        </template>

        <!-- Room/Checkpoint Name Badge -->
        <div v-if="checkpointName" class="checkpoint-room-badge">
          <span>{{ checkpointName }}</span>
        </div>

        <!-- Tags Section On Image -->
        <div v-if="tags.length > 0" class="checkpoint-header-tags">
          <v-chip v-for="(tag, index) in tags" :key="index" size="small" class="checkpoint-tag">
            <strong>{{ tag }}</strong>
          </v-chip>
        </div>
      </v-img>

      <!-- Fallback if no image -->
      <div v-else class="checkpoint-header-image-placeholder">
        <div v-if="checkpointName" class="checkpoint-room-badge">
          <span>{{ checkpointName }}</span>
        </div>

        <!-- Tags Section On Placeholder -->
        <div v-if="tags.length > 0" class="checkpoint-header-tags">
          <v-chip v-for="(tag, index) in tags" :key="index" size="small" class="checkpoint-tag">
            <strong>{{ tag }}</strong>
          </v-chip>
        </div>
      </div>

      <!-- WiFi Info Slide-Up Panel -->
      <Transition name="wifi-slide">
        <div v-if="showWifiPanel && hasWifiTag" class="wifi-info-panel">
          <div class="wifi-info-content">
            <div class="wifi-network-name">{{ currentLangWifi.name }}</div>
            <div class="wifi-password">{{ currentLangWifi.password }}</div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Info Dialog -->
    <v-dialog
      v-model="showInfoDialog"
      max-width="343"
      scrim="transparent"
      location="top"
      transition="slide-y-transition"
    >
      <v-card class="info-dialog-card">
        <!-- Close Button -->
        <v-btn icon size="small" class="info-dialog-close" @click="showInfoDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>

        <!-- Info Content -->
        <v-card-text class="info-dialog-content">
          <div v-for="(section, index) in infoSections" :key="index" class="info-section">
            <h3 class="info-section-title">{{ section.title }}</h3>

            <!-- Single text paragraph -->
            <p v-if="section.text" class="info-section-text">
              {{ section.text }}
            </p>

            <!-- Bulleted list -->
            <ul v-if="section.texts && section.texts.length" class="info-section-list">
              <li
                v-for="(text, textIndex) in section.texts"
                :key="textIndex"
                class="info-list-item"
              >
                {{ text }}
              </li>
            </ul>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.checkpoint-header {
  width: 100%;
  padding-block: 16px;
}

/* Top Navigation Bar */
.checkpoint-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
}

.checkpoint-header-title {
  font-family: 'Roboto', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: normal;
  color: var(--color-primary);
  margin: 0;
  margin-right: 16px;
  flex: 1;
  max-width: 60%;
}

.checkpoint-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Language Button */
.checkpoint-lang-button {
  background-color: var(--color-primary) !important;
  color: var(--color-on-primary) !important;
  border-radius: 10px !important;
  font-family: 'Roboto', sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  min-width: 56px !important;
  height: 48px !important;
  padding: 10px 16px !important;
}

.checkpoint-lang-button:hover {
  background-color: #00508a !important;
}

/* Info Button */
.checkpoint-info-button {
  background-color: var(--color-primary) !important;
  color: var(--color-on-primary) !important;
  border-radius: 10px !important;
  font-family: 'Roboto', sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  height: 48px !important;
  padding: 10px 16px !important;
}

.checkpoint-info-button:hover {
  background-color: #00508a !important;
}

/* Image Container */
.checkpoint-header-image-container {
  position: relative;
  padding: 0;
  overflow: hidden;
}

.checkpoint-header-image-container.clickable {
  cursor: pointer;
}

.checkpoint-header-image {
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.checkpoint-header-image-placeholder {
  height: 173px;
  border-radius: 10px;
  background: linear-gradient(135deg, #d3e4ff 0%, #003c69 100%);
  position: relative;
}

.checkpoint-image-loading {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 60%,
    transparent 100%
  );
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Room Badge Overlay */
.checkpoint-room-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  padding: 9px 16px;
  border-radius: 10px;
  font-family: 'Roboto', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  text-align: center;
  min-width: 97px;
}

/* Tags Section - Positioned on Image */
.checkpoint-header-tags {
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checkpoint-tag {
  background-color: var(--color-secondary-container) !important;
  color: var(--color-on-secondary-container) !important;
  font-family: 'Roboto', sans-serif !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  line-height: 20px !important;
  height: 25px !important;
  border-radius: 100px !important;
  padding: 0 12px !important;
}

/* WiFi Info Slide-Up Panel */
.wifi-info-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 94px;
  background-color: rgba(0, 60, 105, 0.9);
  border-radius: 10px 10px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.wifi-info-content {
  text-align: center;
  color: #fff8ee;
  font-family: 'Roboto', sans-serif;
}

.wifi-network-name {
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
  margin-bottom: 4px;
}

.wifi-password {
  font-size: 20px;
  font-weight: 700;
  line-height: 26px;
}

/* WiFi Slide Transition */
.wifi-slide-enter-active,
.wifi-slide-leave-active {
  transition: transform 0.3s ease;
}

.wifi-slide-enter-from {
  transform: translateY(100%);
}

.wifi-slide-leave-to {
  transform: translateY(100%);
}

.wifi-slide-enter-to,
.wifi-slide-leave-from {
  transform: translateY(0);
}

:deep(.v-overlay__content) {
  align-self: flex-start !important;
  margin-top: 90px !important;
}

/* Info Dialog Styles */
.info-dialog-card {
  background-color: rgba(0, 60, 105, 0.9) !important;
  border-radius: 9.147px !important;
  padding: 20px 27px !important;
  position: relative;
  box-shadow: none !important;
}

.info-dialog-close {
  position: absolute !important;
  top: 13px;
  right: 13px;
  color: #fff8ee !important;
  background-color: transparent !important;
  z-index: 1;
}

.info-dialog-content {
  padding: 0 !important;
  color: #fff8ee;
  font-family: 'Roboto', sans-serif;
}

.info-section {
  margin-bottom: 16px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-title {
  font-size: 17px;
  font-weight: 700;
  line-height: normal;
  color: #fff8ee !important;
  margin: 0 0 8px 0;
  font-family: 'Roboto', sans-serif;
}

.info-section-text {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.475;
  color: #fff8ee;
  margin: 0;
  font-family: 'Roboto', sans-serif;
}

.info-section-list {
  list-style-type: disc;
  padding-left: 20px;
  margin: 0;
  font-family: 'Roboto', sans-serif;
}

.info-list-item {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.475;
  color: #fff8ee;
  margin-bottom: 2px;
  font-family: 'Roboto', sans-serif;
}

.info-list-item:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .checkpoint-header-title {
    font-size: 18px;
  }

  .checkpoint-lang-button,
  .checkpoint-info-button {
    min-width: 48px !important;
    height: 40px !important;
    font-size: 13px !important;
  }

  .checkpoint-room-badge {
    font-size: 18px;
    padding: 8px 12px;
    min-width: 80px;
  }

  .wifi-network-name,
  .wifi-password {
    font-size: 18px;
    line-height: 24px;
  }

  .wifi-info-panel {
    height: 84px;
  }
}
</style>
