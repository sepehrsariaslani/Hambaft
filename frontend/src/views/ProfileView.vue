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
      <h1 class="text-[28px] font-display text-[var(--color-text)]">پروفایل</h1>
    </header>

    <!-- Loading Skeleton -->
    <template v-if="loading">
      <div class="px-4 mb-6">
        <HbCard padding="p-6" class="text-center">
          <HbSkeleton variant="circle" :width="80" :height="80" class="mx-auto mb-4" />
          <HbSkeleton variant="text" width="60%" class="mx-auto mb-2" />
          <HbSkeleton variant="text" width="40%" class="mx-auto" />
        </HbCard>
      </div>
      <div class="px-4 space-y-2">
        <HbSkeleton v-for="i in 5" :key="i" variant="rounded" height="52" />
      </div>
    </template>

    <!-- Loaded Content -->
    <template v-else>
      <!-- Profile Card -->
      <div class="px-4 mb-6">
        <HbCard padding="p-6" class="text-center">
          <!-- Avatar -->
          <div
            class="w-20 h-20 rounded-full bg-[var(--pastel-rose)] border-2 border-[var(--color-border)] flex items-center justify-center mx-auto mb-3"
            :style="profilePhoto ? { backgroundImage: `url(${profilePhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
            role="img"
            :aria-label="`تصویر پروفایل ${displayName}`"
          >
            <span v-if="!profilePhoto" class="text-2xl font-bold text-[var(--color-text)]">{{ initial }}</span>
          </div>
          <h2 class="text-h2 font-heading text-[var(--color-text)]">{{ displayName }}</h2>
          <p class="text-[var(--text-sm)] text-[var(--color-text-secondary)]">{{ email }}</p>
        </HbCard>
      </div>

      <!-- Membership Card -->
      <div class="px-4 mb-6">
        <HbCard padding="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[var(--pastel-blue)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-primary)]">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-[var(--text-sm)] text-[var(--color-text-secondary)]">تاریخ عضویت</p>
              <p class="text-[var(--text-base)] font-bold text-[var(--color-text)]" :lang="jalaliDate ? 'fa' : undefined">
                <span dir="ltr">{{ jalaliDate }}</span>
              </p>
              <p class="text-[12px] text-[var(--color-text-tertiary)]">{{ relativeTime }}</p>
            </div>
          </div>
        </HbCard>
      </div>

      <!-- Settings Section -->
      <div class="px-4">
        <p class="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2 mt-6">تنظیمات</p>
        <HbCard padding="p-0" class="overflow-hidden">
          <button
            v-for="(item, idx) in settingsItems"
            :key="item.label"
            class="w-full flex items-center gap-4 px-4 h-[52px] bg-transparent border-none cursor-pointer transition-colors duration-200 active:bg-[var(--color-surface-secondary)]"
            :class="idx < settingsItems.length - 1 ? 'border-b border-[var(--color-border)]' : ''"
            :aria-label="item.label"
            @click="handleSetting(item)"
          >
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              :style="{ backgroundColor: item.iconBg }"
            >
              <span class="text-[16px]">{{ item.icon }}</span>
            </div>
            <span class="flex-1 text-right text-[var(--text-base)] text-[var(--color-text)]">{{ item.label }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-tertiary)]">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </HbCard>
      </div>

      <!-- Account Section -->
      <div class="px-4">
        <p class="text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-2 mt-6">حساب کاربری</p>
        <HbCard padding="p-0" class="overflow-hidden">
          <button
            class="w-full flex items-center gap-4 px-4 h-[52px] bg-transparent border-none cursor-pointer transition-colors duration-200 active:bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)]"
            aria-label="خروج از حساب کاربری"
            @click="showLogoutDialog = true"
          >
            <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-error-light)]">
              <span class="text-[16px]">🚪</span>
            </div>
            <span class="flex-1 text-right text-[var(--text-base)] text-[var(--color-error)]">خروج از حساب</span>
          </button>
        </HbCard>
      </div>

      <!-- Version -->
      <p class="text-center text-[12px] text-[var(--color-text-tertiary)] mt-4">نسخه ۱.۰.۰</p>
    </template>

    <!-- Error State -->
    <div
      v-if="error"
      class="mx-4 mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[var(--color-error)] flex items-center gap-2"
      role="alert"
    >
      <span class="text-[14px] text-[var(--color-error)]">خطا در بارگذاری اطلاعات کاربری</span>
      <button
        class="ms-auto text-[14px] text-[var(--color-primary)] bg-transparent border-none cursor-pointer font-medium"
        @click="loadProfile"
      >
        تلاش دوباره
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
          aria-labelledby="logout-dialog-title"
        >
          <h3 id="logout-dialog-title" class="text-[18px] font-bold text-[var(--color-text)] text-center">
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getHambaftProfile } from '@/utils/frappe'
import { formatJalaliDate, toPersianDigits } from '@/utils/jalali'
import HbCard from '@/components/ui/HbCard.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbSkeleton from '@/components/ui/HbSkeleton.vue'

const router = useRouter()
const auth = useAuthStore()

const fullName = ref('')
const email = ref('')
const signupDateRaw = ref(null)
const profilePhoto = ref(null)
const loading = ref(true)
const error = ref(false)
const showLogoutDialog = ref(false)

const jalaliDate = computed(() => {
  if (!signupDateRaw.value) return ''
  try {
    return formatJalaliDate(signupDateRaw.value)
  } catch {
    return ''
  }
})

const relativeTime = computed(() => {
  if (!signupDateRaw.value) return ''
  try {
    const diff = Date.now() - new Date(signupDateRaw.value).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days < 1) return 'امروز'
    if (days < 7) return `${toPersianDigits(days)} روز پیش`
    const months = Math.floor(days / 30)
    if (months < 12) return `${toPersianDigits(months)} ماه پیش`
    const years = Math.floor(months / 12)
    return `${toPersianDigits(years)} سال پیش`
  } catch {
    return ''
  }
})

const displayName = computed(() => fullName.value || 'کاربر')
const initial = computed(() => (displayName.value.charAt(0) || '?'))

const settingsItems = [
  { icon: '✏️', iconBg: 'var(--pastel-blue)', label: 'ویرایش پروفایل', route: '/profile/edit' },
  { icon: '⚙️', iconBg: 'var(--pastel-purple)', label: 'تنظیمات عمومی', route: '/settings' },
  { icon: '🔒', iconBg: 'var(--pastel-rose)', label: 'امنیت و حریم خصوصی', route: '/settings/security' },
  { icon: '🎨', iconBg: 'var(--pastel-amber)', label: 'ظاهر برنامه', route: '/settings/appearance' },
  { icon: '❓', iconBg: 'var(--pastel-teal)', label: 'راهنما و پشتیبانی', route: '/help' },
]

async function loadProfile() {
  loading.value = true
  error.value = false
  try {
    const profile = await getHambaftProfile()
    fullName.value = profile.full_name || profile.name || 'کاربر'
    email.value = profile.email || ''
    signupDateRaw.value = profile.signup_date || profile.creation || null
    profilePhoto.value = profile.avatar || null
  } catch (err) {
    error.value = true
    // Fallback to auth store data
    fullName.value = auth.user?.full_name || 'کاربر'
    email.value = auth.user?.email || ''
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfile()
})

function goBack() {
  router.back()
}

function handleSetting(item) {
  if (item.route) {
    router.push(item.route)
  }
}

async function confirmLogout() {
  showLogoutDialog.value = false
  await auth.logout()
  router.replace('/login')
}
</script>
