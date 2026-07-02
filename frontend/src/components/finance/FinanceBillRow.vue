<template>
  <HbCard
    padding="p-4"
    :variant="bill.status === 'عقب‌افتاده' ? 'accent' : undefined"
    :accent-color="bill.status === 'عقب‌افتاده' ? 'var(--color-error)' : undefined"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center"
          :class="statusIconBg"
        >
          <Receipt :size="18" :class="statusIconColor" />
        </div>
        <div>
          <p class="text-body font-medium text-[var(--color-text)]" :class="{ 'line-through opacity-60': bill.status === 'پرداخت‌شده' }">
            {{ bill.bill_name }}
          </p>
          <div class="flex items-center gap-2 mt-0.5">
            <span v-if="bill.category" class="text-xs text-[var(--color-text-tertiary)]">{{ bill.category }}</span>
            <span class="text-xs" :class="isOverdue ? 'text-[var(--color-error)] font-medium' : 'text-[var(--color-text-tertiary)]'">
              {{ formatDate(bill.due_date) }}
              <span v-if="isOverdue"> ({{ overdueDays }} روز گذشته)</span>
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-body font-bold text-[var(--color-text)]">{{ formatMoney(bill.amount) }}</span>
        <button
          v-if="bill.status !== 'پرداخت‌شده'"
          class="h-8 px-3 rounded-full bg-[var(--color-success)] text-white text-xs font-medium"
          @click="$emit('pay')"
        >
          پرداخت
        </button>
      </div>
    </div>
  </HbCard>
</template>

<script setup>
import { computed } from 'vue'
import { formatJalaliDate, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import { Receipt } from 'lucide-vue-next'

const props = defineProps({
  bill: { type: Object, required: true },
})

defineEmits(['pay', 'edit'])

const moneyFormatter = new PersianNumberFormatter('fa-IR')

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDate(dateStr)
}

const isOverdue = computed(() => {
  if (props.bill.status === 'عقب‌افتاده') return true
  return false
})

const overdueDays = computed(() => {
  const due = new Date(props.bill.due_date)
  const today = new Date()
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 0)
})

const statusIconBg = computed(() => {
  if (props.bill.status === 'پرداخت‌شده') return 'bg-[var(--color-success-light)]'
  if (props.bill.status === 'عقب‌افتاده') return 'bg-[var(--color-error-light)]'
  return 'bg-[var(--color-surface-secondary)]'
})

const statusIconColor = computed(() => {
  if (props.bill.status === 'پرداخت‌شده') return 'text-[var(--color-success)]'
  if (props.bill.status === 'عقب‌افتاده') return 'text-[var(--color-error)]'
  return 'text-[var(--color-text)]'
})
</script>
