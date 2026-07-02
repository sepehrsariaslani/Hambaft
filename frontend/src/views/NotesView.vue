<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">یادداشت‌ها</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showCreate = true">
          <span>➕</span>
        </button>
      </div>
    </header>

    <!-- Notes Grid -->
    <div class="px-4">
      <HbCard v-if="notes.loading" padding="p-4">
        <HbSkeleton type="card" />
        <HbSkeleton type="card" class="mt-3" />
      </HbCard>
      <HbEmptyState v-else-if="notes.notes.length === 0" icon="📝" title="یادداشتی نیست" description="افکارت رو بنویس" action-label="نوشتن یادداشت" @action="showCreate = true" />
      <div v-else class="grid grid-cols-2 gap-3">
        <HbCard
          v-for="note in notes.notes"
          :key="note.name"
          interactive
          padding="p-4"
          class="min-h-[120px]"
          @click="viewNote(note)"
        >
          <div class="h-1 w-8 rounded-full mb-3" :style="{ backgroundColor: getCategoryColor(note.category) }" />
          <h3 class="text-sm font-medium text-[var(--color-text)] line-clamp-2 mb-1">{{ note.title }}</h3>
          <p class="text-xs text-[var(--color-text-tertiary)] line-clamp-3">{{ note.content }}</p>
          <p class="text-[10px] text-[var(--color-text-tertiary)] mt-2">{{ formatDate(note.date) }}</p>
        </HbCard>
      </div>
    </div>

    <!-- Create Note Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-[100] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40" @click="showCreate = false" />
        <div class="relative bg-[var(--color-surface)] rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[80vh] overflow-y-auto">
          <div class="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
          <h2 class="text-h2 font-heading text-[var(--color-text)] mb-4">یادداشت جدید</h2>
          <div class="space-y-4">
            <HbInput v-model="newNote.title" label="عنوان" placeholder="عنوان یادداشت" />
            <div>
              <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">محتوا</label>
              <textarea
                v-model="newNote.content"
                rows="5"
                class="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-body resize-none focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder="افکارت رو بنویس..."
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">دسته‌بندی</label>
              <select v-model="newNote.category" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                <option value="general">عمومی</option>
                <option value="journal">دفتر خاطرات</option>
                <option value="idea">ایده</option>
                <option value="gratitude">قدردانی</option>
                <option value="reflection">تأمل</option>
              </select>
            </div>
            <HbButton block @click="createNote">ذخیره</HbButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Note Modal -->
    <Teleport to="body">
      <div v-if="viewingNote" class="fixed inset-0 z-[100] flex flex-col justify-end">
        <div class="absolute inset-0 bg-black/40" @click="viewingNote = null" />
        <div class="relative bg-[var(--color-surface)] rounded-t-3xl p-6 pb-8 animate-slide-up max-h-[80vh] overflow-y-auto">
          <div class="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-6" />
          <h2 class="text-h2 font-heading text-[var(--color-text)] mb-2">{{ viewingNote.title }}</h2>
          <p class="text-xs text-[var(--color-text-tertiary)] mb-4">{{ formatDate(viewingNote.date) }}</p>
          <p class="text-body text-[var(--color-text-secondary)] whitespace-pre-wrap">{{ viewingNote.content }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useNotesStore } from '@/stores/notes'
import { formatJalaliDate } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'

const notes = useNotesStore()
const showCreate = ref(false)
const viewingNote = ref(null)

const newNote = ref({
  title: '',
  content: '',
  category: 'general',
})

function getCategoryColor(cat) {
  const colors = { general: 'var(--color-primary)', journal: 'var(--pastel-blue)', idea: 'var(--pastel-amber)', gratitude: 'var(--pastel-rose)', reflection: 'var(--pastel-purple)' }
  return colors[cat] || 'var(--color-primary)'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDate(dateStr)
}

function createNote() {
  if (!newNote.value.content) return
  notes.createNote({
    title: newNote.value.title || 'بدون عنوان',
    content: newNote.value.content,
    category: newNote.value.category,
    date: new Date().toISOString().split('T')[0],
  })
  showCreate.value = false
  newNote.value = { title: '', content: '', category: 'general' }
}

function viewNote(note) {
  viewingNote.value = note
}

onMounted(() => {
  notes.fetchNotes()
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
