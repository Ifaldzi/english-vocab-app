import { useEffect } from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { getUserFn } from '../server/auth/auth.functions'
import type { SessionUser } from '../lib/types'
import { GA_MEASUREMENT_ID } from '../lib/env'

interface MyRouterContext {
  queryClient: QueryClient
  user: SessionUser | null
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    const user = await getUserFn()
    return { user }
  },
  head: () => {
    const gaId = GA_MEASUREMENT_ID
    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: 'WordDeck',
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
      ],
      scripts: gaId
        ? [
            {
              src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
              async: true,
            },
            {
              children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: false });`,
            },
          ]
        : [],
    }
  },
  shellComponent: RootDocument,
})

/** Fires a GA4 page_view on every client-side navigation (FR-9.2). */
function GtagPageView() {
  const location = useLocation()
  useEffect(() => {
    const gtag = (
      window as unknown as {
        gtag?: (command: string, ...args: unknown[]) => void
      }
    ).gtag
    if (typeof gtag !== 'function') return
    gtag('event', 'page_view', {
      page_path: location.pathname,
      page_title: document.title,
    })
  }, [location.pathname])
  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        {GA_MEASUREMENT_ID ? <GtagPageView /> : null}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
