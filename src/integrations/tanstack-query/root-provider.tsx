import { QueryClient } from '@tanstack/react-query'

import type { SessionUser } from '../../lib/types'

export function getContext() {
  const queryClient = new QueryClient()

  return {
    queryClient,
    user: null as SessionUser | null,
  }
}
export default function TanstackQueryProvider() {}
