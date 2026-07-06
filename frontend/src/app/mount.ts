export function getMountElement(documentRef: Document = document): HTMLElement {
  const root = documentRef.getElementById('root')

  if (root instanceof HTMLElement) {
    return root
  }

  const legacyApp = documentRef.getElementById('app')

  if (legacyApp instanceof HTMLElement) {
    return legacyApp
  }

  throw new Error('Hambaft mount container not found. Expected #root or #app.')
}
