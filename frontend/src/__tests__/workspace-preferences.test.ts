import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CALENDAR_PREFERENCES,
  DEFAULT_CUSTOM_CALENDARS,
  DEFAULT_CUSTOM_EXERCISES,
  DEFAULT_FINANCE_QUICK_TEMPLATES,
  DEFAULT_NOTION_PAGES,
  DEFAULT_SLEEP_PREFERENCES,
  parseCalendarPreferences,
  parseCustomCalendars,
  parseCustomExercises,
  parseFinanceQuickTemplates,
  parseNotionPages,
  parseSleepPreferences,
} from '../app/workspace-preferences'

describe('workspace preferences', () => {
  it('falls back to defaults when settings JSON is empty or invalid', () => {
    expect(parseSleepPreferences(undefined)).toEqual(DEFAULT_SLEEP_PREFERENCES)
    expect(parseNotionPages('{')).toEqual(DEFAULT_NOTION_PAGES)
    expect(parseCustomExercises(null)).toEqual(DEFAULT_CUSTOM_EXERCISES)
    expect(parseFinanceQuickTemplates('bad-json')).toEqual(DEFAULT_FINANCE_QUICK_TEMPLATES)
    expect(parseCalendarPreferences('')).toEqual(DEFAULT_CALENDAR_PREFERENCES)
    expect(parseCustomCalendars('oops')).toEqual(DEFAULT_CUSTOM_CALENDARS)
  })

  it('reads valid JSON payloads from settings', () => {
    expect(parseSleepPreferences('{"targetWakeTime":"07:15","targetSleepDuration":7,"birthdate":"1995-03-21"}')).toMatchObject({
      targetWakeTime: '07:15',
      targetSleepDuration: 7,
      birthdate: '1995-03-21',
    })

    expect(parseCustomExercises('["اسکوات","ددلیفت"]')).toEqual(['اسکوات', 'ددلیفت'])

    expect(parseCalendarPreferences('{"weeklyDaysCount":5,"timelineFullDay":true,"showEvents":false}')).toMatchObject({
      weeklyDaysCount: 5,
      timelineFullDay: true,
      showEvents: false,
    })
  })
})
