<template>
  <article class="calendar-goal-badge">
    <div class="calendar-goal-badge__head">
      <p class="calendar-goal-badge__title">{{ item.title }}</p>
      <span class="calendar-goal-badge__percent">{{ progressLabel }}</span>
    </div>
    <div class="calendar-goal-badge__track">
      <span :style="{ width: `${item.progress_percent || 0}%` }" />
    </div>
    <p class="calendar-goal-badge__subtitle">{{ item.subtitle }}</p>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { toPersianDigits } from '@/utils/jalali'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const progressLabel = computed(() => `${toPersianDigits(Math.round(props.item.progress_percent || 0))}٪`)
</script>

<style scoped>
.calendar-goal-badge {
  border-radius: 22px;
  padding: 14px;
  background: rgba(226, 214, 248, 0.76);
}

.calendar-goal-badge__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.calendar-goal-badge__title,
.calendar-goal-badge__subtitle {
  margin: 0;
}

.calendar-goal-badge__title {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--color-text);
}

.calendar-goal-badge__percent,
.calendar-goal-badge__subtitle {
  font-size: 0.74rem;
  color: var(--color-text-secondary);
}

.calendar-goal-badge__track {
  margin-top: 10px;
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.56);
}

.calendar-goal-badge__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f5b4cc 0%, #bda1f2 100%);
}

.calendar-goal-badge__subtitle {
  margin-top: 8px;
}
</style>
