import { useEffect, useMemo, useRef, useState } from 'react'

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }
}

function isStandalone() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
}

export function resolvePwaAssetUrl(assetPath: string, baseUrl = import.meta.env.BASE_URL || '/') {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedPath = assetPath.replace(/^\/+/, '')
  return `${normalizedBase}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1')
}

export async function probeServiceWorkerScript(scriptUrl: string) {
  try {
    const response = await fetch(scriptUrl, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/javascript,text/javascript,*/*;q=0.1',
      },
    })

    if (!response.ok) {
      return false
    }

    const contentType = response.headers.get('content-type') || ''
    return /javascript|ecmascript/i.test(contentType)
  } catch {
    return false
  }
}

async function unregisterHambaftServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const origin = window.location.origin
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations
        .filter((registration) => {
          const activeScript =
            registration.active?.scriptURL ||
            registration.waiting?.scriptURL ||
            registration.installing?.scriptURL ||
            ''

          return (
            registration.scope.startsWith(origin) &&
            (registration.scope === `${origin}/` ||
              registration.scope.includes('/hambaft') ||
              activeScript.includes('/hambaft') ||
              activeScript.endsWith('/sw.js'))
          )
        })
        .map((registration) => registration.unregister().catch(() => false))
    )
  } catch {
    // Ignore cleanup failures
  }
}

export function registerPwaServiceWorker() {
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    const serviceWorkerUrl = resolvePwaAssetUrl('sw.js')

    probeServiceWorkerScript(serviceWorkerUrl)
      .then((isValidScript) => {
        if (!isValidScript) {
          return unregisterHambaftServiceWorkers()
        }

        return navigator.serviceWorker.getRegistration(serviceWorkerUrl).then((registration) => {
          if (registration?.active?.scriptURL === serviceWorkerUrl) {
            return registration
          }

          return navigator.serviceWorker.register(serviceWorkerUrl)
        })
      })
      .catch(() => {
        // SW registration failed — not fatal
      })
  })
}

/**
 * PWA install prompt banner.
 *
 * Key rules for beforeinstallprompt:
 * - Capture the event on first fire and store it
 * - Only call prompt() from an explicit user click handler
 * - Clear the stored event after use — it can only be prompted once
 * - After the user dismisses, hide the banner
 * - After the app is installed, hide the banner
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const promptConsumedRef = useRef(false)
  const installed = useMemo(() => isStandalone(), [])

  useEffect(() => {
    if (installed) {
      return
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      // Only store if we haven't consumed a previous event
      if (!promptConsumedRef.current) {
        setDeferredPrompt(event as BeforeInstallPromptEvent)
      }
    }

    function handleInstalled() {
      setDeferredPrompt(null)
      promptConsumedRef.current = true
      setDismissed(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [installed])

  // Don't render if already installed, dismissed by user, or no deferred prompt available
  if (installed || dismissed || !deferredPrompt) {
    return null
  }

  async function handleInstall() {
    if (!deferredPrompt || promptConsumedRef.current) {
      setDeferredPrompt(null)
      return
    }

    try {
      promptConsumedRef.current = true
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        // App was installed — hide banner permanently
        setDeferredPrompt(null)
        setDismissed(true)
      } else {
        // User dismissed the native prompt — hide our banner too
        setDeferredPrompt(null)
        setDismissed(true)
      }
    } catch {
      // prompt() failed (e.g., called without user gesture, or event was stale)
      setDeferredPrompt(null)
      setDismissed(true)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[1000] flex justify-center sm:justify-start">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-[rgba(45,48,37,0.12)] bg-[rgba(255,252,246,0.96)] p-2 shadow-[0_24px_48px_rgba(84,66,37,0.14)] backdrop-blur">
        <button
          className="rounded-xl bg-[#2d3025] px-4 py-2 text-sm font-black text-white hover:bg-[#1a1c15] transition-colors"
          type="button"
          onClick={handleInstall}
        >
          نصب اپ
        </button>
        <button
          className="rounded-xl px-3 py-2 text-xs font-bold text-[#6b6c61] hover:text-[#4a4b42] transition-colors"
          type="button"
          onClick={() => {
            setDismissed(true)
            setDeferredPrompt(null)
          }}
        >
          بعداً
        </button>
      </div>
    </div>
  )
}
