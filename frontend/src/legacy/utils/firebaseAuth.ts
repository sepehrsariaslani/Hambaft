export function initAuth(onAuthSuccess?: () => void, onAuthFailure?: () => void) {
  if (typeof window !== 'undefined' && window.user && window.user !== 'Guest') {
    onAuthSuccess?.()
  } else {
    onAuthFailure?.()
  }

  return () => {}
}

export async function googleSignIn(): Promise<null> {
  return null
}

export function getCachedAccessToken(): string | null {
  return null
}

export async function logout() {
  return null
}
