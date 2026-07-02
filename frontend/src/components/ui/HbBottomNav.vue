<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
    aria-label="ناوبری اصلی"
  >
    <div class="relative mx-auto max-w-[480px]">
      <div class="grid grid-cols-5 items-end rounded-[28px] bg-[var(--color-black)] px-2 pt-3 shadow-[var(--shadow-xl)]">
        <router-link
          v-for="item in leadingItems"
          :key="item.route"
          :to="item.route"
          class="hb-nav-item"
          :class="isActive(item.route) ? 'hb-nav-item--active' : ''"
        >
          <component :is="item.icon" :size="22" :stroke-width="isActive(item.route) ? 2.5 : 2" />
          <span>{{ item.label }}</span>
        </router-link>

        <button
          type="button"
          class="hb-fab"
          aria-label="افزودن"
          @click="$emit('add')"
        >
          <Plus :size="28" :stroke-width="2.4" />
        </button>

        <router-link
          v-for="item in trailingItems"
          :key="item.route"
          :to="item.route"
          class="hb-nav-item"
          :class="isActive(item.route) ? 'hb-nav-item--active' : ''"
        >
          <component :is="item.icon" :size="22" :stroke-width="isActive(item.route) ? 2.5 : 2" />
          <span>{{ item.label }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarDays, CheckSquare, Home, Plus, UserRound } from 'lucide-vue-next'

defineEmits(['add'])

const route = useRoute()
const ICONS = {
  calendar: markRaw(CalendarDays),
  checkSquare: markRaw(CheckSquare),
  home: markRaw(Home),
  userRound: markRaw(UserRound),
}

const navItems = [
  { route: '/', label: 'خانه', icon: ICONS.home },
  { route: '/calendar', label: 'تقویم', icon: ICONS.calendar },
  { route: '/tasks', label: 'کارها', icon: ICONS.checkSquare },
  { route: '/profile', label: 'پروفایل', icon: ICONS.userRound },
]

const leadingItems = computed(() => navItems.slice(0, 2))
const trailingItems = computed(() => navItems.slice(2))

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<style scoped>
.hb-nav-item {
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: #938b7f;
  transition:
    color var(--duration-fast) var(--easing-default),
    transform var(--duration-fast) var(--easing-default);
  outline: none;
}

.hb-nav-item span {
  font-size: 0.72rem;
  line-height: 1;
}

.hb-nav-item--active {
  color: #ff9b71;
}

.hb-nav-item:focus-visible,
.hb-fab:focus-visible {
  box-shadow: 0 0 0 3px rgba(247, 240, 227, 0.26);
  border-radius: 20px;
}

.hb-fab {
  width: 68px;
  height: 68px;
  margin-inline: auto;
  margin-top: -28px;
  border-radius: 9999px;
  border: 0;
  background: linear-gradient(180deg, #ff9d73 0%, #f7865c 100%);
  color: #fff9f0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 18px 36px rgba(247, 134, 92, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition:
    transform var(--duration-fast) var(--easing-default),
    box-shadow var(--duration-fast) var(--easing-default);
}

.hb-fab:active {
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .hb-nav-item,
  .hb-fab {
    transition: none;
  }
}
</style>
