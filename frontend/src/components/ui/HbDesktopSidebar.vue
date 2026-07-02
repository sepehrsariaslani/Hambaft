<template>
  <aside
    class="hb-desktop-sidebar"
    :class="collapsed ? 'hb-desktop-sidebar--collapsed' : ''"
  >
    <div class="hb-desktop-sidebar__inner">
      <div class="hb-desktop-sidebar__topbar">
        <div class="hb-desktop-sidebar__brand">
          <div class="hb-desktop-sidebar__logo">ه</div>
          <div v-if="!collapsed">
            <p class="hb-desktop-sidebar__eyebrow">زندگی شخصی</p>
            <h2 class="hb-desktop-sidebar__title">هم‌بافت</h2>
          </div>
        </div>

        <button
          type="button"
          class="hb-desktop-sidebar__toggle"
          :aria-label="collapsed ? 'باز کردن سایدپنل' : 'بستن سایدپنل'"
          :title="collapsed ? 'باز کردن سایدپنل' : 'بستن سایدپنل'"
          @click="emit('toggle')"
        >
          <component :is="collapsed ? ICONS.chevronLeft : ICONS.chevronRight" :size="18" :stroke-width="2.3" />
        </button>
      </div>

      <div class="hb-desktop-sidebar__profile">
        <div class="hb-desktop-sidebar__avatar">{{ displayInitial }}</div>
        <div v-if="!collapsed" class="min-w-0">
          <p class="truncate text-sm font-bold text-[var(--color-text)]">{{ displayName }}</p>
          <p class="truncate text-xs text-[var(--color-text-secondary)]">{{ userEmail }}</p>
        </div>
      </div>

      <nav class="hb-desktop-sidebar__nav" aria-label="ناوبری دسکتاپ">
        <RouterLink
          v-for="item in navItems"
          :key="item.route"
          :to="item.route"
          class="hb-desktop-sidebar__nav-item"
          :class="isActive(item.route) ? 'hb-desktop-sidebar__nav-item--active' : ''"
          :aria-label="item.label"
          :title="item.label"
        >
          <component :is="item.icon" :size="18" :stroke-width="2.2" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <section v-if="!collapsed" class="hb-desktop-sidebar__panel">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-[var(--color-text)]">می‌خواهم انجام بدهم</h3>
          <Sparkles :size="16" :stroke-width="2.2" class="text-[#ef8f67]" />
        </div>

        <div class="space-y-2">
          <button
            v-for="action in quickActions"
            :key="action.label"
            type="button"
            class="hb-desktop-sidebar__action"
            @click="router.push(action.route)"
          >
            <span class="hb-desktop-sidebar__action-icon" :style="{ background: action.bg }">
              <component :is="action.icon" :size="16" :stroke-width="2.2" />
            </span>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </section>

      <div v-else class="hb-desktop-sidebar__collapsed-actions">
        <button
          v-for="action in quickActions"
          :key="action.label"
          type="button"
          class="hb-desktop-sidebar__mini-action"
          :aria-label="action.label"
          :title="action.label"
          @click="router.push(action.route)"
        >
          <span class="hb-desktop-sidebar__action-icon" :style="{ background: action.bg }">
            <component :is="action.icon" :size="16" :stroke-width="2.2" />
          </span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  CircleDollarSign,
  Goal,
  HeartPulse,
  Home,
  NotebookPen,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const ICONS = {
  calendar: markRaw(CalendarDays),
  chevronLeft: markRaw(ChevronLeft),
  chevronRight: markRaw(ChevronRight),
  checkSquare: markRaw(CheckSquare),
  circleDollarSign: markRaw(CircleDollarSign),
  goal: markRaw(Goal),
  heartPulse: markRaw(HeartPulse),
  home: markRaw(Home),
  notebookPen: markRaw(NotebookPen),
  target: markRaw(Target),
  userRound: markRaw(UserRound),
}

const displayName = computed(() => auth.user?.display_name || auth.user?.full_name || auth.user?.name || 'کاربر')
const displayInitial = computed(() => (displayName.value || 'ه').trim().charAt(0) || 'ه')
const userEmail = computed(() => auth.user?.email || '')

const navItems = [
  { route: '/', label: 'خانه', icon: ICONS.home },
  { route: '/calendar', label: 'تقویم', icon: ICONS.calendar },
  { route: '/tasks', label: 'کارها', icon: ICONS.checkSquare },
  { route: '/habits', label: 'عادت‌ها', icon: ICONS.target },
  { route: '/goals', label: 'اهداف', icon: ICONS.goal },
  { route: '/notes', label: 'یادداشت‌ها', icon: ICONS.notebookPen },
  { route: '/finance', label: 'مالی', icon: ICONS.circleDollarSign },
  { route: '/profile', label: 'پروفایل', icon: ICONS.userRound },
]

const quickActions = [
  { label: 'مرور کارهای امروز', route: '/tasks', icon: ICONS.checkSquare, bg: 'linear-gradient(180deg, #ffd1b8 0%, #ff9b72 100%)' },
  { label: 'ثبت عادت‌ها', route: '/habits', icon: ICONS.heartPulse, bg: 'linear-gradient(180deg, #d9e9a4 0%, #b8c97a 100%)' },
  { label: 'به‌روزرسانی هدف', route: '/goals', icon: ICONS.goal, bg: 'linear-gradient(180deg, #edd8ff 0%, #cdb8f0 100%)' },
  { label: 'مدیریت هزینه‌ها', route: '/finance', icon: ICONS.circleDollarSign, bg: 'linear-gradient(180deg, #fde39b 0%, #f7d957 100%)' },
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<style scoped>
.hb-desktop-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: var(--z-sticky);
  width: 312px;
  height: 100dvh;
  padding: 20px 18px 20px max(18px, env(safe-area-inset-right));
  background: linear-gradient(180deg, rgba(255, 251, 246, 0.94) 0%, rgba(247, 240, 227, 0.96) 100%);
  border-left: 1px solid rgba(17, 17, 17, 0.06);
  backdrop-filter: blur(18px);
  transition:
    width var(--duration-normal) var(--easing-default),
    padding var(--duration-normal) var(--easing-default);
}

.hb-desktop-sidebar--collapsed {
  width: 110px;
  padding-inline: 12px;
}

.hb-desktop-sidebar__inner {
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 18px;
}

.hb-desktop-sidebar__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hb-desktop-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.hb-desktop-sidebar__logo {
  display: flex;
  height: 48px;
  width: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: linear-gradient(180deg, #1e1e1d 0%, #111111 100%);
  color: var(--color-text-on-dark);
  font-size: 1.2rem;
  font-weight: 800;
}

.hb-desktop-sidebar__toggle {
  display: inline-flex;
  height: 42px;
  width: 42px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
  transition:
    transform var(--duration-fast) var(--easing-default),
    background-color var(--duration-fast) var(--easing-default);
}

.hb-desktop-sidebar__toggle:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.96);
}

.hb-desktop-sidebar__eyebrow {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.hb-desktop-sidebar__title {
  margin-top: 2px;
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--color-text);
}

.hb-desktop-sidebar__profile {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.75);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.hb-desktop-sidebar--collapsed .hb-desktop-sidebar__profile {
  justify-content: center;
  padding-inline: 0;
}

.hb-desktop-sidebar__avatar {
  display: flex;
  height: 44px;
  width: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(180deg, #262624 0%, #111111 100%);
  color: var(--color-text-on-dark);
  font-weight: 800;
}

.hb-desktop-sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hb-desktop-sidebar__nav-item {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 10px;
  border-radius: 18px;
  padding: 0 14px;
  color: #665f55;
  transition:
    background-color var(--duration-fast) var(--easing-default),
    color var(--duration-fast) var(--easing-default),
    transform var(--duration-fast) var(--easing-default);
}

.hb-desktop-sidebar--collapsed .hb-desktop-sidebar__nav-item {
  justify-content: center;
  padding-inline: 0;
}

.hb-desktop-sidebar__nav-item:hover {
  background: rgba(255, 255, 255, 0.66);
}

.hb-desktop-sidebar__nav-item--active {
  background: linear-gradient(180deg, rgba(255, 161, 119, 0.2) 0%, rgba(255, 255, 255, 0.82) 100%);
  color: #3a2b23;
  box-shadow: var(--shadow-sm);
}

.hb-desktop-sidebar__panel {
  margin-top: auto;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.72);
  padding: 16px;
  box-shadow: var(--shadow-md);
}

.hb-desktop-sidebar__collapsed-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.hb-desktop-sidebar__action {
  display: flex;
  min-height: 46px;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 16px;
  background: rgba(17, 17, 17, 0.035);
  padding: 0 10px;
  text-align: right;
  color: var(--color-text);
  transition: transform var(--duration-fast) var(--easing-default);
}

.hb-desktop-sidebar__action:hover {
  transform: translateX(-2px);
}

.hb-desktop-sidebar__action-icon {
  display: flex;
  height: 34px;
  width: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #181818;
}

.hb-desktop-sidebar__mini-action {
  display: inline-flex;
  height: 46px;
  width: 46px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-sm);
}

@media (prefers-reduced-motion: reduce) {
  .hb-desktop-sidebar,
  .hb-desktop-sidebar__toggle,
  .hb-desktop-sidebar__nav-item,
  .hb-desktop-sidebar__action {
    transition: none;
  }
}
</style>
