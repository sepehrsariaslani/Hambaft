# Goal / Project Linking Design

## Goal

بهبود تجربه‌ی اهداف و پروژه‌ها در هم‌بافت به‌طوری که:

- داخل جزئیات هدف، پروژه‌ها به‌صورت summary کامل و بدون نمایش تمام تسک‌ها دیده شوند.
- کاربر بتواند از روی هر پروژه مستقیم وارد صفحه‌ی همان پروژه شود.
- کاربر بتواند هدف پروژه را هم از داخل هدف و هم از داخل خود پروژه تغییر دهد.
- metadata panel پروژه از نظر ساختار و زبان بصری به task detail نزدیک شود، بدون حذف KPIهای فعلی.

## Current Constraints

- routeهای موجود `goals/:goalId` و `projects/:projectId` باید حفظ شوند.
- state اصلی هنوز در `legacy/App.tsx` نگهداری می‌شود و goal/project/task flows به آن وابسته‌اند.
- `updateProjectRecord(projectId, project, goalId)` از قبل امکان sync پروژه با goal مقصد را دارد.
- KPIهای فعلی goal/project و contribution context نباید حذف یا رقیق شوند.

## Chosen Approach

رویکرد کم‌ریسک و incremental:

1. یک action صریح برای جابه‌جایی پروژه بین هدف‌ها در `App.tsx` اضافه می‌شود.
2. `GoalDetailView` به‌جای نشان دادن همه‌ی taskهای پروژه، کارت summary پروژه نشان می‌دهد.
3. هر کارت پروژه در goal detail دو action می‌گیرد:
   - `ورود به پروژه`
   - `تغییر هدف`
4. `ProjectDetailView` یک metadata panel شبیه task detail می‌گیرد که KPIهای فعلی را حفظ می‌کند.
5. در `ProjectDetailView` هم goal picker اضافه می‌شود تا تغییر هدف از همان‌جا ممکن باشد.

## State Model

### Move Project Between Goals

- ورودی: `projectId`, `fromGoalId`, `toGoalId`
- local update:
  - پروژه از `fromGoal.projects` حذف می‌شود.
  - همان پروژه با `linkedGoalId = toGoalId` داخل `toGoal.projects` insert می‌شود.
  - `goalTitle` و derived route context در render از goal جدید گرفته می‌شود.
- backend sync:
  - پروژه با `updateProjectRecord(project.id, updatedProject, toGoalId)` ذخیره می‌شود.
- taskها حذف یا detach نمی‌شوند؛ فقط ownership goal پروژه عوض می‌شود.

### Project Metadata Panel

پروژه این metadataها را کنار KPIهای فعلی نشان می‌دهد:

- وضعیت
- اولویت
- اهمیت
- برنامه
- سررسید
- تخمین
- زمان صرف‌شده
- حوزه
- پروژه
- هدف

اگر داده‌ای وجود نداشته باشد، fallback فارسی مثل `—` یا `ثبت نشده` نشان داده می‌شود.

## UI Behavior

### Goal Detail

- در tab پروژه‌ها، هر پروژه یک summary card premium دارد.
- کارت شامل:
  - عنوان، توضیح کوتاه
  - goal/project status
  - task completion summary
  - milestone summary
  - tracked time / estimate
  - contribution / health badges
  - دکمه‌ی `ورود به پروژه`
  - دکمه‌ی `تغییر هدف`

### Project Detail

- بالای صفحه، زیر هدر اصلی، یک metadata rail/card اضافه می‌شود.
- `هدف` به‌صورت chip/actionable field دیده می‌شود.
- با کلیک روی تغییر هدف، picker باز می‌شود.
- goal فعلی پروژه همیشه واضح نمایش داده می‌شود.

## Error Handling

- اگر goal مقصد نامعتبر باشد، تغییر local انجام نمی‌شود.
- اگر sync backend fail شود:
  - optimistic move rollback می‌شود.
  - project به goal قبلی برمی‌گردد.
  - خطا فقط در console لاگ می‌شود تا با الگوی فعلی اپ سازگار بماند.

## Tests

- تغییر هدف پروژه باید local state goals را درست reorder/move کند.
- `ProjectDashboard` و `GoalDetailView` باید CTA ورود به پروژه را نشان دهند.
- metadata panel پروژه باید goal فعلی را نشان دهد.
- تغییر goal از project detail باید handler درست را صدا بزند.
