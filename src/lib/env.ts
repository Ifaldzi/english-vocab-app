/**
 * Environment access for the client bundle.
 * Only `GA_MEASUREMENT_ID` is exposed to `import.meta.env` via the
 * `envPrefix` in `vite.config.ts` (FR-9.1: gtag gated on the var). The GA4
 * API secret stays server-only.
 */
export const GA_MEASUREMENT_ID: string | undefined =
  import.meta.env.GA_MEASUREMENT_ID as string | undefined
