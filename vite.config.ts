import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const isProd = process.env.NODE_ENV === 'production'

// Defense-in-depth response headers. CSP stays permissive enough for the
// inline gtag bootstrap and Tailwind inline styles; the app never renders
// user HTML, so the residual XSS surface is small.
const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  ...(isProd
    ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
    : {}),
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Only expose the GA measurement ID (public by nature) to the client so the
  // gtag.js script can be gated on GA_MEASUREMENT_ID (FR-9.1). The GA4 API
  // secret (`GA4_API_SECRET`) must never reach the client bundle.
  envPrefix: ['VITE_', 'GA_'],
  plugins: [
    devtools({
      // The AbortError from server functions cancelled on route change is
      // emitted via console.log; excluding it keeps the terminal clean while
      // warn/error/info/debug still pipe.
      consolePiping: { levels: ['warn', 'error', 'info', 'debug'] },
    }),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      routeRules: {
        '/**': { headers: securityHeaders },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
