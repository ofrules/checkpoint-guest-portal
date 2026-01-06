import './assets/main.css'
import './assets/actionListView.css'
import 'bootstrap/dist/css/bootstrap.min.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import * as Sentry from '@sentry/vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VNumberInput } from 'vuetify/labs/VNumberInput'

const vuetify = createVuetify({
  components: {
    ...components,
    VNumberInput
  },
  directives
})

const app = createApp(App)
app.use(vuetify).use(router).mount('#app')

Sentry.init({
  app,
  dsn: 'https://fb0bf3c1e778ac0afe4d4e88afda6541@o4506955265146880.ingest.us.sentry.io/4509988686921728',
  sendDefaultPii: true,
  enableLogs: true
})

// Register Firebase Cloud Messaging Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('Service Worker registered successfully:', registration)
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error)
    })
}
