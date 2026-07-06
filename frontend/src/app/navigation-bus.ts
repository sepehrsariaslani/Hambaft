type Listener = (path: string) => void

let listeners: Listener[] = []

export function navigateTo(path: string) {
  for (const listener of listeners) {
    try {
      listener(path)
    } catch (err) {
      console.error('[navigation-bus] listener failed', err)
    }
  }
}

export function subscribeNavigation(listener: Listener) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((entry) => entry !== listener)
  }
}

type ActionListener = (action: string, payload?: unknown) => void

let actionListeners: ActionListener[] = []

export function dispatchAction(action: string, payload?: unknown) {
  for (const listener of actionListeners) {
    try {
      listener(action, payload)
    } catch (err) {
      console.error('[navigation-bus] action listener failed', err)
    }
  }
}

export function subscribeAction(listener: ActionListener) {
  actionListeners.push(listener)
  return () => {
    actionListeners = actionListeners.filter((entry) => entry !== listener)
  }
}
