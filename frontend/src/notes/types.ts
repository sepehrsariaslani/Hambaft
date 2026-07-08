export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'numbered_list'
  | 'todo'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'code'
  | 'image'
  | 'table'
  | 'embed'

export interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link'
  attrs?: Record<string, string>
}

export interface InlineText {
  text: string
  marks?: TextMark[]
}

export interface Block {
  id: string
  type: BlockType
  content: InlineText[]
  props?: Record<string, any>
  children?: Block[]
  collapsed?: boolean
}

export interface NotePage {
  id: string
  title: string
  icon?: string
  cover?: string
  parentId?: string
  blocks: Block[]
  isFavorite?: boolean
  isArchived?: boolean
  isTrashed?: boolean
  createdAt: string
  updatedAt: string
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: 'متن',
  heading_1: 'تیتر ۱',
  heading_2: 'تیتر ۲',
  heading_3: 'تیتر ۳',
  bullet_list: 'لیست نشانه‌دار',
  numbered_list: 'لیست شماره‌دار',
  todo: 'لیست کار',
  toggle: 'تگل',
  quote: 'نقل قول',
  callout: 'کال‌اوت',
  divider: 'جداکننده',
  code: 'کد',
  image: 'تصویر',
  table: 'جدول',
  embed: 'امبد',
}

export const BLOCK_TYPE_ICONS: Record<BlockType, string> = {
  paragraph: '▤',
  heading_1: 'H1',
  heading_2: 'H2',
  heading_3: 'H3',
  bullet_list: '•',
  numbered_list: '1.',
  todo: '☐',
  toggle: '▶',
  quote: '"',
  callout: '💡',
  divider: '—',
  code: '</>',
  image: '🖼',
  table: '⊞',
  embed: '🔗',
}

export const SLASH_MENU_GROUPS = [
  {
    label: 'پایه',
    items: [
      { type: 'paragraph' as BlockType, label: 'متن', shortcut: 'پاراگراف', icon: '▤' },
      { type: 'heading_1' as BlockType, label: 'تیتر ۱', shortcut: '#', icon: 'H1' },
      { type: 'heading_2' as BlockType, label: 'تیتر ۲', shortcut: '##', icon: 'H2' },
      { type: 'heading_3' as BlockType, label: 'تیتر ۳', shortcut: '###', icon: 'H3' },
      { type: 'bullet_list' as BlockType, label: 'لیست نشانه‌دار', shortcut: '-', icon: '•' },
      { type: 'numbered_list' as BlockType, label: 'لیست شماره‌دار', shortcut: '1.', icon: '1.' },
      { type: 'todo' as BlockType, label: 'لیست کار', shortcut: '[]', icon: '☐' },
      { type: 'toggle' as BlockType, label: 'تگل', shortcut: '>', icon: '▶' },
      { type: 'quote' as BlockType, label: 'نقل قول', shortcut: '"', icon: '"' },
      { type: 'divider' as BlockType, label: 'جداکننده', shortcut: '---', icon: '—' },
      { type: 'callout' as BlockType, label: 'کال‌اوت', shortcut: '!>', icon: '💡' },
    ],
  },
  {
    label: 'رسانه و پیشرفته',
    items: [
      { type: 'code' as BlockType, label: 'بلوک کد', shortcut: '```', icon: '</>' },
      { type: 'image' as BlockType, label: 'تصویر', shortcut: '/img', icon: '🖼' },
      { type: 'table' as BlockType, label: 'جدول', shortcut: '/table', icon: '⊞' },
      { type: 'embed' as BlockType, label: 'امبد لینک', shortcut: '/embed', icon: '🔗' },
    ],
  },
]
