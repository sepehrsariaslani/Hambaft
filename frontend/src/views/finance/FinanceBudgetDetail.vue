<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.back()">
            <ArrowRight :size="20" />
          </button>
          <h1 class="text-h1 font-display text-[var(--color-text)]">{{ isEdit ? 'ویرایش بودجه' : 'بودجه جدید' }}</h1>
        </div>
        <button v-if="isEdit" class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="showMenu = !showMenu">
          <MoreVertical :size="20" />
        </button>
      </div>
    </header>

    <!-- More Menu -->
    <div v-if="showMenu" class="px-4 mb-4">
      <HbCard padding="p-2">
        <button class="w-full text-right px-4 py-3 rounded-lg hover:bg-[var(--color-surface-secondary)] text-body text-[var(--color-error)]" @click="handleDelete">
          حذف بودجه
        </button>
      </HbCard>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="px-4 space-y-4">
      <HbSkeleton variant="card" height="60" class="rounded-xl" />
      <HbSkeleton variant="card" height="60" class="rounded-xl" />
    </div>

    <!-- Form -->
    <form v-else class="px-4 space-y-4" @submit.prevent="submit">
      <HbInput v-model="form.budget_title" label="عنوان بودجه" required :error="errors.budget_title" />

      <div class="grid grid-cols-2 gap-3">
        <HbInput v-model="form.jalali_year" label="سال (شمسی)" type="number" required :error="errors.jalali_year" dir="ltr" />
        <div>
          <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">ماه</label>
          <select v-model="form.jalali_month" class="w-full h-12 px-3 rounded-xl border-[1.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
            <option v-for="(m, i) in MONTH_NAMES" :key="i" :value="i + 1">{{ m }}</option>
          </select>
        </div>
      </div>

      <FinanceDatePicker v-model="form.start_date" label="تاریخ شروع" required :error="errors.start_date" />
      <FinanceDatePicker v-model="form.end_date" label="تاریخ پایان" required :error="errors.end_date" />

      <!-- Income/Expense Plan -->
      <HbCard variant="flat" padding="p-4">
        <p class="text-sm font-medium text-[var(--color-text-secondary)] mb-3">برنامه درآمد و هزینه</p>
        <div class="space-y-3">
          <HbInput v-model="form.total_income_plan" label="برنامه درآمد (ریال)" type="number" dir="ltr" />
          <HbInput v-model="form.total_expense_plan" label="برنامه هزینه (ریال)" type="number" dir="ltr" />
          <HbInput v-model="form.total_saving_plan" label="برنامه پس‌انداز (ریال)" type="number" dir="ltr" />
        </div>
      </HbCard>

      <!-- Budget Categories -->
      <HbCard padding="p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-[var(--color-text-secondary)]">دسته‌بندی‌های بودجه</p>
          <button type="button" class="text-sm text-[var(--color-pink)] font-medium" @click="showCategoryPicker = true">
            + افزودن دسته‌بندی
          </button>
        </div>

        <div v-if="form.categories.length === 0" class="text-center py-4 text-[var(--color-text-tertiary)] text-sm">
          دسته‌بندی‌ای اضافه نشده
        </div>

        <div v-for="(cat, idx) in form.categories" :key="idx" class="mb-3 pb-3 border-b border-[var(--color-border)] last:border-0">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full" :style="{ backgroundColor: getCategoryColor(cat.category) }" />
              <span class="text-body text-[var(--color-text)]">{{ getCategoryName(cat.category) }}</span>
            </div>
            <button type="button" class="text-[var(--color-error)]" @click="removeCategory(idx)">
              <X :size="16" />
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <HbInput v-model="cat.planned_amount" label="برنامه" type="number" dir="ltr" />
            <HbInput v-model="cat.actual_amount" label="واقعی" type="number" dir="ltr" />
          </div>
          <div class="mt-2">
            <FinanceProgressBar
              :progress="cat.planned_amount > 0 ? (cat.actual_amount / cat.planned_amount) * 100 : 0"
              :warning-threshold="cat.warning_threshold || 70"
              :danger-threshold="cat.warning_threshold || 80"
            />
          </div>
        </div>
      </HbCard>

      <HbInput v-model="form.notes" label="یادداشت‌ها" type="textarea" />

      <HbButton block :loading="saving" type="submit">
        {{ isEdit ? 'ذخیره تغییرات' : 'ایجاد بودجه' }}
      </HbButton>
    </form>

    <!-- Category Picker -->
    <HbModal v-model="showCategoryPicker" title="افزودن دسته‌بندی">
      <div class="max-h-64 overflow-y-auto space-y-1">
        <button
          v-for="cat in availableCategories"
          :key="cat.name"
          class="w-full h-12 px-3 rounded-lg flex items-center gap-3 transition-all active:scale-[0.98] bg-[var(--color-surface-secondary)] text-[var(--color-text)] mb-1"
          @click="addCategory(cat)"
        >
          <div class="w-6 h-6 rounded-full" :style="{ backgroundColor: cat.color || 'var(--color-purple)' }" />
          <span>{{ cat.category_name }}</span>
        </button>
      </div>
    </HbModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceApi } from '@/composables/useFinanceApi'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbCard from '@/components/ui/HbCard.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import HbModal from '@/components/ui/HbModal.vue'
import FinanceDatePicker from '@/components/finance/FinanceDatePicker.vue'
import FinanceProgressBar from '@/components/finance/FinanceProgressBar.vue'
import { ArrowRight, MoreVertical, X } from 'lucide-vue-next'

const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

const route = useRoute()
const router = useRouter()
const api = useFinanceApi()

const isEdit = computed(() => !!route.params.name)
const loading = ref(isEdit.value)
const saving = ref(false)
const showMenu = ref(false)
const showCategoryPicker = ref(false)

const currentYear = new Date().getFullYear()
const jalaliYear = currentYear - 621

const form = reactive({
  budget_title: '',
  jalali_year: jalaliYear,
  jalali_month: new Date().getMonth() + 1,
  start_date: '',
  end_date: '',
  total_income_plan: '',
  total_expense_plan: '',
  total_saving_plan: '',
  categories: [],
  notes: '',
  status: 'فعال',
})

const errors = reactive({ budget_title: '', jalali_year: '', start_date: '', end_date: '' })

const categoryOptions = ref([])

const availableCategories = computed(() => {
  const used = form.categories.map(c => c.category)
  return categoryOptions.value.filter(c => !used.includes(c.name))
})

function getCategoryName(name) {
  const cat = categoryOptions.value.find(c => c.name === name)
  return cat ? cat.category_name : name
}

function getCategoryColor(name) {
  const cat = categoryOptions.value.find(c => c.name === name)
  return cat ? cat.color : 'var(--color-purple)'
}

function addCategory(cat) {
  form.categories.push({
    category: cat.name,
    planned_amount: 0,
    actual_amount: 0,
    remaining_amount: 0,
    percentage_used: 0,
    warning_threshold: 80,
  })
  showCategoryPicker.value = false
}

function removeCategory(idx) {
  form.categories.splice(idx, 1)
}

function validate() {
  let valid = true
  Object.keys(errors).forEach(k => errors[k] = '')
  if (!form.budget_title) { errors.budget_title = 'عنوان بودجه الزامی است'; valid = false }
  if (!form.jalali_year) { errors.jalali_year = 'سال الزامی است'; valid = false }
  if (!form.start_date) { errors.start_date = 'تاریخ شروع الزامی است'; valid = false }
  if (!form.end_date) { errors.end_date = 'تاریخ پایان الزامی است'; valid = false }
  return valid
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = {
      ...form,

      total_income_plan: parseFloat(form.total_income_plan) || 0,
      total_expense_plan: parseFloat(form.total_expense_plan) || 0,
      total_saving_plan: parseFloat(form.total_saving_plan) || 0,
      categories: form.categories.map(c => ({
        category: c.category,
        planned_amount: parseFloat(c.planned_amount) || 0,
        actual_amount: parseFloat(c.actual_amount) || 0,
        warning_threshold: c.warning_threshold || 80,
      })),
    }
    if (isEdit.value) {
      await api.updateBudget(route.params.name, payload)
    } else {
      await api.createBudget(payload)
    }
    router.back()
  } catch (e) {
    alert(e.message || 'خطا در ذخیره')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!confirm('آیا از حذف این بودجه مطمئن هستید؟')) return
  try {
    await api.deleteBudget(route.params.name)
    router.push('/finance/budgets')
  } catch (e) {
    alert('خطا در حذف')
  }
}

async function loadBudget() {
  if (!isEdit.value) return
  try {
    const budget = await api.getBudget(route.params.name)
    form.budget_title = budget.budget_title
    form.jalali_year = budget.jalali_year
    form.jalali_month = parseInt(budget.jalali_month)
    form.start_date = budget.start_date
    form.end_date = budget.end_date
    form.total_income_plan = budget.total_income_plan
    form.total_expense_plan = budget.total_expense_plan
    form.total_saving_plan = budget.total_saving_plan
    form.status = budget.status
    form.notes = budget.notes || ''
    form.categories = (budget.categories || []).map(c => ({
      category: c.category,
      planned_amount: c.planned_amount,
      actual_amount: c.actual_amount,
      remaining_amount: c.remaining_amount,
      percentage_used: c.percentage_used,
      warning_threshold: c.warning_threshold || 80,
    }))
  } catch (e) {
    alert('خطا در دریافت بودجه')
    router.back()
  }
}

onMounted(async () => {
  try {
    categoryOptions.value = await api.getCategories()
  } catch (e) { /* silent */ }
  await loadBudget()
  loading.value = false
})
</script>
