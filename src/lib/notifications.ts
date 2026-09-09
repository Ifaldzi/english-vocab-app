import {
  deletePushSubscriptionFn,
  getPushConfigFn,
  savePushSubscriptionFn,
} from '../server/notifications/reminders.functions'

const SW_PATH = '/sw.js'

/** Feature detection: Web Push needs a service worker + PushManager + HTTPS (or localhost). */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    (window.isSecureContext || window.location.hostname === 'localhost')
  )
}

let swRegistration: ServiceWorkerRegistration | null = null

async function getOrRegisterSw(): Promise<ServiceWorkerRegistration> {
  if (swRegistration) return swRegistration
  const registration = await navigator.serviceWorker.register(SW_PATH)
  swRegistration = registration
  return registration
}

/**
 * Ensures the browser has granted notification permission, then subscribes
 * this device and stores the subscription server-side. No-op when the user
 * has denied permission or Web Push is unsupported. Safe to call repeatedly.
 */
export async function enableNotifications(): Promise<void> {
  if (!isPushSupported()) return
  if (Notification.permission === 'denied') return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission !== 'granted') return

  const { vapidPublicKey } = await getPushConfigFn()
  if (!vapidPublicKey) return

  const registration = await getOrRegisterSw()
  const existing = await registration.pushManager.getSubscription()

  if (!existing) {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
    await savePushSubscriptionFn({ data: toSubscriptionInput(subscription) })
  } else {
    // Already subscribed on this browser; keep the server record in sync.
    await savePushSubscriptionFn({ data: toSubscriptionInput(existing) })
  }
}

/** Removes this device's subscription both locally and server-side. */
export async function disableNotifications(): Promise<void> {
  if (!isPushSupported()) return
  const registration = await getOrRegisterSw()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  await deletePushSubscriptionFn({ data: { endpoint: subscription.endpoint } })
  await subscription.unsubscribe()
}

/** Whether this browser currently has a push subscription (for debugging). */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await getOrRegisterSw()
  return Boolean(await registration.pushManager.getSubscription())
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

function toSubscriptionInput(subscription: PushSubscription): {
  endpoint: string
  p256dh: string
  auth: string
} {
  const json = subscription.toJSON()
  return {
    endpoint: json.endpoint as string,
    p256dh: json.keys?.p256dh as string,
    auth: json.keys?.auth as string,
  }
}
