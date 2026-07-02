import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFinanceStore = defineStore('finance', () => {
  const entries = ref([])
  const summary = ref({ income: 0, expense: 0, balance: 0, by_category: {} })
  const loading = ref(false)

  function fetchEntries(params = {}) {
    loading.value = true
    const query = new URLSearchParams(params).toString()
    return fetch(`/api/method/hambaft.hambaft.api.get_finance_entries?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          entries.value = data.data.entries
          summary.value = { income: data.data.total_income, expense: data.data.total_expense, balance: data.data.total_income - data.data.total_expense, by_category: {} }
        }
        loading.value = false
      })
      .catch(() => {
        entries.value = [
          { name: 'f1', type: 'expense', title: 'Grocery Shopping', amount: 350000, category: 'Food', date: '2026-06-23' },
          { name: 'f2', type: 'income', title: 'Monthly Salary', amount: 12500000, category: 'Salary', date: '2026-06-22' },
          { name: 'f3', type: 'expense', title: 'Transport', amount: 80000, category: 'Transport', date: '2026-06-21' },
          { name: 'f4', type: 'expense', title: 'Coffee', amount: 45000, category: 'Food', date: '2026-06-21' },
        ]
        summary.value = { income: 12500000, expense: 475000, balance: 12025000, by_category: { Food: 395000, Transport: 80000, Salary: 12500000 } }
        loading.value = false
      })
  }

  function createEntry(entryData) {
    return fetch('/api/method/hambaft.hambaft.api.create_finance_entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: entryData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          entries.value.unshift(data.data.entry)
        }
        return data
      })
  }

  return { entries, summary, loading, fetchEntries, createEntry }
})
