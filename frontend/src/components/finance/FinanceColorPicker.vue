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
        <div
          v-if="modelValue"
          class="w-6 h-6 rounded-full border-2 border-white/50"
          :style="{ backgroundColor: modelValue }"
        />
        <span class="text-[var(--color-text)]">{{ modelValue || placeholder }}</span>
      </div>
      <ChevronDown :size="18" class="text-[var(--color-text-tertiary)]" />
    </button>
    <p v-if="error" class="text-sm text-[var(--color-error)] mt-1">{{ error }}</p>

    <!-- Bottom Sheet -->
    <HbModal v-model="sheetOpen" :title="label || 'انتخاب رنگ'">
      <div class="grid grid-cols-4 gap-3 py-4">
        <button
          v-for="color in colors"
          :key="color"
          class="w-12 h-12 rounded-full mx-auto transition-transform active:scale-90"
          :class="modelValue === color ? 'ring-2 ring-offset-2 ring-[var(--color-black)] scale-110' : ''"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
        >
          <Check :size="20" v-if="modelValue === color" class="mx-auto text-white" />
        </button>
      </div>
      <div class="mt-4">
        <label class="block text-sm text-[var(--color-text-secondary)] mb-1">رنگ سفارشی (HEX)</label>
        <input
          v-model="customColor"
          type="text"
          placeholder="#FF0000"
          class="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)] text-left dir=ltr"
          @keyup.enter="selectColor(customColor)"
        />
      </div>
      <HbButton block variant="secondary" class="mt-4" @click="sheetOpen = false">انصراف</HbButton>
    </HbModal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbButton from '@/components/ui/HbButton.vue'
import { ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  placeholder: { type: String, default: 'انتخاب رنگ' },
})

const emit = defineEmits(['update:modelValue'])

const colors = [
  '#F4A8D3', '#F7D957', '#B8C97A', '#AFC7EB',
  '#CDB8F0', '#F26D65', '#5EEAD4', '#FCD34D',
]

const sheetOpen = ref(false)
const customColor = ref('')

function selectColor(color) {
  emit('update:modelValue', color)
  sheetOpen.value = false
  customColor.value = ''
}

function openSheet() {
  sheetOpen.value = true
}
</script>
