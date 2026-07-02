<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">اشتراک‌ها</h1>
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="openCreate">
          <Plus :size="20" />
        </button>
      </div>
    </header>

    <!-- Monthly Summary -->
    <div v-if="!loading && subscriptions.length" class="px-4 mb-6">
      <HbCard variant="accent" accentColor="var(--color-ice-blue)" padding="p-4">
        <p class="text-sm text-[var(--color-text-secondary)]">هزینه ماهانه اشتراک‌ها</p>
        <p class="text-2xl font-display text-[var(--color-text)] mt-1">{{ formatMoney(monthlyTotal) }}</p>
      </HbCard>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-3">
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
      <HbSkeleton variant="card" height="100" class="rounded-2xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchSubscriptions" />

    <!-- Empty -->
    <HbEmptyState
      v-else-if="subscriptions.length === 0"
      icon="credit-card"
      title="اشتراکی ثبت نشده"
      description="اشتراک‌های خود را اضافه کنید تا هزینه‌های تکراری را پیگیری کنید"
      action-label="ایجاد اشتراک"
      @action="openCreate"
    />

    <!-- Subscription List -->
    <div v-else class="px-4 space-y-3">
      <HbCard
        v-for="sub in subscriptions"
        :key="sub.name"
        padding="p-4"
        interactive
        @click="openEdit(sub)"
      >
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ backgroundColor: sub.icon ? 'var(--color-surface-secondary)' : 'var(--color-ice-blue)' }">
            <component v-if="sub.icon" :is="getIcon(sub.icon)" :size="22" class="text-white" />
            <CreditCard v-else :size="22" class="text-white" />
          </div>
          <div class="flex-1">
            <p class="text-body font-bold text-[var(--color-text)]">{{ sub.subscription_name }}</p>
            <div class="flex items-center gap-2 mt-1">
              <HbTag variant="pastel" pastel="ice-blue">{{ sub.billing_cycle }}</HbTag>
              <HbTag :variant="sub.status === 'فعال' ? 'pastel' : 'default'" :pastel="sub.status === 'فعال' ? 'olive' : 'pink'">
                {{ sub.status }}
              </HbTag>
            </div>
          </div>
          <div class="text-end">
            <p class="text-body font-bold text-[var(--color-text)]">{{ formatMoney(sub.amount) }}</p>
            <div class="flex items-center gap-1 mt-1">
              <Clock :size="12" :class="getCountdownClass(sub)" />
              <span class="text-xs" :class="getCountdownClass(sub)">{{ getCountdown(sub) }}</span>
            </div>
          </div>
        </div>
        <div v-if="sub.account" class="mt-2 pt-2 border-t border-[var(--color-border)]">
          <span class="text-xs text-[var(--color-text-tertiary)]">حساب: {{ sub.account }}</span>
        </div>
      </HbCard>
    </div>

    <!-- Create/Edit Modal -->
    <HbModal v-model="showForm" :title="editing ? 'ویرایش اشتراک' : 'اشتراک جدید'">
      <div class="space-y-4">
        <HbInput v-model="form.subscription_name" label="نام اشتراک" required :error="errors.subscription_name" />
        <HbInput v-model="form.amount" label="مبلغ (ریال)" type="number" required :error="errors.amount" dir="ltr" />
        <div>
          <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">چرخه صورت‌حساب</label>
          <div class="flex flex-wrap gap-2">
            <HbTag
              v-for="cycle in billingCycles"
              :key="cycle"
              :variant="form.billing_cycle === cycle ? 'active' : 'default'"
              selectable
              @click="form.billing_cycle = cycle"
            >{{ cycle }}</HbTag>
          </div>
        </div>
        <FinanceDatePicker v-model="form.next_billing_date" label="تاریخ صورت‌حساب بعدی" required :error="errors.next_billing_date" />
        <FinanceSelectSheet v-model="form.category" label="دسته‌بندی" :items="categoryOptions" display-field="category_name" />
        <FinanceSelectSheet v-model="form.account" label="حساب" :items="accountOptions" display-field="account_name" />
        <FinanceColorPicker v-model="form.color" label="رنگ" />
        <FinanceIconPicker v-model="form.icon" label="آیکون" />
        <HbInput v-model="form.website" label="وب‌سایت" dir="ltr" placeholder="https://..." />
        <HbInput v-model="form.notes" label="توضیحات" type="textarea" />
        <HbButton block :loading="saving" @click="saveSub">{{ editing ? 'ذخیره' : 'ایجاد' }}</HbButton>
        <HbButton v-if="editing" block variant="danger" @click="handleDelete">حذف اشتراک</HbButton>
      </div>
    </HbModal>

    <!-- FAB -->
    <HbFab @click="openCreate">
      <Plus :size="24" />
    </HbFab>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useFinanceApi } from '@/composables/useFinanceApi'
import { formatJalaliDate, PersianNumberFormatter } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbFab from '@/components/ui/HbFab.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceDatePicker from '@/components/finance/FinanceDatePicker.vue'
import FinanceColorPicker from '@/components/finance/FinanceColorPicker.vue'
import FinanceIconPicker from '@/components/finance/FinanceIconPicker.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import { Plus, CreditCard, Clock } from 'lucide-vue-next'
import * as icons from 'lucide-vue-next'

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const subscriptions = ref([])
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)

const billingCycles = ['هفتگی', 'ماهانه', 'سالانه', 'سفارشی']

const accountOptions = ref([])
const categoryOptions = ref([])
const moneyFormatter = new PersianNumberFormatter('fa-IR')

const form = reactive({
  subscription_name: '',
  amount: '',
  billing_cycle: 'ماهانه',
  next_billing_date: '',
  category: '',
  account: '',
  status: 'فعال',
  notes: '',
  website: '',
  icon: '',
  color: '',
})
const errors = reactive({ subscription_name: '', amount: '', next_billing_date: '' })

const monthlyTotal = computed(() => {
  return subscriptions.value
    .filter(s => s.status === 'فعال')
    .reduce((sum, s) => {
      const amount = s.amount || 0
      if (s.billing_cycle === 'ماهانه') return sum + amount
      if (s.billing_cycle === 'هفتگی') return sum + amount * 4
      if (s.billing_cycle === 'سالانه') return sum + amount / 12
      return sum + amount
    }, 0)
})

function formatMoney(amount) {
  return moneyFormatter.format(amount || 0)
}

function getCountdown(sub) {
  if (!sub.next_billing_date) return ''
  const due = new Date(sub.next_billing_date)
  const today = new Date()
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'امروز'
  if (diff === 1) return 'فردا'
  return `${diff} روز`
}

function getCountdownClass(sub) {
  if (!sub.next_billing_date) return 'text-[var(--color-text-tertiary)]'
  const due = new Date(sub.next_billing_date)
  const today = new Date()
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'text-[var(--color-error)]'
  if (diff <= 3) return 'text-[var(--color-error)]'
  if (diff <= 7) return 'text-[var(--color-yellow)]'
  return 'text-[var(--color-text-tertiary)]'
}

function getIcon(iconName) {
  if (!iconName) return CreditCard
  return icons[iconName] || CreditCard
}

function openCreate() {
  editing.value = null
  Object.keys(form).forEach(k => form[k] = typeof form[k] === 'boolean' ? false : '')
  form.status = 'فعال'
  form.billing_cycle = 'ماهانه'
  Object.keys(errors).forEach(k => errors[k] = '')
  showForm.value = true
}

function openEdit(sub) {
  editing.value = sub
  Object.keys(form).forEach(k => form[k] = sub[k] || '')
  showForm.value = true
}

async function saveSub() {
  Object.keys(errors).forEach(k => errors[k] = '')
  if (!form.subscription_name) errors.subscription_name = 'نام اشتراک الزامی است'
  if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'مبلغ باید بزرگتر از صفر باشد'
  if (!form.next_billing_date) errors.next_billing_date = 'تاریخ صورت‌حساب الزامی است'
  if (Object.values(errors).some(e => e)) return

  saving.value = true
  try {
    const payload = { ...form, amount: parseFloat(form.amount) }
    if (editing.value) {
      await api.updateSubscription(editing.value.name, payload)
    } else {
      await api.createSubscription(payload)
    }
    showForm.value = false
    fetchSubscriptions()
  } catch (e) {
    alert(e.message || 'خطا در ذخیره')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!editing.value) return
  if (!confirm('آیا از حذف این اشتراک مطمئن هستید؟')) return
  try {
    await api.deleteSubscription(editing.value.name)
    showForm.value = false
    fetchSubscriptions()
  } catch (e) {
    alert('خطا در حذف')
  }
}

async function fetchSubscriptions() {
  loading.value = true
  error.value = null
  try {
    subscriptions.value = await api.getSubscriptions()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  fetchSubscriptions()
  try {
    const [accounts, cats] = await Promise.all([
      api.getAccounts(),
      api.getCategories(),
    ])
    accountOptions.value = accounts
    categoryOptions.value = cats
  } catch (e) { /* silent */ }
})
</script>
