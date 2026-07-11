#!/bin/bash
# === مراحل دیپلوی سرور ===
# بعد از git pull روی سرور، این مراحل رو به ترتیب اجرا کن
#
# 1. bash deploy-fix.sh
# 2. bench --site hambaft.ir migrate
# 3. bench --site hambaft.ir execute hambaft.hambaft.api.run_task_status_migration
# 4. bench --site hambaft.ir execute hambaft.hambaft.api.run_project_tasks_migration
# 5. bench build && bench clear-cache && bench clear-website-cache && bench restart
# 6. Hard-refresh browser (Ctrl+Shift+R)
#
# نکته مهم: bench build باید بعد از npm run build اجرا بشه
# چون deploy-fix.sh خودش npm run build رو اجرا میکنه
# و bench build ممکنه index.html رو overwrite کنه
# اگه bench build اجرا کردی، دوباره deploy-fix.sh رو اجرا کن
