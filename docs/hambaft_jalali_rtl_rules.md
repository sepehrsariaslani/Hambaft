# hambaft Jalali & RTL Enforcement Rules

> **Status:** Specification (no code implementation)
> **Scope:** All hambaft frontend (Vue 3), Frappe backend (Python), templates, and API responses
> **Audience:** Developers implementing or reviewing hambaft UI/UX features

---

## 1. Jalali (Shamsi) Date Rules

### 1.1 Core Principle

**All dates displayed in the hambaft user interface MUST be in Jalali (Shamsi / Persian) format.** Gregorian dates must never appear in rendered UI — not in tables, forms, cards, tooltips, notifications, charts, or any other visual element.

This applies to:
- Date fields on forms and detail views
- Table/list view columns that contain dates
- Calendar widgets and date pickers
- Filter controls (date range pickers, "last N days", etc.)
- Chart axes and data point labels
- Relative time displays ("2 days ago", "last month")
- Notification timestamps
- File/document metadata (created, modified)
- Any human-readable date string rendered in the DOM

### 1.2 Backend Storage vs. Frontend Display

- **Frappe stores all dates in Gregorian (ISO 8601) in the database.** This is non-negotiable and must not be changed.
- **API responses from Frappe return Gregorian dates by default.** The frontend (or an API middleware layer) is responsible for converting these to Jalali before rendering.
- **Dates sent TO the backend (form submissions, API writes) MUST be in Gregorian format.** The frontend must convert Jalali input back to Gregorian before persisting.

```
User sees:       ۱۴۰۳/۰۴/۱۵   (Jalali)
Database stores:  2024-07-06   (Gregorian ISO 8601)
API transmits:    2024-07-06   (Gregorian ISO 8601)
```

### 1.3 Date Format Standard

**Display format:** `YYYY/MM/DD` using Eastern Arabic numerals (Persian digits)

Example: `۱۴۰۳/۰۴/۱۵`

Rules:
- Four-digit year, two-digit month, two-digit day
- Separator: forward slash `/`
- Zero-padded months and days (e.g., `۰۱` for Farvardin, `۰۹` for Azar)
- Eastern Arabic numerals only (see Section 2.4 for number rules)
- No English month names anywhere in the UI

**Datetime display format:** `YYYY/MM/DD HH:mm` (24-hour clock)

Example: `۱۴۰۳/۰۴/۱۵ ۱۴:۳۰`

**Short date (space-constrained):** `YY/MM/DD` — only when layout explicitly requires it (e.g., dense table columns). Prefer full year.

### 1.4 Date Picker Rules

- All date picker components MUST use a Jalali calendar system.
- Week starts on **Saturday** (شنبه) — this is the Iranian convention.
- Day names in the picker header: `ش`, `ی`, `د`, `س`, `چ`, `پ`, `ج`
- Month names must use Persian month names:

  | # | Persian Name | Transliteration |
  |---|-------------|-----------------|
  | 1 | فروردین | Farvardin |
  | 2 | اردیبهشت | Ordibehesht |
  | 3 | خرداد | Khordad |
  | 4 | تیر | Tir |
  | 5 | مرداد | Mordad |
  | 6 | شهریور | Shahrivar |
  | 7 | مهر | Mehr |
  | 8 | آبان | Aban |
  | 9 | آذر | Azar |
  | 10 | دی | Dey |
  | 11 | بهمن | Bahman |
  | 12 | اسفند | Esfand |

- Year navigation must allow quick jumping (year dropdown or fast-scroll).
- Today's date must be visually highlighted.
- Selected date range must be visually distinct (start, end, in-between).
- The date picker must handle leap years correctly (Esfand has 29 or 30 days).

### 1.5 Date Range Display

- Format: `YYYY/MM/DD — YYYY/MM/DD` (using en-dash `—` with spaces)
- Example: `۱۴۰۳/۰۱/۰۱ — ۱۴۰۳/۰۶/۳۱`
- For same-year ranges, the year may be omitted from the start date: `۱۴۰۳/۰۴/۰۱ — ۰۶/۳۱`
- For same-month, same-year ranges: `۱۴۰۳/۰۴/۰۱ — ۱۵`
- Relative ranges ("last 30 days", "this month", "last quarter") must resolve to Jalali periods, not Gregorian.

### 1.6 Edge Cases

| Case | Rule |
|------|------|
| **Empty/null date** | Display a placeholder em-dash `—` or the Persian word `ندارد` (does not have). Never show `null`, `undefined`, `1970-01-01`, or `NaN/NaN/NaN`. |
| **Future dates** | Display normally in Jalali. No special visual treatment required unless the UX spec calls for it (e.g., "due in 3 days"). |
| **Dates before 1300 SH** (pre-1921 CE) | Display normally. Do not block or warn — just render. |
| **Invalid date strings from API** | Display `—` (em-dash). Log a warning to the console in development mode. Do not crash the component. |
| **Timestamps with timezone** | Convert to the user's local timezone, then display in Jalali. Store and transmit in UTC. |
| **Date-only vs. datetime fields** | Date fields show `YYYY/MM/DD`. Datetime fields show `YYYY/MM/DD HH:mm`. Do not append `:00` seconds. |
| **Sorting** | Sort by the underlying Gregorian value, not the Jalali string. Jalali `۱۴۰۳/۰۱/۰۱` > `۱۴۰۲/۱۲/۲۹` because 2024-03-20 > 2024-03-19. |

### 1.7 Frappe Backend — Python Controller Guidance

#### 1.7.1 Do NOT modify Frappe core date handling

Frappe's ORM (`frappe.db.get_value`, `frappe.get_doc`, etc.) returns Python `datetime.date` or `datetime.datetime` objects in Gregorian. This is correct. Do not attempt to change how Frappe stores or internally processes dates.

#### 1.7.2 API Response Conversion Layer

Create a utility module (e.g., `hambaft/utils/jalali.py`) that provides:

```python
# Conceptual API — not implementation

def to_jalali_string(date_obj) -> str:
    """Convert a Python date/datetime to Jalali string 'YYYY/MM/DD'."""
    ...

def to_jalali_datetime_string(datetime_obj) -> str:
    """Convert a Python datetime to Jalali string 'YYYY/MM/DD HH:mm'."""
    ...

def to_gregorian_date(jalali_string: str):
    """Convert a Jalali string 'YYYY/MM/DD' back to Python date for DB writes."""
    ...

def convert_doc_dates(doc: dict, date_fields: list[str]) -> dict:
    """Given a document dict and a list of field names, convert
    all date/datetime fields from Gregorian to Jalali strings."""
    ...
```

#### 1.7.3 Where to Apply Conversion

**Option A — API-level middleware (preferred for list/read APIs):**
- Override or wrap `hambaft/api.py` endpoints.
- After fetching data from Frappe ORM, pass the result through `convert_doc_dates()` before returning.
- Whitelist the fields that need conversion per doctype.

**Option B — `on_change` or document hooks (for form-level):**
- Use Frappe's `before_print` or custom API methods to transform dates.
- Less preferred because it doesn't cover list views.

**Option C — Frontend-only conversion (fallback):**
- If backend conversion is not feasible for a specific endpoint, the frontend must handle it.
- This should be the exception, not the rule.

#### 1.7.4 Recommended Python Library

Use `jdatetime` (the de facto standard Jalali library for Python):

- `pip install jdatetime`
- `jdatetime.date.fromgregorian(date=...)` → Jalali date object
- `jdatetime.datetime.fromgregorian(datetime=...)` → Jalali datetime object
- `jdatetime.date(jy, jm, jd).togregorian()` → back to Gregorian

#### 1.7.5 Frappe Whitespace & Patch Considerations

- Do not patch Frappe core files. Use `hambaft` app-level overrides.
- If using `before_print` hooks, register them in `hambaft/hooks.py`.
- For custom API methods that return Jalali dates, document the field format in the method's docstring.

### 1.8 Frontend — Vue Filters & Composables Guidance

#### 1.8.1 Vue 3 Composable (preferred over filters)

Vue 3 dropped filter support. Use a composable:

```javascript
// Conceptual API — not implementation
// src/composables/useJalali.js

import { computed } from 'vue'

export function useJalali() {
  function toJalali(dateString) { /* ... */ }
  function toJalaliDateTime(dateString) { /* ... */ }
  function toGregorian(jalaliString) { /* ... */ }
  function formatRelative(jalaliString) { /* ... */ }

  return { toJalali, toJalaliDateTime, toGregorian, formatRelative }
}
```

Usage in components:
```vue
<script setup>
import { useJalali } from '@/composables/useJalali'
const { toJalali } = useJalali()
</script>
<template>
  <span>{{ toJalali(task.due_date) }}</span>
</template>
```

#### 1.8.2 Recommended JavaScript Library

Use `jalaali-js` or `moment-jalaali`:

- `jalaali-js`: Lightweight, zero dependencies. `jalaali.toJalali(gy, gm, gd)` returns `{jy, jm, jd}`.
- `moment-jalaali`: Heavier but more feature-rich if moment.js is already in the bundle.

#### 1.8.3 Centralized Date Handling

- **Do not** scatter date conversion logic across components.
- All date display goes through the `useJalali` composable (or a global helper if composables are not appropriate for the context).
- API response interceptors (in `src/utils/frappe.js`) should convert known date fields automatically when the backend doesn't.

#### 1.8.4 Date Picker Component

- Use a Vue 3-compatible Jalali date picker (e.g., `vue3-persian-datepicker` or a custom component).
- The component must emit Gregorian dates to the parent (for API writes) while displaying Jalali.
- Props: `modelValue` (Gregorian ISO string), `placeholder` (Persian text), `disabled`, `min`, `max`.
- Emits: `update:modelValue` (Gregorian ISO string).

---

## 2. RTL Layout Rules

### 2.1 Core Principle

**The entire hambaft application MUST be rendered in Right-to-Left (RTL) direction.** This is not optional and applies to every page, component, modal, drawer, and overlay.

### 2.2 HTML & Document-Level Rules

- The `<html>` tag MUST have `dir="rtl"` and `lang="fa"`.
- In the Frappe template (`hambaft/templates/pages/hambaft.html`), set:
  ```html
  <html dir="rtl" lang="fa">
  ```
- If Frappe's base template already sets `dir`, override it in the hambaft-specific template or via a `before_render` hook.

### 2.3 CSS Direction Rules

- Set `direction: rtl` on the root container (`#app` or `<body>`).
- Use CSS logical properties instead of physical properties:
  - **Use:** `margin-inline-start`, `margin-inline-end`, `padding-inline-start`, `padding-inline-end`, `border-inline-start`, `border-inline-end`
  - **Avoid:** `margin-left`, `margin-right`, `padding-left`, `padding-right`, `border-left`, `border-right`
- For Tailwind CSS (used in hambaft), use RTL-aware utilities:
  - `ms-*` / `me-*` instead of `ml-*` / `mr-*`
  - `ps-*` / `pe-*` instead of `pl-*` / `pr-*`
  - `text-start` / `text-end` instead of `text-left` / `text-right`
  - `start-*` / `end-*` for positioned elements
- Tailwind's `rtl:` variant can be used for directional overrides when needed.

### 2.4 Number Display Rules

**All numbers in the UI MUST be displayed using Eastern Arabic numerals (Persian digits).**

Eastern Arabic numerals: `۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹`

This applies to:
- Dates (covered in Section 1.3)
- Currency amounts
- Quantities and counts
- Percentages
- Phone numbers
- Statistical figures
- Table cell numeric values
- Form input display values (not necessarily raw `<input>` values — see below)

**Exception:** Raw `<input type="number">` fields may display Western digits per browser behavior, but the surrounding label/formatted display must use Eastern Arabic.

**Conversion utility needed:**
```javascript
const easternArabicMap = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

function toPersianDigits(num) {
  return String(num).replace(/[0-9]/g, d => easternArabicMap[parseInt(d)])
}
```

### 2.5 Page Layout Rules

| Element | Rule |
|---------|------|
| **Page header / navbar** | Logo on the **right**, navigation items flowing left. User menu/avatar on the **left** (end side). |
| **Sidebar** | Positioned on the **right** side of the screen. Collapses to the right. |
| **Page content** | Flows from right to left. Primary content area is to the left of the sidebar. |
| **Breadcrumbs** | Separator icon points left (`‹` or `chevron-left`). Home icon on the right. |
| **Page title** | Right-aligned. Action buttons (New, Edit, etc.) on the **left** (inline-end). |
| **Cards** | Header content right-aligned. Card actions on the left side of the header. |

### 2.6 Form Rules

| Element | Rule |
|---------|------|
| **Labels** | Right-aligned above or beside the input. If beside, label is to the right of the input. |
| **Input fields** | Text starts from the right. Placeholder text is right-aligned. |
| **Select/dropdowns** | Dropdown opens aligned to the right edge of the trigger. Selected text is right-aligned. |
| **Checkboxes & radios** | The check/radio indicator is to the **right** of the label text. |
| **Form actions** | Primary button on the **left** (end side). Secondary/cancel button to the right of primary. |
| **Error messages** | Displayed below the input, right-aligned. Error icon on the right. |
| **Help text / descriptions** | Right-aligned below the input. |
| **Section breaks** | Section titles right-aligned. Section border or background extends full width. |

### 2.7 Table / List View Rules

| Element | Rule |
|---------|------|
| **Column headers** | Right-aligned text. Sort indicator on the right side of the header text. |
| **Row content** | Right-aligned by default. Numeric columns may be center-aligned. |
| **Row actions** (edit, delete) | Positioned on the **left** side of the row (or in a left-aligned actions column). |
| **Checkbox column** | On the **right** side (first column visually). |
| **Pagination** | "Previous" button on the left, "Next" button on the right (reversed from LTR). Page numbers flow right-to-left. |
| **Bulk actions toolbar** | Right-aligned. Action buttons flow from right to left. |

### 2.8 Modal / Dialog Rules

| Element | Rule |
|---------|------|
| **Modal position** | Centered (no directional bias). |
| **Close button (X)** | Top **left** corner of the modal. |
| **Modal title** | Right-aligned. |
| **Modal body** | Right-aligned text. Form elements follow Section 2.6 rules. |
| **Modal footer** | Primary action button on the **left**. Cancel/secondary to its right. |
| **Backdrop** | Full screen, no directional behavior. |

### 2.9 Navigation Rules

| Element | Rule |
|---------|------|
| **Main nav items** | Flow from right to left. Active indicator on the right edge. |
| **Sub-menus / dropdowns** | Open to the **left** (toward inline-start). |
| **Back button** | Arrow points right (`→` or `chevron-right`). |
| **Forward/continue button** | Arrow points left (`←` or `chevron-left`). |
| **Tab navigation** | Tabs flow right to left. Active tab indicator on the bottom or right edge. |
| **Stepper/wizard** | Progress flows right to left. Next button on the left, Previous on the right. |

### 2.10 Mixed Content (Bilingual) Rules

hambaft may contain both Persian (RTL) and English (LTR) content. Rules for handling:

1. **Paragraph-level:** If a paragraph is primarily Persian, the entire paragraph is RTL. English words or phrases within it flow left-to-right within the RTL context (bidi algorithm handles this automatically).

2. **UI labels:** If a UI label is in English (e.g., a technical term like "API Key"), it should still be positioned according to RTL layout rules (right-aligned in its container), but the text itself will render LTR.

3. **Code blocks & technical content:** Code, file paths, URLs, and technical identifiers should always render LTR, even inside RTL containers. Use `dir="ltr"` on code elements:
   ```html
   <code dir="ltr">/api/method/hambaft.api.some_method</code>
   ```

4. **Input fields:** Text inputs should respect the language of the expected content. For Persian text fields, set `dir="rtl"`. For fields expecting English/technical input (URLs, email, code), set `dir="ltr"`.

5. **Do NOT use Unicode bidi override characters** (U+202A–U+202E, U+200E, U+200F) directly in content. Rely on HTML `dir` attributes and CSS `direction` property instead.

### 2.11 Icon & Visual Element Rules

| Element | Rule |
|---------|------|
| **Directional icons** (arrows, chevrons) | Must be mirrored. `chevron-right` in LTR becomes `chevron-left` in RTL for "forward" navigation. |
| **Non-directional icons** (home, user, settings, search) | No mirroring needed. |
| **Progress bars** | Fill from right to left. |
| **Timelines** | Flow from right to left. |
| **Chat/message bubbles** | Sent messages on the left, received on the right (matching RTL reading order). |
| **Media with text direction** (e.g., a screenshot showing text) | Do not mirror. Display as-is. |

### 2.12 Frappe-Specific RTL Considerations

- Frappe's default Desk interface supports RTL via `System Settings > Language > فارسی`. When the user's language is set to Frappe, Frappe applies RTL CSS automatically.
- **hambaft must NOT rely on Frappe's RTL system.** hambaft's Vue frontend is a separate SPA and must handle RTL independently.
- Frappe's print formats, if used by hambaft, should have a separate RTL print format template with `direction: rtl` in the style block.
- Frappe's notification/toast messages that appear within the hambaft SPA context should be styled RTL. If using Frappe's built-in `frappe.show_alert()`, override the CSS for `.toast-message` to be right-aligned.

### 2.13 Testing Checklist for RTL

- [ ] All pages render right-to-left with no LTR "leaks"
- [ ] Sidebar is on the right side
- [ ] Form labels and inputs are right-aligned
- [ ] Tables have checkboxes on the right, actions on the left
- [ ] Modal close button is top-left
- [ ] Navigation flows right-to-left
- [ ] Dropdowns open toward inline-start (left)
- [ ] Progress bars fill right-to-left
- [ ] Directional icons are mirrored
- [ ] Non-directional icons are NOT mirrored
- [ ] Mixed English content renders correctly within RTL containers
- [ ] Code blocks and URLs render LTR within RTL context
- [ ] No horizontal scrollbar appears due to RTL overflow
- [ ] Print formats are RTL-compliant
- [ ] Mobile responsive layout maintains RTL at all breakpoints

---

## 3. Summary of Required Utilities

### 3.1 Backend (Python)

| Utility | Purpose | Location |
|---------|---------|----------|
| `to_jalali_string(date)` | Gregorian date → Jalali string | `hambaft/utils/jalali.py` |
| `to_jalali_datetime(dt)` | Gregorian datetime → Jalali string | `hambaft/utils/jalali.py` |
| `to_gregorian_date(jalali_str)` | Jalali string → Gregorian date | `hambaft/utils/jalali.py` |
| `convert_doc_dates(doc, fields)` | Batch convert doc fields | `hambaft/utils/jalali.py` |

### 3.2 Frontend (Vue 3 / JavaScript)

| Utility | Purpose | Location |
|---------|---------|----------|
| `useJalali()` composable | Date conversion for components | `frontend/src/composables/useJalali.js` |
| `toPersianDigits(num)` | Western → Eastern Arabic numerals | `frontend/src/utils/numbers.js` |
| API interceptor | Auto-convert date fields in responses | `frontend/src/utils/frappe.js` |
| Jalali date picker component | Persian calendar date selection | `frontend/src/components/JalaliDatePicker.vue` |

---

## 4. References

- `jdatetime` (Python): https://github.com/slashmili/python-jalali
- `jalaali-js` (JavaScript): https://github.com/jalaali/jalaali-js
- `moment-jalaali` (JavaScript): https://github.com/jalaali/moment-jalaali
- Tailwind CSS RTL: https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support
- MDN RTL best practices: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties
- Frappe RTL Desk: Enabled via System Settings → Language → فارسی
