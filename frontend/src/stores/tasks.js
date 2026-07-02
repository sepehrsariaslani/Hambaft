import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([])
  const loading = ref(false)
  const filter = ref('all')

  function fetchTasks(params = {}) {
    loading.value = true
    const query = new URLSearchParams(params).toString()
    return fetch(`/api/method/hambaft.hambaft.api.get_tasks?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          tasks.value = data.data.tasks
        }
        loading.value = false
      })
      .catch(() => {
        // Mock data for offline dev
        tasks.value = [
          { name: 't1', title: 'مرور گزارش مالی ماه', status: 'todo', priority: 'high', due_date: '2026-07-01T14:00:00', description: 'بررسی وضعیت بودجه و مخارج ضروری.' },
          { name: 't2', title: 'هماهنگی وقت دندان‌پزشک', status: 'todo', priority: 'medium', due_date: '2026-07-01T16:00:00', description: 'تماس برای تعیین نوبت هفته‌ی آینده.' },
          { name: 't3', title: 'خرید خانه', status: 'done', priority: 'low', completed_on: '2026-06-30', description: 'اقلام سبک و ضروری.' },
          { name: 't4', title: 'مرور بازخوردهای محصول', status: 'in_progress', priority: 'medium', description: 'یادداشت‌برداری از نکات تکرارشونده.' },
          { name: 't5', title: 'پیاده‌روی عصر', status: 'todo', priority: 'medium', due_date: '2026-07-01T19:00:00', description: '۴۵ دقیقه راه رفتن آرام.' },
        ]
        loading.value = false
      })
  }

  function createTask(taskData) {
    return fetch('/api/method/hambaft.hambaft.api.create_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: taskData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          tasks.value.unshift(data.data.task)
        }
        return data
      })
  }

  function completeTask(name, actualMinutes) {
    return fetch('/api/method/hambaft.hambaft.api.complete_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, actual_minutes: actualMinutes }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          const idx = tasks.value.findIndex((t) => t.name === name)
          if (idx !== -1) tasks.value[idx] = data.data.task
        }
        return data
      })
  }

  function deleteTask(name) {
    return fetch('/api/method/hambaft.hambaft.api.delete_task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then((res) => res.json())
  }

  return { tasks, loading, filter, fetchTasks, createTask, completeTask, deleteTask }
})
