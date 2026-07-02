<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--color-bg)]">
    <div class="w-full max-w-sm text-center">
      <!-- Step indicator -->
      <div class="flex gap-2 justify-center mb-8">
        <div
          v-for="i in 5"
          :key="i"
          class="h-1.5 rounded-full transition-all duration-300"
          :class="i <= currentStep ? 'bg-[var(--color-accent)] w-8' : 'bg-[var(--color-border)] w-4'"
        />
      </div>

      <!-- Step Content -->
      <transition name="fade" mode="out-in">
        <div :key="currentStep">
          <!-- Step 1: Profile -->
          <template v-if="currentStep === 1">
            <h2 class="text-h1 font-display text-[var(--color-text)] mb-2">خوش اومدی!</h2>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">چند تا سوال کوچیک داریم</p>
            <div class="space-y-4">
              <HbInput v-model="data.display_name" label="نام نمایشی" placeholder="مثلاً: سارا" />
              <div>
                <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">زبان</label>
                <select v-model="data.language" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                  <option value="fa">فارسی</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Step 2: Categories -->
          <template v-if="currentStep === 2">
            <h2 class="text-h1 font-display text-[var(--color-text)] mb-2">چه چیزایی رو می‌خوای دنبال کنی؟</h2>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">حداقل یک مورد انتخاب کن</p>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="cat in categories"
                :key="cat.id"
                class="p-4 rounded-2xl border-2 transition-all duration-150 active:scale-95"
                :class="data.categories.includes(cat.id) ? 'border-[var(--color-accent)] bg-[var(--color-warning-light)]' : 'border-[var(--color-border)] bg-[var(--color-surface)]'"
                @click="toggleCategory(cat.id)"
              >
                <span class="text-2xl block mb-1">{{ cat.icon }}</span>
                <span class="text-sm text-[var(--color-text)]">{{ cat.label }}</span>
              </button>
            </div>
          </template>

          <!-- Step 3: First Goal -->
          <template v-if="currentStep === 3">
            <h2 class="text-h1 font-display text-[var(--color-text)] mb-2">اولین هدفتت چیه؟</h2>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">هر چیزی که دوست داری بهش برسی</p>
            <div class="space-y-4">
              <HbInput v-model="data.goal_title" label="عنوان هدف" placeholder="مثلاً: یادگیری اسپانیایی" />
              <HbInput v-model="data.goal_target" label="هدف عددی" type="number" placeholder="مثلاً: ۱۰۰" dir="ltr" />
              <HbInput v-model="data.goal_unit" label="واحد" placeholder="مثلاً: ساعت" />
            </div>
          </template>

          <!-- Step 4: First Habit -->
          <template v-if="currentStep === 4">
            <h2 class="text-h1 font-display text-[var(--color-text)] mb-2">اولین عادتت چیه؟</h2>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">عادتی که می‌خوای هر روزش انجام بدی</p>
            <div class="space-y-4">
              <HbInput v-model="data.habit_name" label="نام عادت" placeholder="مثلاً: مطالعه ۳۰ دقیقه" />
              <div>
                <label class="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-right">دسته‌بندی</label>
                <select v-model="data.habit_category" class="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
                  <option value="health">سلامتی</option>
                  <option value="productivity">بهره‌وری</option>
                  <option value="learning">یادگیری</option>
                  <option value="mindfulness">ذهن‌آگاهی</option>
                  <option value="fitness">ورزشی</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Step 5: Notifications -->
          <template v-if="currentStep === 5">
            <h2 class="text-h1 font-display text-[var(--color-text)] mb-2">اعلان‌ها</h2>
            <p class="text-sm text-[var(--color-text-secondary)] mb-6">می‌خوای یادآوری بگیری؟</p>
            <div class="space-y-4">
              <div class="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <span class="text-body text-[var(--color-text)]">اعلان روزانه</span>
                <HbToggle v-model="data.daily_notifications" />
              </div>
              <HbInput v-model="data.reminder_time" label="ساعت یادآوری" type="time" />
            </div>
          </template>
        </div>
      </transition>

      <!-- Navigation -->
      <div class="flex gap-3 mt-8">
        <HbButton v-if="currentStep > 1" variant="secondary" block @click="prevStep">قبلی</HbButton>
        <HbButton block :loading="loading" @click="nextStep">
          {{ currentStep === 5 ? 'پایان' : 'بعدی' }}
        </HbButton>
      </div>

      <!-- Skip -->
      <button
        v-if="currentStep < 5"
        class="text-sm text-[var(--color-text-tertiary)] mt-4"
        @click="skipOnboarding"
      >
        رد شدن
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import HbInput from '@/components/ui/HbInput.vue'
import HbButton from '@/components/ui/HbButton.vue'
import HbToggle from '@/components/ui/HbToggle.vue'

const router = useRouter()
const currentStep = ref(1)
const loading = ref(false)

const data = reactive({
  display_name: '',
  language: 'fa',
  categories: [],
  goal_title: '',
  goal_target: '',
  goal_unit: '',
  habit_name: '',
  habit_category: 'health',
  daily_notifications: true,
  reminder_time: '08:00',
})

const categories = [
  { id: 'health', icon: '💪', label: 'سلامتی' },
  { id: 'finance', icon: '💰', label: 'مالی' },
  { id: 'career', icon: '💼', label: 'شغلی' },
  { id: 'personal', icon: '🌱', label: 'شخصی' },
  { id: 'learning', icon: '📚', label: 'یادگیری' },
  { id: 'relationship', icon: '❤️', label: 'روابط' },
]

function toggleCategory(id) {
  const idx = data.categories.indexOf(id)
  if (idx === -1) {
    data.categories.push(id)
  } else {
    data.categories.splice(idx, 1)
  }
}

function nextStep() {
  if (currentStep.value < 5) {
    currentStep.value++
  } else {
    finishOnboarding()
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function finishOnboarding() {
  loading.value = true
  // In production, send data to backend
  setTimeout(() => {
    loading.value = false
    router.push('/')
  }, 500)
}

function skipOnboarding() {
  router.push('/')
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
