from hermes_tools import read_file, write_file
content = read_file('/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue')['content']
# Count occurrences
count = content.count("import { toPersianDigits } from '@/utils/jalali'")
print(f"Found {count} occurrences")
# Remove all and add one at the right place
content = content.replace("import { toPersianDigits } from '@/utils/jalali'\n", "")
# Add after the first vue import
content = content.replace(
    "import { ref, computed, onMounted } from 'vue'",
    "import { ref, computed, onMounted } from 'vue'\nimport { toPersianDigits } from '@/utils/jalali'"
)
write_file('/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue', content)
print('Done')
