<template>
  <v-card
    v-if="showNotificationPrompt"
    class="notification-prompt mb-1"
    elevation="2"
    style="position: sticky; top: 0; z-index: 1000"
  >
    <v-card-text>
      <v-row align="center" no-gutters>
        <v-col cols="auto" class="pr-3">
          <v-icon size="32" color="primary">mdi-bell-outline</v-icon>
        </v-col>
        <v-col>
          <div class="text-subtitle-1 font-weight-medium">{{ texts.title }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ texts.message }}
          </div>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="grey"
        variant="text"
        style="border-radius: 10px !important"
        @click="dismissPrompt"
      >
        {{ texts.dismiss }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        :loading="isLoading"
        style="border-radius: 10px !important"
        @click="enableNotifications"
      >
        {{ texts.enable }}
      </v-btn>
    </v-card-actions>
  </v-card>

  <!-- Success message -->
  <v-snackbar v-model="showSuccessMessage" :timeout="5000" color="success" location="top">
    <v-icon start>mdi-check-circle</v-icon>
    {{ texts.success }}
  </v-snackbar>

  <!-- Error message -->
  <v-snackbar v-model="showErrorMessage" :timeout="5000" color="error" location="top">
    <v-icon start>mdi-alert-circle</v-icon>
    {{ errorMessage }}
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  requestNotificationPermission,
  registerToken,
  isNotificationSupported,
  getNotificationPermission,
  onForegroundMessage
} from '@/services/notification-service'
import { store } from '@/store'

interface Props {
  trigger?: 'main' | 'order-success' // Trigger type for showing notification
}

const props = withDefaults(defineProps<Props>(), {
  trigger: 'main'
})

// Define notification texts for different languages
const notificationTexts: Record<string, any> = {
  sk: {
    title: 'Povoliť upozornenia',
    message:
      '💌Nechajte sa počas svojho pobytu rozmaznávať — dostanete tipy, ponuky a malé prekvapenia, ktoré urobia Váš pobyt výnimočným.',
    enable: 'Povoliť',
    dismiss: 'Neskôr',
    success: 'Notifikácie boli úspešne povolené',
    error: 'Nepodarilo sa povoliť notifikácie'
  },
  en: {
    title: 'Enable notifications',
    message:
      '💌Let yourself be pampered during your stay — you will receive tips, offers, and little surprises that will make your stay exceptional.',
    enable: 'Enable',
    dismiss: 'Later',
    success: 'Notifications enabled successfully',
    error: 'Failed to enable notifications'
  },
  cs: {
    title: 'Povolit upozornění',
    message:
      '💌Nechte se během svého pobytu rozmazlovat — dostanete tipy, nabídky a malá překvapení, která váš pobyt učiní výjimečným.',
    enable: 'Povolit',
    dismiss: 'Později',
    success: 'Oznámení byla úspěšně povolena',
    error: 'Nepodařilo se povolit oznámení'
  }
}

const notificationTextsOrderSuccess: Record<string, any> = {
  sk: {
    title: 'Povoliť upozornenia',
    message: '💌Budeme vám môcť pripomenúť vašu rezerváciu alebo informovať o dostupnosti služieb.',
    enable: 'Povoliť',
    dismiss: 'Neskôr',
    success: 'Notifikácie boli úspešne povolené',
    error: 'Nepodarilo sa povoliť notifikácie'
  },
  en: {
    title: 'Enable notifications',
    message:
      '💌We will be able to remind you of your reservation or inform you about the availability of services.',
    enable: 'Enable',
    dismiss: 'Later',
    success: 'Notifications enabled successfully',
    error: 'Failed to enable notifications'
  },
  cs: {
    title: 'Povolit upozornění',
    message:
      '💌Budeme vám moci připomenout vaši rezervaci nebo vás informovat o dostupnosti služeb.',
    enable: 'Povolit',
    dismiss: 'Později',
    success: 'Oznámení byla úspěšně povolena',
    error: 'Nepodařilo se povolit oznámení'
  }
}

const texts = computed(() => {
  const lang = store.chosenLang || 'sk'
  const textSource =
    props.trigger === 'order-success' ? notificationTextsOrderSuccess : notificationTexts
  return textSource[lang] || textSource.sk
})

const showNotificationPrompt = ref(false)
const isLoading = ref(false)
const showSuccessMessage = ref(false)
const showErrorMessage = ref(false)
const errorMessage = ref('')
const dismissedTriggers = ref<Set<string>>(new Set())

// Get the appropriate localStorage key based on trigger type
const getDismissedKey = (trigger: string) => {
  return trigger === 'order-success'
    ? 'notification-prompt-dismissed-order'
    : 'notification-prompt-dismissed-main'
}

// Check if specific trigger is already dismissed
const checkIfDismissed = (trigger: string) => {
  return (
    localStorage.getItem(getDismissedKey(trigger)) === 'true' ||
    dismissedTriggers.value.has(trigger)
  )
}

// Check if we should show the notification prompt
const checkAndShowPrompt = () => {
  // Check if notifications are supported
  if (!isNotificationSupported()) {
    return
  }

  // Check permission status
  const permission = getNotificationPermission()

  // Don't show if current trigger is already dismissed
  if (checkIfDismissed(props.trigger)) {
    return
  }

  // Show prompt only if permission is 'default' (not asked yet)
  if (permission === 'default') {
    if (props.trigger === 'main') {
      // Show prompt after 4 seconds for main page
      setTimeout(() => {
        if (!checkIfDismissed(props.trigger)) {
          showNotificationPrompt.value = true
        }
      }, 4000)
    } else if (props.trigger === 'order-success') {
      // Show immediately for order success
      showNotificationPrompt.value = true
    }
  } else if (permission === 'granted' && !store.notificationToken) {
    // Permission already granted but no token yet - get token silently
    setupNotifications()
  }

  // Setup foreground message handler if permission is granted
  if (permission === 'granted') {
    setupForegroundMessageHandler()
  }
}

onMounted(() => {
  checkAndShowPrompt()
})

// Watch for trigger changes - when it changes to order-success, show if not dismissed
watch(
  () => props.trigger,
  (newTrigger, oldTrigger) => {
    // If trigger changed and the new trigger is not dismissed
    if (newTrigger !== oldTrigger && !checkIfDismissed(newTrigger)) {
      if (newTrigger === 'order-success') {
        // Show order-success notification immediately
        showNotificationPrompt.value = true
      } else if (!showNotificationPrompt.value) {
        // For other triggers, check if we should show
        checkAndShowPrompt()
      }
    } else if (checkIfDismissed(newTrigger)) {
      // If new trigger is dismissed, hide the notification
      showNotificationPrompt.value = false
    }
  }
)

async function enableNotifications() {
  isLoading.value = true
  showNotificationPrompt.value = false

  try {
    await setupNotifications()
  } catch (error) {
    console.error('Error enabling notifications:', error)
    errorMessage.value = texts.value.error
    showErrorMessage.value = true
  } finally {
    isLoading.value = false
  }
}

async function setupNotifications() {
  // Request permission and get token
  const token = await requestNotificationPermission()

  if (!token) {
    throw new Error('Failed to get notification token')
  }

  // Store token in store
  store.notificationToken = token

  // Register token with backend if we have buildingID
  if (store.buildingID) {
    try {
      const response = await registerToken(store.buildingID, token, store.guestID || undefined)

      // Store guestID if it was created
      if (response.guestID && !store.guestID) {
        store.guestID = response.guestID
        // Persist guestID to localStorage
        localStorage.setItem('guestID', response.guestID)
      }

      // Persist token and registration status
      localStorage.setItem('notificationToken', token)
      localStorage.setItem('notificationRegistered', 'true')
    } catch (error) {
      console.error('Error registering token with backend:', error)
      // Don't throw - we still got the token, just backend registration failed
    }
  }

  // Setup foreground message handler
  setupForegroundMessageHandler()
}

function setupForegroundMessageHandler() {
  onForegroundMessage((payload) => {
    console.log('Foreground notification received:', payload)
    console.log('Payload structure:', {
      hasNotification: !!payload.notification,
      notificationTitle: payload.notification?.title,
      notificationBody: payload.notification?.body,
      data: payload.data
    })

    // Extract title and body - try notification object first, then data object
    const title = payload.notification?.title || payload.data?.title || 'Checkpoint Notification'
    const body = payload.notification?.body || payload.data?.message || payload.data?.body || ''

    console.log('Extracted values:', { title, body })

    // Show browser notification
    if (Notification.permission === 'granted') {
      const options = {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data || {}
      }

      console.log('Showing notification with:', { title, options })
      new Notification(title, options)
    } else {
      console.warn('Notification permission not granted:', Notification.permission)
    }
  })
}

function dismissPrompt() {
  showNotificationPrompt.value = false
  // Remember user dismissed this specific trigger
  dismissedTriggers.value.add(props.trigger)
  localStorage.setItem(getDismissedKey(props.trigger), 'true')
}
</script>

<style scoped>
.notification-prompt {
  border-left: 4px solid rgb(var(--v-theme-primary));
}
</style>
