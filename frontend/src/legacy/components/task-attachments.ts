type AttachmentLike = {
  name: string
  file_type?: string
  file_name?: string
  file_url?: string
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'])

export function isAttachmentImage(item: AttachmentLike): boolean {
  const normalizedType = String(item.file_type || '').trim().toLowerCase().replace(/^\./, '')
  if (normalizedType.startsWith('image/')) return true
  if (IMAGE_EXTENSIONS.has(normalizedType)) return true

  for (const candidate of [item.file_name, item.file_url]) {
    const value = String(candidate || '').trim().toLowerCase()
    if (!value) continue
    const base = value.split('?')[0].split('#')[0].split('/').pop() || ''
    const ext = base.includes('.') ? base.split('.').pop() : ''
    if (ext && IMAGE_EXTENSIONS.has(ext)) return true
  }

  return false
}

export function resolveAttachmentAssetUrl(fileUrl?: string): string {
  const value = String(fileUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('/private/files/')) {
    return `/api/method/frappe.utils.file_manager.download_file?file_url=${encodeURIComponent(value)}`
  }
  return value
}

export function getAttachmentColumnCount(width: number): number {
  if (width >= 1280) return 5
  if (width >= 1024) return 4
  if (width >= 640) return 3
  return 2
}

export function mergeAttachmentsWithReorderedImages<T extends AttachmentLike>(
  allAttachments: T[],
  reorderedImages: T[],
): T[] {
  const nonImages = allAttachments.filter((item) => !isAttachmentImage(item))
  return [...reorderedImages, ...nonImages]
}
