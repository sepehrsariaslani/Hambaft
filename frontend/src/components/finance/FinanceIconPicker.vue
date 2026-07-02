<template>
  <div>
    <label v-if="label" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
      {{ label }}
      <span v-if="required" class="text-[var(--color-error)] ms-0.5">*</span>
    </label>

    <!-- Trigger button -->
    <button
      type="button"
      class="w-full h-12 px-3 rounded-xl border-[1.5px] bg-[var(--color-surface)] flex items-center justify-between transition-all"
      :class="error ? 'border-[var(--color-error)]' : 'border-[var(--color-border)]'"
      @click="openSheet"
    >
      <div class="flex items-center gap-2">
        <component v-if="selectedIconComponent" :is="selectedIconComponent" :size="20" class="text-[var(--color-text)]" />
        <span class="text-[var(--color-text)]">{{ modelValue || placeholder }}</span>
      </div>
      <ChevronDown :size="18" class="text-[var(--color-text-tertiary)]" />
    </button>
    <p v-if="error" class="text-sm text-[var(--color-error)] mt-1">{{ error }}</p>

    <!-- Bottom Sheet -->
    <HbModal v-model="sheetOpen" :title="label || 'انتخاب آیکون'">
      <input
        v-model="search"
        type="text"
        placeholder="جستجو..."
        class="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text)] mb-4"
      />
      <div class="grid grid-cols-5 gap-2 py-2 max-h-64 overflow-y-auto">
        <button
          v-for="icon in filteredIcons"
          :key="icon.name"
          class="w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90"
          :class="modelValue === icon.name ? 'bg-[var(--color-pink)] text-white' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text)]'"
          @click="selectIcon(icon.name)"
        >
          <component :is="icon.component" :size="22" />
        </button>
      </div>
      <HbButton block variant="secondary" class="mt-4" @click="sheetOpen = false">انصراف</HbButton>
    </HbModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import HbModal from '@/components/ui/HbModal.vue'
import HbButton from '@/components/ui/HbButton.vue'
import { ChevronDown } from 'lucide-vue-next'
import * as icons from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  error: { type: String, default: '' },
  placeholder: { type: String, default: 'انتخاب آیکون' },
})

const emit = defineEmits(['update:modelValue'])

const iconList = [
  'Wallet', 'Banknote', 'CreditCard', 'PiggyBank', 'Landmark',
  'Gem', 'TrendingUp', 'TrendingDown', 'Coins', 'Receipt',
  'Bill', 'ShoppingCart', 'Home', 'Car', 'Plane',
  'GraduationCap', 'Heart', 'Shield', 'Gift', 'Star',
  'CircleDollarSign', 'ChartLine', 'ChartPie', 'Percent', 'Calendar',
]

const sheetOpen = ref(false)
const search = ref('')

const filteredIcons = computed(() => {
  const term = search.value.toLowerCase()
  return iconList
    .map(name => ({ name, component: icons[name] }))
    .filter(i => i.component && (!term || i.name.toLowerCase().includes(term)))
})

const selectedIconComponent = computed(() => {
  if (!props.modelValue) return null
  return icons[props.modelValue] || null
})

function selectIcon(name) {
  emit('update:modelValue', name)
  sheetOpen.value = false
}
</script>
