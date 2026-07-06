import { useEffect, useMemo, useState } from 'react'

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

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function registerPwaServiceWorker() {
  if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('PWA service worker registration failed', error)
    })
  })
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const installed = useMemo(() => isStandalone(), [])

  useEffect(() => {
    if (installed) {
      return
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function handleInstalled() {
      setDeferredPrompt(null)
      setDismissed(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [installed])

  if (installed || dismissed || !deferredPrompt) {
    return null
  }

  async function handleInstall() {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (choice.outcome !== 'accepted') {
      setDismissed(true)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[1000] flex justify-center sm:justify-start">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-[rgba(45,48,37,0.12)] bg-[rgba(255,252,246,0.96)] p-2 shadow-[0_24px_48px_rgba(84,66,37,0.14)] backdrop-blur">
        <button
          className="rounded-xl bg-[#2d3025] px-4 py-2 text-sm font-black text-white"
          type="button"
          onClick={handleInstall}
        >
          نصب اپ
        </button>
        <button
          className="rounded-xl px-3 py-2 text-xs font-bold text-[#6b6c61]"
          type="button"
          onClick={() => setDismissed(true)}
        >
          بعداً
        </button>
      </div>
    </div>
  )
}
