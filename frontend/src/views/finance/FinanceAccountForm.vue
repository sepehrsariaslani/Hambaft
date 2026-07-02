<template>
  <div class="page pb-24">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4">
      <div class="flex items-center gap-3">
        <button class="w-10 h-10 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center" @click="$router.back()">
          <ArrowRight :size="20" />
        </button>
        <h1 class="text-h1 font-display text-[var(--color-text)]">{{ isEdit ? 'ویرایش حساب' : 'حساب جدید' }}</h1>
      </div>
    </header>

    <!-- Form -->
    <form class="px-4 space-y-4" @submit.prevent="submit">
      <HbInput v-model="form.account_name" label="نام حساب" required :error="errors.account_name" />

      <div>
        <label class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">نوع حساب</label>
        <div class="flex flex-wrap gap-2">
          <HbTag
            v-for="t in accountTypes"
            :key="t"
            :variant="form.account_type === t ? 'active' : 'default'"
            selectable
            @click="form.account_type = t"
          >{{ t }}</HbTag>
        </div>
        <p v-if="errors.account_type" class="text-sm text-[var(--color-error)] mt-1">{{ errors.account_type }}</p>
      </div>

      <FinanceSelectSheet
        v-model="form.currency"
        label="واحد پول"
        required
        :items="currencyOptions"
        display-field="name"
        :error="errors.currency"
      />

      <HbInput v-model="form.opening_balance" label="موجودی اولیه (ریال)" type="number" dir="ltr" />

      <template v-if="form.account_type === 'بانک'">
        <HbInput v-model="form.bank_name" label="نام بانک" />
        <HbInput v-model="form.account_number" label="شماره حساب" dir="ltr" />
      </template>

      <FinanceColorPicker v-model="form.color" label="رنگ" />
      <FinanceIconPicker v-model="form.icon" label="آیکون" />

      <HbInput v-model="form.description" label="توضیحات" type="textarea" />

      <div class="flex items-center gap-3">
        <HbToggle v-model="form.is_active" />
        <span class="text-body text-[var(--color-text)]">فعال</span>
      </div>

      <HbButton block :loading="saving" type="submit">
        {{ isEdit ? 'ذخیره تغییرات' : 'ایجاد حساب' }}
      </HbButton>

      <HbButton v-if="isEdit" block variant="danger" :loading="deleting" @click="handleDelete">
        حذف حساب
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
import FinanceColorPicker from '@/components/finance/FinanceColorPicker.vue'
import FinanceIconPicker from '@/components/finance/FinanceIconPicker.vue'
import FinanceSelectSheet from '@/components/finance/FinanceSelectSheet.vue'
import { ArrowRight } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const api = useFinanceApi()

const isEdit = computed(() => !!route.params.name)
const saving = ref(false)
const deleting = ref(false)

const accountTypes = ['نقدی', 'بانک', 'کارت', 'پس‌انداز', 'سرمایه‌گذاری', 'بدهی', 'کیف پول', 'سایر']

const form = reactive({
  account_name: '',
  account_type: 'بانک',
  currency: '',
  opening_balance: 0,
  bank_name: '',
  account_number: '',
  color: '',
  icon: '',
  description: '',
  is_active: 1,
})

const errors = reactive({ account_name: '', account_type: '', currency: '' })
const currencyOptions = ref([])

async function submit() {
  Object.keys(errors).forEach(k => errors[k] = '')
  if (!form.account_name) errors.account_name = 'نام حساب الزامی است'
  if (!form.account_type) errors.account_type = 'نوع حساب الزامی است'
  if (!form.currency) errors.currency = 'واحد پول الزامی است'
  if (Object.values(errors).some(e => e)) return

  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      await api.updateAccount(route.params.name, payload)
    } else {
      await api.createAccount(payload)
    }
    router.push('/finance/accounts')
  } catch (e) {
    alert(e.message || 'خطا در ذخیره')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!confirm('آیا از حذف این حساب مطمئن هستید؟')) return
  deleting.value = true
  try {
    await api.deleteAccount(route.params.name)
    router.push('/finance/accounts')
  } catch (e) {
    alert('خطا در حذف')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  try {
    currencyOptions.value = await api.getCurrencies()
  } catch (e) { /* silent */ }

  if (isEdit.value) {
    try {
      const account = await api.getAccount(route.params.name)
      form.account_name = account.account_name
      form.account_type = account.account_type
      form.currency = account.currency
      form.opening_balance = account.opening_balance || 0
      form.bank_name = account.bank_name || ''
      form.account_number = account.account_number || ''
      form.color = account.color || ''
      form.icon = account.icon || ''
      form.description = account.description || ''
      form.is_active = account.is_active
    } catch (e) {
      alert('خطا در دریافت حساب')
      router.back()
    }
  }
})
</script>
