import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import './legacy/index.css'
import { getMountElement } from './app/mount'
import { PwaInstallPrompt, registerPwaServiceWorker } from './app/pwa'
import { router } from './app/router'

declare global {
  interface HTMLElement {
    __hambaftReactRoot?: Root
  }
}

const mountElement = getMountElement()
const root = mountElement.__hambaftReactRoot ?? createRoot(mountElement)
mountElement.__hambaftReactRoot = root
registerPwaServiceWorker()

root.render(
  <StrictMode>
    <>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
    </>
  </StrictMode>,
)
