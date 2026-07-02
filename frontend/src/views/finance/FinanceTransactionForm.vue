<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center gap-3">
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.back()">
          <ArrowRight :size="20" />
        </button>
        <h1 class="text-h1 font-display text-[var(--color-text)]">{{ isEdit ? 'ویرایش تراکنش' : 'تراکنش جدید' }}</h1>
      </div>
    </header>

    <!-- Loading (edit mode) -->
    <div v-if="loading" class="px-4 space-y-4">
      <HbSkeleton variant="card" height="60" class="rounded-xl" />
      <HbSkeleton variant="card" height="60" class="rounded-xl" />
      <HbSkeleton variant="card" height="60" class="rounded-xl" />
    </div>

    <!-- Form -->
    <form v-else class="px-4 space-y-4" @submit.prevent="submit">
      <!-- Transaction Type -->
      <div>
        <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
          نوع تراکنش <span class="text-[var(--color-error)]">*</span>
        </label>
        <div class="flex flex-wrap gap-2">
          <HbTag
            v-for="t in transactionTypes"
            :key="t"
            :variant="form.transaction_type === t ? 'active' : 'default'"
            selectable
            @click="onTypeChange(t)"
          >{{ t }}</HbTag>
        </div>
        <p v-if="errors.transaction_type" class="text-sm text-[var(--color-error)] mt-1">{{ errors.transaction_type }}</p>
      </div>

      <!-- Date -->
      <FinanceDatePicker
        v-model="form.transaction_date"
        label="تاریخ تراکنش"
        required
        :error="errors.transaction_date"
      />

      <!-- Amount -->
      <HbInput
        v-model="form.amount"
        label="مبلغ (ریال)"
        type="number"
        required
        :error="errors.amount"
        dir="ltr"
      />

      <!-- Account (From) -->
      <FinanceSelectSheet
        v-model="form.account"
        label="حساب مبدأ"
        required
        :items="accountOptions"
        display-field="account_name"
        :error="errors.account"
      />

      <!-- To Account (only for transfers) -->
      <FinanceSelectSheet
        v-if="form.transaction_type === 'انتقال'"
        v-model="form.to_account"
        label="حساب مقصد"
        required
        :items="accountOptions"
        display-field="account_name"
        :error="errors.to_account"
      />

      <!-- Category -->
      <FinanceSelectSheet
        v-model="form.category"
        label="دسته‌بندی"
        :items="categoryOptions"
        display-field="category_name"
      />

      <!-- Description -->
      <HbInput
        v-model="form.description"
        label="شرح"
        placeholder="مثلاً: خرید از سوپرمارکت"
      />

      <!-- Note -->
      <HbInput
        v-model="form.note"
        label="یادداشت"
        type="textarea"
        placeholder="توضیحات اضافی..."
      />

      <!-- Receipt -->
      <div>
        <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">رسید</label>
        <input type="file" accept="image/*,.pdf" class="w-full text-sm text-[var(--color-text)]" @change="onFileChange" />
      </div>

      <!-- Recurring -->
      <div class="flex items-center gap-3">
        <HbToggle v-model="form.is_recurring" />
        <span class="text-body text-[var(--color-text)]">تکراری</span>
      </div>

      <!-- Recurrence Rule (only when recurring) -->
      <FinanceSelectSheet
        v-if="form.is_recurring"
        v-model="form.recurrence_rule"
        label="قاعده تکرار"
        required
        :items="recurrenceOptions"
        display-field="title"
        :error="errors.recurrence_rule"
      />

      <!-- Linked Goal -->
      <FinanceSelectSheet
        v-model="form.linked_goal"
        label="هدف مرتبط"
        :items="goalOptions"
        display-field="goal_name"
      />

      <!-- Submit -->
      <HbButton block :loading="saving" type="submit">
        {{ isEdit ? 'ذخیره تغییرات' : 'ذخیره تراکنش' }}
      </HbButton>

      <!-- Delete (edit only) -->
      <HbButton v-if="isEdit" block variant="danger" :loading="deleting" @click="handleDelete">
        حذف تراکنش
      </HbButton>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceApi } from '@/composables/useFinanceApi'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbTag from '@/components/ui/HbTag.vue'
import HbToggle from '@/components/ui/HbToggle.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'
import FinanceDatePicker from '@/components/finance/FinanceDatePicker.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import { ArrowRight } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const api = useFinanceApi()

const isEdit = computed(() => !!route.params.name)
const loading = ref(isEdit.value)
const saving = ref(false)
const deleting = ref(false)

const transactionTypes = ['درآمد', 'هزینه', 'انتقال', 'پس‌انداز', 'پرداخت بدهی']

const form = reactive({
  transaction_type: 'هزینه',
  transaction_date: new Date().toISOString().split('T')[0],
  amount: '',
  account: '',
  to_account: '',
  category: '',
  description: '',
  note: '',
  is_recurring: false,
  recurrence_rule: '',
  linked_goal: '',
})

const errors = reactive({
  transaction_type: '',
  transaction_date: '',
  amount: '',
  account: '',
  to_account: '',
  recurrence_rule: '',
})

const accountOptions = ref([])
const categoryOptions = ref([])
const recurrenceOptions = ref([])
const goalOptions = ref([])

function onTypeChange(type) {
  form.transaction_type = type
  if (type !== 'انتقال') {
    form.to_account = ''
  }
}

function onFileChange(e) {
  form.receipt = e.target.files[0]
}

function validate() {
  let valid = true
  Object.keys(errors).forEach(k => errors[k] = '')

  if (!form.transaction_type) { errors.transaction_type = 'نوع تراکنش الزامی است'; valid = false }
  if (!form.transaction_date) { errors.transaction_date = 'تاریخ تراکنش الزامی است'; valid = false }
  if (!form.amount || parseFloat(form.amount) <= 0) { errors.amount = 'مبلغ باید بزرگتر از صفر باشد'; valid = false }
  if (!form.account) { errors.account = 'حساب مبدأ الزامی است'; valid = false }
  if (form.transaction_type === 'انتقال' && !form.to_account) { errors.to_account = 'برای انتقال، حساب مقصد الزامی است'; valid = false }
  if (form.transaction_type === 'انتقال' && form.account === form.to_account) { errors.to_account = 'حساب مبدأ و مقصد نمی‌توانند یکسان باشند'; valid = false }
  if (form.is_recurring && !form.recurrence_rule) { errors.recurrence_rule = 'قاعده تکرار الزامی است'; valid = false }

  return valid
}

async function submit() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      await api.updateTransaction(route.params.name, payload)
    } else {
      await api.createTransaction(payload)
    }
    router.back()
  } catch (e) {
    alert(e.message || 'خطا در ذخیره')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!confirm('آیا از حذف این تراکنش مطمئن هستید؟')) return
  deleting.value = true
  try {
    await api.deleteTransaction(route.params.name)
    router.back()
  } catch (e) {
    alert('خطا في حذف')
  } finally {
    deleting.value = false
  }
}

async function loadFormData() {
  try {
    const [accounts, categories, recurrences, goals] = await Promise.all([
      api.getAccounts(),
      api.getCategories(),
      api.getRecurrenceRules(),
      api.getSavingsGoals(),
    ])
    accountOptions.value = accounts
    categoryOptions.value = categories
    recurrenceOptions.value = recurrences
    goalOptions.value = goals
  } catch (e) {
    // silent
  }
}

async function loadTransaction() {
  if (!isEdit.value) return
  try {
    const tx = await api.getTransaction(route.params.name)
    form.transaction_type = tx.transaction_type
    form.transaction_date = tx.transaction_date
    form.amount = tx.amount
    form.account = tx.account
    form.to_account = tx.to_account || ''
    form.category = tx.category || ''
    form.description = tx.description || ''
    form.note = tx.note || ''
    form.is_recurring = !!tx.is_recurring
    form.recurrence_rule = tx.recurrence_rule || ''
    form.linked_goal = tx.linked_goal || ''
  } catch (e) {
    alert('خطا در دریافت تراکنش')
    router.back()
  }
}

onMounted(async () => {
  await loadFormData()
  await loadTransaction()
  loading.value = false

  // Pre-fill account from query param
  if (route.query.account) {
    form.account = route.query.account
  }
})
</script>
