<template>
  <div class="page pb-24" dir="rtl">
    <!-- Header -->
    <header class="px-4 pt-6 pb-4 flex items-center gap-3">
      <button
        class="w-[44px] h-[44px] flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--color-text-secondary)]"
        aria-label="بازگشت"
        @click="goBack"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      <h1 class="text-[28px] font-display text-[var(--color-text)]">امنیت</h1>
    </header>

    <!-- Password Change Section -->
    <div class="px-4">
      <p class="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2 mt-4">تغییر رمز عبور</p>

      <form @submit.prevent="handleChangePassword">
        <!-- Current Password -->
        <div class="mb-4">
          <label class="block text-[var(--text-sm)] font-medium text-[var(--color-text)] mb-1.5">
            رمز عبور فعلی
          </label>
          <div class="relative">
            <input
              :type="showCurrent ? 'text' : 'password'"
              v-model="currentPassword"
              autocomplete="current-password"
              placeholder="رمز عبور فعلی خود را وارد کنید"
              class="w-full h-12 ps-4 pe-12 border-[1.5px] rounded-[12px] bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-200 focus:outline-none placeholder:text-[var(--color-text-tertiary)] text-left"
              dir="ltr"
              :class="errors.current ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'"
              :aria-describedby="errors.current ? 'current-error' : undefined"
              @blur="validateField('current')"
            />
            <button
              type="button"
              class="absolute end-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none cursor-pointer text-[var(--color-text-tertiary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
              :aria-label="showCurrent ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'"
              :aria-pressed="showCurrent.toString()"
              @click="showCurrent = !showCurrent"
            >
              <svg v-if="!showCurrent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <p v-if="errors.current" id="current-error" class="text-[14px] text-[var(--color-error)] mt-1" role="alert">{{ errors.current }}</p>
        </div>

        <!-- New Password -->
        <div class="mb-1">
          <label class="block text-[var(--text-sm)] font-medium text-[var(--color-text)] mb-1.5">
            رمز عبور جدید
          </label>
          <div class="relative">
            <input
              :type="showNew ? 'text' : 'password'"
              v-model="newPassword"
              autocomplete="new-password"
              placeholder="رمز عبور جدید خود را وارد کنید"
              class="w-full h-12 ps-4 pe-12 border-[1.5px] rounded-[12px] bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-200 focus:outline-none placeholder:text-[var(--color-text-tertiary)] text-left"
              dir="ltr"
              :class="errors.new ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'"
              :aria-describedby="errors.new ? 'new-error' : undefined"
              @blur="validateField('new')"
            />
            <button
              type="button"
              class="absolute end-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none cursor-pointer text-[var(--color-text-tertiary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
              :aria-label="showNew ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'"
              :aria-pressed="showNew.toString()"
              @click="showNew = !showNew"
            >
              <svg v-if="!showNew" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <p v-if="errors.new" id="new-error" class="text-[14px] text-[var(--color-error)] mt-1" role="alert">{{ errors.new }}</p>
          <p v-if="!errors.new" class="text-[12px] text-[var(--color-text-tertiary)] mt-1">رمز عبور باید حداقل ۶ کاراکتر باشد</p>
        </div>

        <!-- Confirm New Password -->
        <div class="mb-6 mt-4">
          <label class="block text-[var(--text-sm)] font-medium text-[var(--color-text)] mb-1.5">
            تأیید رمز عبور جدید
          </label>
          <div class="relative">
            <input
              :type="showConfirm ? 'text' : 'password'"
              v-model="confirmPassword"
              autocomplete="new-password"
              placeholder="رمز عبور جدید را دوباره وارد کنید"
              class="w-full h-12 ps-4 pe-12 border-[1.5px] rounded-[12px] bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-200 focus:outline-none placeholder:text-[var(--color-text-tertiary)] text-left"
              dir="ltr"
              :class="errors.confirm ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'"
              :aria-describedby="errors.confirm ? 'confirm-error' : undefined"
              @blur="validateField('confirm')"
            />
            <button
              type="button"
              class="absolute end-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none cursor-pointer text-[var(--color-text-tertiary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
              :aria-label="showConfirm ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'"
              :aria-pressed="showConfirm.toString()"
              @click="showConfirm = !showConfirm"
            >
              <svg v-if="!showConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <p v-if="errors.confirm" id="confirm-error" class="text-[14px] text-[var(--color-error)] mt-1" role="alert">{{ errors.confirm }}</p>
        </div>

        <!-- API Error -->
        <div
          v-if="apiError"
          class="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-error)] flex items-start gap-2"
          role="alert"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--color-error)] shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span class="text-[14px] text-[var(--color-error)]">{{ apiError }}</span>
        </div>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-success-light)] border border-[var(--color-success)] flex items-start gap-2"
          role="status"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--color-success)] shrink-0 mt-0.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span class="text-[14px] text-[var(--color-success)]">{{ successMessage }}</span>
        </div>

        <!-- Change Password Button -->
        <button
          type="submit"
          class="w-full h-12 rounded-[12px] border-none bg-[var(--color-black)] text-white text-[var(--text-base)] font-bold cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
          :disabled="loading || !isFormValid"
          :aria-disabled="(loading || !isFormValid).toString()"
        >
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span v-else>تغییر رمز عبور</span>
        </button>
      </form>
    </div>

    <!-- Separator -->
    <div class="px-4 my-8">
      <div class="h-px bg-[var(--color-border)]"></div>
    </div>

    <!-- Logout Button -->
    <div class="px-4">
      <button
        class="w-full h-12 rounded-[12px] border-none bg-[var(--color-error)] text-white text-[var(--text-base)] font-bold cursor-pointer transition-all duration-200 active:scale-[0.97]"
        @click="showLogoutDialog = true"
      >
        خروج از حساب
      </button>
    </div>

    <!-- Logout Confirmation Dialog -->
    <Teleport to="body">
      <div
        v-if="showLogoutDialog"
        class="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center p-4 transition-opacity duration-200"
        :class="showLogoutDialog ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        style="background-color: rgba(0, 0, 0, 0.4)"
        @click.self="showLogoutDialog = false"
      >
        <div
          class="bg-[var(--color-surface)] rounded-[24px] p-6 w-full max-w-[320px] shadow-[var(--shadow-lg)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-logout-title"
        >
          <h3 id="security-logout-title" class="text-[18px] font-bold text-[var(--color-text)] text-center">
            خروج از حساب کاربری؟
          </h3>
          <p class="text-[14px] text-[var(--color-text-secondary)] text-center mt-2">
            آیا مطمئنید که می‌خواهید از حساب کاربری خود خارج شوید؟
          </p>
          <div class="flex gap-3 mt-6">
            <button
              class="flex-1 h-12 rounded-[var(--radius-full)] border-[1.5px] border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] text-[var(--text-base)] font-bold cursor-pointer active:bg-[var(--color-surface-secondary)]"
              @click="showLogoutDialog = false"
            >
              انصراف
            </button>
            <button
              class="flex-1 h-12 rounded-[var(--radius-full)] border-none bg-[var(--color-error)] text-white text-[var(--text-base)] font-bold cursor-pointer active:scale-[0.97]"
              @click="confirmLogout"
            >
              خروج
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { call } from '@/utils/frappe'

const router = useRouter()
const auth = useAuthStore()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)
const showLogoutDialog = ref(false)
const apiError = ref('')
const successMessage = ref('')

const errors = reactive({ current: '', new: '', confirm: '' })

const isFormValid = computed(() => {
  return currentPassword.value && newPassword.value && confirmPassword.value
})

function validateField(field) {
  errors[field] = ''
  if (field === 'current' && !currentPassword.value) {
    errors.current = 'لطفاً رمز عبور فعلی را وارد کنید'
  }
  if (field === 'new') {
    if (!newPassword.value) {
      errors.new = 'لطفاً رمز عبور جدید را وارد کنید'
    } else if (newPassword.value.length < 6) {
      errors.new = 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد'
    } else if (newPassword.value === currentPassword.value) {
      errors.new = 'رمز عبور جدید نباید با رمز عبور فعلی یکسان باشد'
    }
  }
  if (field === 'confirm') {
    if (!confirmPassword.value) {
      errors.confirm = 'لطفاً رمز عبور جدید را تأیید کنید'
    } else if (confirmPassword.value !== newPassword.value) {
      errors.confirm = 'رمز عبور جدید و تأیید آن مطابقت ندارد'
    }
  }
}

function validateAll() {
  validateField('current')
  validateField('new')
  validateField('confirm')
  return !errors.current && !errors.new && !errors.confirm
}

async function handleChangePassword() {
  apiError.value = ''
  successMessage.value = ''
  if (!validateAll()) return

  loading.value = true
  try {
    const result = await call('change_password', {
      old_password: currentPassword.value,
      new_password: newPassword.value,
    })
    successMessage.value = result?.message || 'رمز عبور با موفقیت تغییر کرد'
    // Clear form
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    const errMsg = err?.message || ''
    if (errMsg.includes('incorrect') || errMsg.includes('اشتباه')) {
      apiError.value = 'رمز عبور فعلی اشتباه است'
    } else {
      apiError.value = 'خطا در تغییر رمز عبور. لطفاً دوباره تلاش کنید.'
    }
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

async function confirmLogout() {
  showLogoutDialog.value = false
  await auth.logout()
  router.replace('/login')
}
</script>
