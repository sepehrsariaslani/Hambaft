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
bash deploy-fix.sh
#
# ─── مرحله ۳: مایگریت دیتابیس — مهم! ───
# این مرحله DocType‌های جدید (Gallery Board/Section/Pin) رو در دیتابیس می‌سازه
# و فیلد goal در Board از Hambaft Goal به Goal تغییر می‌کنه
# بدون این مرحله، API‌های گالری 417 برمی‌گردونن
bench --site hambaft.ir migrate
#
# ─── مرحله ۴: مایگریت وضعیت تسک‌ها ───
bench --site hambaft.ir execute hambaft.hambaft.api.run_task_status_migration
#
# ─── مرحله ۵: مایگریت تسک‌های پروژه ───
bench --site hambaft.ir execute hambaft.hambaft.api.run_project_tasks_migration
#
# ─── مرحله ۶: مایگریت Pin Order → Gallery Domain ───
# تبدیل رکوردهای قدیمی Hambaft Gallery Pin Order به دامین جدید
bench --site hambaft.ir execute hambaft.hambaft.api.migrate_pin_order_to_domain
#
# ─── مرحله ۷: سینک فایل‌های موجود به گالری ───
# ایجاد خودکار Board/Section/Pin از تصاویر موجود Task/Project/Goal
bench --site hambaft.ir execute hambaft.hambaft.api.sync_gallery_from_existing_files
#
# ─── مرحله ۸: bench build ───
bench build
#
# ─── مرحله ۹: بیلد مجدد فرانت‌اند بعد از bench build ───
cd ~/frappe-bench/apps/hambaft
bash deploy-fix.sh
#
# ─── مرحله ۱۰: پاکسازی کش و ریستارت ───
bench clear-cache
bench clear-website-cache
redis-cli FLUSHALL
supervisorctl restart all
#
# ─── مرحله ۱۱: تست در مرورگر ───
# 1. Ctrl+Shift+R (hard refresh)
# 2. اگه هنوز مشکل داشتید: DevTools > Application > Storage > Clear site data
# 3. یا: chrome://serviceworker-internals/ → unregister SW
#
# ─── نکات مهم ───
# - مرحله ۳ (bench migrate) حیاتی هست — بدون اون DocType‌های گالری ساخته نمیشن
# - مرحله ۶ و ۷ فقط یکبار لازم هستن (idempotent هستند)
# - اگر خطای 417 گرفتید، یعنی bench migrate اجرا نشده
