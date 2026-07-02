<template>
  <Teleport to="body">
    <Transition name="overlay-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[var(--z-overlay)] bg-[rgba(17,17,17,0.48)] backdrop-blur-[6px]"
        @click="close"
      />
    </Transition>

    <Transition name="sheet-rise">
      <section
        v-if="modelValue"
        class="fixed inset-x-3 bottom-3 z-[var(--z-modal)] mx-auto max-w-[480px] overflow-hidden rounded-[30px] bg-[#171716] px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-[var(--color-text-on-dark)] shadow-[0_24px_48px_rgba(17,17,17,0.24)]"
        aria-label="منوی افزودن"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/18" />

        <div class="mb-5 flex items-center justify-between">
          <div>
            <p class="text-sm text-white/55">اقدام سریع</p>
            <h3 class="mt-1 text-lg font-bold">افزودن به هم‌بافت</h3>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white/75 transition-colors duration-[var(--duration-fast)] hover:bg-white/12"
            aria-label="بستن"
            @click="close"
          >
            <X :size="20" :stroke-width="2.2" />
          </button>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="item in menuItems"
            :key="item.label"
            type="button"
            class="flex min-h-[112px] flex-col items-center justify-center gap-3 rounded-[24px] bg-white/6 px-3 py-4 text-center transition-transform duration-[var(--duration-fast)] active:scale-[0.97]"
            @click="navigate(item.route)"
          >
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
              :style="{ background: item.bg, color: item.fg || '#111111' }"
            >
              <component :is="item.icon" :size="24" :stroke-width="2.2" />
            </span>
            <span class="text-sm font-medium leading-6 text-white/88">{{ item.label }}</span>
          </button>
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, markRaw, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Activity,
  CheckSquare,
  CircleDollarSign,
  Goal,
  NotebookPen,
  Pill,
  Repeat2,
  X,
} from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])
const router = useRouter()
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const ICONS = {
  activity: markRaw(Activity),
  checkSquare: markRaw(CheckSquare),
  circleDollarSign: markRaw(CircleDollarSign),
  goal: markRaw(Goal),
  notebookPen: markRaw(NotebookPen),
  pill: markRaw(Pill),
  repeat2: markRaw(Repeat2),
}

const menuItems = computed(() => [
  { label: 'افزودن کار', icon: ICONS.checkSquare, route: '/tasks?action=create', bg: 'linear-gradient(180deg, #ffb18f 0%, #ff8e64 100%)' },
  { label: 'افزودن عادت', icon: ICONS.repeat2, route: '/habits?action=create', bg: 'linear-gradient(180deg, #cfe37f 0%, #b3ca59 100%)' },
  { label: 'افزودن یادداشت', icon: ICONS.notebookPen, route: '/notes?action=create', bg: 'linear-gradient(180deg, #f7de7e 0%, #f5c94b 100%)' },
  { label: 'افزودن هدف', icon: ICONS.goal, route: '/goals?action=create', bg: 'linear-gradient(180deg, #efb2de 0%, #de8fc3 100%)' },
  { label: 'ثبت هزینه', icon: ICONS.circleDollarSign, route: '/finance/transactions/new', bg: 'linear-gradient(180deg, #bcd5f7 0%, #8db3eb 100%)' },
  { label: 'ثبت حال و انرژی', icon: ICONS.activity, route: '/habits?action=mood', bg: 'linear-gradient(180deg, #d7c1f4 0%, #b89de4 100%)' },
  { label: 'ثبت مکمل', icon: ICONS.pill, route: '/habits?action=supplement', bg: 'linear-gradient(180deg, #ffd2ad 0%, #ffab70 100%)' },
])

function close() {
  emit('update:modelValue', false)
}

function navigate(route) {
  router.push(route)
  close()
}

function onTouchStart(event) {
  touchStartY.value = event.touches[0].clientY
  touchCurrentY.value = event.touches[0].clientY
}

function onTouchMove(event) {
  touchCurrentY.value = event.touches[0].clientY
}

function onTouchEnd() {
  if (touchCurrentY.value - touchStartY.value > 80) {
    close()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.overlay-fade-enter-active,
.overlay-fade-leave-active,
.sheet-rise-enter-active,
.sheet-rise-leave-active {
  transition: all var(--duration-normal) var(--easing-default);
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

.sheet-rise-enter-from,
.sheet-rise-leave-to {
  opacity: 0;
  transform: translateY(24px);
}

@media (prefers-reduced-motion: reduce) {
  .overlay-fade-enter-active,
  .overlay-fade-leave-active,
  .sheet-rise-enter-active,
  .sheet-rise-leave-active {
    transition: none;
  }
}
</style>
