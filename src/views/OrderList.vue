<template>
  <div class="order-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>交易中心</h2>
        <p>管理你买到的商品与卖出的订单，校园闲置轻松流转</p>
      </div>
      <el-button :icon="Refresh" @click="reload">刷新</el-button>
    </div>

    <!-- 身份切换 + 数量概览 -->
    <div class="overview">
      <div
          class="overview__item"
          :class="{ 'is-active': activeTab === 'buyer' }"
          @click="switchTab('buyer')"
      >
        <div class="overview__icon overview__icon--buyer">
          <el-icon><ShoppingBag /></el-icon>
        </div>
        <div class="overview__meta">
          <div class="overview__label">我买到的</div>
          <div class="overview__count">{{ buyerCount }}</div>
        </div>
      </div>

      <div
          class="overview__item"
          :class="{ 'is-active': activeTab === 'seller' }"
          @click="switchTab('seller')"
      >
        <div class="overview__icon overview__icon--seller">
          <el-icon><Shop /></el-icon>
        </div>
        <div class="overview__meta">
          <div class="overview__label">我卖出的</div>
          <div class="overview__count">{{ sellerCount }}</div>
        </div>
      </div>
    </div>

    <!-- 状态筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="default">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="pending">待交易</el-radio-button>
        <el-radio-button value="done">已完成</el-radio-button>
      </el-radio-group>

      <div class="filter-bar__summary">
        <span v-if="!loading && filteredOrders.length > 0">
          当前共 <strong>{{ filteredOrders.length }}</strong> 笔订单
        </span>
      </div>
    </div>

    <!-- 订单列表 -->
    <div
        v-loading="loading"
        element-loading-text="正在拉取订单..."
        class="order-list"
    >

      <div
          v-for="order in filteredOrders"
          :key="order.orderId"
          class="order-card"
      >
        <!-- 商品图 -->
        <div class="order-card__image" @click="goGoods(order.goodsId)">
          <img
              v-if="order.imageUrl"
              :src="resolveImageUrl(order.imageUrl)"
              alt="商品主图"
              @error="onImageError(order)"
          >
          <div v-else class="order-card__image-fallback">
            <el-icon><Picture /></el-icon>
          </div>

          <el-tag
              class="order-card__status-tag"
              :type="statusTagType(order.orderStatus)"
              effect="light"
              size="small"
              round
          >
            {{ statusText(order.orderStatus) }}
          </el-tag>
        </div>

        <!-- 主体信息 -->
        <div class="order-card__body">
          <div class="order-card__goods">
            <h3 class="order-card__title" @click="goGoods(order.goodsId)">
              {{ order.goodsName || '商品已删除' }}
            </h3>
            <div class="order-card__price">
              <span class="currency">¥</span>{{ formatPrice(order.price) }}
            </div>
          </div>

          <div class="order-card__meta">
            <div class="meta-row">
              <span class="meta-label">订单编号</span>
              <span class="meta-value">#{{ order.orderId }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">{{ activeTab === 'buyer' ? '卖家' : '买家' }}</span>
              <span class="meta-value">
                {{ counterpartyName(order) || '已注销用户' }}
                <el-tag
                    v-if="counterpartyIsMe(order)"
                    size="small"
                    type="info"
                    effect="plain"
                    round
                    class="me-tag"
                >我</el-tag>
              </span>
            </div>
            <div class="meta-row">
              <span class="meta-label">下单时间</span>
              <span class="meta-value">{{ formatDateTime(order.createTime) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作 -->
        <div class="order-card__actions">
          <el-button
              size="default"
              class="action-btn"
              @click="openDetail(order)"
          >
            <el-icon><View /></el-icon>
            查看详情
          </el-button>
          <el-button
              v-if="Number(order.orderStatus) === 0"
              type="success"
              size="default"
              class="action-btn"
              :loading="finishingId === order.orderId"
              @click="handleFinish(order)"
          >
            <el-icon v-if="finishingId !== order.orderId"><CircleCheck /></el-icon>
            确认完成
          </el-button>
          <div v-else class="order-card__done">
            <el-icon><CircleCheckFilled /></el-icon>
            交易已结束
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredOrders.length === 0" class="empty-state">
        <el-icon class="empty-state__icon"><Box /></el-icon>
        <p class="empty-state__title">{{ emptyTitle }}</p>
        <p class="empty-state__desc">{{ emptyDesc }}</p>
        <el-button
            v-if="activeTab === 'buyer' && statusFilter === 'all'"
            type="primary"
            round
            @click="$router.push('/goods')"
        >去商品中心逛逛</el-button>
      </div>

    </div>

    <!-- 订单详情 Dialog -->
    <el-dialog
        v-model="detailVisible"
        title="订单详情"
        width="540px"
        align-center
        class="detail-dialog"
    >
      <template v-if="detailOrder">
        <div class="detail-goods">
          <div class="detail-goods__image" @click="goGoods(detailOrder.goodsId)">
            <img
                v-if="detailOrder.imageUrl"
                :src="resolveImageUrl(detailOrder.imageUrl)"
                alt="商品主图"
            >
            <div v-else class="detail-goods__fallback">
              <el-icon><Picture /></el-icon>
            </div>
          </div>
          <div class="detail-goods__info">
            <div class="detail-goods__name">{{ detailOrder.goodsName || '商品已删除' }}</div>
            <div class="detail-goods__price">
              <span class="currency">¥</span>{{ formatPrice(detailOrder.price) }}
            </div>
            <el-button
                size="small"
                type="primary"
                plain
                @click="goGoods(detailOrder.goodsId)"
            >
              查看商品
            </el-button>
          </div>
        </div>

        <el-descriptions :column="1" border class="detail-desc">
          <el-descriptions-item label="订单编号">
            #{{ detailOrder.orderId }}
          </el-descriptions-item>
          <el-descriptions-item label="买家">
            {{ detailOrder.buyerName || '已注销用户' }}
            <el-tag
                v-if="Number(detailOrder.buyerId) === currentUserId"
                size="small"
                type="success"
                effect="plain"
                round
                class="me-tag"
            >我</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="卖家">
            {{ detailOrder.sellerName || '已注销用户' }}
            <el-tag
                v-if="Number(detailOrder.sellerId) === currentUserId"
                size="small"
                type="warning"
                effect="plain"
                round
                class="me-tag"
            >我</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">
            {{ formatDateTime(detailOrder.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag
                :type="statusTagType(detailOrder.orderStatus)"
                effect="light"
                size="small"
                round
            >
              {{ statusText(detailOrder.orderStatus) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 状态时间线 -->
        <div class="timeline">
          <div class="timeline__item timeline__item--done">
            <div class="timeline__dot"></div>
            <div class="timeline__content">
              <div class="timeline__title">下单成功</div>
              <div class="timeline__time">{{ formatDateTime(detailOrder.createTime) }}</div>
            </div>
          </div>
          <div class="timeline__line"></div>
          <div
              class="timeline__item"
              :class="{ 'timeline__item--done': Number(detailOrder.orderStatus) === 1 }"
          >
            <div class="timeline__dot"></div>
            <div class="timeline__content">
              <div class="timeline__title">
                {{ Number(detailOrder.orderStatus) === 1 ? '交易完成' : '待交易中' }}
              </div>
              <div class="timeline__time">
                {{ Number(detailOrder.orderStatus) === 1
                    ? '买卖双方任一确认完成'
                    : '等待线下交接与确认' }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="Number(detailOrder.orderStatus) === 0" class="detail-footer">
          <el-button
              type="success"
              :loading="finishingId === detailOrder.orderId"
              @click="handleFinish(detailOrder)"
          >确认交易完成</el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, ShoppingBag, Shop, Picture, View,
  CircleCheck, CircleCheckFilled, Box
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

// buyer = 我买到的；seller = 我卖出的（支持 ?tab=buyer/seller 从详情页跳入）
const activeTab = ref(route.query.tab === 'seller' ? 'seller' : 'buyer')

// 状态筛选：all / pending(0) / done(1)
const statusFilter = ref('all')

const orders = ref([])
const loading = ref(false)
const loadError = ref(false)
const finishingId = ref(null)

// 两个视角的数量角标
const buyerCount = ref(0)
const sellerCount = ref(0)

// 详情 Dialog
const detailVisible = ref(false)
const detailOrder = ref(null)


// =========================
// 数据加载
// =========================

const loadOrders = async () => {
  loading.value = true
  loadError.value = false

  try {
    const url = activeTab.value === 'buyer'
        ? '/orders/buyer'
        : '/orders/seller'

    const result = await request.get(url)

    orders.value = Array.isArray(result) ? result : []

    // 同步当前 Tab 的角标
    if (activeTab.value === 'buyer') {
      buyerCount.value = orders.value.length
    } else {
      sellerCount.value = orders.value.length
    }
  } catch (error) {
    loadError.value = true
    orders.value = []
  } finally {
    loading.value = false
  }
}

// 首次进入时把两个角标数量都拉出来（失败不阻塞）
const loadCounts = async () => {
  const [buyerRes, sellerRes] = await Promise.allSettled([
      request.get('/orders/buyer'),
      request.get('/orders/seller')
  ])

  if (buyerRes.status === 'fulfilled' && Array.isArray(buyerRes.value)) {
    buyerCount.value = buyerRes.value.length
  }

  if (sellerRes.status === 'fulfilled' && Array.isArray(sellerRes.value)) {
    sellerCount.value = sellerRes.value.length
  }
}

const reload = async () => {
  await Promise.allSettled([loadOrders(), loadCounts()])
}


// =========================
// 状态筛选（前端完成，不额外请求接口）
// 拿到当前 Tab 全量订单后按 orderStatus 在前端过滤，避免每次切筛选都打后端
// =========================

const filteredOrders = computed(() => {
  if (statusFilter.value === 'all') return orders.value

  const target = statusFilter.value === 'pending' ? 0 : 1

  return orders.value.filter(o => Number(o.orderStatus) === target)
})


// =========================
// 切换视角：清空筛选 + 重新拉取当前 Tab 数据
// =========================

const switchTab = (tab) => {
  if (tab === activeTab.value) return
  activeTab.value = tab
  statusFilter.value = 'all'
  loadOrders()
}


// =========================
// 状态展示
// =========================

const statusText = (status) => {
  const s = Number(status)
  if (s === 0) return '待交易'
  if (s === 1) return '已完成'
  return '未知'
}

const statusTagType = (status) => {
  const s = Number(status)
  if (s === 0) return 'warning'
  if (s === 1) return 'success'
  return 'info'
}


// =========================
// 对方信息
// =========================

const counterpartyName = (order) => {
  if (!order) return ''
  // 当前是买家 → 对方是卖家；当前是卖家 → 对方是买家
  return activeTab.value === 'buyer'
      ? (order.sellerName || '')
      : (order.buyerName || '')
}

const counterpartyIsMe = (order) => {
  // 极端情况：买家和卖家是同一人的子账号场景不适用，这里仅常规标识
  return false
}


// =========================
// 图片处理
// =========================

const resolveImageUrl = (url) => {
  if (!url) return ''
  // 后端 /files/** 已通过 context-path /api 对外暴露
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return '/api' + (url.startsWith('/') ? url : '/' + url)
}

const onImageError = (order) => {
  // 图片加载失败直接清空，让 fallback 显示
  order.imageUrl = ''
}


// =========================
// 跳转商品详情
// =========================

const goGoods = (goodsId) => {
  if (goodsId) {
    router.push(`/goods/${goodsId}`)
  }
}


// =========================
// 确认完成：PUT /orders/{id}/status { orderStatus: 1 }
// 买家或卖家本人操作，归属与状态合法性由后端 finishOrder 兜底
// =========================

const handleFinish = async (order) => {
  try {
    await ElMessageBox.confirm(
        `确认订单「${order.goodsName || '#' + order.orderId}」已经线下交易完成吗？完成后不可撤销。`,
        '确认交易完成',
        {
          confirmButtonText: '确认完成',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )
  } catch (action) {
    return
  }

  finishingId.value = order.orderId

  try {
    const result = await request.put(
        `/orders/${order.orderId}/status`,
        { orderStatus: 1 }
    )

    if (result === '订单已完成') {
      ElMessage.success('订单已完成')
      // 局部刷新：重新拉取当前 Tab 数据 + 角标
      await reload()
      // 若详情 Dialog 打开，同步关闭或刷新
      if (detailVisible.value && detailOrder.value?.orderId === order.orderId) {
        detailVisible.value = false
      }
    } else {
      // 非参与者 / 订单状态已变化 / 订单不存在
      ElMessage.error(result || '操作失败')
      await loadOrders()
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    finishingId.value = null
  }
}


// =========================
// 详情 Dialog
// =========================

const openDetail = (order) => {
  detailOrder.value = order
  detailVisible.value = true
}


// =========================
// 空状态文案
// =========================

const emptyTitle = computed(() => {
  if (loadError.value) return '订单加载失败'
  if (statusFilter.value === 'pending') {
    return activeTab.value === 'buyer' ? '当前没有待交易的订单' : '当前没有待交易的订单'
  }
  if (statusFilter.value === 'done') {
    return activeTab.value === 'buyer' ? '还没有完成的订单' : '还没有完成的订单'
  }
  return activeTab.value === 'buyer' ? '还没有买到喜欢的东西' : '暂时没有卖出的商品'
})

const emptyDesc = computed(() => {
  if (loadError.value) return '请稍后刷新重试'
  if (statusFilter.value === 'pending') return '待交易订单会在这里等你确认'
  if (statusFilter.value === 'done') return '完成的订单会留作记录'
  return activeTab.value === 'buyer'
      ? '去商品中心逛逛，淘到心仪的闲置吧'
      : '上架你的闲置商品，等待同学下单吧'
})


onMounted(() => {
  loadOrders()
  loadCounts()
})
</script>


<style scoped>

.order-page {
  width: 100%;
}

/* ========== 页面标题 ========== */

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: var(--brand-text-secondary);
  font-size: 13.5px;
}

/* ========== 身份概览 ========== */

.overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.overview__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border-radius: var(--brand-radius-lg, 16px);
  background: linear-gradient(135deg,
    rgba(251, 246, 240, 0.95) 0%,
    rgba(255, 255, 255, 0.7) 100%);
  border: 1px solid var(--brand-border, #ece3dc);
  cursor: pointer;
  transition: all 0.22s ease;
}

.overview__item:hover {
  border-color: var(--brand-primary-soft, #f0d6d8);
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(216, 168, 173, 0.15);
}

.overview__item.is-active {
  background: linear-gradient(135deg,
    rgba(216, 168, 173, 0.18) 0%,
    rgba(201, 168, 92, 0.12) 100%);
  border-color: var(--brand-primary, #d8a8ad);
  box-shadow: 0 6px 18px rgba(216, 168, 173, 0.2);
}

.overview__icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
  flex-shrink: 0;
}

.overview__icon--buyer {
  background: linear-gradient(135deg, #d8a8ad 0%, #e5c1c4 100%);
  box-shadow: 0 6px 16px rgba(216, 168, 173, 0.32);
}

.overview__icon--seller {
  background: linear-gradient(135deg, #c9a85c 0%, #dbbf80 100%);
  box-shadow: 0 6px 16px rgba(201, 168, 92, 0.32);
}

.overview__label {
  font-size: 13px;
  color: var(--brand-text-secondary);
  margin-bottom: 2px;
}

.overview__count {
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-text, #4a4548);
  line-height: 1.1;
}

/* ========== 筛选条 ========== */

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-bar__summary {
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.filter-bar__summary strong {
  color: var(--brand-primary, #d8a8ad);
  font-weight: 700;
  margin: 0 2px;
}

/* ========== 订单列表 ========== */

.order-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

/* ========== 订单卡片 ========== */

.order-card {
  display: grid;
  grid-template-columns: 132px 1fr auto;
  gap: 22px;
  align-items: center;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--brand-border, #ece3dc);
  border-radius: var(--brand-radius-lg, 16px);
  transition: all 0.22s ease;
}

.order-card:hover {
  border-color: var(--brand-primary-soft, #f0d6d8);
  box-shadow: 0 8px 24px rgba(216, 168, 173, 0.12);
  transform: translateY(-1px);
}

/* 商品图 */
.order-card__image {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #f6ecdf 0%, #f1e4d4 100%);
  flex-shrink: 0;
}

.order-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.order-card__image:hover img {
  transform: scale(1.04);
}

.order-card__image-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9a85c;
  font-size: 36px;
}

.order-card__status-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  backdrop-filter: blur(4px);
}

/* 主体信息 */
.order-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card__goods {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.order-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--brand-text, #4a4548);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  transition: color 0.2s ease;
}

.order-card__title:hover {
  color: var(--brand-primary, #d8a8ad);
}

.order-card__price {
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary, #d8a8ad);
  font-feature-settings: 'tnum';
  line-height: 1.1;
  flex-shrink: 0;
}

.order-card__price .currency {
  font-size: 13px;
  margin-right: 1px;
  font-weight: 500;
}

.order-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.meta-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-label {
  color: var(--brand-text-secondary);
}

.meta-value {
  color: var(--brand-text-secondary);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.me-tag {
  transform: scale(0.85);
  transform-origin: left center;
}

/* 操作区 */
.order-card__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 132px;
}

.action-btn {
  width: 100%;
}

.order-card__done {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 13px;
  color: #8fae6c;
  background: rgba(143, 174, 108, 0.1);
  border-radius: 8px;
}

.order-card__done .el-icon {
  font-size: 15px;
}

/* ========== 空状态 ========== */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state__icon {
  font-size: 56px;
  color: var(--brand-primary-soft, #f0d6d8);
  margin-bottom: 12px;
}

.empty-state__title {
  margin: 0 0 4px;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--brand-text, #4a4548);
}

.empty-state__desc {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--brand-text-secondary);
  max-width: 360px;
}

/* ========== 详情 Dialog ========== */

.detail-dialog :deep(.el-dialog__body) {
  padding: 16px 24px 24px;
}

.detail-goods {
  display: flex;
  gap: 16px;
  padding: 14px;
  margin-bottom: 18px;
  background: linear-gradient(135deg, #fbf6f0 0%, #fff 100%);
  border: 1px solid var(--brand-border, #ece3dc);
  border-radius: 12px;
}

.detail-goods__image {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  background: #f6ecdf;
}

.detail-goods__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-goods__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9a85c;
  font-size: 26px;
}

.detail-goods__info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.detail-goods__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text, #4a4548);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-goods__price {
  font-size: 19px;
  font-weight: 700;
  color: var(--brand-primary, #d8a8ad);
}

.detail-goods__price .currency {
  font-size: 12px;
  margin-right: 1px;
}

.detail-desc {
  margin-bottom: 18px;
}

.detail-desc :deep(.el-descriptions__label) {
  width: 96px;
  color: var(--brand-text-secondary);
  background: #fbf6f0;
}

.detail-desc :deep(.el-descriptions__content) {
  color: var(--brand-text);
}

/* ========== 时间线 ========== */

.timeline {
  display: flex;
  flex-direction: column;
  padding: 8px 4px;
  margin-bottom: 8px;
}

.timeline__item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 4px 0;
}

.timeline__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e8ddd0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px #e8ddd0;
  margin-top: 4px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.timeline__item--done .timeline__dot {
  background: var(--brand-primary, #d8a8ad);
  box-shadow: 0 0 0 2px var(--brand-primary, #d8a8ad);
}

.timeline__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text-secondary);
}

.timeline__item--done .timeline__title {
  color: var(--brand-text);
}

.timeline__time {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.timeline__line {
  width: 2px;
  height: 18px;
  margin-left: 5px;
  background: linear-gradient(to bottom, var(--brand-primary, #d8a8ad), #e8ddd0);
}

.detail-footer {
  display: flex;
  justify-content: center;
  padding: 8px 0 0;
  border-top: 1px dashed var(--brand-border, #ece3dc);
}

/* ========== 响应式 ========== */

@media (max-width: 768px) {

  .overview {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .overview__item {
    padding: 14px 16px;
  }

  .order-card {
    grid-template-columns: 100px 1fr;
    grid-template-rows: auto auto;
    gap: 12px;
    padding: 12px;
  }

  .order-card__image {
    width: 100px;
    height: 100px;
    grid-row: 1 / 3;
  }

  .order-card__actions {
    grid-column: 2;
    flex-direction: row;
    flex-wrap: wrap;
    min-width: 0;
  }

  .action-btn {
    width: auto;
    flex: 1;
    min-width: 92px;
  }

  .order-card__price {
    font-size: 18px;
  }

  .order-card__meta {
    gap: 6px 16px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {

  .order-card__goods {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .detail-goods {
    flex-direction: column;
  }

  .detail-goods__image {
    width: 100%;
    height: 160px;
  }
}

</style>
