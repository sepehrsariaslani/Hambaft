import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { checkFrappeSession, getHambaftProfile } from '@/utils/frappe'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isReady = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  async function init() {
    try {
      const username = await checkFrappeSession()
      if (username) {
        const profile = await getHambaftProfile()
        user.value = {
          name: profile.name || username,
          full_name: profile.full_name || username,
          display_name: profile.full_name || profile.name || username,
          email: profile.email || username,
          signup_date: profile.signup_date || null,
        }
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    } finally {
      isReady.value = true
    }
  }

  async function login(email, password) {
    try {
      const res = await fetch('/api/method/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ usr: email, pwd: password }),
      })
      const data = await res.json()

      if (res.ok && data.message === 'Logged In') {
        const profile = await getHambaftProfile()
        user.value = {
          name: profile.name || email,
          full_name: profile.full_name || email,
          display_name: profile.full_name || profile.name || email,
          email: profile.email || email,
          signup_date: profile.signup_date || null,
        }
        return { success: true, data: { user: user.value } }
      }

      const msg = data.message || data._error_message || 'خطا در ورود'
      return { success: false, message: msg }
    } catch (err) {
      return { success: false, message: err.message || 'خطا در ارتباط با سرور' }
    }
  }

  async function signup(email, password, display_name) {
    try {
      // Create a new Frappe User via the standard API
      const res = await fetch('/api/method/frappe.client.insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          doc: {
            doctype: 'User',
            email: email,
            first_name: display_name || email.split('@')[0],
            send_welcome_email: 0,
            enabled: 1,
            new_password: password,
          },
        }),
      })
      const data = await res.json()

      if (data.message && data.message.name) {
        // User created — now auto-login
        return login(email, password)
      }

      const msg = data.exception || data.message || data._error_message || 'خطا در ثبت‌نام'
      return { success: false, message: msg }
    } catch (err) {
      return { success: false, message: err.message || 'خطا در ارتباط با سرور' }
    }
  }

  async function logout() {
    try {
      await fetch('/api/method/logout', {
        credentials: 'same-origin',
      })
    } catch {
      // ignore network errors — clear local state anyway
    }
    user.value = null
  }

  return { user, isReady, isAuthenticated, init, login, signup, logout }
})
