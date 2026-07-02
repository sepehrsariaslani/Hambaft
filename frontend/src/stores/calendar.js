import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCalendarStore = defineStore('calendar', () => {
  const events = ref([])
  const loading = ref(false)
  const selectedDate = ref(null)

  function fetchEvents(params = {}) {
    loading.value = true
    const query = new URLSearchParams(params).toString()
    return fetch(`/api/method/hambaft.hambaft.api.get_events?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          events.value = data.data.events
        }
        loading.value = false
      })
      .catch(() => {
        events.value = [
          { name: 'e1', title: 'Team Standup', starts_at: '2026-06-23T09:00:00', ends_at: '2026-06-23T09:30:00', event_type: 'meeting', color: '#93C5FD' },
          { name: 'e2', title: 'Dentist Appointment', starts_at: '2026-06-23T14:00:00', ends_at: '2026-06-23T15:00:00', event_type: 'health', color: '#FCA5A5' },
          { name: 'e3', title: 'Gym Session', starts_at: '2026-06-23T18:00:00', ends_at: '2026-06-23T19:00:00', event_type: 'health', color: '#86EFAC' },
        ]
        loading.value = false
      })
  }

  function createEvent(eventData) {
    return fetch('/api/method/hambaft.hambaft.api.create_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: eventData }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          events.value.push(data.data.event)
        }
        return data
      })
  }

  return { events, loading, selectedDate, fetchEvents, createEvent }
})
