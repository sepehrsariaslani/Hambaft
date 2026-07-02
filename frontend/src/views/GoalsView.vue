<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">اهداف</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showCreate = true">
          <span>➕</span>
        </button>
      </div>
    </header>

    <!-- Goals List -->
    <div class="px-4">
      <HbCard v-if="goals.loading" padding="p-4">
        <HbSkeleton type="card" />
        <HbSkeleton type="card" class="mt-3" />
      </HbCard>
      <HbEmptyState v-else-if="goals.goals.length === 0" icon="🎯" title="هنوز هدفی نذاشتی" description="هدف جدید اضافه کن" action-label="افزودن هدف" @action="showCreate = true" />
      <div v-else class="space-y-3">
        <HbCard v-for="goal in goals.goals" :key="goal.name" padding="p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ backgroundColor: getCategoryColor(goal.category) + '30' }">
              <span>{{ getCategoryIcon(goal.category) }}</span>
            </div>
            <div class="flex-1">
              <p class="text-body text-[var(--color-text)]">{{ goal.title }}</p>
              <p class="text-xs text-[var(--color-text-tertiary)]">{{ goal.current_value }}/{{ goal.target_value }} {{ goal.unit }}</p>
            </div>
            <span class="text-sm font-bold text-[var(--color-accent)]">{{ goal.progress_percent }}%</span>
          </div>
          <!-- Progress Bar -->
          <div class="h-2 bg-[var(--color-surface-tertiary)] rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500 ease-out"
              :style="{ width: goal.progress_percent + '%', backgroundColor: getCategoryColor(goal.category) }"
            />
          </div>
          <div class="flex justify-between mt-2 text-xs text-[var(--color-text-tertiary)]">
            <span>شروع: {{ formatDate(goal.start_date) }}</span>
            <span>ددلاین: {{ formatDate(goal.target_date) }}</span>
          </div>
        </HbCard>
      </div>
    </div>

    <!-- Create Goal Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-[100] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40" @click="showCreate = false" />
        <div class="relative bg-[var(--color-surface)] rounded-t-3xl p-6 pb-8 animate-slide-up">
          <div class="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
          <h2 class="text-h2 font-heading text-[var(--color-text)] mb-4">هدف جدید</h2>
          <div class="space-y-4">
            <HbInput v-model="newGoal.title" label="عنوان هدف" placeholder="مثلاً: یادگیری اسپانیایی" />
            <div class="grid grid-cols-2 gap-3">
              <HbInput v-model="newGoal.target_value" label="مقدار هدف" type="number" placeholder="100" dir="ltr" />
              <HbInput v-model="newGoal.unit" label="واحد" placeholder="ساعت" />
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">دسته‌بندی</label>
              <select v-model="newGoal.category" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                <option value="health">سلامتی</option>
                <option value="finance">مالی</option>
                <option value="career">شغلی</option>
                <option value="personal">شخصی</option>
                <option value="learning">یادگیری</option>
                <option value="relationship">روابط</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">تاریخ هدف</label>
              <JalaliDatePicker v-model="newGoalDate" />
            </div>
            <HbButton block @click="createGoal">ذخیره</HbButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGoalsStore } from '@/stores/goals'
import { formatJalaliDate } from '@/utils/jalali'
import JalaliDatePicker from '@/components/JalaliDatePicker.vue'
import HbCard from '@/components/ui/HbCard.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'

const goals = useGoalsStore()
const showCreate = ref(false)
const newGoalDate = ref(new Date())

const newGoal = ref({
  title: '',
  target_value: '',
  unit: '',
  category: 'personal',
})

function getCategoryColor(cat) {
  const colors = { health: 'var(--pastel-green)', finance: 'var(--pastel-amber)', career: 'var(--pastel-blue)', personal: 'var(--pastel-purple)', learning: 'var(--pastel-purple)', relationship: 'var(--pastel-rose)' }
  return colors[cat] || 'var(--color-primary)'
}

function getCategoryIcon(cat) {
  const icons = { health: '💪', finance: '💰', career: '💼', personal: '🌱', learning: '📚', relationship: '❤️' }
  return icons[cat] || '🎯'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return formatJalaliDate(dateStr)
}

function createGoal() {
  if (!newGoal.value.title) return
  goals.createGoal({
    title: newGoal.value.title,
    target_value: parseFloat(newGoal.value.target_value) || 100,
    current_value: 0,
    unit: newGoal.value.unit,
    category: newGoal.value.category,
    target_date: newGoalDate.value.toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    status: 'active',
  })
  showCreate.value = false
  newGoal.value = { title: '', target_value: '', unit: '', category: 'personal' }
  newGoalDate.value = new Date()
}

onMounted(() => {
  goals.fetchGoals()
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
