<template>
  <div class="jalali-month-picker">
    <!-- Year Display -->
    <div class="text-center mb-3">
      <span class="text-md font-bold text-[var(--color-text)]">
        {{ toPersianDigits(currentYear) }}
      </span>
    </div>

    <!-- Months Grid (4 columns x 3 rows) -->
    <div class="grid grid-cols-4 gap-2">
      <button
        v-for="(month, i) in months"
        :key="i"
        type="button"
        class="h-12 rounded-xl text-sm font-medium transition-all duration-150 flex items-center justify-center"
        :class="{
          'bg-[var(--color-primary)] text-[var(--color-text-on-dark)]': isSelected(i + 1),
          'bg-[var(--color-surface-secondary)] text-[var(--color-text)] hover:bg-[var(--color-divider)]': !isSelected(i + 1),
        }"
        @click="selectMonth(i + 1)"
      >
        {{ month }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { toJalaali, toGregorian } from 'jalaali-js'
import { toPersianDigits } from '@/utils/jalali'

const MONTH_NAMES = [
  '\u0641\u0631\u0648\u0631\u062F\u06CC\u0646', // فروردین
  '\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A', // اردیبهشت
  '\u062E\u0631\u062F\u0627\u062F',             // خرداد
  '\u062A\u06CC\u0631',                         // تیر
  '\u0645\u0631\u062F\u0627\u062F',             // مرداد
  '\u0634\u0647\u0631\u06CC\u0648\u0631',       // شهریور
  '\u0645\u0647\u0631',                         // مهر
  '\u0622\u0628\u0627\u0646',                   // آبان
  '\u0622\u0630\u0631',                         // آذر
  '\u062F\u06CC',                               // دی
  '\u0628\u0647\u0645\u0646',                   // بهمن
  '\u0627\u0633\u0641\u0646\u062F',             // اسفند
]

const props = defineProps({
  /** v-model: JS Date (Gregorian) or null — first day of the selected Jalali month */
  modelValue: { type: Date, default: null },
  /** Default year when no modelValue is set (Jalali) */
  defaultYear: { type: Number, default: null },
})

const emit = defineEmits(['update:modelValue'])

const today = new Date()
const todayJalaali = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())

const currentYear = ref(props.defaultYear || todayJalaali.jy)
const selectedMonth = ref(null)

// Initialize from modelValue
if (props.modelValue) {
  const j = toJalaali(props.modelValue.getFullYear(), props.modelValue.getMonth() + 1, props.modelValue.getDate())
  currentYear.value = j.jy
  selectedMonth.value = j.jm
}

// Sync from parent
watch(() => props.modelValue, (val) => {
  if (val) {
    const j = toJalaali(val.getFullYear(), val.getMonth() + 1, val.getDate())
    currentYear.value = j.jy
    selectedMonth.value = j.jm
  }
})

const months = MONTH_NAMES

function isSelected(monthIndex) {
  return selectedMonth.value === monthIndex
}

function selectMonth(monthIndex) {
  selectedMonth.value = monthIndex
  // Convert 1st day of Jalali month to Gregorian, emit as JS Date
  const g = toGregorian(currentYear.value, monthIndex, 1)
  const date = new Date(g.gy, g.gm - 1, g.gd)
  emit('update:modelValue', date)
}
</script>

<style scoped>
.jalali-month-picker {
  direction: rtl;
  font-family: var(--font-family-primary);
}
</style>
