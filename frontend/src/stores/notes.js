import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref([])
  const loading = ref(false)

  function fetchNotes(params = {}) {
    loading.value = true
    const query = new URLSearchParams(params).toString()
    return fetch(`/api/method/hambaft.hambaft.api.get_notes?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          notes.value = data.data.notes
        }
        loading.value = false
      })
      .catch(() => {
        notes.value = [
          { name: 'n1', title: 'Shopping List', content: 'Milk, eggs, bread, fruits, vegetables', category: 'general', date: '2026-06-23', is_pinned: true },
          { name: 'n2', title: 'App Ideas', content: 'Build a habit tracker with streaks, a finance app with categories, a meal planner', category: 'idea', date: '2026-06-22', is_pinned: false },
          { name: 'n3', title: 'Meeting Notes', content: 'Discussed Q2 roadmap, assigned tasks to team members', category: 'general', date: '2026-06-20', is_pinned: false },
          { name: 'n4', title: 'Gratitude', content: 'Thankful for health, family, and the opportunity to learn new things', category: 'gratitude', date: '2026-06-19', is_pinned: true },
        ]
        loading.value = false
      })
  }

  function createNote(noteData) {
    return fetch('/api/method/hambaft.hambaft.api.create_note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: noteData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          notes.value.unshift(data.data.note)
        }
        return data
      })
  }

  return { notes, loading, fetchNotes, createNote }
})
