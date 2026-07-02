<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">داشبورد مالی</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center">
          <Bell :size="20" />
        </button>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="px-4 space-y-4">
      <HbSkeleton variant="card" height="160" class="rounded-2xl" />
      <HbSkeleton variant="card" height="80" class="rounded-2xl" />
      <HbSkeleton variant="card" height="80" class="rounded-2xl" />
      <HbSkeleton variant="card" height="80" class="rounded-2xl" />
    </div>

    <!-- Error State -->
    <FinanceErrorState v-else-if="error" @retry="fetchDashboard" />

    <!-- Dashboard Content -->
    <template v-else>
      <!-- Hero Balance Card -->
      <div class="px-4 mb-6">
        <HbCard variant="accent" accentColor="var(--color-purple)" padding="p-5">
          <p class="text-sm text-[var(--color-text-secondary)] mb-1">موجودی کل</p>
          <p class="text-3xl font-display mb-3" :class="dashboard.totalBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
            {{ dashboard.totalBalance >= 0 ? '+' : '' }}{{ formatMoney(dashboard.totalBalance) }}
          </p>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="bg-[var(--color-surface-secondary)] rounded-xl p-3">
              <p class="text-xs text-[var(--color-text-tertiary)]">درآمد این ماه</p>
              <p class="text-lg font-bold text-[var(--color-success)]">+{{ formatMoney(dashboard.income) }}</p>
            </div>
            <div class="bg-[var(--color-surface-secondary)] rounded-xl p-3">
              <p class="text-xs text-[var(--color-text-tertiary)]">هزینه این ماه</p>
              <p class="text-lg font-bold text-[var(--color-error)]">-{{ formatMoney(dashboard.expense) }}</p>
            </div>
          </div>
          <div class="h-px bg-[var(--color-border)] my-3" />
          <div class="flex justify-between items-center">
            <span class="text-sm text-[var(--color-text-secondary)]">پس‌انداز</span>
            <span class="text-lg font-bold text-[var(--color-success)]">+{{ formatMoney(dashboard.savings) }}</span>
          </div>
        </HbCard>
      </div>

      <!-- My Accounts -->
      <div class="px-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-h2 font-heading text-[var(--color-text)]">حساب‌های من</h2>
          <HbTag variant="pastel" pastel="ice-blue" selectable @click="$router.push('/finance/accounts')">
            مشاهده همه
          </HbTag>
        </div>
        <div class="space-y-2">
          <HbCard
            v-for="account in dashboard.accounts"
            :key="account.name"
            padding="p-4"
            interactive
            @click="$router.push(`/finance/accounts/${account.name}`)"
          >
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ backgroundColor: account.color || 'var(--color-purple)' }">
                <component :is="getIcon(account.icon)" :size="22" class="text-white" />
              </div>
              <div class="flex-1">
                <p class="text-body font-medium text-[var(--color-text)]">{{ account.account_name }}</p>
                <p class="text-xs text-[var(--color-text-tertiary)]">{{ account.account_type }}</p>
              </div>
              <span class="text-body font-bold" :class="account.current_balance >= 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-error)]'">
                {{ formatMoney(account.current_balance) }}
              </span>
            </div>
          </HbCard>
        </div>
      </div>

      <!-- Budget Progress -->
      <div v-if="dashboard.budgets.length" class="px-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-h2 font-heading text-[var(--color-text)]">بودجه این ماه</h2>
          <HbTag variant="pastel" pastel="purple" selectable @click="$router.push('/finance/budgets')">
            مشاهده همه
          </HbTag>
        </div>
        <div class="space-y-2">
          <HbCard
            v-for="budget in dashboard.budgets"
            :key="budget.name"
            padding="p-4"
            interactive
            @click="$router.push(`/finance/budgets/${budget.name}`)"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-body font-medium text-[var(--color-text)]">{{ budget.budget_title }}</span>
              <span class="text-sm text-[var(--color-text-tertiary)]">{{ budget.jalali_month }}/{{ toPersianDigits(budget.jalali_year) }}</span>
            </div>
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
      </div>

      <!-- Upcoming Bills -->
      <div v-if="dashboard.upcomingBills.length" class="px-4 mb-6">
        <h2 class="text-h2 font-heading text-[var(--color-text)] mb-3">قبض‌های پیش‌رو</h2>
        <div class="space-y-2">
          <HbCard
            v-for="bill in dashboard.upcomingBills"
            :key="bill.name"
            padding="p-4"
            :accent-color="bill.status === 'عقب‌افتاده' ? 'var(--color-error)' : undefined"
            :variant="bill.status === 'عقب‌افتاده' ? 'accent' : 'default'"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center">
                  <Receipt :size="18" class="text-[var(--color-text)]" />
                </div>
                <div>
                  <p class="text-body font-medium text-[var(--color-text)]">{{ bill.bill_name }}</p>
                  <p class="text-xs text-[var(--color-text-tertiary)]">سررسید: {{ formatDate(bill.due_date) }}</p>
                </div>
              </div>
              <span class="text-body font-bold text-[var(--color-text)]">{{ formatMoney(bill.amount) }}</span>
            </div>
          </HbCard>
        </div>
      </div>

      <!-- Savings Goals -->
      <div v-if="dashboard.goals.length" class="px-4 mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-h2 font-heading text-[var(--color-text)]">اهداف پس‌انداز</h2>
          <HbTag variant="pastel" pastel="olive" selectable @click="$router.push('/finance/savings')">
            مشاهده همه
          </HbTag>
        </div>
        <div class="space-y-2">
          <HbCard
            v-for="goal in dashboard.goals"
            :key="goal.name"
            padding="p-4"
            interactive
            @click="$router.push(`/finance/savings/${goal.name}`)"
          >
            <div class="flex items-center gap-3">
              <HbProgressRing :progress="goal.progress || 0" :size="48" :color="goal.color || 'var(--color-yellow)'">
                <span class="text-xs font-bold">{{ toPersianDigits(Math.round(goal.progress || 0)) }}%</span>
              </HbProgressRing>
              <div class="flex-1">
                <p class="text-body font-medium text-[var(--color-text)]">{{ goal.goal_name }}</p>
                <p class="text-xs text-[var(--color-text-tertiary)]">
                  {{ formatMoney(goal.current_amount) }} / {{ formatMoney(goal.target_amount) }}
                </p>
              </div>
            </div>
          </HbCard>
        </div>
      </div>

      <!-- Empty State for new users -->
      <HbEmptyState
        v-if="!dashboard.accounts.length && !dashboard.budgets.length"
        icon="wallet"
        title="هنوز حسابی نساختید"
        description="اولین حساب مالی خود را اضافه کنید"
        action-label="ایجاد حساب جدید"
        @action="$router.push('/finance/accounts/new')"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { formatJalaliDate, toPersianDigits, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbProgressRing from '@/components/ui/HbProgressRing.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceProgressBar from '@/components/finance/FinanceProgressBar.vue'
import { Bell, Receipt } from 'lucide-vue-next'
import * as icons from 'lucide-vue-next'

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const dashboard = ref({
  totalBalance: 0, income: 0, expense: 0, savings: 0,
  accounts: [], budgets: [], upcomingBills: [], goals: [],
})

const moneyFormatter = new PersianNumberFormatter('fa-IR')

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDate(dateStr)
}

function getBudgetProgress(budget) {
  if (!budget.total_income_plan) return 0
  return ((budget.total_expense_plan || 0) / budget.total_income_plan) * 100
}

function getIcon(iconName) {
  if (!iconName) return icons.Wallet
  return icons[iconName] || icons.Wallet
}

async function fetchDashboard() {
  loading.value = true
  error.value = null
  try {
    dashboard.value = await api.getDashboard()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
})
</script>
