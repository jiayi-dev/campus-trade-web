<template>
  <!--
    商品详情页预览（发布向导专用）
    复刻 GoodsDetail.vue 的视觉结构与样式（Gallery / 标签 / 价格 / 交易信息 / 描述 / 卖家区），
    数据全部来自 props（即发布表单当前值与已上传图片），只读展示：
    - 不请求商品接口、不创建商品、不提交表单、不写库；
    - 浏览/收藏为 0，状态固定"在售中"，卖家区展示当前登录用户占位；
    - 关闭弹窗不影响向导表单与图片状态。
  -->
  <el-dialog
      :model-value="modelValue"
      title="详情页效果预览"
      width="880px"
      top="4vh"
      class="gdp-dialog"
      @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 预览来源说明：明确不是已发布的真实商品 -->
    <div class="gdp-tip">
      <el-icon><View /></el-icon>
      预览数据来自当前表单，商品尚未发布；发布后将呈现与此一致的商品详情页。
    </div>

    <div class="gdp-layout">

      <!-- 左：图片 Gallery + 商品信息 + 描述（与详情页同构） -->
      <div class="gdp-main">
        <div v-if="safeUrls.length > 0" class="gdp-gallery">
          <div class="gdp-gallery__stage">
            <el-image
                :key="safeUrls[activeIndex]"
                :src="safeUrls[activeIndex]"
                :alt="`${goodsName || '商品'} 图片${activeIndex + 1}`"
                fit="contain"
                class="gdp-gallery__image"
                :preview-src-list="safeUrls"
                :initial-index="activeIndex"
                preview-teleported
                @error="removeImage(activeIndex)"
            />

            <template v-if="safeUrls.length > 1">
              <button type="button" class="gdp-gallery__arrow gdp-gallery__arrow--prev" @click.stop="prevImage">
                <el-icon><ArrowLeft /></el-icon>
              </button>
              <button type="button" class="gdp-gallery__arrow gdp-gallery__arrow--next" @click.stop="nextImage">
                <el-icon><ArrowRight /></el-icon>
              </button>
            </template>

            <span class="gdp-gallery__counter">{{ activeIndex + 1 }} / {{ safeUrls.length }}</span>
            <span v-if="activeIndex === 0" class="gdp-gallery__primary-badge">封面</span>
          </div>

          <div v-if="safeUrls.length > 1" class="gdp-gallery__thumbs">
            <button
                v-for="(url, index) in safeUrls"
                :key="url"
                type="button"
                class="gdp-gallery__thumb"
                :class="{ 'gdp-gallery__thumb--active': index === activeIndex }"
                @click="activeIndex = index"
            >
              <img :src="url" :alt="`缩略图${index + 1}`" @error="removeImage(index)" />
            </button>
          </div>
        </div>

        <!-- 无图：与详情页一致的莫兰迪色块兜底 -->
        <div v-else class="gdp-gallery__fallback" :class="`cover--${coverTheme}`">
          <el-icon><ShoppingBag /></el-icon>
          <span>{{ categoryName || '未分类' }}</span>
          <em>还没有上传商品图片</em>
        </div>

        <div class="gdp-info">
          <div class="gdp-info__tags">
            <el-tag size="small" type="info" effect="plain">
              {{ categoryName || '未分类' }}
            </el-tag>
            <el-tag v-if="conditionText" size="small" effect="plain" class="gdp-condition-tag">
              {{ conditionText }}
            </el-tag>
            <el-tag size="small" type="success">在售中</el-tag>
          </div>

          <h1 class="gdp-info__name">{{ goodsName || '商品标题会显示在这里' }}</h1>

          <div class="gdp-info__price price-text">{{ formatPrice(price ?? 0) }}</div>

          <div class="gdp-info__meta">
            <div class="gdp-meta-item">
              <el-icon><School /></el-icon>
              <span class="gdp-meta-item__label">交易校区</span>
              <span class="gdp-meta-item__value">{{ campus || '卖家未填写' }}</span>
            </div>
            <div class="gdp-meta-item">
              <el-icon><Location /></el-icon>
              <span class="gdp-meta-item__label">面交地点</span>
              <span class="gdp-meta-item__value">{{ location || '卖家未填写' }}</span>
            </div>
            <div class="gdp-meta-item">
              <el-icon><Clock /></el-icon>
              <span class="gdp-meta-item__label">发布时间</span>
              <span class="gdp-meta-item__value">{{ formatDateTime(new Date()) }}</span>
            </div>
            <div class="gdp-meta-item">
              <el-icon><View /></el-icon>
              <span class="gdp-meta-item__label">浏览 / 收藏</span>
              <span class="gdp-meta-item__value">0 次浏览 · 0 人收藏</span>
            </div>
          </div>
        </div>

        <div class="gdp-section">
          <h3 class="gdp-section__title">
            <el-icon><Document /></el-icon>商品描述
          </h3>
          <div class="gdp-section__desc">
            {{ description || '卖家暂时没有填写商品描述' }}
          </div>
        </div>
      </div>

      <!-- 右：卖家信息占位（发布后展示真实卖家与联系方式） -->
      <div class="gdp-side">
        <div class="gdp-seller">
          <h3 class="gdp-section__title">
            <el-icon><User /></el-icon>卖家信息
          </h3>
          <div class="gdp-seller__head">
            <div class="gdp-seller__avatar">{{ sellerLetter }}</div>
            <div>
              <div class="gdp-seller__name">{{ sellerName || '我' }}</div>
              <el-tag size="small" type="warning" effect="plain">卖家</el-tag>
            </div>
          </div>
          <div class="gdp-seller__hint">
            <el-icon><Lock /></el-icon>
            发布后这里会展示你的联系方式，买家可留言或发起私聊。
          </div>
        </div>

        <div class="gdp-action">
          <el-button type="primary" size="large" class="gdp-action__btn" disabled>
            <el-icon><ShoppingCart /></el-icon>立即购买
          </el-button>
          <el-button size="large" class="gdp-action__btn" disabled>
            <el-icon><Star /></el-icon>收藏商品
          </el-button>
          <div class="gdp-action__tip">买家视角的操作按钮，发布后自动生效</div>
        </div>
      </div>

    </div>
  </el-dialog>
</template>


<script setup>
import { ref, computed, watch } from 'vue'
import {
  ArrowLeft, ArrowRight, ShoppingBag, School, Location, Clock,
  View, Document, User, Lock, ShoppingCart, Star
} from '@element-plus/icons-vue'
import { formatPrice, formatDateTime } from '../utils/format'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  goodsName: { type: String, default: '' },
  categoryName: { type: String, default: '' },
  conditionLevel: { type: Number, default: null },
  price: { type: Number, default: null },
  campus: { type: String, default: '' },
  location: { type: String, default: '' },
  description: { type: String, default: '' },
  imageUrls: { type: Array, default: () => [] },
  sellerName: { type: String, default: '' }
})

defineEmits(['update:modelValue'])

// 成色口径与详情页 CONDITION_MAP 一致
const CONDITION_MAP = { 1: '全新', 2: '99新', 3: '95新', 4: '9成新', 5: '8成新及以下' }
const conditionText = computed(() => CONDITION_MAP[props.conditionLevel] || '')

const sellerLetter = computed(() => (props.sellerName || '我').charAt(0).toUpperCase())

// 封面兜底色：与详情页同一套主题轮转
const coverTheme = computed(() => {
  const themes = ['cream', 'rose', 'yellow', 'sage']
  const seed = props.goodsName.length + props.imageUrls.length
  return themes[seed % themes.length]
})

// Gallery：打开时重置，图片加载失败自动剔除（与详情页同策略）
const activeIndex = ref(0)
const failedUrls = ref(new Set())

const safeUrls = computed(() => props.imageUrls.filter((_, i) => !failedUrls.value.has(i)))

watch(() => props.modelValue, (open) => {
  if (open) {
    activeIndex.value = 0
    failedUrls.value = new Set()
  }
})

const removeImage = (index) => {
  const next = new Set(failedUrls.value)
  next.add(index)
  failedUrls.value = next
  if (activeIndex.value >= safeUrls.value.length) {
    activeIndex.value = Math.max(0, safeUrls.value.length - 1)
  }
}

const prevImage = () => {
  const len = safeUrls.value.length
  if (len < 2) return
  activeIndex.value = (activeIndex.value - 1 + len) % len
}

const nextImage = () => {
  const len = safeUrls.value.length
  if (len < 2) return
  activeIndex.value = (activeIndex.value + 1) % len
}
</script>


<style scoped>
/* 预览来源提示 */
.gdp-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 9px 14px;
  border-radius: var(--brand-radius);
  background: var(--brand-primary-soft);
  border: 1px solid #f0d9dc;
  color: var(--brand-primary-active);
  font-size: 12.5px;
  line-height: 1.6;
}

.gdp-tip .el-icon {
  flex-shrink: 0;
}

/* 布局：与详情页 1fr + 300px 两栏一致，弹窗内等比缩小 */
.gdp-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 18px;
  align-items: start;
}

.gdp-main {
  min-width: 0;
}

/* Gallery */
.gdp-gallery__stage {
  position: relative;
  width: 100%;
  height: 320px;
  border-radius: var(--brand-radius-lg);
  overflow: hidden;
  background: #f7f1e8;
}

.gdp-gallery__image {
  width: 100%;
  height: 100%;
}

.gdp-gallery__image :deep(.el-image__inner) {
  cursor: zoom-in;
}

.gdp-gallery__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--brand-text);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.25s ease, background 0.25s ease;
  box-shadow: 0 2px 10px rgba(90, 70, 50, 0.14);
  z-index: 2;
}

.gdp-gallery__stage:hover .gdp-gallery__arrow {
  opacity: 1;
}

.gdp-gallery__arrow:hover {
  background: #fff;
}

.gdp-gallery__arrow--prev { left: 12px; }
.gdp-gallery__arrow--next { right: 12px; }

.gdp-gallery__counter {
  position: absolute;
  right: 12px;
  bottom: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(60, 50, 40, 0.55);
  color: #fff;
  font-size: 12px;
  letter-spacing: 0.5px;
  z-index: 2;
}

.gdp-gallery__primary-badge {
  position: absolute;
  left: 12px;
  top: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--brand-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  z-index: 2;
}

.gdp-gallery__thumbs {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gdp-gallery__thumb {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--brand-radius, 10px);
  overflow: hidden;
  background: #f7f1e8;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.gdp-gallery__thumb:hover { opacity: 1; }

.gdp-gallery__thumb--active {
  border-color: var(--brand-primary);
  opacity: 1;
}

.gdp-gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 无图兜底（与详情页同一套莫兰迪配色） */
.gdp-gallery__fallback {
  width: 100%;
  height: 260px;
  border-radius: var(--brand-radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}

.gdp-gallery__fallback .el-icon {
  font-size: 48px;
  opacity: 0.5;
}

.gdp-gallery__fallback em {
  font-style: normal;
  font-size: 12.5px;
  font-weight: 400;
  opacity: 0.75;
}

.cover--cream { background: linear-gradient(135deg, #fdf6e3 0%, #fbf0d8 100%); color: #b8985a; }
.cover--rose  { background: linear-gradient(135deg, #f5d9dc 0%, #fce6e8 100%); color: #c0848a; }
.cover--yellow{ background: linear-gradient(135deg, #f5e4b8 0%, #fbeec8 100%); color: #b8985a; }
.cover--sage  { background: linear-gradient(135deg, #d2d8de 0%, #e2e8ec 100%); color: #70808c; }

/* 商品信息 */
.gdp-info { margin-top: 16px; }

.gdp-info__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gdp-condition-tag {
  color: var(--brand-accent);
  border-color: var(--brand-accent);
}

.gdp-info__name {
  margin: 10px 0 10px;
  font-size: 20px;
  line-height: 1.35;
  color: var(--brand-text);
}

.gdp-info__price {
  font-size: 28px;
  line-height: 1.1;
}

.gdp-info__meta {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 18px;
  padding: 13px 15px;
  border-radius: var(--brand-radius, 10px);
  background: rgba(216, 168, 173, 0.07);
}

.gdp-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  min-width: 0;
}

.gdp-meta-item .el-icon {
  color: var(--brand-primary);
  font-size: 14px;
  flex-shrink: 0;
}

.gdp-meta-item__label {
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

.gdp-meta-item__value {
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 描述 */
.gdp-section { margin-top: 18px; }

.gdp-section__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 15px;
  color: var(--brand-text);
}

.gdp-section__desc {
  color: var(--brand-text-regular);
  line-height: 1.8;
  font-size: 13.5px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 右栏：卖家占位 + 买家操作按钮 */
.gdp-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gdp-seller {
  padding: 14px;
  border-radius: var(--brand-radius-lg);
  border: 1px solid var(--brand-border);
}

.gdp-seller__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gdp-seller__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.gdp-seller__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text);
  margin-bottom: 4px;
}

.gdp-seller__hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 12px;
  padding: 9px 10px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg-soft);
  font-size: 12px;
  line-height: 1.6;
  color: var(--brand-text-secondary);
}

.gdp-seller__hint .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.gdp-action__btn {
  width: 100%;
  margin: 0 0 10px;
}

.gdp-action__tip {
  text-align: center;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
  line-height: 1.6;
}

/* 窄屏：弹窗内两栏堆叠 */
@media (max-width: 760px) {
  .gdp-layout { grid-template-columns: 1fr; }
  .gdp-gallery__stage { height: 240px; }
}
</style>
