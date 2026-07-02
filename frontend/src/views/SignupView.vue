<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--color-bg)]" dir="rtl">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-display font-display text-[var(--color-accent)]">همبافت</h1>
        <p class="text-sm text-[var(--color-text-secondary)] mt-2">حساب جدید بساز</p>
      </div>

      <!-- Form -->
      <form class="space-y-4" @submit.prevent="handleSignup">
        <HbInput v-model="displayName" label="نام نمایشی" placeholder="نام شما" />
        <HbInput v-model="email" label="ایمیل" type="email" placeholder="email@example.com" dir="ltr" />
        <HbInput v-model="password" label="رمز عبور" type="password" placeholder="حداقل ۸ کاراکتر" dir="ltr" />

        <p v-if="error" class="text-sm text-[var(--color-danger)]">{{ error }}</p>

        <HbButton type="submit" block :loading="loading">
          ثبت‌نام
        </HbButton>
      </form>

      <!-- Footer -->
      <p class="text-center text-sm text-[var(--color-text-secondary)] mt-6">
        حساب داری؟
        <router-link to="/login" class="text-[var(--color-accent)] font-medium">ورود</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'

const router = useRouter()
const auth = useAuthStore()

const displayName = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSignup() {
  if (!email.value || !password.value) {
    error.value = 'لطفاً تمام فیلدها را پر کنید'
    return
  }
  if (password.value.length < 8) {
    error.value = 'رمز عبور باید حداقل ۸ کاراکتر باشد'
    return
  }
  loading.value = true
  error.value = ''

  const result = await auth.signup(email.value, password.value, displayName.value)
  loading.value = false
  if (result.success) {
    router.push('/onboarding')
  } else {
    error.value = result.message || 'خطا در ثبت‌نام'
  }
}
</script>
