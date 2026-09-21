<template>
  <!-- 统一的统计卡片：图标 + 指标名称 + 数值，供各数据看板复用 -->
  <div class="stat-card" :class="`stat-card--${theme}`">
    <div class="stat-card__icon">
      <slot name="icon" />
    </div>
    <div class="stat-card__body">
      <div class="stat-card__label">{{ label }}</div>
      <div class="stat-card__value is-num">
        <span v-if="prefix" class="stat-card__prefix">{{ prefix }}</span>{{ displayValue }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 指标名称
  label: {
    type: String,
    required: true
  },
  // 指标数值
  value: {
    type: [String, Number],
    default: 0
  },
  // 数值前缀（如 ¥）
  prefix: {
    type: String,
    default: ''
  },
  // 主题色：teal / orange / blue / purple
  theme: {
    type: String,
    default: 'teal'
  }
})

// null / undefined 统一显示为 0
const displayValue = computed(() => props.value ?? 0)
</script>

<style scoped>

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--brand-shadow);
}

.stat-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  flex-shrink: 0;
}

.stat-card__label {
  font-size: 13.5px;
  color: var(--brand-text-secondary);
  margin-bottom: 8px;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--brand-text);
  line-height: 1;
}

.stat-card__prefix {
  font-size: 18px;
  margin-right: 2px;
}

/* 四种主题色（图标底色 + 图标颜色，莫兰迪低饱和） */
.stat-card--teal .stat-card__icon {
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
}

.stat-card--orange .stat-card__icon {
  background: var(--brand-accent-soft);
  color: var(--brand-accent);
}

.stat-card--orange .stat-card__prefix {
  color: var(--brand-accent);
}

.stat-card--blue .stat-card__icon {
  background: var(--brand-aux-soft);
  color: var(--brand-aux);
}

.stat-card--purple .stat-card__icon {
  background: var(--brand-accent-soft);
  color: var(--brand-accent-hover);
}

</style>
