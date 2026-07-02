<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">اهداف پس‌انداز</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="openCreate">
          <Plus :size="20" />
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-3">
      <HbSkeleton variant="card" height="120" class="rounded-2xl" />
      <HbSkeleton variant="card" height="120" class="rounded-2xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchGoals" />

    <!-- Empty -->
    <HbEmptyState
      v-else-if="goals.length === 0"
      icon="piggy-bank"
      title="هدف پس‌اندازی نساختید"
      description="هدف جدید تعیین کنید و شروع به پس‌انداز کنید"
      action-label="ایجاد هدف"
      @action="openCreate"
    />

    <!-- Goal List -->
    <div v-else class="px-4 space-y-3">
      <HbCard
        v-for="goal in goals"
        :key="goal.name"
        padding="p-4"
        interactive
        @click="$router.push(`/finance/savings/${goal.name}`)"
      >
        <div class="flex items-center gap-4">
          <HbProgressRing :progress="goal.progress || 0" :size="64" :color="goal.color || 'var(--color-yellow)'">
            <span class="text-sm font-bold">{{ toPersianDigits(Math.round(goal.progress || 0)) }}%</span>
          </HbProgressRing>
          <div class="flex-1">
            <p class="text-body font-bold text-[var(--color-text)]">{{ goal.goal_name }}</p>
            <p class="text-sm text-[var(--color-text-tertiary)] mt-1">
              {{ formatMoney(goal.current_amount) }} / {{ formatMoney(goal.target_amount) }}
            </p>
            <div class="flex items-center gap-2 mt-2">
              <HbTag v-if="goal.status" :variant="getStatusVariant(goal.status)" :pastel="getStatusPastel(goal.status)">
                {{ goal.status }}
              </HbTag>
              <span class="text-xs text-[var(--color-text-tertiary)]">
                هدف: {{ formatDate(goal.target_date) }}
              </span>
            </div>
          </div>
        </div>
      </HbCard>
    </div>

    <!-- Create Modal -->
    <HbModal v-model="showCreate" title="هدف پس‌انداز جدید">
      <div class="space-y-4">
        <HbInput v-model="form.goal_name" label="نام هدف" required :error="errors.goal_name" />
        <HbInput v-model="form.target_amount" label="مبلغ هدف (ریال)" type="number" required :error="errors.target_amount" dir="ltr" />
        <HbInput v-model="form.current_amount" label="مبلغ فعلی (ریال)" type="number" dir="ltr" />
        <FinanceDatePicker v-model="form.target_date" label="تاریخ هدف" required :error="errors.target_date" />
        <HbInput v-model="form.monthly_contribution" label="پرداخت ماهانه (ریال)" type="number" dir="ltr" />
        <FinanceSelectSheet v-model="form.account" label="حساب پس‌انداز" :items="accountOptions" display-field="account_name" />
        <FinanceColorPicker v-model="form.color" label="رنگ" />
        <FinanceIconPicker v-model="form.icon" label="آیکون" />
        <HbInput v-model="form.description" label="توضیحات" type="textarea" />
        <HbButton block :loading="saving" @click="saveGoal">ایجاد هدف</HbButton>
      </div>
    </HbModal>

    <!-- FAB -->
    <HbFab @click="openCreate">
      <Plus :size="24" />
    </HbFab>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { formatJalaliDate, toPersianDigits, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbProgressRing from '@/components/ui/HbProgressRing.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbFab from '@/components/ui/HbFab.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceDatePicker from '@/components/finance/FinanceDatePicker.vue'
import FinanceColorPicker from '@/components/finance/FinanceColorPicker.vue'
import FinanceIconPicker from '@/components/finance/FinanceIconPicker.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import { Plus } from 'lucide-vue-next'

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const goals = ref([])
const showCreate = ref(false)
const saving = ref(false)
const accountOptions = ref([])
const moneyFormatter = new PersianNumberFormatter('fa-IR')

const form = reactive({
  goal_name: '',
  target_amount: '',
  current_amount: 0,
  target_date: '',
  monthly_contribution: '',
  account: '',
  color: '#F7D957',
  icon: '',
  description: '',
  status: 'فعال',
})

const errors = reactive({ goal_name: '', target_amount: '', target_date: '' })

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return formatJalaliDate(dateStr)
}

function getStatusVariant(status) {
  if (status === 'تکمیل‌شده') return 'active'
  if (status === 'متوقف‌شده') return 'default'
  return 'pastel'
}

function getStatusPastel(status) {
  if (status === 'تکمیل‌شده') return 'olive'
  if (status === 'متوقف‌شده') return 'pink'
  return 'yellow'
}

function openCreate() {
  form.goal_name = ''
  form.target_amount = ''
  form.current_amount = 0
  form.target_date = ''
  form.monthly_contribution = ''
  form.account = ''
  form.color = '#F7D957'
  form.icon = ''
  form.description = ''
  form.status = 'فعال'
  Object.keys(errors).forEach(k => errors[k] = '')
  showCreate.value = true
}

async function saveGoal() {
  Object.keys(errors).forEach(k => errors[k] = '')
  if (!form.goal_name) errors.goal_name = 'نام هدف الزامی است'
  if (!form.target_amount || parseFloat(form.target_amount) <= 0) errors.target_amount = 'مبلغ هدف باید بزرگتر از صفر باشد'
  if (Object.values(errors).some(e => e)) return

  saving.value = true
  try {
    const progress = form.target_amount > 0 ? (form.current_amount / parseFloat(form.target_amount)) * 100 : 0
    await api.createSavingsGoal({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
      progress: Math.min(progress, 100),
    })
    showCreate.value = false
    fetchGoals()
  } catch (e) {
    alert(e.message || 'خطا در ایجاد')
  } finally {
    saving.value = false
  }
}

async function fetchGoals() {
  loading.value = true
  error.value = null
  try {
    goals.value = await api.getSavingsGoals()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  fetchGoals()
  try {
    accountOptions.value = await api.getAccounts()
  } catch (e) { /* silent */ }
})
</script>
