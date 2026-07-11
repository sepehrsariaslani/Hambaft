#!/bin/bash
# === مراحل دیپلوی سرور ===
# بعد از git pull روی سرور، این مراحل رو به ترتیب اجرا کن
#
# مرحله ۱: پاکسازی و بیلد فرانت‌اند
#   bash deploy-fix.sh
#
# مرحله ۲: مایگریت دیتابیس
#   bench --site hambaft.ir migrate
#
# مرحله ۳: مایگریت وضعیت تسک‌ها (فارسی → انگلیسی)
#   bench --site hambaft.ir execute hambaft.hambaft.api.run_task_status_migration
#
# مرحله ۴: مایگریت تسک‌های پروژه (child table → Task اصلی)
#   bench --site hambaft.ir execute hambaft.hambaft.api.run_project_tasks_migration
#
# مرحله ۵: بیلد و ریستارت
#   bench build && bench clear-cache && bench clear-website-cache && bench restart
#
# مرحله ۶: بیلد فرانت‌اند دوباره (bench build ممکنه index.html رو تغییر بده)
#   cd frontend && npm run build && cd ..
#
# مرحله ۷: هارد رفرش مرورگر (Ctrl+Shift+R)
#
# ⚠️ نکته مهم: اگر بعد از همه مراحل بالا اپ هنوز لود نمیشه:
#   1. برو به DevTools > Application > Storage > Clear site data
#   2. یا در آدرس بار بزن: chrome://serviceworker-internals/ و unregister کن
