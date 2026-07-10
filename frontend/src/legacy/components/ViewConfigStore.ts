/**
 * ViewConfigStore — Notion-like saved views & configurable columns.
 * Persists per-view layout state in localStorage.
 * Supports: visible columns, sort, filters, groupBy, density mode, saved view snapshots.
 */

// ─── Column Definitions ──────────────────────────────────────

export type ColumnId =
  | 'title' | 'status' | 'priority' | 'category' | 'importance'
  | 'dueDate' | 'scheduledDate' | 'project' | 'area' | 'goal'
  | 'impactScore' | 'effortType' | 'estimatedMinutes' | 'actualMinutes'
  | 'isDailyHighlight' | 'blockedBy' | 'createdAt'

export interface ColumnDef {
  id: ColumnId
  label: string
  defaultVisible: boolean
  minWidth?: number  // px
}

export const TASK_COLUMNS: ColumnDef[] = [
  { id: 'title', label: 'عنوان', defaultVisible: true, minWidth: 160 },
  { id: 'status', label: 'وضعیت', defaultVisible: true, minWidth: 90 },
  { id: 'priority', label: 'اولویت', defaultVisible: true, minWidth: 80 },
  { id: 'importance', label: 'اهمیت', defaultVisible: true, minWidth: 80 },
  { id: 'dueDate', label: 'تاریخ سررسید', defaultVisible: true, minWidth: 100 },
  { id: 'category', label: 'دسته', defaultVisible: false, minWidth: 80 },
  { id: 'project', label: 'پروژه', defaultVisible: true, minWidth: 100 },
  { id: 'area', label: 'حوزه', defaultVisible: false, minWidth: 80 },
  { id: 'goal', label: 'هدف', defaultVisible: false, minWidth: 80 },
  { id: 'impactScore', label: 'امتیاز تأثیر', defaultVisible: false, minWidth: 80 },
  { id: 'effortType', label: 'نوع تلاش', defaultVisible: false, minWidth: 80 },
  { id: 'estimatedMinutes', label: 'زمان تخمینی', defaultVisible: false, minWidth: 80 },
  { id: 'actualMinutes', label: 'زمان واقعی', defaultVisible: false, minWidth: 80 },
  { id: 'isDailyHighlight', label: 'برجسته روز', defaultVisible: false, minWidth: 80 },
  { id: 'blockedBy', label: 'پیش‌نیازها', defaultVisible: false, minWidth: 80 },
  { id: 'scheduledDate', label: 'تاریخ برنامه', defaultVisible: false, minWidth: 100 },
  { id: 'createdAt', label: 'تاریخ ایجاد', defaultVisible: false, minWidth: 100 },
]

// ─── Density Modes ───────────────────────────────────────────

export type DensityMode = 'compact' | 'comfortable'

export const DENSITY_CONFIG: Record<DensityMode, {
  rowPadding: string
  textSize: string
  badgeSize: string
  gap: string
  cellPadding: string
}> = {
  compact: {
    rowPadding: 'px-2 py-1.5',
    textSize: 'text-[11px]',
    badgeSize: 'text-[9px] px-1 py-0.5',
    gap: 'gap-1.5',
    cellPadding: 'px-1.5 py-1',
  },
  comfortable: {
    rowPadding: 'px-4 py-3',
    textSize: 'text-sm',
    badgeSize: 'text-[11px] px-2 py-0.5',
    gap: 'gap-3',
    cellPadding: 'px-3 py-2',
  },
}

// ─── View Config Shape ───────────────────────────────────────

export interface ViewConfig {
  id: string          // e.g. 'planner-buckets', 'task-manager-list'
  label: string
  visibleColumns: ColumnId[]
  density: DensityMode
  sortBy?: string
  groupBy?: string
  filters?: Record<string, string>
}

export interface SavedView {
  id: string
  name: string
  createdAt: string
  config: ViewConfig
}

// ─── Storage Keys ────────────────────────────────────────────

const VIEW_CONFIG_PREFIX = 'hambaft_view_config_'
const SAVED_VIEWS_KEY = 'hambaft_saved_views'

// ─── Helpers ─────────────────────────────────────────────────

function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function storageSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

// ─── View Config CRUD ────────────────────────────────────────

export function getViewConfig(viewId: string): ViewConfig | null {
  return storageGet<ViewConfig | null>(VIEW_CONFIG_PREFIX + viewId, null)
}

export function setViewConfig(viewId: string, config: ViewConfig) {
  storageSet(VIEW_CONFIG_PREFIX + viewId, config)
}

export function getDefaultViewConfig(viewId: string, label: string): ViewConfig {
  return {
    id: viewId,
    label,
    visibleColumns: TASK_COLUMNS.filter(c => c.defaultVisible).map(c => c.id),
    density: 'comfortable',
  }
}

export function getOrInitViewConfig(viewId: string, label: string): ViewConfig {
  return getViewConfig(viewId) || getDefaultViewConfig(viewId, label)
}

// ─── Saved Views ─────────────────────────────────────────────

export function getSavedViews(): SavedView[] {
  return storageGet<SavedView[]>(SAVED_VIEWS_KEY, [])
}

export function saveView(saved: SavedView) {
  const views = getSavedViews()
  const idx = views.findIndex(v => v.id === saved.id)
  if (idx >= 0) views[idx] = saved
  else views.push(saved)
  storageSet(SAVED_VIEWS_KEY, views)
}

export function deleteSavedView(id: string) {
  const views = getSavedViews().filter(v => v.id !== id)
  storageSet(SAVED_VIEWS_KEY, views)
}

// ─── Column toggle ───────────────────────────────────────────

export function toggleColumn(config: ViewConfig, columnId: ColumnId): ViewConfig {
  const cols = [...config.visibleColumns]
  const idx = cols.indexOf(columnId)
  if (idx >= 0) {
    // Don't allow hiding title
    if (columnId === 'title') return config
    cols.splice(idx, 1)
  } else {
    // Insert after the last currently-visible column
    cols.push(columnId)
  }
  return { ...config, visibleColumns: cols }
}

export function isColumnVisible(config: ViewConfig, columnId: ColumnId): boolean {
  return config.visibleColumns.includes(columnId)
}

export function setDensity(config: ViewConfig, density: DensityMode): ViewConfig {
  return { ...config, density }
}
