<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
      {{ label }}
      <span v-if="required" class="text-[var(--color-error)] ms-0.5">*</span>
    </label>

    <!-- Trigger button -->
    <button
      type="button"
      class="w-full h-12 px-3 rounded-xl border-[1.5px] bg-[var(--color-surface)] flex items-center justify-between transition-all"
      :class="error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'"
      @click="openSheet"
    >
      <div class="flex items-center gap-2">
        <span class="text-[var(--color-text)]">{{ displayValue }}</span>
      </div>
      <ChevronDown :size="18" class="text-[var(--color-text-tertiary)]" />
    </button>
    <p v-if="error" class="text-sm text-[var(--color-error)] mt-1">{{ error }}</p>

    <!-- Bottom Sheet -->
    <HbModal v-model="sheetOpen" :title="label || 'انتخاب'">
      <input
        v-model="search"
        type="text"
        placeholder="جستجو..."
        class="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)] mb-3"
      />
      <div class="max-h-64 overflow-y-auto space-y-1">
        <button
          v-for="item in filteredItems"
          :key="item.name"
          class="w-full h-12 px-3 rounded-lg flex items-center justify-between transition-all active:scale-[0.98]"
          :class="isSelected(item) ? 'bg-[var(--color-pink)] text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text)]'"
          @click="selectItem(item)"
        >
          <div class="flex items-center gap-2">
            <div
              v-if="item.color"
              class="w-5 h-5 rounded-full"
              :style="{ backgroundColor: item.color }"
            />
            <span>{{ item.display }}</span>
          </div>
          <Check v-if="isSelected(item)" :size="18" />
        </button>
        <p v-if="filteredItems.length === 0" class="text-center text-[var(--color-text-tertiary)] py-4">
          موردی یافت نشد
        </p>
      </div>
      <HbButton block variant="secondary" class="mt-3" @click="sheetOpen = false">انصراف</HbButton>
    </HbModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbButton from '@/components/ui/HbButton.vue'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  placeholder: { type: String, default: 'انتخاب' },
  items: { type: Array, default: () => [] },
  displayField: { type: String, default: 'display' },
})

const emit = defineEmits(['update:modelValue'])

const sheetOpen = ref(false)
const search = ref('')

const filteredItems = computed(() => {
  if (!search.value) return props.items
  const term = search.value.toLowerCase()
  return props.items.filter(i => (i[props.displayField] || '').toLowerCase().includes(term))
})

const displayValue = computed(() => {
  const item = props.items.find(i => i.name === props.modelValue)
  return item ? item[props.displayField] : props.placeholder
})

function isSelected(item) {
  return item.name === props.modelValue
}

function selectItem(item) {
  emit('update:modelValue', item.name)
  sheetOpen.value = false
  search.value = ''
}
</script>
