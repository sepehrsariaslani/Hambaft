import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHabitsStore = defineStore('habits', () => {
  const habits = ref([])
  const logs = ref([])
  const loading = ref(false)

  function todayString() {
    return new Date().toISOString().split('T')[0]
  }

  function fetchHabits(params = {}) {
    loading.value = true
    const query = new URLSearchParams(params).toString()
    const today = todayString()

    return Promise.all([
      fetch(`/api/method/hambaft.hambaft.api.get_habits?${query}`).then((res) => res.json()),
      fetch(`/api/method/hambaft.hambaft.api.get_habit_logs?from_date=${today}&to_date=${today}`).then((res) => res.json()),
    ])
      .then(([habitsData, logsData]) => {
        if (habitsData.status === 'success') {
          habits.value = habitsData.data.habits
        }
        if (logsData.status === 'success') {
          logs.value = logsData.data.logs || []
        }
        loading.value = false
      })
      .catch(() => {
        habits.value = [
          { name: 'روتین صبح', frequency: 'daily', category: 'productivity', streak_current: 12, streak_best: 30, is_active: 1, target_value: 1, unit: 'بار' },
          { name: 'مطالعه ۳۰ دقیقه', frequency: 'daily', category: 'learning', streak_current: 5, streak_best: 15, is_active: 1, target_value: 1, unit: 'بار' },
          { name: 'نوشیدن آب', frequency: 'daily', category: 'health', streak_current: 8, streak_best: 21, is_active: 1, target_value: 8, unit: 'لیوان' },
          { name: 'مرور شبانه', frequency: 'daily', category: 'mindfulness', streak_current: 3, streak_best: 10, is_active: 1, target_value: 1, unit: 'بار' },
        ]
        logs.value = [
          { habit: 'روتین صبح', date: today, status: 'done', value: 1 },
          { habit: 'مطالعه ۳۰ دقیقه', date: today, status: 'done', value: 1 },
        ]
        loading.value = false
      })
  }

  function logHabit(habitName, status, value = 1) {
    const today = new Date().toISOString().split('T')[0]
    return fetch('/api/method/hambaft.hambaft.api.log_habit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit: habitName, date: today, status, value }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          logs.value.push(data.data.log)
          const idx = habits.value.findIndex((h) => h.name === habitName)
          if (idx !== -1 && data.data.log.status === 'done') {
            habits.value[idx].streak_current++
          }
        }
        return data
      })
  }

  function createHabit(habitData) {
    return fetch('/api/method/hambaft.hambaft.api.create_habit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: habitData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          habits.value.unshift(data.data.habit)
        }
        return data
      })
  }

  return { habits, logs, loading, fetchHabits, logHabit, createHabit }
})
