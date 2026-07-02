<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">بودجه‌ها</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.push('/finance/budgets/new')">
          <Plus :size="20" />
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-3">
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchBudgets" />

    <!-- Empty -->
    <HbEmptyState
      v-else-if="budgets.length === 0"
      icon="chart-pie"
      title="بودجه‌ای نساختید"
      description="اولین بودجه ماهانه خود را برنامه‌ریزی کنید"
      action-label="ایجاد بودجه"
      @action="$router.push('/finance/budgets/new')"
    />

    <!-- Budget List -->
    <div v-else class="px-4 space-y-3">
      <HbCard
        v-for="budget in budgets"
        :key="budget.name"
        padding="p-4"
        interactive
        @click="$router.push(`/finance/budgets/${budget.name}`)"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-body font-bold text-[var(--color-text)]">{{ budget.budget_title }}</span>
          <HbTag :variant="budget.status === 'فعال' ? 'pastel' : 'default'" :pastel="budget.status === 'فعال' ? 'olive' : 'pink'">
            {{ budget.status }}
          </HbTag>
        </div>
        <p class="text-sm text-[var(--color-text-tertiary)] mb-3">
          {{ getMonthName(budget.jalali_month) }} {{ toPersianDigits(budget.jalali_year) }}
        </p>
        <FinanceProgressBar
          :progress="getBudgetProgress(budget)"
          :warning-threshold="70"
          :danger-threshold="80"
        />
        <div class="flex justify-between mt-2 text-xs text-[var(--color-text-tertiary)]">
          <span>هزینه: {{ formatMoney(budget.total_expense_plan || 0) }}</span>
          <span>بودجه: {{ formatMoney(budget.total_income_plan || 0) }}</span>
        </div>
      </HbCard>
    </div>

    <!-- FAB -->
    <HbFab @click="$router.push('/finance/budgets/new')">
      <Plus :size="24" />
    </HbFab>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { toPersianDigits, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbFab from '@/components/ui/HbFab.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceProgressBar from '@/components/finance/FinanceProgressBar.vue'
import { Plus } from 'lucide-vue-next'

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const budgets = ref([])
const moneyFormatter = new PersianNumberFormatter('fa-IR')

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function getBudgetProgress(budget) {
  if (!budget.total_income_plan) return 0
  return ((budget.total_expense_plan || 0) / budget.total_income_plan) * 100
}

function getMonthName(m) {
  return MONTH_NAMES[parseInt(m) - 1] || m
}

async function fetchBudgets() {
  loading.value = true
  error.value = null
  try {
    budgets.value = await api.getBudgets()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchBudgets()
})
</script>
