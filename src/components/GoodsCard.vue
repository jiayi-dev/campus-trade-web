<template>
  <!-- 商品卡片：点击卡片整体进入商品详情 -->
  <div
      class="goods-card"
      :class="{ 'is-offline': !onSale }"
      @click="goDetail"
  >

    <!-- 封面区 -->
    <div class="goods-card__cover" :class="`cover--${coverTheme}`">
      <el-icon class="goods-card__cover-icon"><ShoppingBag /></el-icon>
      <span class="goods-card__cover-category">{{ categoryName || '未分类' }}</span>

      <el-tag
          class="goods-card__status"
          :type="onSale ? 'success' : 'info'"
          size="small"
          round
      >
        {{ onSale ? '在售' : '已下架' }}
      </el-tag>
    </div>

    <!-- 信息区 -->
    <div class="goods-card__body">
      <div class="goods-card__name" :title="goods.goodsName">
        {{ goods.goodsName }}
      </div>

      <div class="goods-card__desc" :title="goods.description">
        {{ goods.description || '这个卖家很懒，暂时没有填写商品描述' }}
      </div>

      <div class="goods-card__meta">
        <span class="goods-card__price price-text">
          {{ formatPrice(goods.price) }}
        </span>
        <span class="goods-card__time">
          <el-icon><Clock /></el-icon>
          {{ formatRelativeTime(goods.createTime) }}
        </span>
      </div>

      <!-- 管理操作：仅商品归属人可见（真正的权限由后端兜底）；阻止冒泡，避免点编辑也跳进详情 -->
      <div v-if="editable" class="goods-card__actions" @click.stop>
        <el-button type="primary" link @click="$emit('edit', goods.goodsId)">
          <el-icon><EditPen /></el-icon>编辑
        </el-button>
        <el-button type="danger" link @click="$emit('delete', goods.goodsId)">
          <el-icon><Delete /></el-icon>删除
        </el-button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ShoppingBag, Clock, EditPen, Delete } from '@element-plus/icons-vue'
import { formatPrice, formatRelativeTime } from '../utils/format'

const router = useRouter()

const props = defineProps({
  // 商品对象
  goods: {
    type: Object,
    required: true
  },
  // 父组件根据分类列表映射出的分类名称
  categoryName: {
    type: String,
    default: ''
  },
  // 是否展示编辑/删除操作（归属人可见；权限最终由后端校验）
  editable: {
    type: Boolean,
    default: true
  }
})

defineEmits(['edit', 'delete'])

// 进入商品详情 /goods/:id
const goDetail = () => {
  router.push(`/goods/${props.goods.goodsId}`)
}

// status === 1 为在售，其余视为下架
const onSale = computed(() => props.goods.status === 1)

// 封面配色按分类轮转（颜色全部取自全局设计令牌，不额外引入新色）
const coverThemes = ['teal', 'blue', 'purple', 'orange']
const coverTheme = computed(() => {
  const seed = props.goods.categoryId ?? props.goods.goodsId ?? 0
  return coverThemes[Math.abs(seed) % coverThemes.length]
})
</script>

<style scoped>

.goods-card {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
}

.goods-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--brand-shadow);
}

/* 封面 */
.goods-card__cover {
  position: relative;
  height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.cover--teal {
  background: linear-gradient(135deg, #d9f0f0 0%, #eef8f7 100%);
  color: var(--brand-primary);
}

.cover--blue {
  background: linear-gradient(135deg, #e3eefc 0%, #f2f7fe 100%);
  color: #3b82f6;
}

.cover--purple {
  background: linear-gradient(135deg, #ece7fc 0%, #f6f3fe 100%);
  color: #8b5cf6;
}

.cover--orange {
  background: linear-gradient(135deg, #ffe9dc 0%, #fff4ec 100%);
  color: var(--brand-accent);
}

.goods-card__cover-icon {
  font-size: 34px;
  opacity: 0.55;
}

.goods-card__cover-category {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  opacity: 0.85;
}

.goods-card__status {
  position: absolute;
  top: 10px;
  right: 10px;
}

/* 信息区 */
.goods-card__body {
  padding: 14px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
}

.goods-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}

.goods-card__desc {
  font-size: 12.5px;
  color: var(--brand-text-secondary);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goods-card__meta {
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.goods-card__price {
  font-size: 19px;
}

.goods-card__time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.goods-card__actions {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed var(--brand-border);
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.goods-card__actions .el-button {
  font-size: 13px;
}

.goods-card__actions .el-icon {
  margin-right: 2px;
}

/* 下架商品弱化 */
.goods-card.is-offline {
  opacity: 0.72;
}

.goods-card.is-offline .goods-card__name {
  color: var(--brand-text-secondary);
}

</style>
