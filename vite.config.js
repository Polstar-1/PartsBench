import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readUpdates } from './scripts/updates-from-git.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The newest commits become entries in the Updates list (see scripts/updates-from-git.mjs).
  define: { __GIT_UPDATES__: JSON.stringify(readUpdates()) },
})
