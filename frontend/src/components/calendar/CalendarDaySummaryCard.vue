<template>
  <section class="calendar-day-summary">
    <div>
      <p class="calendar-day-summary__eyebrow">{{ headline }}</p>
      <h3 class="calendar-day-summary__score">{{ scoreLabel }}</h3>
      <p class="calendar-day-summary__caption">جمع‌بندی هوشمند برای برنامه، کار، عادت و مالی</p>
    </div>

    <div class="calendar-day-summary__stats">
      <article class="calendar-day-summary__stat">
        <span>رویداد</span>
        <strong>{{ toPersianDigits(bundle?.summary_counts?.events || 0) }}</strong>
      </article>
      <article class="calendar-day-summary__stat">
        <span>کار</span>
        <strong>{{ toPersianDigits((bundle?.summary_counts?.timed_tasks || 0) + (bundle?.summary_counts?.untimed_tasks || 0)) }}</strong>
      </article>
      <article class="calendar-day-summary__stat">
        <span>عادت</span>
        <strong>{{ toPersianDigits(bundle?.summary_counts?.habits_done || 0) }}/{{ toPersianDigits(bundle?.summary_counts?.habits_due || 0) }}</strong>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { toPersianDigits } from '@/utils/jalali'

const props = defineProps({
  bundle: {
    type: Object,
    default: null,
  },
  headline: {
    type: String,
    default: '',
  },
})

const scoreLabel = computed(() => `${toPersianDigits(props.bundle?.day_score ?? 0)} از ۱۰`)
</script>

<style scoped>
.calendar-day-summary {
  display: grid;
  gap: 16px;
  border-radius: 28px;
  padding: 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.74) 0%, rgba(255, 244, 232, 0.92) 100%);
  box-shadow: 0 20px 42px rgba(122, 94, 54, 0.08);
}

.calendar-day-summary__eyebrow,
.calendar-day-summary__caption {
  margin: 0;
  color: var(--color-text-secondary);
}

.calendar-day-summary__eyebrow {
  font-size: 0.78rem;
}

.calendar-day-summary__score {
  margin: 8px 0 4px;
  font-size: clamp(1.8rem, 5vw, 2.8rem);
  line-height: 1;
  color: var(--color-text);
}

.calendar-day-summary__caption {
  font-size: 0.75rem;
}

.calendar-day-summary__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.calendar-day-summary__stat {
  border-radius: 20px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.calendar-day-summary__stat span {
  display: block;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.calendar-day-summary__stat strong {
  display: block;
  margin-top: 6px;
  font-size: 1rem;
  color: var(--color-text);
}
</style>
