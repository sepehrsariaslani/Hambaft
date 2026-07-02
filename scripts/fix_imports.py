#!/usr/bin/env python3
path = '/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue'
with open(path, 'r') as f:
    content = f.read()
# Remove all duplicate imports
content = content.replace("import { toPersianDigits } from '@/utils/jalali'\n", '')
# Add one after the vue import
content = content.replace(
    "import { ref, computed, onMounted } from 'vue'",
    "import { ref, computed, onMounted } from 'vue'\nimport { toPersianDigits } from '@/utils/jalali'"
)
with open(path, 'w') as f:
    f.write(content)
# Verify
count = content.count("import { toPersianDigits }")
print(f'Done — {count} occurrence(s) of import')
