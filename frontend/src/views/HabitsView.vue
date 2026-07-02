<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">عادت‌ها</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showCreate = true">
          <span>➕</span>
        </button>
      </div>
    </header>

    <!-- Habits List -->
    <div class="px-4">
      <HbCard v-if="habits.loading" padding="p-4">
        <HbSkeleton type="card" />
        <HbSkeleton type="card" class="mt-3" />
      </HbCard>
      <HbEmptyState v-else-if="habits.habits.length === 0" icon="🔄" title="هنوز عادتی نذاشتی" description="عادت جدید اضافه کن" action-label="افزودن عادت" @action="showCreate = true" />
      <div v-else class="space-y-3">
        <HbCard v-for="habit in habits.habits" :key="habit.name" interactive padding="p-4" @click="toggleExpand(habit.name)">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ backgroundColor: getCategoryColor(habit.category) + '30' }">
              <span>{{ getCategoryIcon(habit.category) }}</span>
            </div>
            <div class="flex-1">
              <p class="text-body text-[var(--color-text)]">{{ habit.name }}</p>
              <p class="text-xs text-[var(--color-text-tertiary)]">{{ habit.frequency }} - {{ habit.streak_current }} روز متوالی</p>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="habit.streak_current > 0" class="text-sm">🔥 {{ toPersianDigits(habit.streak_current) }}</span>
              <button
                class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                :class="isDoneToday(habit.name) ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]'"
                @click.stop="toggleHabit(habit.name)"
              >
                <span class="text-sm">{{ isDoneToday(habit.name) ? '✓' : '+' }}</span>
              </button>
            </div>
          </div>

          <!-- Expanded: Week View -->
          <div v-if="expanded === habit.name" class="mt-4 pt-4 border-t border-[var(--color-border)]">
            <div class="flex justify-between gap-1">
              <div
                v-for="(day, i) in weekDays"
                :key="i"
                class="flex flex-col items-center gap-1"
              >
                <span class="text-[10px] text-[var(--color-text-tertiary)]">{{ day.label }}</span>
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  :class="day.done ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-tertiary)]'"
                >
                  {{ day.done ? '✓' : '' }}
                </div>
              </div>
            </div>
            <div class="flex justify-between mt-3 text-xs text-[var(--color-text-tertiary)]">
              <span>بهترین: {{ habit.streak_best }} روز</span>
              <span>این هفته: {{ habit.target_days || 5 }}/۵</span>
            </div>
          </div>
        </HbCard>
      </div>
    </div>

    <!-- Create Habit Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-[100] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40" @click="showCreate = false" />
        <div class="relative bg-[var(--color-surface)] rounded-t-3xl p-6 pb-8 animate-slide-up">
          <div class="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
          <h2 class="text-h2 font-heading text-[var(--color-text)] mb-4">عادت جدید</h2>
          <div class="space-y-4">
            <HbInput v-model="newHabit.name" label="نام عادت" placeholder="مثلاً: مطالعه ۳۰ دقیقه" />
            <div>
              <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">تکرار</label>
              <select v-model="newHabit.frequency" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">دسته‌بندی</label>
              <select v-model="newHabit.category" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                <option value="health">سلامتی</option>
                <option value="productivity">بهره‌وری</option>
                <option value="learning">یادگیری</option>
                <option value="mindfulness">ذهن‌آگاهی</option>
                <option value="fitness">ورزشی</option>
              </select>
            </div>
            <HbButton block @click="createHabit">ذخیره</HbButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { toPersianDigits } from '@/utils/jalali'
import { useHabitsStore } from '@/stores/habits'
import HbCard from '@/components/ui/HbCard.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'

const habits = useHabitsStore()
const showCreate = ref(false)
const expanded = ref(null)

const newHabit = ref({
  name: '',
  frequency: 'daily',
  category: 'health',
})

const weekDays = computed(() => {
  const labels = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']
  return labels.map((label, i) => ({
    label,
    done: Math.random() > 0.4, // Mock data
  }))
})

function isDoneToday(habitName) {
  const today = new Date().toISOString().split('T')[0]
  return habits.logs.some(l => l.habit === habitName && l.date === today && l.status === 'done')
}

function toggleHabit(habitName) {
  if (isDoneToday(habitName)) {
    const idx = habits.logs.findIndex(l => l.habit === habitName && l.status === 'done')
    if (idx !== -1) habits.logs.splice(idx, 1)
  } else {
    habits.logHabit(habitName, 'done')
  }
}

function toggleExpand(name) {
  expanded.value = expanded.value === name ? null : name
}

function createHabit() {
  if (!newHabit.value.name) return
  habits.createHabit({
    name: newHabit.value.name,
    frequency: newHabit.value.frequency,
    category: newHabit.value.category,
    is_active: 1,
    streak_current: 0,
    streak_best: 0,
  })
  showCreate.value = false
  newHabit.value = { name: '', frequency: 'daily', category: 'health' }
}

function getCategoryColor(cat) {
  const colors = { health: 'var(--pastel-green)', learning: 'var(--pastel-purple)', fitness: 'var(--pastel-blue)', productivity: 'var(--pastel-amber)', mindfulness: 'var(--pastel-teal)' }
  return colors[cat] || 'var(--color-primary)'
}

function getCategoryIcon(cat) {
  const icons = { health: '💪', learning: '📚', fitness: '🏃', productivity: '⚡', mindfulness: '🧘' }
  return icons[cat] || '🔄'
}

onMounted(() => {
  habits.fetchHabits()
})
</script>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
