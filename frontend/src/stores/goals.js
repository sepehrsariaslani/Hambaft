import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGoalsStore = defineStore('goals', () => {
  const goals = ref([])
  const loading = ref(false)

  function fetchGoals(params = {}) {
    loading.value = true
    const query = new URLSearchParams(params).toString()
    return fetch(`/api/method/hambaft.hambaft.api.get_goals?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          goals.value = data.data.goals
        }
        loading.value = false
      })
      .catch(() => {
        goals.value = [
          { name: 'g1', title: 'Learn Spanish', category: 'learning', status: 'active', target_value: 100, current_value: 65, unit: 'hours', progress_percent: 65, target_date: '2026-08-15' },
          { name: 'g2', title: 'Lose 5kg', category: 'health', status: 'active', target_value: 5, current_value: 2, unit: 'kg', progress_percent: 40, target_date: '2026-09-01' },
          { name: 'g3', title: 'Read 12 books', category: 'learning', status: 'active', target_value: 12, current_value: 9, unit: 'books', progress_percent: 75, target_date: '2026-12-31' },
        ]
        loading.value = false
      })
  }

  function createGoal(goalData) {
    return fetch('/api/method/hambaft.hambaft.api.create_goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: goalData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          goals.value.unshift(data.data.goal)
        }
        return data
      })
  }

  function updateProgress(name, currentValue) {
    return fetch('/api/method/hambaft.hambaft.api.update_goal_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, current_value: currentValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          const idx = goals.value.findIndex((g) => g.name === name)
          if (idx !== -1) goals.value[idx] = data.data.goal
        }
        return data
      })
  }

  return { goals, loading, fetchGoals, createGoal, updateProgress }
})
