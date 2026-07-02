<template>
  <div class="px-4">
    <!-- Month Navigation -->
    <div class="flex items-center justify-between mb-4">
      <button class="w-9 h-9 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="prevMonth">
        <ChevronRight :size="18" />
      </button>
      <span class="text-md font-bold text-[var(--color-text)]">
        {{ MONTH_NAMES[currentMonth - 1] }} {{ toPersianDigits(currentYear) }}
      </span>
      <button class="w-9 h-9 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="nextMonth">
        <ChevronLeft :size="18" />
      </button>
    </div>

    <!-- Day Headers -->
    <div class="grid grid-cols-7 gap-1 mb-1">
      <div v-for="day in ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']" :key="day" class="text-center text-xs text-[var(--color-text-tertiary)] py-1 font-medium">
        {{ day }}
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="(cell, i) in calendarCells"
        :key="i"
        class="aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative"
        :class="{
          'invisible': !cell.day,
          'bg-[var(--color-pink)] text-white': cell.isToday,
          'bg-[var(--color-surface-secondary)]': cell.day && !cell.isToday && cell.bills.length === 0,
          'bg-[var(--color-error-light)]': cell.day && !cell.isToday && cell.bills.length > 0,
        }"
      >
        <span v-if="cell.day">{{ toPersianDigits(cell.day) }}</span>
        <div v-if="cell.bills.length" class="flex gap-0.5 mt-0.5">
          <div
            v-for="bill in cell.bills.slice(0, 3)"
            :key="bill.name"
            class="w-1.5 h-1.5 rounded-full"
            :class="bill.status === 'عقب‌افتاده' ? 'bg-[var(--color-error)]' : 'bg-[var(--color-warning)]'"
          />
        </div>
      </div>
    </div>

    <!-- Bills for selected day -->
    <div v-if="selectedDayBills.length" class="mt-4">
      <h3 class="text-sm font-bold text-[var(--color-text)] mb-2">
        قبض‌های {{ toPersianDigits(selectedDay) }} {{ MONTH_NAMES[currentMonth - 1] }}
      </h3>
      <div class="space-y-2">
        <FinanceBillRow
          v-for="bill in selectedDayBills"
          :key="bill.name"
          :bill="bill"
          @pay="$emit('select', bill)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { toJalaali, toGregorian } from 'jalaali-js'
import { toPersianDigits } from '@/utils/jalali'
import FinanceBillRow from './FinanceBillRow.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  bills: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

const today = new Date()
const todayJalali = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate())
const currentYear = ref(todayJalali.jy)
const currentMonth = ref(todayJalali.jm)
const selectedDay = ref(todayJalali.jd)

function getDaysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  const g1 = toGregorian(jy, 12, 1)
  const g2 = toGregorian(jy + 1, 1, 1)
  const d1 = new Date(g1.gy, g1.gm - 1, g1.gd)
  const d2 = new Date(g2.gy, g2.gm - 1, g2.gd)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

const calendarCells = computed(() => {
  const { jy, jm } = { jy: currentYear.value, jm: currentMonth.value }
  const firstDayGreg = toGregorian(jy, jm, 1)
  const firstDayJS = new Date(firstDayGreg.gy, firstDayGreg.gm - 1, firstDayGreg.gd)
  const startDayOfWeek = (firstDayJS.getDay() + 1) % 7
  const daysInMonth = getDaysInJalaliMonth(jy, jm)

  const cells = []
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, isToday: false, bills: [] })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${jy}-${String(jm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayBills = props.bills.filter(b => b.due_date === dateStr)
    cells.push({
      day: d,
      isToday: d === todayJalali.jd && jm === todayJalali.jm && jy === todayJalali.jy,
      bills: dayBills,
    })
  }
  return cells
})

const selectedDayBills = computed(() => {
  const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
  return props.bills.filter(b => b.due_date === dateStr)
})

function prevMonth() {
  currentMonth.value--
  if (currentMonth.value < 1) {
    currentMonth.value = 12
    currentYear.value--
  }
}

function nextMonth() {
  currentMonth.value++
  if (currentMonth.value > 12) {
    currentMonth.value = 1
    currentYear.value++
  }
}
</script>
