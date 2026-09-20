<template>
  <!-- 商品卡片：点击卡片整体进入商品详情 -->
  <div
      class="goods-card"
      :class="{ 'is-offline': !onSale }"
      @click="goDetail"
  >

    <!-- 封面区：有主图显示图片，无图用分类色块占位 -->
    <div class="goods-card__cover" :class="`cover--${coverTheme}`">
      <img
          v-if="goods.imageUrl"
          :src="goods.imageUrl"
          :alt="goods.goodsName"
          class="goods-card__image"
          @error="handleImgError"
      />
      <template v-else>
        <el-icon class="goods-card__cover-icon"><ShoppingBag /></el-icon>
        <span class="goods-card__cover-category">{{ categoryName || '未分类' }}</span>
      </template>

      <!-- 状态徽标：仅在已下架时显示 -->
      <el-tag
          v-if="!onSale"
          class="goods-card__status"
          type="info"
          size="small"
          round
      >
        已下架
      </el-tag>

      <!-- 成色徽标：左上角 -->
      <span
          v-if="goods.conditionLevel"
          class="goods-card__condition"
          :class="`condition--${goods.conditionLevel}`"
      >
        {{ conditionLabel }}
      </span>
    </div>

    <!-- 信息区 -->
    <div class="goods-card__body">
      <div class="goods-card__name" :title="goods.goodsName">
        {{ goods.goodsName }}
      </div>

      <div class="goods-card__desc" :title="goods.description">
        {{ goods.description || '这个卖家很懒，暂时没有填写商品描述' }}
      </div>

      <!-- 标签行：分类 + 校区 -->
      <div class="goods-card__tags">
        <span v-if="categoryName" class="goods-card__tag tag--category">
          <el-icon><Folder /></el-icon>{{ categoryName }}
        </span>
        <span v-if="goods.campus" class="goods-card__tag tag--campus">
          <el-icon><Location /></el-icon>{{ goods.campus }}
        </span>
      </div>

      <!-- 价格 + 底部 meta -->
      <div class="goods-card__meta">
        <span class="goods-card__price price-text">
          {{ formatPrice(goods.price) }}
        </span>
        <div class="goods-card__stats">
          <span class="stat-item" :title="`收藏 ${goods.favoriteCount ?? 0}`">
            <el-icon><Star /></el-icon>{{ goods.favoriteCount ?? 0 }}
          </span>
          <span class="stat-item" :title="`浏览 ${goods.viewCount ?? 0}`">
            <el-icon><View /></el-icon>{{ goods.viewCount ?? 0 }}
          </span>
        </div>
      </div>

      <!-- 面交地点 + 发布时间 -->
      <div class="goods-card__foot">
        <span v-if="goods.location" class="goods-card__location" :title="goods.location">
          <el-icon><Position /></el-icon>{{ goods.location }}
        </span>
        <span class="goods-card__time">
          <el-icon><Clock /></el-icon>{{ formatRelativeTime(goods.createTime) }}
        </span>
      </div>

      <!-- 管理操作：仅商品归属人可见（真正的权限由后端兜底）；阻止冒泡，避免点编辑也跳进详情 -->
      <div v-if="editable" class="goods-card__actions" @click.stop>
        <el-button type="primary" link size="small" @click="$emit('edit', goods.goodsId)">
          <el-icon><EditPen /></el-icon>编辑
        </el-button>
        <el-button type="danger" link size="small" @click="$emit('delete', goods.goodsId)">
          <el-icon><Delete /></el-icon>删除
        </el-button>
      </div>
    </div>

  </div>
</template>


<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ShoppingBag, Clock, EditPen, Delete,
  Star, View, Location, Position, Folder
} from '@element-plus/icons-vue'
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

// 成色字典（与后端 TINYINT 一致）
const CONDITION_MAP = {
  1: '全新',
  2: '99新',
  3: '95新',
  4: '9成新',
  5: '8成新'
}
const conditionLabel = computed(
    () => CONDITION_MAP[props.goods.conditionLevel] || ''
)

// 封面配色按分类轮转（莫兰迪色系，与全局设计令牌一致）
const coverThemes = ['cream', 'rose', 'lavender', 'sage']
const coverTheme = computed(() => {
  const seed = props.goods.categoryId ?? props.goods.goodsId ?? 0
  return coverThemes[Math.abs(seed) % coverThemes.length]
})

// 图片加载失败时切换到色块占位
const imgError = ref(false)
const handleImgError = () => {
  imgError.value = true
}
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
  height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
}

/* 莫兰迪色系封面（无图占位） */
.cover--cream {
  background: linear-gradient(135deg, #f5efe6 0%, #fbf6ed 100%);
  color: #a89880;
}

.cover--rose {
  background: linear-gradient(135deg, #f4dcd8 0%, #fbeae7 100%);
  color: #b08380;
}

.cover--lavender {
  background: linear-gradient(135deg, #d8d4e0 0%, #ebe7f0 100%);
  color: #7d7593;
}

.cover--sage {
  background: linear-gradient(135deg, #c8d4cb 0%, #e2ebe4 100%);
  color: #6b8470;
}

.goods-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.goods-card__cover-icon {
  font-size: 36px;
  opacity: 0.55;
}

.goods-card__cover-category {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  opacity: 0.85;
}

.goods-card__status {
  position: absolute;
  top: 10px;
  right: 10px;
}

/* 成色徽标 */
.goods-card__condition {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  color: #fff;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.condition--1 { background: #7d9d7a; }  /* 全新：莫兰迪绿 */
.condition--2 { background: #b8a55a; }  /* 99新：莫兰迪黄 */
.condition--3 { background: #c79564; }  /* 95新：莫兰迪橙 */
.condition--4 { background: #a58880; }  /* 9成新：莫兰迪棕 */
.condition--5 { background: #9a9590; }  /* 8成新及以下：莫兰迪灰 */

/* 信息区 */
.goods-card__body {
  padding: 12px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.goods-card__name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--brand-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}

.goods-card__desc {
  font-size: 12px;
  color: var(--brand-text-secondary);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 标签行 */
.goods-card__tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.goods-card__tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  font-size: 11px;
  border-radius: 10px;
  background: var(--brand-bg-soft, #f5f3ef);
  color: var(--brand-text-secondary);
}

.goods-card__tag .el-icon {
  font-size: 11px;
}

.tag--campus {
  background: #e7e3f0;
  color: #6b6480;
}

/* 价格 + 收藏/浏览 */
.goods-card__meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.goods-card__price {
  font-size: 18px;
  font-weight: 700;
}

.goods-card__stats {
  display: flex;
  gap: 10px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.stat-item .el-icon {
  font-size: 12px;
}

/* 面交地点 + 时间 */
.goods-card__foot {
  margin-top: 2px;
  padding-top: 6px;
  border-top: 1px dashed var(--brand-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.goods-card__location,
.goods-card__time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50%;
}

.goods-card__time {
  margin-left: auto;
}

.goods-card__actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--brand-border);
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.goods-card__actions .el-button {
  font-size: 12px;
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
