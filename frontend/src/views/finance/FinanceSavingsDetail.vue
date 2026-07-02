<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.back()">
            <ArrowRight :size="20" />
          </button>
          <h1 class="text-h1 font-display text-[var(--color-text)]">{{ goal?.goal_name || 'جزئیات هدف' }}</h1>
        </div>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showMenu = !showMenu">
          <MoreVertical :size="20" />
        </button>
      </div>
    </header>

    <!-- More Menu -->
    <div v-if="showMenu" class="px-4 mb-4">
      <HbCard padding="p-2">
        <button class="w-full text-right px-4 py-3 rounded-lg hover:bg-[var(--color-surface-secondary)] text-body" @click="showContribute = true; showMenu = false">
          ثبت پرداخت
        </button>
        <button class="w-full text-right px-4 py-3 rounded-lg hover:bg-[var(--color-surface-secondary)] text-body text-[var(--color-error)]" @click="handleDelete; showMenu = false">
          حذف هدف
        </button>
      </HbCard>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-4">
      <HbSkeleton variant="card" height="250" class="rounded-2xl" />
      <HbSkeleton variant="card" height="60" class="rounded-xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchGoal" />

    <!-- Goal Detail -->
    <template v-else-if="goal">
      <!-- Progress Ring -->
      <div class="px-4 mb-6">
        <HbCard padding="p-6" class="text-center">
          <HbProgressRing :progress="goal.progress || 0" :size="120" :color="goal.color || 'var(--color-yellow)'" :stroke-width="10">
            <span class="text-2xl font-display font-bold">{{ toPersianDigits(Math.round(goal.progress || 0)) }}%</span>
          </HbProgressRing>
          <h2 class="text-h2 font-heading text-[var(--color-text)] mt-4">{{ goal.goal_name }}</h2>
          <p class="text-2xl font-display text-[var(--color-text)] mt-2">
            {{ formatMoney(goal.current_amount) }}
            <span class="text-sm text-[var(--color-text-tertiary)]">/ {{ formatMoney(goal.target_amount) }}</span>
          </p>
        </HbCard>
      </div>

      <!-- Info Rows -->
      <div class="px-4 space-y-2">
        <HbCard padding="p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-secondary)]">پرداخت ماهانه</span>
            <span class="text-body font-medium text-[var(--color-text)]">{{ formatMoney(goal.monthly_contribution) }}</span>
          </div>
        </HbCard>
        <HbCard v-if="goal.account" padding="p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-secondary)]">حساب پس‌انداز</span>
            <span class="text-body font-medium text-[var(--color-text)]">{{ goal.account }}</span>
          </div>
        </HbCard>
        <HbCard v-if="goal.target_date" padding="p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-secondary)]">تاریخ هدف</span>
            <span class="text-body font-medium text-[var(--color-text)]">{{ formatDate(goal.target_date) }}</span>
          </div>
        </HbCard>
        <HbCard v-if="goal.linked_life_goal" padding="p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-text-secondary)]">هدف مرتبط</span>
            <span class="text-body font-medium text-[var(--color-text)]">{{ goal.linked_life_goal }}</span>
          </div>
        </HbCard>
      </div>

      <!-- Contribute Button -->
      <div class="px-4 mt-4">
        <HbButton block @click="showContribute = true">
          <Plus :size="18" class="me-1" />
          ثبت پرداخت
        </HbButton>
      </div>
    </template>

    <!-- Contribute Modal -->
    <HbModal v-model="showContribute" title="ثبت پرداخت">
      <div class="space-y-4">
        <HbInput v-model="contributeAmount" label="مبلغ (ریال)" type="number" required dir="ltr" />
        <FinanceSelectSheet v-model="contributeAccount" label="حساب" :items="accountOptions" display-field="account_name" />
        <HbButton block :loading="contributing" @click="submitContribution">ثبت پرداخت</HbButton>
      </div>
    </HbModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { formatJalaliDate, toPersianDigits, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbProgressRing from '@/components/ui/HbProgressRing.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbModal from '@/components/ui/HbModal.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import { ArrowRight, MoreVertical, Plus } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const api = useFinanceApi()

const loading = ref(true)
const error = ref(null)
const goal = ref(null)
const showMenu = ref(false)
const showContribute = ref(false)
const contributeAmount = ref('')
const contributeAccount = ref('')
const contributing = ref(false)
const accountOptions = ref([])
const moneyFormatter = new PersianNumberFormatter('fa-IR')

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDate(dateStr)
}

async function submitContribution() {
  if (!contributeAmount.value || parseFloat(contributeAmount.value) <= 0) return
  contributing.value = true
  try {
    await api.contributeToGoal(route.params.name, parseFloat(contributeAmount.value), contributeAccount.value)
    showContribute.value = false
    contributeAmount.value = ''
    fetchGoal()
  } catch (e) {
    alert('خطا در ثبت پرداخت')
  } finally {
    contributing.value = false
  }
}

async function handleDelete() {
  if (!confirm('آیا از حذف این هدف مطمئن هستید؟')) return
  try {
    await api.deleteSavingsGoal(route.params.name)
    router.push('/finance/savings')
  } catch (e) {
    alert('خطا در حذف')
  }
}

async function fetchGoal() {
  loading.value = true
  error.value = null
  try {
    goal.value = await api.getSavingsGoal(route.params.name)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  fetchGoal()
  try {
    accountOptions.value = await api.getAccounts()
  } catch (e) { /* silent */ }
})
</script>
