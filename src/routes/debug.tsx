import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/debug')({
  component: DebugPage,
})

function DebugPage() {
  const context = Route.useRouteContext()
  return (
    <pre style={{ whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(
        {
          hasUser: Boolean(context.user),
          user: context.user,
          ctxKeys: Object.keys(context),
        },
        null,
        2,
      )}
    </pre>
  )
}
