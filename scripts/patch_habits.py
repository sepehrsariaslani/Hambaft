with open('/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue', 'r') as f:
    content = f.read()
content = content.replace('🔥 {{ habit.streak_current }}', '🔥 {{ toPersianDigits(habit.streak_current) }}')
content = content.replace(
    "import { ref, computed, onMounted } from 'vue'",
    "import { ref, computed, onMounted } from 'vue'\nimport { toPersianDigits } from '@/utils/jalali'"
)
with open('/home/sepehr/den-v16-docker/apps/hambaft/frontend/src/views/HabitsView.vue', 'w') as f:
    f.write(content)
print('Done')
