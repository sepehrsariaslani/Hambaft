with open('/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue', 'r') as f:
    content = f.read()
# Remove the duplicated import line
content = content.replace(
    "import { toPersianDigits } from '@/utils/jalali'\nimport { toPersianDigits } from '@/utils/jalali'",
    "import { toPersianDigits } from '@/utils/jalali'"
)
with open('/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue', 'w') as f:
    f.write(content)
print('Done')
