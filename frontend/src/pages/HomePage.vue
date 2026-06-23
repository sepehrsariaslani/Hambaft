<template>
  <div class="space-y-8">
    <!-- Hero -->
    <div class="text-center py-16 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-800 rounded-2xl">
      <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
       به Hambaft خوش آمدید
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        اپلیکیشن Frappe-Vue با پشتیبانی فارسی و راست‌چین
      </p>
      <div class="flex items-center justify-center gap-4">
        <router-link
          to="/about"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium"
        >
          بیشتر بدانید
          <ArrowLeftIcon class="w-4 h-4" />
        </router-link>
        <button
          @click="testConnection"
          :disabled="loading"
          class="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium border border-gray-200 dark:border-gray-600 disabled:opacity-50"
        >
          <RefreshCwIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          تست اتصال
        </button>
      </div>
    </div>

    <!-- API Response -->
    <div v-if="apiResponse" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <CheckCircleIcon class="w-5 h-5 text-green-500" />
        پاسخ API فراپ
      </h2>
      <pre class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-auto">{{ JSON.stringify(apiResponse, null, 2) }}</pre>
    </div>

    <!-- Error -->
    <div v-if="apiError" class="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
      <h2 class="text-lg font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
        <AlertCircleIcon class="w-5 h-5" />
        خطا در ارتباط
      </h2>
      <pre class="text-sm text-red-600 dark:text-red-400">{{ apiError }}</pre>
    </div>

    <!-- Features -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <GlobeIcon class="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Vue 3 + Vite</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          فرانت‌مدرن با Composition API و بیلد سریع Vite
        </p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
          <LayoutDashboardIcon class="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Pinia State</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          مدیریت وضعیت مرکزی با Pinia
        </p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
        <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
          <LanguagesIcon class="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <h3 class="font-semibold text-gray-900 dark:text-white">پشتیبانی RTL</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          طراحی کاملاً راست‌چین برای زبان فارسی
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ArrowLeft as ArrowLeftIcon,
  RefreshCw as RefreshCwIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon,
  Globe as GlobeIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Languages as LanguagesIcon,
} from 'lucide-vue-next'
import { call } from '@/utils/frappe'

const loading = ref(false)
const apiResponse = ref(null)
const apiError = ref(null)

async function testConnection() {
  loading.value = true
  apiResponse.value = null
  apiError.value = null

  try {
    const res = await call('hambaft.api.ping')
    apiResponse.value = res

    try {
      const info = await call('hambaft.api.get_app_info')
      apiResponse.value = { ...apiResponse.value, app_info: info }
    } catch (e) {
      // App info endpoint might not be available yet
      console.log('App info not available:', e)
    }
  } catch (e) {
    apiError.value = e.message || 'خطا در برقراری ارتباط با سرور'
    console.error('API Error:', e)
  } finally {
    loading.value = false
  }
}
</script>
