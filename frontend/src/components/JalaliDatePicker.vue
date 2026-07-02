<template>
  <div class="jalali-date-picker">
    <!-- Header: Month/Year Navigation -->
    <div class="flex items-center justify-between mb-3 px-1">
      <button
        type="button"
        class="w-9 h-9 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-divider)] transition-colors"
        @click="goToPrevMonth"
        aria-label="ماه قبل"
      >
        <ChevronRight :size="18" />
      </button>

      <div class="text-center">
        <span class="text-md font-bold text-[var(--color-text)]">
          {{ currentMonthName }}
        </span>
        <span class="text-sm text-[var(--color-text-secondary)] mr-1">
          {{ toPersianDigits(currentYear) }}
        </span>
      </div>

      <button
        type="button"
        class="w-9 h-9 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-divider)] transition-colors"
        @click="goToNextMonth"
        aria-label="ماه بعد"
      >
        <ChevronLeft :size="18" />
      </button>
    </div>

    <!-- Weekday Headers -->
    <div class="grid grid-cols-7 gap-1 mb-1">
      <div
        v-for="(day, i) in weekdayHeaders"
        :key="i"
        class="text-center text-xs text-[var(--color-text-tertiary)] py-1 font-medium"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="(cell, i) in calendarCells"
        :key="i"
        class="aspect-square flex items-center justify-center rounded-full text-sm transition-all duration-150"
        :class="{
          'invisible': !cell.day,
          'bg-[var(--color-primary)] text-[var(--color-text-on-dark)]': cell.isToday,
          'hover:bg-[var(--color-surface-secondary)] cursor-pointer': cell.day && !cell.isToday && !cell.isSelected,
          'ring-2 ring-[var(--color-primary)] text-[var(--color-text)]': cell.isSelected && !cell.isToday,
        }"
        @click="cell.day && selectDate(cell)"
      >
        <span v-if="cell.day">{{ toPersianDigits(cell.day) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { toJalaali, toGregorian } from 'jalaali-js'
import { toPersianDigits, getPersianMonthName } from '@/utils/jalali'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  /** v-model: JS Date (Gregorian) or null */
  modelValue: { type: Date, default: null },
  /** Default year when no modelValue is set (Jalali) */
  defaultYear: { type: Number, default: null },
  /** Default month when no modelValue is set (Jalali, 1-12) */
  defaultMonth: { type: Number, default: null },
})

const emit = defineEmits(['update:modelValue'])

// ── Internal Jalali state ──────────────────────────────────────
const today = new Date()
const todayJalaali = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())

function getInitialJalali() {
  if (props.modelValue) {
    const j = toJalaali(props.modelValue.getFullYear(), props.modelValue.getMonth() + 1, props.modelValue.getDate())
    return { jy: j.jy, jm: j.jm, jd: j.jd }
  }
  return {
    jy: props.defaultYear || todayJalaali.jy,
    jm: props.defaultMonth || todayJalaali.jm,
    jd: 1,
  }
}

const currentJalali = ref(getInitialJalali())

// Sync from parent → internal
watch(() => props.modelValue, (val) => {
  if (val) {
    const j = toJalaali(val.getFullYear(), val.getMonth() + 1, val.getDate())
    currentJalali.value = { jy: j.jy, jm: j.jm, jd: j.jd }
  }
})

// ── Weekday headers (Persian, Saturday-first) ─────────────────
const weekdayHeaders = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

// ── Computed: current month name ──────────────────────────────
const currentMonthName = computed(() => getPersianMonthName(
  new Date(...toGregorian(currentJalali.value.jy, currentJalali.value.jm, 1))
))

const currentYear = computed(() => currentJalali.value.jy)

// ── Helper: days in a Jalali month ────────────────────────────
function getDaysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  // Month 12: compute by diff
  const g1 = toGregorian(jy, 12, 1)
  const g2 = toGregorian(jy + 1, 1, 1)
  const d1 = new Date(g1.gy, g1.gm - 1, g1.gd)
  const d2 = new Date(g2.gy, g2.gm - 1, g2.gd)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

// ── Computed: calendar cells ──────────────────────────────────
const calendarCells = computed(() => {
  const { jy, jm } = currentJalali.value

  // First day of Jalali month → Gregorian → JS Date
  const firstDayGreg = toGregorian(jy, jm, 1)
  const firstDayJS = new Date(firstDayGreg.gy, firstDayGreg.gm - 1, firstDayGreg.gd)

  // JS getDay(): 0=Sun … 6=Sat → Persian: Sat=0, Sun=1 … Fri=6
  const startDayOfWeek = (firstDayJS.getDay() + 1) % 7

  // Days in this Jalali month
  const daysInMonth = getDaysInJalaliMonth(jy, jm)

  const cells = []

  // Empty cells before first day
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, isToday: false, isSelected: false })
  }

  // Selected date for fast lookup
  let selectedJalali = null
  if (props.modelValue) {
    const sj = toJalaali(props.modelValue.getFullYear(), props.modelValue.getMonth() + 1, props.modelValue.getDate())
    selectedJalali = { jy: sj.jy, jm: sj.jm, jd: sj.jd }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellGreg = toGregorian(jy, jm, d)
    const cellDate = new Date(cellGreg.gy, cellGreg.gm - 1, cellGreg.gd)

    cells.push({
      day: d,
      date: cellDate,
      isToday: cellDate.getTime() === today.getTime(),
      isSelected: selectedJalali &&
        selectedJalali.jy === jy &&
        selectedJalali.jm === jm &&
        selectedJalali.jd === d,
    })
  }

  return cells
})

// ── Actions ───────────────────────────────────────────────────
function selectDate(cell) {
  const { jy, jm } = currentJalali.value
  const g = toGregorian(jy, jm, cell.day)
  const date = new Date(g.gy, g.gm - 1, g.gd)
  emit('update:modelValue', date)
}

function goToPrevMonth() {
  let { jy, jm } = currentJalali.value
  jm--
  if (jm < 1) {
    jm = 12
    jy--
  }
  currentJalali.value = { jy, jm, jd: 1 }
}

function goToNextMonth() {
  let { jy, jm } = currentJalali.value
  jm++
  if (jm > 12) {
    jm = 1
    jy++
  }
  currentJalali.value = { jy, jm, jd: 1 }
}
</script>

<style scoped>
.jalali-date-picker {
  direction: rtl;
  font-family: var(--font-family-primary);
}
</style>
