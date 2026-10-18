<template>
  <aside class="conv-sidebar">
    <!-- 新建会话 -->
    <button class="conv-new" :disabled="loading" @click="$emit('new')">
      <el-icon><Plus /></el-icon>
      新建对话
    </button>

    <!-- 会话列表 -->
    <div class="conv-list">
      <div v-if="loading" class="conv-empty">加载中…</div>
      <div v-else-if="!conversations.length" class="conv-empty">
        暂无对话记录
      </div>
      <div
        v-for="conv in conversations"
        :key="conv.id"
        class="conv-item"
        :class="{ 'conv-item--active': conv.id === activeId }"
        @click="$emit('select', conv.id)"
      >
        <div class="conv-item__title">{{ conv.title || '新对话' }}</div>
        <div class="conv-item__time">{{ formatTime(conv.updateTime || conv.createTime) }}</div>
        <button
          class="conv-item__del"
          title="删除此对话"
          @click.stop="$emit('delete', conv.id)"
        >
          <el-icon><Delete /></el-icon>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { Plus, Delete } from '@element-plus/icons-vue'

defineProps({
  conversations: { type: Array, default: () => [] },
  activeId: { type: [Number, String, null], default: null },
  loading: { type: Boolean, default: false }
})

defineEmits(['new', 'select', 'delete'])

const formatTime = (time) => {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  if (sameDay) return `今天 ${hh}:${mm}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hh}:${mm}`

  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays < 7) return `${diffDays}天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<style scoped>
.conv-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  overflow: hidden;
}

.conv-new {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid var(--brand-primary);
  background: var(--brand-primary-soft);
  color: var(--brand-primary-active);
  border-radius: var(--brand-radius);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.conv-new:hover:not(:disabled) {
  background: var(--brand-primary);
  color: #fff;
}

.conv-new:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.conv-empty {
  text-align: center;
  color: var(--brand-text-secondary);
  font-size: 12.5px;
  padding: 20px 0;
}

.conv-item {
  position: relative;
  padding: 9px 12px;
  border-radius: var(--brand-radius-sm);
  cursor: pointer;
  transition: background 0.15s ease;
  border: 1px solid transparent;
}

.conv-item:hover {
  background: var(--brand-bg-soft);
}

.conv-item--active {
  background: var(--brand-primary-soft);
  border-color: rgba(216, 168, 173, 0.3);
}

.conv-item__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 22px;
}

.conv-item__time {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
  margin-top: 2px;
}

.conv-item__del {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  background: none;
  color: var(--brand-text-secondary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s ease;
}

.conv-item:hover .conv-item__del {
  opacity: 0.7;
}

.conv-item__del:hover {
  opacity: 1;
  color: var(--brand-primary-active);
  background: rgba(216, 168, 173, 0.1);
}
</style>
