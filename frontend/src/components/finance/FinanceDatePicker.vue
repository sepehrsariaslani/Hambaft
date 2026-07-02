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
        <Calendar :size="18" class="text-[var(--color-text-tertiary)]" />
        <span class="text-[var(--color-text)]">{{ displayDate }}</span>
      </div>
    </button>
    <p v-if="error" class="text-sm text-[var(--color-error)] mt-1">{{ error }}</p>

    <!-- Bottom Sheet with Jalali Calendar -->
    <HbModal v-model="sheetOpen" :title="label || 'انتخاب تاریخ'">
      <JalaliDatePicker v-model="selectedDate" />
      <div class="flex gap-3 mt-4">
        <HbButton block variant="primary" @click="confirm">تایید</HbButton>
        <HbButton block variant="secondary" @click="sheetOpen = false">انصراف</HbButton>
      </div>
    </HbModal>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbButton from '@/components/ui/HbButton.vue'
import JalaliDatePicker from '@/components/JalaliDatePicker.vue'
import { Calendar } from 'lucide-vue-next'
import { formatJalaliDate, toPersianDigits } from '@/utils/jalali'
import { toJalaali } from 'jalaali-js'

const props = defineProps({
  modelValue: { type: [String, Date], default: null },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const sheetOpen = ref(false)
const selectedDate = ref(props.modelValue ? new Date(props.modelValue) : new Date())

watch(() => props.modelValue, (val) => {
  if (val) selectedDate.value = new Date(val)
})

const displayDate = computed(() => {
  if (!props.modelValue) return 'انتخاب تاریخ'
  return formatJalaliDate(new Date(props.modelValue))
})

function confirm() {
  emit('update:modelValue', selectedDate.value.toISOString().split('T')[0])
  sheetOpen.value = false
}
</script>
