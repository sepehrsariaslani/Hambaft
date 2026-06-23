<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-sm">H</span>
          </div>
          <span class="font-bold text-gray-900 dark:text-white text-lg">Hambaft</span>
        </div>
        <nav class="flex items-center gap-4">
          <router-link
            to="/"
            class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            :class="{ 'text-primary-600 dark:text-primary-400 font-medium': $route.path === '/' }"
          >
            خانه
          </router-link>
          <router-link
            to="/about"
            class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
            :class="{ 'text-primary-600 dark:text-primary-400 font-medium': $route.path === '/about' }"
          >
            درباره
          </router-link>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const userName = ref('')

onMounted(() => {
  userName.value = window.user_full_name || window.user || 'کاربر'
})
</script>
