<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">حساب‌های مالی</h1>
        <div class="flex items-center gap-2">
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showSearch = !showSearch">
            <Search :size="20" />
          </button>
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.push('/finance/accounts/new')">
            <Plus :size="20" />
          </button>
        </div>
      </div>
    </header>

    <!-- Search -->
    <div v-if="showSearch" class="px-4 mb-4">
      <HbInput v-model="searchQuery" placeholder="جستجوی حساب..." />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-3">
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchAccounts" />

    <!-- Empty -->
    <HbEmptyState
      v-else-if="filteredAccounts.length === 0"
      icon="wallet"
      :title="searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز حسابی نساختید'"
      :description="searchQuery ? 'عبارت دیگری را جستجو کنید' : 'اولین حساب مالی خود را اضافه کنید'"
      :action-label="searchQuery ? '' : 'ایجاد حساب جدید'"
      @action="$router.push('/finance/accounts/new')"
    />

    <!-- Account List -->
    <div v-else class="px-4 space-y-3">
      <HbCard
        v-for="account in filteredAccounts"
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
            <p class="text-body font-bold text-[var(--color-text)]">{{ account.account_name }}</p>
            <HbTag variant="pastel" pastel="ice-blue" class="mt-1">{{ account.account_type }}</HbTag>
          </div>
          <div class="text-end">
            <p class="text-lg font-bold" :class="account.current_balance >= 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-error)]'">
              {{ formatMoney(account.current_balance) }}
            </p>
            <p class="text-xs text-[var(--color-text-tertiary)]">ریال</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-[var(--color-border)]">
          <button
            class="text-sm text-[var(--color-pink)] font-medium"
            @click.stop="$router.push(`/finance/transactions/new?account=${account.name}`)"
          >
            تراکنش جدید +
          </button>
        </div>
      </HbCard>
    </div>

    <!-- FAB -->
    <HbFab @click="$router.push('/finance/accounts/new')">
      <Plus :size="24" />
    </HbFab>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbInput from '@/components/ui/HbInput.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import HbFab from '@/components/ui/HbFab.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import { Search, Plus } from 'lucide-vue-next'
import * as icons from 'lucide-vue-next'

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const accounts = ref([])
const searchQuery = ref('')
const showSearch = ref(false)
const moneyFormatter = new PersianNumberFormatter('fa-IR')

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function getIcon(iconName) {
  if (!iconName) return icons.Wallet
  return icons[iconName] || icons.Wallet
}

const filteredAccounts = computed(() => {
  if (!searchQuery.value) return accounts.value
  const term = searchQuery.value.toLowerCase()
  return accounts.value.filter(a => a.account_name.toLowerCase().includes(term))
})

async function fetchAccounts() {
  loading.value = true
  error.value = null
  try {
    accounts.value = await api.getAccounts()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAccounts()
})
</script>
