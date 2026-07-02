# طراحی Interaction و State Model تقویم هم‌بافت

تاریخ: 2026-07-02
وضعیت: Draft for Review
دامنه: بازطراحی کامل تقویم با معماری Hybrid

## هدف

تقویم هم‌بافت باید یک shell مستقل، premium و lifestyle-first داشته باشد که داده‌های چند domain را در یک مدل روزانه یکپارچه نمایش دهد، بدون اینکه UI به جدول شلوغ یا ERP خشک تبدیل شود.

این فاز فقط قرارداد interaction و state model را تعریف می‌کند. هنوز وارد پیاده‌سازی UI یا refactor domainها نمی‌شویم.

## اصول طراحی

- تقویم نمای ترکیبی کامل است: رویدادها، کارها، عادت‌ها، مالی، هدف‌ها و یادآوری‌ها.
- نمایش در هر view متناسب با چگالی اطلاعات است.
- ماهانه و هفتگی summary-first هستند.
- جزئیات فقط در detail pane یا bottom sheet باز می‌شوند.
- تقویم باید mobile-first باشد ولی دسکتاپ layout مستقل سه‌بخشی داشته باشد.
- همه متن‌ها، تاریخ‌ها و labels فارسی و جلالی هستند.
- فیلترها فقط presentation را تغییر می‌دهند، نه data source را.

## معماری سطح بالا

### Calendar Shell

CalendarShell لایه‌ی orchestration است و مسئول این موارد خواهد بود:

- نگهداری state اصلی تقویم
- انتخاب view فعال: روز، هفته، ماه، فهرست
- کنترل باز و بسته شدن day detail
- مدیریت فیلترهای domain
- هماهنگی بین navigation، data layer و child views
- تصمیم برای استفاده از bottom sheet در موبایل یا detail pane در دسکتاپ

### Data Adapter Layer

یک adapter جدید بین domain stores/APIها و UI قرار می‌گیرد. این لایه:

- داده‌های رویداد، task، habit، finance، goal و reminder را fetch می‌کند
- آن‌ها را به مدل مشترک day bundle تبدیل می‌کند
- رنگ، badge، score و summary را تولید می‌کند
- viewها را از منطق domain جدا نگه می‌دارد

این لایه domainهای فعلی را rewrite نمی‌کند. فقط از آن‌ها data می‌خواند و normalize می‌کند.

## مدل داده اصلی

### calendarDayBundle

```js
{
  date: "2026-07-02",
  jalali_date: {
    year: 1405,
    month: 4,
    day: 11,
    month_label: "تیر",
    weekday_index: 5,
    weekday_label: "پنجشنبه",
    short_label: "۱۱ تیر"
  },
  events: CalendarEventItem[],
  timed_tasks: CalendarTaskItem[],
  untimed_tasks: CalendarTaskItem[],
  habits: CalendarHabitItem[],
  finance_items: CalendarFinanceItem[],
  goals: CalendarGoalItem[],
  reminders: CalendarReminderItem[],
  summary_counts: {
    total: 0,
    events: 0,
    timed_tasks: 0,
    untimed_tasks: 0,
    habits_due: 0,
    habits_done: 0,
    finance_due: 0,
    goals: 0,
    reminders: 0
  },
  badges: CalendarBadge[],
  dominant_color: "orange",
  day_score: 7.8
}
```

### item contract

هر آیتم normalized باید این حداقل contract را داشته باشد:

```js
{
  id: "string",
  type: "event|task|habit|finance|goal|reminder",
  subtype: "meeting|deadline|bill|subscription|water|sleep|focus_goal|...",
  title: "string",
  subtitle: "string | null",
  starts_at: "ISO string | null",
  ends_at: "ISO string | null",
  is_all_day: false,
  is_completed: false,
  importance: "low|medium|high|urgent",
  visual: {
    color_token: "orange|yellow|green|blue|purple|pink|neutral",
    icon_key: "calendar|wallet|leaf|target|bell|check-square",
    emphasis: "solid|soft|outline"
  },
  source: {
    doctype: "string",
    name: "string",
    route: "/route",
    can_open: true,
    can_edit: true
  }
}
```

### badge contract

```js
{
  id: "string",
  type: "habit|finance|goal|reminder|overflow",
  label: "۶/۸",
  icon_key: "leaf",
  color_token: "green",
  count: 6,
  action: "open-section|open-item|expand-day"
}
```

## CalendarShell State Model

### global state

```js
{
  activeView: "month|week|day|agenda",
  activeFilters: {
    tasks: true,
    events: true,
    habits: true,
    finance: true,
    goals: true,
    reminders: true
  },
  selectedDate: "2026-07-02",
  focusedRange: {
    type: "month|week|day",
    from: "2026-06-21",
    to: "2026-07-21"
  },
  detailSurface: {
    open: false,
    mode: "mobile-sheet|desktop-pane",
    activeSection: "overview|events|tasks|habits|finance|goals|reminders"
  },
  ui: {
    loading: false,
    refreshing: false,
    error: null,
    swipeEnabled: true,
    denseMode: false
  }
}
```

### derived state

- `visibleDayBundles`
- `selectedDayBundle`
- `hasActiveFilters`
- `visibleMonthGrid`
- `visibleWeekColumns`
- `visibleTimelineBlocks`
- `visibleUntimedTasks`
- `hasOverflowItemsForDay`
- `currentEmptyState`

## Interaction Contract

### وقتی کاربر روی روز کلیک می‌کند

#### ماهانه

- `selectedDate` برابر همان روز می‌شود.
- اگر موبایل باشد، `CalendarAgendaDrawer` از پایین باز می‌شود.
- اگر دسکتاپ باشد، `Desktop Detail Pane` در ستون سوم با همان روز sync می‌شود.
- active section به `overview` می‌رود.
- اگر کاربر دوباره روی همان روز بزند:
  - در موبایل sheet collapse/expand نمی‌شود؛ فقط focus همان روز حفظ می‌شود.
  - در دسکتاپ pane باز می‌ماند و فقط highlight state refresh می‌شود.

#### هفتگی

- tap روی header روز یا badge summary همان رفتار را دارد.
- tap روی timeline block مستقیم active section را روی `events` یا `tasks` می‌برد.

#### روزانه

- چون کل view برای یک روز است، tap روی آیتم‌ها جزئیات item را باز می‌کند، نه day detail را.

### وقتی روی badge مالی کلیک می‌کند

- اگر badge روی ماهانه باشد:
  - detail surface باز می‌شود.
  - active section روی `finance` قرار می‌گیرد.
  - همان روز scroll target روی اولین finance item می‌نشیند.
- اگر badge روی هفتگی باشد:
  - mini popover نداریم.
  - مستقیم detail surface یا pane باز می‌شود.
- اگر فقط یک item وجود داشته باشد و `can_open=true`:
  - CTA ثانویه `مشاهده جزئیات` route همان item را می‌دهد.

### وقتی روی habit strip کلیک می‌کند

- detail surface روی section `habits` باز می‌شود.
- داخل section:
  - habitهای due
  - completed count
  - progress mini list
  - actions مثل `ثبت` یا `تکمیل`
- اگر habit قابل toggle سریع باشد:
  - در موبایل و دسکتاپ quick action inline مجاز است.

### وقتی task را complete می‌کند

- optimistic update روی `selectedDayBundle` و `visibleDayBundles` اعمال می‌شود.
- اگر task زمان‌دار باشد:
  - block در timeline faded/completed می‌شود، نه اینکه فوراً حذف شود.
- اگر task بدون زمان باشد:
  - از لیست `کارهای بدون زمان` به completed state می‌رود.
- stateهای متاثر:
  - `summary_counts.timed_tasks` یا `untimed_tasks`
  - `day_score`
  - `badges`
  - month cell preview اگر آن task جزو top two بوده
- اگر API fail شود:
  - rollback
  - toast فارسی با CTA `تلاش دوباره`

### وقتی task زمان‌دار ندارد

- هرگز داخل timeline هفته نمایش داده نمی‌شود.
- در Week View زیر هر روز یک section مستقل `کارهای بدون زمان` دارد.
- در Month View فقط به عنوان preview text یا overflow count می‌آید.
- در Day View در section `کارها` با label `بدون زمان` نمایش داده می‌شود.

### وقتی آیتم‌ها زیاد هستند

#### ماهانه

- هر روز:
  - حداکثر ۲ preview متنی
  - حداکثر ۳ badge/dot
  - سپس `+N مورد`
- ترتیب priority:
  - event urgent
  - timed task high
  - event normal
  - untimed task high
  - overflow count

#### هفتگی

- timeline blockها اگر overlap زیاد شود:
  - compact stack می‌شوند
  - `+N` overlay برای hidden overlap نشان داده می‌شود
- untimed tasks اگر بیشتر از 3 مورد باشند:
  - اول 3 مورد
  - سپس `نمایش همه`

#### روزانه

- هر section default collapsed نیست.
- اما اگر تعداد item در section بیش از 6 باشد:
  - ابتدا 4 مورد
  - سپس CTA `نمایش موارد بیشتر`

## رفتار Viewها

### Month View

#### ساختار

- header ماه جلالی
- capsule switch برای filters یا top-level views
- month grid شش‌ردیفه
- هر cell:
  - شماره روز
  - today/selected state
  - دو preview line
  - badges row
  - overflow count

#### preview logic

- preview line فقط برای:
  - رویدادها
  - کارهای مهم
- badgeها برای:
  - عادت
  - مالی
  - goal
  - reminder

#### empty state ماهانه

- اگر ماه هیچ data نداشت:
  - grid همچنان نشان داده می‌شود.
  - state خالی با subtitle:
    - `این ماه هنوز برنامه‌ای ثبت نشده است.`
  - CTA:
    - `افزودن رویداد`

### Week View

#### ساختار

- week header جلالی
- 7 ستون روز
- habit strip بالای هر روز
- finance badges زیر header
- timeline وسط
- untimed tasks پایین

#### timeline rules

- فقط `events` و `timed_tasks`
- all-day eventها در all-day rail بالا
- overlapها با layout stacked columns
- current time indicator اگر روز جاری visible باشد

#### empty state هفتگی

- اگر هیچ رویداد زمان‌دار نبود:
  - timeline خالی با text:
    - `این هفته تایم‌بلاک فعالی نداری.`
  - ولی habit strip و financial badges اگر وجود دارند باقی می‌مانند.

### Day View

#### ساختار

- hero header روز جلالی
- score و quick summary
- پنج سکشن:
  - برنامه‌ها و رویدادها
  - کارها
  - عادت‌ها
  - مالی و پرداخت‌ها
  - هدف‌ها و یادآوری‌ها

#### رفتار

- این view execution-oriented است.
- CTAهای inline دارد:
  - تکمیل کار
  - ثبت عادت
  - مشاهده پرداخت
  - باز کردن هدف
- ترتیب سکشن‌ها ثابت می‌ماند حتی اگر یکی خالی باشد.

#### empty state روزانه

- اگر روز کاملاً خالی بود:
  - یک empty state مرکزی
  - subtitle:
    - `برای این روز هنوز چیزی نچیده‌ای.`
  - quick actions:
    - `افزودن کار`
    - `افزودن رویداد`
    - `ثبت عادت`

## Mobile Bottom Sheet

### رفتار

- از پایین با animation 200-250ms باز می‌شود.
- snap pointها:
  - `peek`
  - `half`
  - `full`
- default:
  - month view => `half`
  - week view => `half`
  - day view نیازی به day detail sheet ندارد مگر item detail

### محتوا

- date header
- segmented tabs:
  - `خلاصه`
  - `برنامه‌ها`
  - `کارها`
  - `عادت‌ها`
  - `مالی`
  - `هدف‌ها`
- scroll independent only inside sheet

### dismiss

- swipe down
- backdrop tap
- close button

## Desktop Detail Pane

### رفتار

- همیشه در ستون سوم mount است.
- اگر روزی انتخاب نشده باشد:
  - placeholder summary نشان می‌دهد.
- با انتخاب روز:
  - pane animate-in نمی‌شود؛ فقط content crossfade می‌شود.
- width ثابت و قابل‌اعتماد دارد.

### محتوا

- date header
- quick stats
- grouped sections
- CTAهای مرتبط با item selected

## Event Handlers

### shell-level

- `onSelectDate(date)`
- `onChangeView(view)`
- `onToggleFilter(filterKey)`
- `onOpenDetailSection(sectionKey)`
- `onNavigateRange(direction)`
- `onToday()`

### month-level

- `onDayCellClick(bundle)`
- `onOverflowClick(bundle)`
- `onBadgeClick(bundle, badge)`

### week-level

- `onTimelineItemClick(item)`
- `onUntimedTaskClick(task)`
- `onHabitStripClick(bundle)`

### day-level

- `onTaskComplete(taskId)`
- `onHabitToggle(habitId)`
- `onFinanceItemOpen(itemId)`
- `onReminderOpen(itemId)`

## APIهای لازم

### preferred

یک endpoint تجمیعی جدید:

`GET /api/method/hambaft.hambaft.api.get_calendar_bundle`

query params:

- `from_date`
- `to_date`
- `include=events,tasks,habits,finance,goals,reminders`
- `timezone`

response:

```js
{
  status: "success",
  data: {
    bundles: calendarDayBundle[],
    meta: {
      from_date: "2026-06-21",
      to_date: "2026-07-21",
      timezone: "Asia/Tehran",
      generated_at: "ISO"
    }
  }
}
```

### fallback during migration

اگر endpoint تجمیعی هنوز کامل نباشد، adapter می‌تواند موقتاً این endpointها را ترکیب کند:

- `get_events`
- `get_tasks`
- `get_habits`
- `get_finance_summary`
- `get_goals`
- `get_reminders`

اما contract نهایی UI باید فقط با `calendarDayBundle` کار کند.

## Loading State

### shell loading

- اولین load:
  - skeleton کامل view
- range navigation:
  - preserve view
  - overlay shimmer سبک
- detail open قبل از آماده بودن data:
  - skeleton sections inside pane/sheet

### granular loading

- task complete: row-level pending state
- habit toggle: chip-level pending state
- filter change: no full page spinner, only content crossfade

## Error State

- اگر range fetch fail شد:
  - inline error card
  - CTA `تلاش دوباره`
- اگر یک domain fail شد ولی بقیه موفق بودند:
  - تقویم render می‌شود
  - بخش مربوطه badge هشدار ظریف می‌گیرد
  - در detail section پیام:
    - `اطلاعات این بخش فعلاً در دسترس نیست.`
- اگر action fail شد:
  - toast + rollback

## Edge Cases

- روزی که فقط habit دارد و event/task ندارد
- روزی با 10+ item و overflow زیاد
- overlap چند event در یک ساعت
- task زمان‌دار که از یک روز به روز بعد کشیده می‌شود
- all-day event
- قبض یا subscription بدون ساعت
- روزی که چند domain رنگ غالب متفاوت دارند
- روز جاری در range نامشهود پس از navigation
- فیلتر فعال که selected day را ظاهراً خالی می‌کند
- ماهی که از دو range میلادی مختلف تغذیه می‌شود ولی در UI فقط جلالی دیده می‌شود
- empty state با selected date معتبر
- تغییر view در حالی که detail surface باز است
- resize بین موبایل و دسکتاپ در زمانی که day detail باز است

## قواعد تصمیم‌گیری بصری

- `dominant_color` از مهم‌ترین item روز انتخاب می‌شود.
- اگر task urgent یا bill overdue وجود داشته باشد، dominant color به نارنجی/قرمز نرم نزدیک می‌شود.
- اگر فقط habit/health باشد، dominant color سبز یا آبی است.
- اگر فقط reminder/goals باشد، بنفش یا صورتی ملایم.
- رنگ غالب فقط accent است، نه background کامل cell.

## قرارداد فیلترها

- فیلتر `همه` همه domainها را visible می‌کند.
- اگر کاربر فیلتر domainها را دستی تغییر دهد، `همه` inactive می‌شود.
- فیلترها state محلی CalendarShell هستند.
- فیلترها در URL query ذخیره می‌شوند تا deep-linking ممکن شود:
  - `?view=week&filters=events,tasks,finance`

## تصمیم‌های قفل‌شده این فاز

- تقویم با معماری Hybrid جلو می‌رود.
- UI با day bundle کار می‌کند، نه با domain objects خام.
- Month View summary-first است.
- Week View timeline-only برای items زمان‌دار است.
- Day View execution-oriented است.
- موبایل از bottom sheet و دسکتاپ از detail pane استفاده می‌کند.
- فیلترها فقط نمایش را تغییر می‌دهند.

## خارج از scope این فاز

- drag-and-drop scheduling
- recurrence editor جدید
- collaborative calendar editing
- push notification workflow
- AI scheduling automation

## مرحله بعد

بعد از تأیید این سند:

- implementation plan نوشته می‌شود
- component tree نهایی قفل می‌شود
- data adapter و CalendarShell implementation شروع می‌شود
