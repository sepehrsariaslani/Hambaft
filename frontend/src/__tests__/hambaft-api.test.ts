import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  callMock,
  checkFrappeSessionMock,
  createDocMock,
  deleteDocMock,
  updateDocMock,
} = vi.hoisted(() => ({
  callMock: vi.fn(),
  checkFrappeSessionMock: vi.fn(),
  createDocMock: vi.fn(),
  deleteDocMock: vi.fn(),
  updateDocMock: vi.fn(),
}))

vi.mock('../app/frappe', () => ({
  call: callMock,
  checkFrappeSession: checkFrappeSessionMock,
  createDoc: createDocMock,
  deleteDoc: deleteDocMock,
  updateDoc: updateDocMock,
}))

import {
  updateDocumentRecord,
  updateMindfulnessRecord,
  updateNutritionRecord,
  updateWorkoutRecord,
  logWaterRecord,
} from '../app/hambaft-api'

describe('hambaft API contracts', () => {
  beforeEach(() => {
    callMock.mockReset()
    checkFrappeSessionMock.mockReset()
    createDocMock.mockReset()
    deleteDocMock.mockReset()
    updateDocMock.mockReset()
  })

  it('updates documents through the hambaft backend endpoint', async () => {
    callMock.mockResolvedValue({ ok: true })

    await updateDocumentRecord('DOC-1', {
      title: 'بیمه عمر',
      type: 'insurance',
      description: 'تمدید شد',
      tags: ['مهم'],
      notes: 'نسخه جدید',
    })

    expect(callMock).toHaveBeenCalledWith('hambaft.hambaft.api.update_document', {
      name: 'DOC-1',
      data: expect.objectContaining({
        title: 'بیمه عمر',
        document_type: 'insurance',
        description: 'تمدید شد',
        tags: ['مهم'],
        notes: 'نسخه جدید',
      }),
    })
  })

  it('updates mindfulness sessions through the dedicated endpoint', async () => {
    callMock.mockResolvedValue({ ok: true })

    await updateMindfulnessRecord('MS-1', {
      date: '2026-07-06',
      type: 'meditation',
      durationMinutes: 12,
      stressLevelBefore: 6,
      stressLevelAfter: 2,
      notes: 'جلسه عصر',
    })

    expect(callMock).toHaveBeenCalledWith('hambaft.hambaft.api.update_mindfulness_session', {
      name: 'MS-1',
      data: {
        session_date: '2026-07-06',
        session_type: 'meditation',
        duration_minutes: 12,
        stress_before: 6,
        stress_after: 2,
        notes: 'جلسه عصر',
      },
    })
  })

  it('updates nutrition logs through the dedicated endpoint', async () => {
    callMock.mockResolvedValue({ ok: true })

    await updateNutritionRecord('NL-1', {
      date: '2026-07-06',
      time: '13:00',
      type: 'lunch',
      foods: 'مرغ و برنج',
      calories: 620,
      protein: 40,
      carbs: 55,
      fat: 18,
      waterGlasses: 2,
    })

    expect(callMock).toHaveBeenCalledWith('hambaft.hambaft.api.update_nutrition_log', {
      name: 'NL-1',
      data: {
        log_date: '2026-07-06',
        log_time: '13:00',
        meal_type: 'lunch',
        foods: 'مرغ و برنج',
        calories: 620,
        protein: 40,
        carbs: 55,
        fat: 18,
        water_glasses: 2,
      },
    })
  })

  it('updates workout logs through the dedicated endpoint', async () => {
    callMock.mockResolvedValue({ ok: true })

    await updateWorkoutRecord('WL-1', {
      date: '2026-07-06',
      type: 'strength',
      durationMinutes: 45,
      caloriesBurned: 300,
      gymSets: [
        {
          id: 'SET-1',
          exerciseName: 'اسکوات',
          weight: 80,
          reps: 8,
          sets: 3,
        },
      ],
      notes: 'روز پا',
    })

    expect(callMock).toHaveBeenCalledWith('hambaft.hambaft.api.update_workout_log', {
      name: 'WL-1',
      data: {
        workout_date: '2026-07-06',
        workout_type: 'strength',
        cardio_type: undefined,
        distance_km: undefined,
        duration_minutes: 45,
        calories_burned: 300,
        gym_sets: [
          {
            id: 'SET-1',
            exerciseName: 'اسکوات',
            weight: 80,
            reps: 8,
            sets: 3,
          },
        ],
        notes: 'روز پا',
      },
    })
  })

  it('syncs water intake through the frappe water endpoint', async () => {
    callMock.mockResolvedValue({ ok: true })

    await logWaterRecord(7, '2026-07-06')

    expect(callMock).toHaveBeenCalledWith('hambaft.hambaft.api.log_water', {
      date: '2026-07-06',
      amount_ml: 1750,
    })
  })
})
