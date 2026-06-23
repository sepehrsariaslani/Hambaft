<template>
  <div class="max-w-3xl mx-auto space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">درباره Hambaft</h1>
      <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
        Hambaft یک اپلیکیشن نمونه است که با استفاده از Frappe Framework و Vue 3 ساخته شده است.
        این اپلیکیشن شامل یک فرانت‌اند مدرن با پشتیبانی RTL برای زبان فارسی می‌شود.
      </p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">ویژگی‌ها</h2>
      <ul class="space-y-3">
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">Frappe v16 با پایتون 3.10+</span>
        </li>
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">Vue 3 با Composition API و Vite</span>
        </li>
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">Vue Router برای مسیریابی صفحات</span>
        </li>
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">Pinia برای مدیریت وضعیت</span>
        </li>
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">frappe-ui برای کامپوننت‌ها و ارتباط API</span>
        </li>
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">Tailwind CSS با پشتیبانی RTL و فونت Vazirmatn</span>
        </li>
        <li class="flex items-start gap-3">
          <CheckCircleIcon class="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <span class="text-gray-700 dark:text-gray-300">پروکسی Vite برای ارتباط با Frappe backend</span>
        </li>
      </ul>
    </div>

    <div class="text-center">
      <router-link
        to="/"
        class="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
      >
        <ArrowRightIcon class="w-4 h-4" />
        بازگشت به خانه
      </router-link>
    </div>
  </div>
</template>

<script setup>
import {
  CheckCircle as CheckCircleIcon,
  ArrowRight as ArrowRightIcon,
} from 'lucide-vue-next'
</script>
