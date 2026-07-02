<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <h1 class="text-h1 font-display text-[var(--color-text)]">قبض‌ها</h1>
        <div class="flex items-center gap-2">
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="viewMode = viewMode === 'list' ? 'calendar' : 'list'">
            <Calendar :size="20" />
          </button>
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showSearch = !showSearch">
            <Search :size="20" />
          </button>
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="openCreate">
            <Plus :size="20" />
          </button>
        </div>
      </div>
    </header>

    <!-- Search -->
    <div v-if="showSearch" class="px-4 mb-4">
      <HbInput v-model="searchQuery" placeholder="جستجوی قبض..." />
    </div>

    <!-- Filter Chips -->
    <div class="px-4 mb-4">
      <div class="flex gap-2 overflow-x-auto">
        <HbTag :variant="statusFilter === 'all' ? 'active' : 'default'" selectable @click="statusFilter = 'all'">همه</HbTag>
        <HbTag :variant="statusFilter === 'پیش‌رو' ? 'active' : 'default'" selectable @click="statusFilter = 'پیش‌رو'">پیش‌رو</HbTag>
        <HbTag :variant="statusFilter === 'عقب‌افتاده' ? 'active' : 'default'" selectable @click="statusFilter = 'عقب‌افتاده'">عقب‌افتاده</HbTag>
        <HbTag :variant="statusFilter === 'پرداخت‌شده' ? 'active' : 'default'" selectable @click="statusFilter = 'پرداخت‌شده'">پرداخت‌شده</HbTag>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-2">
      <HbSkeleton variant="card" height="72" class="rounded-xl" />
      <HbSkeleton variant="card" height="72" class="rounded-xl" />
      <HbSkeleton variant="card" height="72" class="rounded-xl" />
    </div>

    <!-- Error -->
    <FinanceErrorState v-else-if="error" @retry="fetchBills" />

    <!-- Empty -->
    <HbEmptyState
      v-else-if="filteredBills.length === 0"
      icon="receipt"
      title="قبضی ثبت نشده"
      description="قبض‌های خود را اضافه کنید تا سررسیدها را فراموش نکنید"
      action-label="ایجاد قبض"
      @action="openCreate"
    />

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="px-4">
      <!-- Overdue Section -->
      <div v-if="overdueBills.length" class="mb-4">
        <h3 class="text-sm font-bold text-[var(--color-error)] mb-2">عقب‌افتاده</h3>
        <div class="space-y-2">
          <FinanceBillRow
            v-for="bill in overdueBills"
            :key="bill.name"
            :bill="bill"
            @pay="openPaySheet(bill)"
            @edit="openEdit(bill)"
          />
        </div>
      </div>

      <!-- Upcoming Section -->
      <div v-if="upcomingBills.length" class="mb-4">
        <h3 class="text-sm font-bold text-[var(--color-text)] mb-2">پیش‌رو</h3>
        <div class="space-y-2">
          <FinanceBillRow
            v-for="bill in upcomingBills"
            :key="bill.name"
            :bill="bill"
            @pay="openPaySheet(bill)"
            @edit="openEdit(bill)"
          />
        </div>
      </div>

      <!-- Paid Section -->
      <div v-if="paidBills.length" class="mb-4">
        <h3 class="text-sm font-bold text-[var(--color-text-tertiary)] mb-2">پرداخت‌شده</h3>
        <div class="space-y-2">
          <FinanceBillRow
            v-for="bill in paidBills"
            :key="bill.name"
            :bill="bill"
            @pay="openPaySheet(bill)"
            @edit="openEdit(bill)"
          />
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <FinanceBillCalendar v-else :bills="filteredBills" @select="openPaySheet" />

    <!-- Pay Sheet -->
    <HbModal v-model="showPaySheet" title="پرداخت قبض">
      <div class="space-y-4">
        <HbInput v-model="payAmount" label="مبلغ (ریال)" type="number" required dir="ltr" />
        <FinanceSelectSheet v-model="payAccount" label="حساب" :items="accountOptions" display-field="account_name" />
        <HbButton block :loading="paying" @click="confirmPay">پرداخت</HbButton>
      </div>
    </HbModal>

    <!-- Create/Edit Modal -->
    <HbModal v-model="showForm" :title="editing ? 'ویرایش قبض' : 'قبض جدید'">
      <div class="space-y-4">
        <HbInput v-model="form.bill_name" label="نام قبض" required :error="errors.bill_name" />
        <HbInput v-model="form.amount" label="مبلغ (ریال)" type="number" required :error="errors.amount" dir="ltr" />
        <FinanceDatePicker v-model="form.due_date" label="سررسید" required :error="errors.due_date" />
        <FinanceSelectSheet v-model="form.category" label="دسته‌بندی" :items="categoryOptions" display-field="category_name" />
        <FinanceSelectSheet v-model="form.account" label="حساب" :items="accountOptions" display-field="account_name" />
        <div class="flex items-center gap-3">
          <HbToggle v-model="form.is_recurring" />
          <span class="text-body text-[var(--color-text)]">تکراری</span>
        </div>
        <FinanceSelectSheet v-if="form.is_recurring" v-model="form.recurrence_rule" label="قاعده تکرار" :items="recurrenceOptions" display-field="title" />
        <HbInput v-model="form.reminder_days_before" label="یادآوری (روز قبل)" type="number" dir="ltr" />
        <HbInput v-model="form.description" label="توضیحات" type="textarea" />
        <HbButton block :loading="saving" @click="saveBill">{{ editing ? 'ذخیره' : 'ایجاد' }}</HbButton>
        <HbButton v-if="editing" block variant="danger" @click="handleDelete">حذف قبض</HbButton>
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
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbToggle from '@/components/ui/HbToggle.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbFab from '@/components/ui/HbFab.vue'
import HbEmptyState from '@/components/ui/HbEmptyState.vue'
import FinanceErrorState from '@/components/finance/FinanceErrorState.vue'
import FinanceDatePicker from '@/components/finance/FinanceDatePicker.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import FinanceBillRow from '@/components/finance/FinanceBillRow.vue'
import FinanceBillCalendar from '@/components/finance/FinanceBillCalendar.vue'
import { Calendar, Search, Plus } from 'lucide-vue-next'

const api = useFinanceApi()
const loading = ref(true)
const error = ref(null)
const bills = ref([])
const statusFilter = ref('all')
const viewMode = ref('list')
const showSearch = ref(false)
const searchQuery = ref('')
const showPaySheet = ref(false)
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const paying = ref(false)
const payAmount = ref('')
const payAccount = ref('')
const payingBill = ref(null)

const accountOptions = ref([])
const categoryOptions = ref([])
const recurrenceOptions = ref([])

const form = reactive({
  bill_name: '',
  amount: '',
  due_date: '',
  category: '',
  account: '',
  is_recurring: false,
  recurrence_rule: '',
  reminder_days_before: 3,
  description: '',
  status: 'پیش‌رو',
})
const errors = reactive({ bill_name: '', amount: '', due_date: '' })

const filteredBills = computed(() => {
  let result = bills.value
  if (statusFilter.value !== 'all') {
    result = result.filter(b => b.status === statusFilter.value)
  }
  if (searchQuery.value) {
    const term = searchQuery.value.toLowerCase()
    result = result.filter(b => b.bill_name.toLowerCase().includes(term))
  }
  return result
})

const overdueBills = computed(() => filteredBills.value.filter(b => b.status === 'عقب‌افتاده'))
const upcomingBills = computed(() => filteredBills.value.filter(b => b.status === 'پیش‌رو'))
const paidBills = computed(() => filteredBills.value.filter(b => b.status === 'پرداخت‌شده'))

function openCreate() {
  editing.value = null
  Object.keys(form).forEach(k => form[k] = typeof form[k] === 'boolean' ? false : '')
  form.status = 'پیش‌رو'
  form.reminder_days_before = 3
  Object.keys(errors).forEach(k => errors[k] = '')
  showForm.value = true
}

function openEdit(bill) {
  editing.value = bill
  form.bill_name = bill.bill_name
  form.amount = bill.amount
  form.due_date = bill.due_date
  form.category = bill.category || ''
  form.account = bill.account || ''
  form.is_recurring = !!bill.is_recurring
  form.recurrence_rule = bill.recurrence_rule || ''
  form.reminder_days_before = bill.reminder_days_before || 3
  form.description = bill.description || ''
  form.status = bill.status
  showForm.value = true
}

function openPaySheet(bill) {
  payingBill.value = bill
  payAmount.value = bill.amount
  payAccount.value = bill.account || ''
  showPaySheet.value = true
}

async function confirmPay() {
  if (!payAmount.value) return
  paying.value = true
  try {
    await api.markBillPaid(payingBill.value.name, parseFloat(payAmount.value))
    showPaySheet.value = false
    fetchBills()
  } catch (e) {
    alert('خطا در پرداخت')
  } finally {
    paying.value = false
  }
}

async function saveBill() {
  Object.keys(errors).forEach(k => errors[k] = '')
  if (!form.bill_name) errors.bill_name = 'نام قبض الزامی است'
  if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'مبلغ باید بزرگتر از صفر باشد'
  if (!form.due_date) errors.due_date = 'سررسید الزامی است'
  if (Object.values(errors).some(e => e)) return

  saving.value = true
  try {
    const payload = { ...form, amount: parseFloat(form.amount) }
    if (editing.value) {
      await api.updateBill(editing.value.name, payload)
    } else {
      await api.createBill(payload)
    }
    showForm.value = false
    fetchBills()
  } catch (e) {
    alert(e.message || 'خطا در ذخیره')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!editing.value) return
  if (!confirm('آیا از حذف این قبض مطمئن هستید؟')) return
  try {
    await api.deleteBill(editing.value.name)
    showForm.value = false
    fetchBills()
  } catch (e) {
    alert('خطا در حذف')
  }
}

async function fetchBills() {
  loading.value = true
  error.value = null
  try {
    bills.value = await api.getBills()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  fetchBills()
  try {
    const [accounts, cats, recs] = await Promise.all([
      api.getAccounts(),
      api.getCategories(),
      api.getRecurrenceRules(),
    ])
    accountOptions.value = accounts
    categoryOptions.value = cats
    recurrenceOptions.value = recs
  } catch (e) { /* silent */ }
})
</script>
