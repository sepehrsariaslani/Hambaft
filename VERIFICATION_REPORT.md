# 🏗️ Hambaft — گزارش بررسی نهایی و وضعیت تولید

**شاخه:** `feat/areas-views-notion`  
**تاریخ:** ۱۴۰۵/۰۴/۲۰ — ۲۰۲۶-۰۷-۱۱  
**تعداد کامیت‌ها:** ۶ کامیت جدید این جلسه

---

## ✅ کارهای انجام‌شده این جلسه

### ۱. وایر کردن sub-routeهای PlannerSection
- اضافه شدن case handler برای `planner-timeline`، `planner-week`، `planner-month`، `planner-board`، `planner-areas`
- هر sub-route `initialView` مناسب رو به `<PlannerSection>` پاس میده
- اضافه شدن مسیرهای planner sub به `tabToPath`
- اضافه شدن تیتر فارسی برای هر sub-tab توی هدر

### ۲. حذف باگ حیاتی post-build (🚨)
- **مشکل:** اسکریپت `post-build.js` فقط assetهای مرجع‌داده‌شده توی `index.html` رو نگه میداشت
- **نتیجه:** تمام chunkهای lazy-loaded (۲۲ بخش) بعد از هر بیلد حذف میشدن → صفحه خالی برای کاربر!
- **رفع:** اسکن main JS bundle برای مسیرهای dynamic import (`"assets/X.js"` و `"./X.js"`)
- **نتیجه:** هر ۳۱ chunk حالا درست حفظ میشن

### ۳. حذف dynamic importهای متناقض از hambaft-api
- ۸ `await import('../app/hambaft-api')` تبدیل به static import شد
- فانکشن‌ها: `getActiveTaskSession`، `stopTaskSession`، `startTaskSession`، `resumeTaskSession`، `finishTaskSession`، `getTaskTrackedMinutes`
- حذف Vite warning درباره mixed static/dynamic import

### ۴. حذف کامپوننت‌های مرده (۱۴۵۱ خط)
- `CalendarViewSwitcher.tsx` (۴۰۳ خط) — هرگز import نشده
- `GoalSection.tsx` (۴۸۰ خط) — هرگز import نشده
- `JournalSection.tsx` (۵۶۸ خط) — هرگز import نشده

### ۵. حذف redirect اشتباه `/tasks → /journal`
- روت `/tasks` به `/journal` هدایت میشد و با روت واقعی tasks تداخل داشت

### ۶. حذف آیتم سایدبار `inbox` (InboxSection حذف‌شده بود)
- planner خودش bucket inbox داره

### ۷. اصلاح دکمه پروفایل سایدبار
- از `goToTab('coach')` به `goToTab('profile')` تغییر کرد
- اضافه شدن `پروفایل و تنظیمات` به منوی سایدبار

### ۸. اضافه شدن MindfulnessSession update handler
- `handleUpdateMindfulnessSession` توی App.tsx با optimistic update
- `onUpdateSession` prop به `MindfulnessSection`

### ۹. PlannerSection از eager به lazy تغییر کرد
- ۲۵ KB از باندل اصلی کم شد

---

## 📊 وضعیت باندل

| بخش | حجم | نوع |
|------|------|------|
| index.js (shell اصلی) | ۷۷۹ KB | Eager |
| 20 lazy section chunks | ~۱,۱۰۰ KB | Lazy |
| 5 vendor chunks | ~۸۶۷ KB | Lazy |
| 4 utility chunks | ~۵۵ KB | Lazy |
| **مجموع** | **~۲.۸ MB** | — |
| **بار اولیه** | **۷۷۹ KB** | Shell فقط |

### Vendor chunks
| Chunk | حجم |
|-------|------|
| vendor-recharts | ۴۵۰ KB |
| vendor-motion | ۱۳۰ KB |
| vendor-markdown | ۱۱۸ KB |
| vendor-react | ۱۰۴ KB |
| vendor-lucide | ۶۶ KB |

---

## 🗺️ پوشش Routeها

### ۳۱ route → ۳۰ case handler → ۱۰۰% پوشش ✅

| Route | Case | Sidebar |
|-------|------|---------|
| dashboard | ✅ | ✅ |
| coach | ✅ | ✅ |
| contacts | ✅ | ✅ |
| journal | ✅ | ✅ |
| tasks | ✅ | ✅ |
| mood | ✅ | ✅ |
| calendar | ✅ | ✅ |
| occasions | ✅ | ✅ |
| balance_report | ✅ | ✅ |
| sleep | ✅ | ✅ |
| mindfulness | ✅ | ✅ |
| habits | ✅ | ✅ |
| nutrition | ✅ | ✅ |
| fitness | ✅ | ✅ |
| goals | ✅ | ✅ |
| projects | ✅ | ✅ |
| areas | ✅ | ✅ |
| notes | ✅ | ✅ |
| finance | ✅ | ✅ |
| documents | ✅ | ✅ |
| profile | ✅ | ✅ |
| planner | ✅ | ✅ |
| planner-timeline | ✅ | ❌ (از داخل planner) |
| planner-week | ✅ | ❌ (از داخل planner) |
| planner-month | ✅ | ❌ (از داخل planner) |
| planner-board | ✅ | ❌ (از داخل planner) |
| planner-areas | ✅ | ❌ (از داخل planner) |
| inbox | ✅ → planner | ❌ (حذف شد) |
| task-detail | ✅ | ❌ (از داخل tasks) |

---

## 🔌 Backend API ← Frontend Coverage

- **۱۸۶ whitelisted API** توی `api.py`
- **۱۴۲ frontend wrapper** توی `hambaft-api.ts`
- همه domainها CRUD کامل دارن (نام‌گذاری camelCase توی frontend)
- ۳ AI conversation API: `getAiConversations`، `getAiConversationMessages`، `deleteAiConversation`

---

## 🧹 فایل‌های حذف‌شده (این + جلسه قبل)

| فایل | دلیل |
|------|------|
| HealthSection.tsx | یتیم — هرگز import نشده |
| InboxSection.tsx | یتیم — هرگز import نشده |
| CalendarViewSwitcher.tsx | یتیم — هرگز import نشده |
| GoalSection.tsx | یتیم — هرگز import نشده |
| JournalSection.tsx | یتیم — هرگز import نشده |
| TaskDetailView.tsx | جایگزین با TaskDetailDrawer |

---

## ⚠️ موارد باقی‌مانده

| مورد | اولویت | وضعیت |
|-------|--------|--------|
| `bench migrate` روی سرور | 🔴 حیاتی | باید روی سرور انجام بشه |
| Notes store `initMockPages` (3 seed pages) | 🟡 قابل قبول | seed برای کاربران جدید |
| Vite chunk > 500KB warning | 🟡 اطلاعات | index.js 779KB — قابل قبول |
| `profile` route توی سایدبار mobile | 🟢 بررسی | ممکنه توی bottom nav نباشه |

---

## 🚀 مراحل استقرار

1. `git push` ✅ (انجام شد)
2. روی سرور: `bench get-app hambaft` یا `git pull`
3. روی سرور: `bench migrate` (برای DocTypeهای جدید مثل AI Message)
4. روی سرور: `bench build` یا بیلد frontend
5. روی سرور: `bench restart`

---

*گزارش تولیدشده توسط Hambaft Dev Agent*
