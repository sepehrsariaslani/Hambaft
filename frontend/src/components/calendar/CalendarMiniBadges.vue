<template>
  <div class="calendar-mini-badges">
    <button
      v-for="badge in badges"
      :key="badge.id"
      type="button"
      class="calendar-mini-badges__item"
      :class="`calendar-mini-badges__item--${badge.color_token || 'neutral'}`"
      @click="$emit('select', badge)"
    >
      <component :is="resolveIcon(badge.icon_key)" :size="12" :stroke-width="2.2" />
      <span>{{ badge.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { markRaw } from 'vue'
import { BellRing, Leaf, Target, WalletCards } from 'lucide-vue-next'

defineProps({
  badges: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['select'])

const icons = {
  bell: markRaw(BellRing),
  leaf: markRaw(Leaf),
  target: markRaw(Target),
  wallet: markRaw(WalletCards),
}

function resolveIcon(iconKey) {
  return icons[iconKey] || icons.bell
}
</script>

<style scoped>
.calendar-mini-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.calendar-mini-badges__item {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text);
}

.calendar-mini-badges__item--green {
  background: rgba(184, 213, 135, 0.42);
}

.calendar-mini-badges__item--pink {
  background: rgba(248, 196, 212, 0.42);
}

.calendar-mini-badges__item--purple {
  background: rgba(214, 198, 244, 0.42);
}

.calendar-mini-badges__item--blue {
  background: rgba(187, 210, 250, 0.48);
}

.calendar-mini-badges__item--neutral {
  background: rgba(17, 17, 17, 0.06);
}
</style>
