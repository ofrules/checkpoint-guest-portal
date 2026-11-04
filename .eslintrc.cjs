/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  overrides: [
    {
      // Service worker: importScripts and clients are worker globals, and
      // firebase comes from the compat scripts it imports.
      files: ['public/firebase-messaging-sw.js'],
      env: { serviceworker: true, browser: false },
      globals: { firebase: 'readonly' }
    }
  ]
}
