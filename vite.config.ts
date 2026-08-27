import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Only expose the GA measurement ID (public by nature) to the client so the
  // gtag.js script can be gated on GA_MEASUREMENT_ID (FR-9.1). The GA4 API
  // secret (`GA4_API_SECRET`) must never reach the client bundle.
  envPrefix: ['VITE_', 'GA_'],
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
