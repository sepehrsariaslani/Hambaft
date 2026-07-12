#!/bin/bash
# === مراحل دیپلوی سرور Hambaft ===
# این مراحل رو دقیقاً به همین ترتیب اجرا کن
#
# مسیر ساده‌تر از روی هاست:
#   cd ~/den-v16-docker/apps/hambaft
#   bash deploy-live.sh
# این اسکریپت build را داخل کانتینر اجرا می‌کند و در انتها هش ریموت را با بیلد جدید چک می‌کند.
#
# ─── مرحله ۱: گرفتن آخرین تغییرات ───
cd ~/frappe-bench/apps/hambaft
git pull
#
# ─── مرحله ۲: پاکسازی و بیلد (deploy-fix.sh) ───
# این اسکریپت:
#   - دایرکتوری‌های قدیمی /frontend/ رو حذف میکنه
#   - index.html رو از git بازنشانی میکنه
#   - npm install + npm run build اجرا میکنه
#   - sw.js رو force-copy میکنه (حل مشکل EPERM)
#   - stale hashed assets رو پاک میکنه
bash deploy-fix.sh
#
# ─── مرحله ۳: مایگریت دیتابیس ───
bench --site hambaft.ir migrate
#
# ─── مرحله ۴: مایگریت وضعیت تسک‌ها ───
bench --site hambaft.ir execute hambaft.hambaft.api.run_task_status_migration
#
# ─── مرحله ۵: مایگریت تسک‌های پروژه ───
bench --site hambaft.ir execute hambaft.hambaft.api.run_project_tasks_migration
#
# ─── مرحله ۶: bench build ───
bench build
#
# ─── مرحله ۷: بیلد مجدد فرانت‌اند بعد از bench build ───
# bench build ممکنه فایل‌های فرانت‌اند رو overwrite کنه
# این مرحله تضمین میکنه که آخرین بیلد فعال باشه
cd ~/frappe-bench/apps/hambaft
bash deploy-fix.sh
#
# ─── مرحله ۸: پاکسازی کش و ریستارت ───
bench clear-cache
bench clear-website-cache
bench restart
#
# ─── مرحله ۹: تست در مرورگر ───
# 1. Ctrl+Shift+R (hard refresh)
# 2. اگه هنوز مشکل داشتید: DevTools > Application > Storage > Clear site data
# 3. یا: chrome://serviceworker-internals/ → unregister SW
