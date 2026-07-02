<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--color-bg)]" dir="rtl">
    <div class="w-full max-w-sm">
      <!-- Logo Area -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-3 bg-[var(--color-pink)] rounded-[var(--radius-xl)] flex items-center justify-center">
          <span class="text-2xl text-white font-bold">ه</span>
        </div>
        <h1 class="text-[28px] font-display text-[var(--color-text)]">همبافت</h1>
        <p class="text-[var(--text-body)] text-[var(--color-text-secondary)] mt-2">به همبافت خوش آمدید</p>
        <p class="text-[var(--text-sm)] text-[var(--color-text-tertiary)] mt-1">وارد حساب کاربری‌تان شوید</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin">
        <!-- Email/Username -->
        <div class="mb-4">
          <label class="block text-[var(--text-sm)] font-medium text-[var(--color-text)] mb-1.5">
            ایمیل یا نام کاربری
          </label>
          <input
            v-model="email"
            type="text"
            autocomplete="username"
            inputmode="email"
            placeholder="example@email.com"
            required
            class="w-full h-12 px-4 border-[1.5px] rounded-[12px] bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-200 focus:outline-none placeholder:text-[var(--color-text-tertiary)]"
            :class="errors.email ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'"
            :aria-describedby="errors.email ? 'email-error' : undefined"
            @blur="validateField('email')"
          />
          <p v-if="errors.email" id="email-error" class="text-[14px] text-[var(--color-error)] mt-1" role="alert">{{ errors.email }}</p>
        </div>

        <!-- Password -->
        <div class="mb-2">
          <label class="block text-[var(--text-sm)] font-medium text-[var(--color-text)] mb-1.5">
            رمز عبور
          </label>
          <div class="relative">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              autocomplete="current-password"
              placeholder="رمز عبور خود را وارد کنید"
              required
              class="w-full h-12 ps-4 pe-12 border-[1.5px] rounded-[12px] bg-[var(--color-surface)] text-[var(--color-text)] text-[var(--text-base)] font-[var(--font-family-primary)] transition-all duration-200 focus:outline-none placeholder:text-[var(--color-text-tertiary)] text-left"
              dir="ltr"
              :class="errors.password ? 'border-[var(--color-error)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'"
              :aria-describedby="errors.password ? 'password-error' : undefined"
              @blur="validateField('password')"
            />
            <button
              type="button"
              class="absolute end-3 top-1/2 -translate-y-1/2 p-1 bg-transparent border-none cursor-pointer text-[var(--color-text-tertiary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
              :aria-label="showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'"
              :aria-pressed="showPassword.toString()"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
          <p v-if="errors.password" id="password-error" class="text-[14px] text-[var(--color-error)] mt-1" role="alert">{{ errors.password }}</p>
        </div>

        <!-- Forgot Password Link -->
        <div class="mb-6 text-start">
          <button
            type="button"
            class="text-[14px] text-[var(--color-primary)] bg-transparent border-none cursor-pointer p-1"
            @click="goToForgotPassword"
          >
            رمز عبورم را فراموش کردم
          </button>
        </div>

        <!-- API Error Banner -->
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

        <!-- Login Button -->
        <button
          type="submit"
          class="w-full h-12 rounded-[12px] border-none bg-[var(--color-black)] text-white text-[var(--text-base)] font-bold cursor-pointer transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center"
          :disabled="loading"
          :aria-disabled="loading.toString()"
        >
          <svg v-if="loading" class="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span v-else>ورود</span>
        </button>
      </form>

      <!-- Divider -->
      <div class="flex items-center gap-4 my-6">
        <div class="flex-1 h-px bg-[var(--color-border)]"></div>
        <span class="text-[12px] text-[var(--color-text-tertiary)]">یا</span>
        <div class="flex-1 h-px bg-[var(--color-border)]"></div>
      </div>

      <!-- Sign Up Link -->
      <p class="text-center text-[14px] text-[var(--color-text-secondary)]">
        حساب کاربری ندارید؟
        <router-link to="/signup" class="text-[var(--color-primary)] font-medium ms-1">ثبت‌نام کنید</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const showPassword = ref(false)
const apiError = ref('')
const errors = reactive({ email: '', password: '' })

function validateField(field) {
  errors[field] = ''
  if (field === 'email') {
    if (!email.value.trim()) {
      errors.email = 'لطفاً ایمیل یا نام کاربری را وارد کنید'
    }
  }
  if (field === 'password') {
    if (!password.value) {
      errors.password = 'لطفاً رمز عبور را وارد کنید'
    } else if (password.value.length < 6) {
      errors.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد'
    }
  }
}

function validateAll() {
  validateField('email')
  validateField('password')
  return !errors.email && !errors.password
}

async function handleLogin() {
  apiError.value = ''
  if (!validateAll()) return

  loading.value = true
  try {
    const result = await auth.login(email.value, password.value)
    if (result.success) {
      router.replace('/')
    } else {
      apiError.value = result.message || 'ایمیل یا رمز عبور اشتباه است'
    }
  } catch (err) {
    apiError.value = 'خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.'
  } finally {
    loading.value = false
  }
}

function goToForgotPassword() {
  // Navigate to forgot password — placeholder for now
  // Could open a modal or navigate to a future route
}
</script>
