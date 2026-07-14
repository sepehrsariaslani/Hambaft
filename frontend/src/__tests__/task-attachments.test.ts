import { describe, expect, it } from 'vitest'

import { getAttachmentColumnCount, isAttachmentImage, mergeAttachmentsWithReorderedImages } from '../legacy/components/task-attachments'

describe('getAttachmentColumnCount', () => {
  it('returns mobile-first responsive columns', () => {
    expect(getAttachmentColumnCount(375)).toBe(2)
    expect(getAttachmentColumnCount(768)).toBe(3)
    expect(getAttachmentColumnCount(1100)).toBe(4)
    expect(getAttachmentColumnCount(1440)).toBe(5)
  })
})

describe('mergeAttachmentsWithReorderedImages', () => {
  it('keeps non-image attachments while replacing image order', () => {
    const allAttachments = [
      { name: 'img-1', file_type: 'image/png' },
      { name: 'doc-1', file_type: 'application/pdf' },
      { name: 'img-2', file_type: 'image/jpeg' },
      { name: 'sheet-1', file_type: 'application/vnd.ms-excel' },
    ]

    const reorderedImages = [
      { name: 'img-2', file_type: 'image/jpeg' },
      { name: 'img-1', file_type: 'image/png' },
    ]

    expect(
      mergeAttachmentsWithReorderedImages(allAttachments, reorderedImages).map((item) => item.name),
    ).toEqual(['img-2', 'img-1', 'doc-1', 'sheet-1'])
  })
})

describe('isAttachmentImage', () => {
  it('accepts mime-style image types', () => {
    expect(isAttachmentImage({ name: 'img-1', file_type: 'image/png' })).toBe(true)
  })

  it('accepts extension-style file types returned by Frappe files', () => {
    expect(isAttachmentImage({ name: 'img-2', file_type: 'PNG', file_name: 'cover.png' })).toBe(true)
  })

  it('rejects non-image attachments', () => {
    expect(isAttachmentImage({ name: 'doc-1', file_type: 'PDF', file_name: 'brief.pdf' })).toBe(false)
  })
})
