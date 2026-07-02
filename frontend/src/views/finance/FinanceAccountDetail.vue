<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.back()">
            <ArrowRight :size="20" />
          </button>
          <h1 class="text-h1 font-display text-[var(--color-text)]">{{ account?.account_name || 'جزئیات حساب' }}</h1>
        </div>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showMenu = !showMenu">
          <MoreVertical :size="20" />
        </button>
      </div>
    </header>

    <!-- More Menu -->
    <div v-if="showMenu" class="px-4 mb-4">
      <HbCard padding="p-2">
        <button class="w-full text-right px-4 py-3 rounded-lg hover:bg-[var(--color-surface-secondary)] text-body" @click="$router.push(`/finance/accounts/${route.params.name}/edit`); showMenu = false">
          ویرایش حساب
        </button>
        <button class="w-full text-right px-4 py-3 rounded-lg hover:bg-[var(--color-surface-secondary)] text-body text-[var(--color-error)]" @click="handleDelete; showMenu = false">
          حذف حساب
        </button>
      </HbCard>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-4">
      <HbSkeleton variant="card" height="200" class="rounded-2xl" />
      <HbSkeleton variant="card" height="60" class="rounded-2xl" />
      <HbSkeleton variant="card" height="60" class="rounded-2xl" />
      <HbSkeleton variant="card" height="60" class="rounded-2xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchAccount" />

    <!-- Account Detail -->
    <template v-else-if="account">
      <!-- Hero -->
      <div class="px-4 mb-6">
        <HbCard padding="p-6" class="text-center">
          <div class="w-18 h-18 rounded-full mx-auto mb-3 flex items-center justify-center" :style="{ backgroundColor: account.color || 'var(--color-purple)', width: '72px', height: '72px' }">
            <component :is="getIcon(account.icon)" :size="32" class="text-white" />
          </div>
          <h2 class="text-h2 font-heading text-[var(--color-text)]">{{ account.account_name }}</h2>
          <HbTag variant="pastel" pastel="purple" class="mt-1">{{ account.account_type }}</HbTag>
          <p class="text-3xl font-display mt-4" :class="account.current_balance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
            {{ formatMoney(account.current_balance) }}
          </p>
          <p class="text-sm text-[var(--color-text-tertiary)] mt-1">موجودی فعلی</p>
          <p class="text-sm text-[var(--color-text-secondary)] mt-2">موجودی اولیه: {{ formatMoney(account.opening_balance) }}</p>
        </HbCard>
      </div>

      <!-- Filter Chips -->
      <div class="px-4 mb-4">
        <div class="flex gap-2 overflow-x-auto">
          <HbTag :variant="transactionFilter === 'all' ? 'active' : 'default'" selectable @click="transactionFilter = 'all'">همه</HbTag>
          <HbTag :variant="transactionFilter === 'income' ? 'active' : 'default'" selectable @click="transactionFilter = 'income'">درآمد</HbTag>
          <HbTag :variant="transactionFilter === 'expense' ? 'active' : 'default'" selectable @click="transactionFilter = 'expense'">هزینه</HbTag>
        </div>
      </div>

      <!-- Transactions -->
      <div class="px-4">
        <h3 class="text-h3 font-heading text-[var(--color-text)] mb-3">تراکنش‌های اخیر</h3>

        <HbSkeleton v-if="txLoading" variant="card" height="60" class="rounded-xl mb-2" />
        <HbSkeleton v-if="txLoading" variant="card" height="60" class="rounded-xl mb-2" />
        <HbSkeleton v-if="txLoading" variant="card" height="60" class="rounded-xl mb-2" />

        <HbEmptyState
          v-else-if="filteredTransactions.length === 0"
          icon="receipt"
          title="تراکنشی ثبت نشده"
          description="اولین تراکنش این حساب را ثبت کنید"
          action-label="ثبت تراکنش"
          @action="$router.push(`/finance/transactions/new?account=${route.params.name}`)"
        />

        <div v-else class="space-y-2">
          <HbCard
            v-for="tx in filteredTransactions"
            :key="tx.name"
            padding="p-4"
            interactive
            @click="$router.push(`/finance/transactions/${tx.name}`)"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="tx.transaction_type === 'درآمد' ? 'bg-[var(--color-success-light)]' : 'bg-[var(--color-error-light)]'">
                <span>{{ tx.transaction_type === 'درآمد' ? '↓' : '↑' }}</span>
              </div>
              <div class="flex-1">
                <p class="text-body font-medium text-[var(--color-text)]">{{ tx.description || tx.transaction_type }}</p>
                <p class="text-xs text-[var(--color-text-tertiary)]">
                  {{ formatDate(tx.transaction_date) }}
                  <span v-if="tx.category"> · {{ tx.category }}</span>
                </p>
              </div>
              <span class="text-body font-bold" :class="getAmountClass(tx)">
                {{ tx.transaction_type === 'درآمد' ? '+' : '-' }}{{ formatMoney(tx.amount) }}
              </span>
            </div>
          </HbCard>
        </div>
      </div>
    </template>

    <!-- FAB -->
    <HbFab @click="$router.push(`/finance/transactions/new?account=${route.params.name}`)">
      <Plus :size="24" />
    </HbFab>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { formatJalaliDate, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbFab from '@/components/ui/HbFab.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import { ArrowRight, MoreVertical, Plus } from 'lucide-vue-next'
import * as icons from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const api = useFinanceApi()

const loading = ref(true)
const txLoading = ref(true)
const error = ref(null)
const account = ref(null)
const transactions = ref([])
const showMenu = ref(false)
const transactionFilter = ref('all')
const moneyFormatter = new PersianNumberFormatter('fa-IR')

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDate(dateStr)
}

function getIcon(iconName) {
  if (!iconName) return icons.Wallet
  return icons[iconName] || icons.Wallet
}

function getAmountClass(tx) {
  if (tx.transaction_type === 'درآمد') return 'text-[var(--color-success)]'
  if (tx.transaction_type === 'انتقال') return 'text-[var(--color-ice-blue)]'
  return 'text-[var(--color-error)]'
}

const filteredTransactions = computed(() => {
  if (transactionFilter.value === 'all') return transactions.value
  if (transactionFilter.value === 'income') return transactions.value.filter(t => t.transaction_type === 'درآمد')
  if (transactionFilter.value === 'expense') return transactions.value.filter(t => t.transaction_type === 'هزینه')
  return transactions.value
})

async function fetchAccount() {
  loading.value = true
  error.value = null
  try {
    account.value = await api.getAccount(route.params.name)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchTransactions() {
  txLoading.value = true
  try {
    transactions.value = await api.getTransactions([
      ['account', '=', route.params.name],
    ])
  } catch (e) {
    // silent
  } finally {
    txLoading.value = false
  }
}

async function handleDelete() {
  if (confirm('آیا از حذف این حساب مطمئن هستید؟')) {
    try {
      await api.deleteAccount(route.params.name)
      router.push('/finance/accounts')
    } catch (e) {
      alert('خطا در حذف حساب')
    }
  }
}

onMounted(() => {
  fetchAccount()
  fetchTransactions()
})
</script>
