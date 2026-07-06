import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import './legacy/index.css'
import { getMountElement } from './app/mount'
import { PwaInstallPrompt, registerPwaServiceWorker } from './app/pwa'
import { router } from './app/router'
import { queryClient } from './app/query-client'
import { CommandPaletteProvider } from './app/command-palette'
import { KeyboardShortcutsProvider } from './app/keyboard-shortcuts'

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
    <QueryClientProvider client={queryClient}>
      <KeyboardShortcutsProvider>
        <CommandPaletteProvider>
          <RouterProvider router={router} />
          <PwaInstallPrompt />
        </CommandPaletteProvider>
      </KeyboardShortcutsProvider>
    </QueryClientProvider>
  </StrictMode>,
)
