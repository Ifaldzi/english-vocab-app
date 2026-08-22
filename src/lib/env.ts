/**
 * Environment access for the client bundle.
 * `GA_MEASUREMENT_ID` / `GA4_MEASUREMENT_ID` are exposed to `import.meta.env`
 * via the `envPrefix` in `vite.config.ts` (FR-9.1: gtag gated on the var).
 */
export const GA_MEASUREMENT_ID: string | undefined =
  (import.meta.env.GA_MEASUREMENT_ID as string | undefined) ??
  (import.meta.env.GA4_MEASUREMENT_ID as string | undefined)
