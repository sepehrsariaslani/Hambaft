# Hambaft Design Tokens & Visual Spec

**App:** Hambaft (همبافت) — Mobile-first Persian lifestyle app  
**Version:** 1.0.0  
**Direction:** RTL (right-to-left)  
**Language:** Persian (فارسی) only — no English text in UI

---

## 1. Design Tokens

### 1.1 Color Tokens

All colors are defined as CSS custom properties under `:root`. The palette uses a warm cream base, solid black for text/nav, and a set of pastel accents for categorization and action.

#### Core Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-cream` | `#F7F0E3` | App background — main canvas color |
| `--color-black` | `#111111` | Primary text, bottom nav bar, strong headings |
| `--color-warning-red` | `#F26D65` | Errors, destructive actions, overdue indicators |

#### Pastel Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-pink` | `#F4A8D3` | Floating Action Button, love/favorite categories, soft highlights |
| `--color-yellow` | `#F7D957` | Goals, achievements, streak indicators, warning highlights |
| `--color-olive` | `#B8C97A` | Habits, wellness, nature, growth metrics |
| `--color-ice-blue` | `#AFC7EB` | Calendar, focus time, water intake, cool categories |
| `--color-purple` | `#CDB8F0` | Creativity, learning, premium features |

#### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#111111` | Headings, primary content (same as black) |
| `--color-text-secondary` | `#6B665D` | Body text, descriptions, timestamps |
| `--color-text-placeholder` | `#9E988B` | Input placeholders, disabled labels |
| `--color-text-on-dark` | `#F7F0E3` | Text on dark/black surfaces (cream) |

#### Semantic Aliases

These aliases map semantic roles to the palette above. Use these in components.

| Token | Maps To | Usage |
|-------|---------|-------|
| `--color-bg` | `--color-cream` | Root/app background |
| `--color-surface` | `#FFFFFF` | Card surfaces, sheets, modals |
| `--color-surface-elevated` | `#FFFFFF` | Elevated cards, dropdowns |
| `--color-text` | `--color-text-primary` | Default text color |
| `--color-text-muted` | `--color-text-secondary` | Secondary text |
| `--color-border` | `#E8E0D4` | Default border color |
| `--color-divider` | `#EDE6DB` | List dividers, separators |
| `--color-error` | `--color-warning-red` | Error states |
| `--color-success` | `--color-olive` | Success, completion states |
| `--color-info` | `--color-ice-blue` | Informational states |

### 1.2 Typography Tokens

#### Font Stack

**Primary (Preferred):** Peyda — a modern Persian/Arabic display and text font.  
**Fallback Chain:** Estedad → Vazirmatn → Noto Sans Arabic → Tahoma → system-ui → sans-serif

All weights available: 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold).

```css
:root {
  --font-family-primary: 'Peyda', 'Estedad', 'Vazirmatn', 'Noto Sans Arabic', 'Tahoma', system-ui, sans-serif;
  --font-family-numeric: 'Estedad', 'Vazirmatn', 'SF Mono', 'Roboto Mono', monospace;
}
```

All UI text uses `--font-family-primary`. Numbers, dates, and tabular data use `--font-family-numeric` with `font-variant-numeric: tabular-nums` for alignment.

#### Type Scale (Mobile-first)

Based on a 1.25 ratio (Major Third), optimized for Persian readability at size 14px+.

| Token | Size (px) | Size (rem) | Line Height | Weight | Usage |
|-------|-----------|------------|-------------|--------|-------|
| `--text-xs` | 10 | 0.625 | 1.5 | 400 | Badges, tiny labels |
| `--text-sm` | 12 | 0.75 | 1.5 | 400 | Captions, helper text |
| `--text-base` | 14 | 0.875 | 1.6 | 400 | Body text, form inputs |
| `--text-md` | 16 | 1.0 | 1.6 | 400 | Default body, descriptions |
| `--text-lg` | 18 | 1.125 | 1.5 | 500 | Subheadings, card titles |
| `--text-xl` | 20 | 1.25 | 1.4 | 700 | Page headings |
| `--text-2xl` | 24 | 1.5 | 1.35 | 700 | Section headings |
| `--text-3xl` | 30 | 1.875 | 1.3 | 800 | Hero text, onboarding |
| `--text-4xl` | 36 | 2.25 | 1.25 | 800 | Large display (rare) |

#### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--tracking-tight` | `-0.01em` | Headings `--text-xl` and above |
| `--tracking-normal` | `0` | Body text |
| `--tracking-wide` | `0.05em` | Labels, uppercase badges |

### 1.3 Spacing Tokens

4px base grid. All spacing values are multiples of 4px for consistent rhythm.

| Token | Value | rem |
|-------|-------|-----|
| `--space-0` | 0 | 0 |
| `--space-0-5` | 2px | 0.125rem |
| `--space-1` | 4px | 0.25rem |
| `--space-1-5` | 6px | 0.375rem |
| `--space-2` | 8px | 0.5rem |
| `--space-3` | 12px | 0.75rem |
| `--space-4` | 16px | 1rem |
| `--space-5` | 20px | 1.25rem |
| `--space-6` | 24px | 1.5rem |
| `--space-8` | 32px | 2rem |
| `--space-10` | 40px | 2.5rem |
| `--space-12` | 48px | 3rem |
| `--space-16` | 64px | 4rem |
| `--space-20` | 80px | 5rem |

### 1.4 Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 4px | Small tags, inline badges |
| `--radius-sm` | 8px | Chips, small buttons, inputs |
| `--radius-md` | 12px | Standard cards, list items |
| `--radius-lg` | 16px | Large cards, form sections |
| `--radius-xl` | 20px | Modals, bottom sheets |
| `--radius-2xl` | 24px | Hero cards, onboarding cards |
| `--radius-full` | 9999px | Avatars, pill shapes, FAB |

### 1.5 Shadow Tokens

Soft, warm shadows matching the cream palette. Avoid harsh shadows.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(17,17,17,0.04)` | Subtle card elevation |
| `--shadow-sm` | `0 1px 3px rgba(17,17,17,0.06), 0 1px 2px rgba(17,17,17,0.04)` | Resting cards |
| `--shadow-md` | `0 4px 8px rgba(17,17,17,0.06), 0 2px 4px rgba(17,17,17,0.04)` | Hovered cards, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(17,17,17,0.08), 0 4px 8px rgba(17,17,17,0.04)` | Modals, elevated surfaces |
| `--shadow-xl` | `0 12px 40px rgba(17,17,17,0.10), 0 6px 16px rgba(17,17,17,0.06)` | Floating elements, sheets |
| `--shadow-inner` | `inset 0 2px 4px rgba(17,17,17,0.04)` | Inset inputs, pressed states |

### 1.6 Z-Index Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | 0 | Default content |
| `--z-dropdown` | 100 | Dropdown menus |
| `--z-sticky` | 200 | Sticky headers |
| `--z-overlay` | 300 | Backdrop overlays |
| `--z-modal` | 400 | Modal dialogs |
| `--z-toast` | 500 | Toasts, snackbars |
| `--z-fab` | 150 | Floating Action Button |

### 1.7 Transition Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `150ms` | Micro-interactions, color changes |
| `--duration-normal` | `250ms` | Standard transitions |
| `--duration-slow` | `350ms` | Complex animations, modals |
| `--easing-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard ease |
| `--easing-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounces (celebrations) |
| `--easing-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Entering elements |
| `--easing-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exiting elements |

---

## 2. RTL Layout Rules

### 2.1 Document Direction

```html
<html dir="rtl" lang="fa">
```

### 2.2 Logical Properties

All layout CSS MUST use logical properties instead of physical properties:

| ❌ Physical | ✅ Logical |
|------------|-----------|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `left` | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `text-align: left` | `text-align: start` |
| `text-align: right` | `text-align: end` |

### 2.3 Flippable Exceptions

Some elements should NOT be mirrored:

- **Phone numbers and email addresses** — display LTR via `<bdi>` or `dir="ltr"`
- **Numeric values in mixed text** — use `unicode-isolate`
- **Icons with directionality** (arrows, progress bars) — flip via CSS `transform: scaleX(-1)` when needed
- **Charts and graphs** — typically LTR with RTL labels
- **Media playback controls** — keep standard LTR layout
- **QR codes and barcodes** — never flip

### 2.4 Text Alignment

- Default alignment: `start` (resolves to RTL right-aligned)
- Numeric tables: may use `end` for right-alignment of numbers in RTL
- Center alignment: acceptable for headings, buttons, empty states
- Persian body text: `start`; avoid forced justification (justification creates uneven gaps in Persian)

---

## 3. Responsive Breakpoints

Mobile-first approach. The app is designed for phones first, with optional tablet support.

| Token | Value | Target |
|-------|-------|--------|
| `--bp-xs` | `320px` | Minimum supported (iPhone SE 2nd gen) |
| `--bp-sm` | `375px` | Standard phone (iPhone 14) |
| `--bp-md` | `414px` | Large phone (iPhone 14 Plus) |
| `--bp-lg` | `768px` | Tablet (iPad portrait) |
| `--bp-xl` | `1024px` | Tablet landscape / small desktop |

### Media Query Mixins

```css
@media (min-width: 320px) { /* baseline — no media query needed */ }
@media (min-width: 375px) { /* standard phone adjustments */ }
@media (min-width: 414px) { /* large phone */ }
@media (min-width: 768px) { /* tablet */ }
@media (min-width: 1024px) { /* tablet landscape */ }
```

### Touch Targets

- Minimum touch target size: `44x44px` (`--tap-target: 44px`)
- Interactive elements: minimum `48x48px` on primary actions
- Spacing between touch targets: minimum `8px`

---

## 4. CSS Custom Properties Block

```css
/* ============================================
   Hambaft Design Tokens — CSS Custom Properties
   Version: 1.0.0
   ============================================ */

:root,
[data-theme='light'] {
  /* ── Core Colors ── */
  --color-cream: #F7F0E3;
  --color-black: #111111;
  --color-warning-red: #F26D65;

  /* ── Pastels ── */
  --color-pink: #F4A8D3;
  --color-yellow: #F7D957;
  --color-olive: #B8C97A;
  --color-ice-blue: #AFC7EB;
  --color-purple: #CDB8F0;

  /* ── Text Colors ── */
  --color-text-primary: #111111;
  --color-text-secondary: #6B665D;
  --color-text-placeholder: #9E988B;
  --color-text-on-dark: #F7F0E3;

  /* ── Semantic ── */
  --color-bg: var(--color-cream);
  --color-surface: #FFFFFF;
  --color-surface-elevated: #FFFFFF;
  --color-text: var(--color-text-primary);
  --color-text-muted: var(--color-text-secondary);
  --color-border: #E8E0D4;
  --color-divider: #EDE6DB;
  --color-error: var(--color-warning-red);
  --color-success: var(--color-olive);
  --color-info: var(--color-ice-blue);

  /* ── Gradients ── */
  --gradient-pink-yellow: linear-gradient(135deg, #F4A8D3 0%, #F7D957 100%);
  --gradient-purple-blue: linear-gradient(135deg, #CDB8F0 0%, #AFC7EB 100%);
  --gradient-olive-cream: linear-gradient(135deg, #B8C97A 0%, #F7F0E3 100%);

  /* ── Typography ── */
  --font-family-primary: 'Peyda', 'Estedad', 'Vazirmatn', 'Noto Sans Arabic', 'Tahoma', system-ui, sans-serif;
  --font-family-numeric: 'Estedad', 'Vazirmatn', 'SF Mono', 'Roboto Mono', monospace;

  --text-xs: 0.625rem;
  --text-sm: 0.75rem;
  --text-base: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  --leading-xs: 1.5;
  --leading-sm: 1.5;
  --leading-base: 1.6;
  --leading-md: 1.6;
  --leading-lg: 1.5;
  --leading-xl: 1.4;
  --leading-2xl: 1.35;
  --leading-3xl: 1.3;
  --leading-4xl: 1.25;

  --tracking-tight: -0.01em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;

  /* ── Spacing ── */
  --space-0: 0;
  --space-0-5: 0.125rem;
  --space-1: 0.25rem;
  --space-1-5: 0.375rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;

  /* ── Border Radius ── */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-xs: 0 1px 2px rgba(17, 17, 17, 0.04);
  --shadow-sm: 0 1px 3px rgba(17, 17, 17, 0.06), 0 1px 2px rgba(17, 17, 17, 0.04);
  --shadow-md: 0 4px 8px rgba(17, 17, 17, 0.06), 0 2px 4px rgba(17, 17, 17, 0.04);
  --shadow-lg: 0 8px 24px rgba(17, 17, 17, 0.08), 0 4px 8px rgba(17, 17, 17, 0.04);
  --shadow-xl: 0 12px 40px rgba(17, 17, 17, 0.10), 0 6px 16px rgba(17, 17, 17, 0.06);
  --shadow-inner: inset 0 2px 4px rgba(17, 17, 17, 0.04);

  /* ── Z-Index ── */
  --z-base: 0;
  --z-fab: 150;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;

  /* ── Transitions ── */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --easing-enter: cubic-bezier(0, 0, 0.2, 1);
  --easing-exit: cubic-bezier(0.4, 0, 1, 1);

  /* ── Component Tokens ── */
  --tap-target: 44px;

  /* ── Bottom Navigation ── */
  --bottom-nav-height: 64px;
  --bottom-nav-bg: var(--color-black);
  --bottom-nav-text: var(--color-text-on-dark);
  --bottom-nav-text-active: var(--color-pink);
  --bottom-nav-icon-size: 24px;

  /* ── FAB ── */
  --fab-size: 56px;
  --fab-bg: var(--color-pink);
  --fab-shadow: 0 4px 12px rgba(244, 168, 211, 0.4);
  --fab-shadow-active: 0 2px 8px rgba(244, 168, 211, 0.3);

  /* ── Card ── */
  --card-radius: var(--radius-lg);
  --card-padding: var(--space-4);
  --card-bg: var(--color-surface);
  --card-shadow: var(--shadow-sm);

  /* ── Modal ── */
  --modal-bg: rgba(17, 17, 17, 0.5);
  --modal-surface-bg: #1C1C1C;
  --modal-radius: var(--radius-xl);
  --modal-padding: var(--space-6);

  /* ── Button ── */
  --button-height-sm: 36px;
  --button-height-md: 44px;
  --button-height-lg: 52px;
  --button-radius: var(--radius-full);
  --button-padding-x: var(--space-5);
}

/* ============================================
   Breakpoints (for reference in media queries)
   ============================================
   --bp-xs: 320px
   --bp-sm: 375px
   --bp-md: 414px
   --bp-lg: 768px
   --bp-xl: 1024px
   ============================================ */
```

---

## 5. Component Specifications

### 5.1 Card (کارت)

The primary content container. Rounded, soft-shadowed, cream-surface.

**Visual Spec:**
- Background: `var(--color-surface)` (#FFFFFF)
- Border radius: `var(--radius-lg)` (16px)
- Box shadow: `var(--shadow-sm)`
- Padding: `var(--space-4)` (16px)
- Border: none (shadow provides elevation)

**States:**

| State | Style |
|-------|-------|
| Default | As above |
| Pressed | `transform: scale(0.98)`, shadow reduces to `--shadow-xs` |
| Disabled | `opacity: 0.5`, no interaction |
| Accent-left | 3px `border-inline-start` in pastel color |

**Accent Variants:**

| Variant | Accent Color |
|---------|-------------|
| Tasks | `--color-pink` |
| Calendar | `--color-ice-blue` |
| Habits | `--color-olive` |
| Goals | `--color-yellow` |
| Finance | `--color-purple` |
| Notes | `--color-pink` |

**CSS:**

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--card-padding, var(--space-4));
}

.card--accent::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: var(--space-2);
  bottom: var(--space-2);
  width: 3px;
  border-radius: var(--radius-full);
  background: var(--card-accent, var(--color-pink));
}

.card:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-xs);
  transition: transform var(--duration-fast) var(--easing-default),
              box-shadow var(--duration-fast) var(--easing-default);
}
```

---

### 5.2 Primary Button (دکمه اصلی)

Rounded pill button for primary actions.

**Visual Spec:**

| Property | Value |
|----------|-------|
| Background | `var(--color-black)` (#111111) |
| Text color | `var(--color-text-on-dark)` (cream) |
| Font | `--font-family-primary`, weight 700, size `--text-base` |
| Height | `--button-height-md` (44px) |
| Padding-inline | `--button-padding-x` (20px) |
| Border radius | `--radius-full` (9999px) |
| Shadow | `--shadow-xs` |

**Size Variants:**

| Variant | Height | Padding-X | Font Size |
|---------|--------|-----------|-----------|
| sm | 36px | 16px | `--text-sm` |
| md (default) | 44px | 20px | `--text-base` |
| lg | 52px | 24px | `--text-md` |

**States:**

| State | Background | Transform | Shadow |
|-------|-----------|-----------|--------|
| Default | `#111111` | — | `--shadow-xs` |
| Pressed | `#2A2A2A` | `scale(0.97)` | `--shadow-xs` |
| Disabled | `#111111` opacity 0.35 | — | none |
| Loading | `#2A2A2A` | — | `--shadow-xs` |

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--button-height-md);
  padding-inline: var(--button-padding-x);
  border-radius: var(--button-radius);
  background: var(--color-black);
  color: var(--color-text-on-dark);
  font-family: var(--font-family-primary);
  font-weight: 700;
  font-size: var(--text-base);
  box-shadow: var(--shadow-xs);
  transition: all var(--duration-fast) var(--easing-default);
  min-height: var(--tap-target);
}

.btn-primary:active {
  transform: scale(0.97);
  background: #2A2A2A;
}

.btn-primary:disabled {
  opacity: 0.35;
  box-shadow: none;
  pointer-events: none;
}
```

---

### 5.3 Pill/Chip (برچسب)

Small rounded tag for filtering, categorization, and selection.

**Visual Spec:**

| Property | Value |
|----------|-------|
| Height | 32px |
| Padding-inline | 12px |
| Border radius | `--radius-full` (9999px) |
| Font size | `--text-sm` (12px) |
| Font weight | 500 |

**Variants:**

| Variant | Background | Text Color | Border |
|---------|-----------|------------|--------|
| Default (inactive) | `--color-divider` | `--color-text-secondary` | none |
| Active (selected) | `--color-black` | `--color-text-on-dark` | none |
| Pastel accent | `[pastel] opacity 0.2` | `--color-text-primary` | 1px solid `[pastel] opacity 0.3` |

**Pastel chip tints:**

| Category | Background | Border |
|----------|-----------|--------|
| Pink | `rgba(244,168,211,0.15)` | `rgba(244,168,211,0.3)` |
| Yellow | `rgba(247,217,87,0.15)` | `rgba(247,217,87,0.3)` |
| Olive | `rgba(184,201,122,0.15)` | `rgba(184,201,122,0.3)` |
| Ice Blue | `rgba(175,199,235,0.15)` | `rgba(175,199,235,0.3)` |
| Purple | `rgba(205,184,240,0.15)` | `rgba(205,184,240,0.3)` |

```css
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding-inline: var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  font-family: var(--font-family-primary);
  transition: all var(--duration-fast) var(--easing-default);
  min-width: var(--tap-target);
}

.chip--default {
  background: var(--color-divider);
  color: var(--color-text-secondary);
}

.chip--active {
  background: var(--color-black);
  color: var(--color-text-on-dark);
}
```

---

### 5.4 Bottom Navigation (نوار پایینی)

Black navigation bar fixed at the bottom of the screen.

**Visual Spec:**

| Property | Value |
|----------|-------|
| Background | `--color-black` (#111111) |
| Height | 64px + safe-area-inset-bottom |
| Text color (inactive) | `#8A8578` (muted cream) |
| Text color (active) | `--color-pink` (#F4A8D3) |
| Icon size | 24px |
| Label font | `--text-xs` (10px), weight 400 |
| Label font (active) | weight 700 |
| Padding-bottom | `max(8px, env(safe-area-inset-bottom))` |
| Border-top | none |
| Shadow | `0 -2px 8px rgba(17,17,17,0.06)` (subtle top shadow) |

**Layout:** 5 equal-width items (icons + labels centered). FAB overlaps center if present.

**Items:** Typically 4 or 5 navigation destinations. If 5 items with center FAB, the center slot is left empty for the FAB to overlap.

```css
.bottom-nav {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  height: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--color-black);
  display: flex;
  flex-direction: row;
  box-shadow: 0 -2px 8px rgba(17, 17, 17, 0.06);
  z-index: var(--z-sticky);
}

.bottom-nav__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  color: #8A8578;
  transition: color var(--duration-fast) var(--easing-default);
  min-height: var(--tap-target);
}

.bottom-nav__item--active {
  color: var(--color-pink);
}

.bottom-nav__icon {
  width: var(--bottom-nav-icon-size);
  height: var(--bottom-nav-icon-size);
}

.bottom-nav__label {
  font-size: var(--text-xs);
  font-weight: 400;
}

.bottom-nav__item--active .bottom-nav__label {
  font-weight: 700;
}
```

---

### 5.5 Floating Action Button (دکمه شناور)

Pink circular FAB for the primary "add" action.

**Visual Spec:**

| Property | Value |
|----------|-------|
| Size | 56px × 56px |
| Shape | Circle (`border-radius: 50%`) |
| Background | `--color-pink` (#F4A8D3) |
| Icon color | `--color-black` #111111 |
| Icon size | 24px |
| Shadow | `0 4px 12px rgba(244,168,211,0.4)` |
| Position | Fixed, 16px above bottom nav, inline-end 16px |

**States:**

| State | Transform | Background | Shadow |
|-------|-----------|------------|--------|
| Default | — | `#F4A8D3` | `0 4px 12px rgba(244,168,211,0.4)` |
| Pressed | `scale(0.9)` | `#E899C4` | `0 2px 8px rgba(244,168,211,0.3)` |

**Positioning (with bottom nav):**
- Bottom: `calc(var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom))`
- Inline-end: `var(--space-4)` (16px)

```css
.fab {
  position: fixed;
  bottom: calc(var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom));
  inset-inline-end: var(--space-4);
  width: var(--fab-size);
  height: var(--fab-size);
  border-radius: 50%;
  background: var(--color-pink);
  color: var(--color-black);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--fab-shadow);
  z-index: var(--z-fab);
  transition: all var(--duration-fast) var(--easing-default);
}

.fab:active {
  transform: scale(0.9);
  background: #E899C4;
  box-shadow: var(--fab-shadow-active);
}
```

---

### 5.6 Modal — Add Menu (مودال افزودن)

Dark modal for adding new items. Full-screen or bottom-sheet feel.

**Backdrop:**
- Background: `rgba(17, 17, 17, 0.5)` (50% black overlay)
- Animation: fade in `--duration-normal`

**Sheet/Modal Surface:**
- Background: `#1C1C1C` (dark charcoal)
- Border radius: `20px 20px 0 0` (top corners only — bottom sheet style)
- Max height: 90vh
- Padding: `var(--space-6)` (24px)

**Content on Dark Surface:**
- Text color: `var(--color-text-on-dark)` (cream)
- Secondary text: `rgba(247, 240, 227, 0.6)`
- Input backgrounds: `rgba(255, 255, 255, 0.08)`
- Input text: cream
- Input placeholder: `rgba(247, 240, 227, 0.4)`
- Button: `--color-pink` background, `--color-black` text
- Close button: top-inline-start, cream icon

**Animation:**
- Enter: slide up from bottom `--duration-normal` `--easing-enter`
- Exit: slide down `--duration-normal` `--easing-exit`

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.5);
  z-index: var(--z-overlay);
  opacity: 0;
  transition: opacity var(--duration-normal) var(--easing-default);
}

.modal-overlay--open {
  opacity: 1;
}

.modal-sheet {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  max-height: 90vh;
  background: #1C1C1C;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: var(--modal-padding);
  z-index: var(--z-modal);
  transform: translateY(100%);
  transition: transform var(--duration-normal) var(--easing-enter);
  overflow-y: auto;
}

.modal-sheet--open {
  transform: translateY(0);
}

.modal-sheet__title {
  color: var(--color-text-on-dark);
  font-size: var(--text-xl);
  font-weight: 700;
  margin-bottom: var(--space-4);
  text-align: center;
}

.modal-sheet__close {
  position: absolute;
  top: var(--space-4);
  inset-inline-start: var(--space-4);
  color: var(--color-text-on-dark);
  background: none;
  border: none;
  padding: var(--space-2);
  min-height: var(--tap-target);
  min-width: var(--tap-target);
}
```

---

### 5.7 Mobile Form Elements (فرم‌های موبایل)

Optimized for touch, RTL, and Persian input.

**Text Input:**

| Property | Value |
|----------|-------|
| Height | 48px |
| Background | `var(--color-bg)` (cream) or `rgba(17,17,17,0.04)` on dark |
| Border | 1.5px solid `var(--color-border)` (`#E8E0D4`) |
| Border radius | `--radius-md` (12px) |
| Padding-inline | `--space-4` (16px) |
| Font size | `--text-base` (14px) |
| Font family | `--font-family-primary` |
| Color | `--color-text-primary` |
| Placeholder | `--color-text-placeholder` |

**Input States:**

| State | Border | Background | Shadow |
|-------|--------|------------|--------|
| Default | `#E8E0D4` | cream | none |
| Focused | `--color-text-secondary` #6B665D | cream | `0 0 0 3px rgba(107,102,93,0.12)` |
| Error | `--color-warning-red` | `rgba(242,109,101,0.05)` | `0 0 0 3px rgba(242,109,101,0.12)` |
| Disabled | `#E8E0D4` opacity 0.5 | `#F0EBE3` | none |

**Textarea:**
- Min height: 96px (3 lines)
- Same border, radius, and states as text input
- Resize: vertical only

**Select / Dropdown:**
- Same dimensions as text input
- Chevron icon at inline-end, rotated for RTL
- Dropdown menu: `var(--color-surface)`, `--shadow-md`, `--radius-md`
- Option height: 44px min
- Selected option: bold weight with pastel tint background

**Checkbox:**
- Size: 22px × 22px
- Border radius: `--radius-xs` (4px)
- Unchecked border: `--color-text-placeholder`
- Checked background: `--color-black`
- Checkmark: cream color, SVG
- Label: `--text-base`, 8px gap from checkbox (inline-start)

**Radio:**
- Size: 22px × 22px
- Unchecked border: `--color-text-placeholder`, 1.5px
- Checked: `--color-black` fill with cream inner circle

**Error Message:**
- Text: `--color-warning-red`, `--text-sm`
- Position: below input, 4px gap
- Icon: optional warning icon inline-start

```css
.input {
  width: 100%;
  height: 48px;
  padding-inline: var(--space-4);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-family-primary);
  font-size: var(--text-base);
  transition: all var(--duration-fast) var(--easing-default);
}

.input::placeholder {
  color: var(--color-text-placeholder);
}

.input:focus {
  outline: none;
  border-color: var(--color-text-secondary);
  box-shadow: 0 0 0 3px rgba(107, 102, 93, 0.12);
}

.input--error {
  border-color: var(--color-warning-red);
  background: rgba(242, 109, 101, 0.05);
}

.input--error:focus {
  box-shadow: 0 0 0 3px rgba(242, 109, 101, 0.12);
}

.input-error-text {
  color: var(--color-warning-red);
  font-size: var(--text-sm);
  margin-block-start: var(--space-1);
}

/* ── Labels ── */
.label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-block-end: var(--space-2);
}
```

---

### 5.8 Card-Based Charts (نمودارهای کارتی)

Charts displayed within cards for dashboards (habits, goals overview, finance summary).

**Container:**
- Wrapped in a `.card` component
- Chart area padding: `--space-4` (16px)
- Title: `--text-lg`, bold, `--color-text-primary`
- Subtitle: `--text-sm`, `--color-text-secondary`

**Color Sequence for Data Series:**
Use pastel accents in this order for multi-series charts:
1. Pink `#F4A8D3`
2. Ice Blue `#AFC7EB`
3. Yellow `#F7D957`
4. Olive `#B8C97A`
5. Purple `#CDB8F0`

**Chart Types:**

**Bar Chart (horizontal preferred in RTL):**
- Bar height: 12px
- Border radius: `--radius-full`
- Background bar: `--color-divider`
- Value bar: pastel color
- Label: `--text-xs`, `--color-text-secondary`
- Value: `--text-sm`, bold, `--color-text-primary`
- Gap between bars: `--space-3` (12px)

**Progress Ring (for goals/completion):**
- Size: 80px × 80px (small), 120px × 120px (large)
- Stroke width: 8px (small), 10px (large)
- Track color: `--color-divider`
- Progress color: pastel (per category)
- Center label: percentage, `--text-xl` (small) / `--text-2xl` (large), bold
- Sub-label: `--text-xs`, `--color-text-secondary`

**Line Chart (for trends):**
- Stroke width: 2.5px
- Line color: pastel per category
- Fill: gradient from pastel 10% opacity to transparent
- Point radius: 4px
- Grid lines: `--color-divider`, 0.5px dashed
- Axis labels: `--text-xs`, `--color-text-placeholder`

**Pie/Donut Chart:**
- Donut hole: 60% of radius
- Segment gap: 2px
- Colors: pastel sequence above
- Label: `--text-xs`, `--color-text-secondary`
- Center: total/summary value

```css
.chart-card {
  /* Inherits from .card */
}

.chart-card__title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.chart-card__subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-4);
}

/* ── Progress Bar ── */
.progress-bar {
  width: 100%;
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--color-divider);
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--progress-color, var(--color-pink));
  transition: width var(--duration-slow) var(--easing-enter);
}

/* ── Progress Ring ── */
.progress-ring {
  transform: rotate(90deg); /* Start from top in RTL */
}

.progress-ring__track {
  fill: none;
  stroke: var(--color-divider);
  stroke-width: 8;
}

.progress-ring__progress {
  fill: none;
  stroke: var(--progress-color, var(--color-pink));
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset var(--duration-slow) var(--easing-enter);
}
```

---

## 6. Persian Text Rules

1. **All user-facing text MUST be in Persian (فارسی).** No English words visible in the UI.
2. **Use Persian numerals (۰-۹)** unless the design specifically requires Western numerals for data clarity.
3. **Use Persian/Arabic comma (،)** for separating lists, not the English comma.
4. **Use Eastern Arabic numerals** for dates and times (or Western if the product audience is tech-savvy — decide at implementation and stay consistent).
5. **Tabular numbers** (`font-variant-numeric: tabular-nums`) for aligned columns of numbers.
6. **Text direction:** RTL is the default. Only use LTR isolation for phone numbers, email addresses, URLs, and codes.
7. **Minimum font size:** 12px for body text, 10px for tertiary/labels. Persian script is harder to read at small sizes than Latin.
8. **Line height:** Use 1.5-1.6 for body text (Persian script descenders need more room).
9. **Avoid all-caps styling** — Persian script does not have a concept of uppercase/lowercase.

---

## 7. Accessibility Notes

- Minimum contrast ratio: **4.5:1** for body text, **3:1** for large text (WCAG AA)
- All interactive elements: minimum **44×44px** touch target
- Focus visible: 2px outline in `--color-text-secondary`, offset 2px
- Color alone must never convey information — pair with icons or text
- Decorative images: empty `alt` attribute; informative images: Persian `alt` text
- Form inputs: always have associated labels (not just placeholder)

---

*End of Hambaft Design Tokens & Visual Spec v1.0.0*
