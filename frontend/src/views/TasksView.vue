<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">تسک‌ها</h1>
        <div class="flex gap-2">
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center">
            <span>🔍</span>
          </button>
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showCreate = true">
            <span>➕</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Filter Chips -->
    <div class="px-4 mb-4">
      <div class="flex gap-2 overflow-x-auto pb-2">
        <button
          v-for="f in filters"
          :key="f.value"
          class="px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-150"
          :class="activeFilter === f.value ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]'"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Task List -->
    <div class="px-4">
      <HbCard v-if="tasks.loading" padding="p-4">
        <HbSkeleton type="card" />
        <HbSkeleton type="card" class="mt-3" />
      </HbCard>
      <HbEmptyState v-else-if="filteredTasks.length === 0" icon="✅" title="تسکی نیست" description="تسک جدید اضافه کن" action-label="ساخت تسک" @action="showCreate = true" />
      <div v-else class="space-y-2">
        <HbCard v-for="task in filteredTasks" :key="task.name" interactive padding="p-4">
          <div class="flex items-center gap-3">
            <button
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0"
              :class="task.status === 'done' ? 'bg-[var(--color-success)] border-[var(--color-success)]' : 'border-[var(--color-border)]'"
              @click="task.status === 'done' ? uncomplete(task.name) : completeTask(task.name)"
            >
              <span v-if="task.status === 'done'" class="text-white text-xs">✓</span>
            </button>
            <div class="flex-1 min-w-0">
              <p class="text-body text-[var(--color-text)] truncate" :class="{ 'line-through opacity-60': task.status === 'done' }">{{ task.title }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span v-if="task.due_date" class="text-xs text-[var(--color-text-tertiary)]" :class="{ 'text-[var(--color-danger)]': isOverdue(task) }">
                  {{ formatDate(task.due_date) }}
                </span>
                <span v-if="task.estimated_minutes" class="text-xs text-[var(--color-text-tertiary)]">
                  {{ task.estimated_minutes }} دقیقه
                </span>
              </div>
            </div>
            <HbTag :color="getPriorityColor(task.priority)">{{ getPriorityLabel(task.priority) }}</HbTag>
          </div>
        </HbCard>
      </div>
    </div>

    <!-- Create Task Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-[100] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40" @click="showCreate = false" />
        <div class="relative bg-[var(--color-surface)] rounded-t-3xl p-6 pb-8 animate-slide-up">
          <div class="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
          <h2 class="text-h2 font-heading text-[var(--color-text)] mb-4">تسک جدید</h2>
          <div class="space-y-4">
            <HbInput v-model="newTask.title" label="عنوان تسک" placeholder="مثلاً: ارسال گزارش" />
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">اولویت</label>
                <select v-model="newTask.priority" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                  <option value="low">پایین</option>
                  <option value="medium">متوسط</option>
                  <option value="high">بالا</option>
                  <option value="urgent">فوری</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">موعد</label>
                <JalaliDatePicker v-model="newTaskDate" />
              </div>
            </div>
            <HbInput v-model="newTask.estimated_minutes" label="زمان تخمینی (دقیقه)" type="number" placeholder="۳۰" dir="ltr" />
            <HbButton block @click="createTask">ذخیره</HbButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '@/stores/tasks'
import { formatJalaliDateTime } from '@/utils/jalali'
import JalaliDatePicker from '@/components/JalaliDatePicker.vue'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'

const tasks = useTasksStore()
const activeFilter = ref('all')
const showCreate = ref(false)
const newTaskDate = ref(new Date())

const newTask = ref({
  title: '',
  priority: 'medium',
  estimated_minutes: '',
})

const filters = [
  { label: 'همه', value: 'all' },
  { label: 'امروز', value: 'today' },
  { label: 'این هفته', value: 'week' },
  { label: 'انجام شده', value: 'done' },
]

const filteredTasks = computed(() => {
  if (activeFilter.value === 'all') return tasks.tasks
  if (activeFilter.value === 'done') return tasks.tasks.filter(t => t.status === 'done')
  if (activeFilter.value === 'today') {
    const today = new Date().toISOString().split('T')[0]
    return tasks.tasks.filter(t => t.due_date && t.due_date.startsWith(today))
  }
  if (activeFilter.value === 'week') {
    const now = new Date()
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return tasks.tasks.filter(t => {
      if (!t.due_date) return false
      const d = new Date(t.due_date)
      return d >= now && d <= weekEnd
    })
  }
  return tasks.tasks
})

function completeTask(name) {
  tasks.completeTask(name)
}

function uncomplete(name) {
  // In production, call API to revert
  const idx = tasks.tasks.findIndex(t => t.name === name)
  if (idx !== -1) {
    tasks.tasks[idx].status = 'todo'
    tasks.tasks[idx].completed_on = null
  }
}

function createTask() {
  if (!newTask.value.title) return
  const dueDate = newTaskDate.value.toISOString().split('T')[0]
  tasks.createTask({
    title: newTask.value.title,
    priority: newTask.value.priority,
    due_date: dueDate + 'T00:00:00',
    estimated_minutes: parseInt(newTask.value.estimated_minutes) || null,
    status: 'todo',
  })
  showCreate.value = false
  newTask.value = { title: '', priority: 'medium', estimated_minutes: '' }
  newTaskDate.value = new Date()
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'done') return false
  return new Date(task.due_date) < new Date()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDateTime(dateStr)
}

function getPriorityColor(p) {
  const colors = { urgent: 'var(--color-danger)', high: 'var(--color-warning)', medium: 'var(--pastel-blue)', low: 'var(--color-success)' }
  return colors[p] || 'var(--color-primary)'
}

function getPriorityLabel(p) {
  const labels = { urgent: 'فوری', high: 'بالا', medium: 'متوسط', low: 'پایین' }
  return labels[p] || p
}

onMounted(() => {
  tasks.fetchTasks()
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
