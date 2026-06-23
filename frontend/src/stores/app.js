import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const user = ref(window.user || null)
  const userName = ref(window.user_full_name || '')
  const userRoles = ref(window.user_roles || [])

  const isAuthenticated = computed(() => !!user.value && user.value !== 'Guest')

  function setUser(data) {
    user.value = data.name || data
    userName.value = data.full_name || data.name || ''
  }

  return { user, userName, userRoles, isAuthenticated, setUser }
})
