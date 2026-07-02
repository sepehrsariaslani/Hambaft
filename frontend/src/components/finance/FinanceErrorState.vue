<template>
  <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div class="w-16 h-16 rounded-full bg-[var(--color-error-light)] flex items-center justify-center mb-4">
      <AlertCircle :size="32" class="text-[var(--color-error)]" />
    </div>
    <h3 class="text-h3 font-heading text-[var(--color-text)] mb-2">خطا در دریافت اطلاعات</h3>
    <p class="text-sm text-[var(--color-text-secondary)] max-w-xs mb-4">
      لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
    </p>
    <HbButton variant="primary" @click="$emit('retry')">
      <RefreshCw :size="16" class="me-1" />
      تلاش دوباره
    </HbButton>
  </div>
</template>

<script setup>
import HbButton from '@/components/ui/HbButton.vue'
import { AlertCircle, RefreshCw } from 'lucide-vue-next'

defineEmits(['retry'])
</script>
