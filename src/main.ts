import './assets/main.css'
import './assets/actionListView.css'
import 'bootstrap/dist/css/bootstrap.min.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

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

createApp(App).use(vuetify).use(router).mount('#app')

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
