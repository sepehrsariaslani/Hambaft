<template>
  <div class="app-container">
    <HbDesktopSidebar
      v-if="showNav && isDesktop"
      :collapsed="desktopSidebarCollapsed"
      @toggle="toggleDesktopSidebar"
    />

    <div :class="contentShellClass">
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>

    <HbBottomNav v-if="showNav && !isDesktop" @add="addMenuOpen = true" />
    <HbAddMenu v-if="showNav && !isDesktop" v-model="addMenuOpen" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import HbDesktopSidebar from '@/components/ui/HbDesktopSidebar.vue'
import HbBottomNav from '@/components/ui/HbBottomNav.vue'
import HbAddMenu from '@/components/ui/HbAddMenu.vue'

const route = useRoute()
const addMenuOpen = ref(false)
const isDesktop = ref(false)
const desktopSidebarCollapsed = ref(false)
let mediaQuery = null
const DESKTOP_SIDEBAR_STORAGE_KEY = 'hambaft:desktop-sidebar-collapsed'

const showNav = computed(() => {
  const noNavRoutes = ['Login', 'Signup', 'Onboarding']
  return !noNavRoutes.includes(route.name)
})

const contentShellClass = computed(() => {
  if (!showNav.value || !isDesktop.value) return ''
  return desktopSidebarCollapsed.value ? 'lg:pr-[110px]' : 'lg:pr-[312px]'
})

function handleOpenAddMenu() {
  addMenuOpen.value = true
}

function toggleDesktopSidebar() {
  desktopSidebarCollapsed.value = !desktopSidebarCollapsed.value
  window.localStorage.setItem(DESKTOP_SIDEBAR_STORAGE_KEY, desktopSidebarCollapsed.value ? '1' : '0')
}

function updateDesktopState() {
  isDesktop.value = !!mediaQuery?.matches
}

onMounted(() => {
  desktopSidebarCollapsed.value = window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) === '1'
  mediaQuery = window.matchMedia('(min-width: 1024px)')
  updateDesktopState()
  mediaQuery.addEventListener('change', updateDesktopState)
  window.addEventListener('open-add-menu', handleOpenAddMenu)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', updateDesktopState)
  window.removeEventListener('open-add-menu', handleOpenAddMenu)
})
</script>

<style scoped>
.app-container {
  min-height: 100dvh;
  background-color: var(--color-bg);
}
</style>
