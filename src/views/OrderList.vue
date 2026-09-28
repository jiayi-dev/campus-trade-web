<template>
  <!--
    交易中心 / 我的订单（一页一成品）
    买家订单 + 卖家订单 + 状态 + 订单详情 + 商品信息 + 时间线 + 操作 + 空状态 + 加载 + 错误
    真实接口：
      GET /orders/buyer  → 买家订单（JOIN goods+user+goods_image，带 campus/location）
      GET /orders/seller → 卖家订单
      PUT /orders/{id}/status { orderStatus: 1 } → 确认完成（0→1，后端校验参与者身份）
  -->
  <div class="trade-page">

    <!-- ==================== Hero ==================== -->
    <section class="hero">
      <div class="hero__blob hero__blob--pink"></div>
      <div class="hero__blob hero__blob--butter"></div>
      <div class="hero__inner">
        <div class="hero__copy">
          <span class="hero__eyebrow">TRADE CENTER · 交易中心</span>
          <h1 class="hero__title">我的交易</h1>
          <p class="hero__sub">每一笔交易，都有清晰的去向。</p>
        </div>
        <!-- 统计：基于真实订单数据计算，不造假 -->
        <div class="hero__stats">
          <div class="stat-pill">
            <span class="stat-pill__num">{{ totalCount }}</span>
            <span class="stat-pill__label">全部</span>
          </div>
          <div class="stat-pill">
            <span class="stat-pill__num">{{ pendingCount }}</span>
            <span class="stat-pill__label">待交易</span>
          </div>
          <div class="stat-pill">
            <span class="stat-pill__num">{{ doneCount }}</span>
            <span class="stat-pill__label">已完成</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== Tab 切换 ==================== -->
    <div class="tab-bar">
      <button
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'buyer' }"
          @click="switchTab('buyer')"
      >
        <el-icon><ShoppingBag /></el-icon>
        <span>我买到的</span>
        <span class="tab-item__badge">{{ buyerCount }}</span>
      </button>
      <button
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'seller' }"
          @click="switchTab('seller')"
      >
        <el-icon><Shop /></el-icon>
        <span>我卖出的</span>
        <span class="tab-item__badge">{{ sellerCount }}</span>
      </button>

      <div class="tab-bar__right">
        <el-radio-group v-model="statusFilter" size="small" @change="onFilterChange">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="pending">待交易</el-radio-button>
          <el-radio-button value="done">已完成</el-radio-button>
        </el-radio-group>
        <el-button :icon="Refresh" :loading="loading" size="small" @click="reload">刷新</el-button>
      </div>
    </div>

    <!-- ==================== 订单列表区 ==================== -->

    <!-- 错误状态 -->
    <div v-if="loadError" class="error-state">
      <el-icon class="error-state__icon"><CircleCloseFilled /></el-icon>
      <p class="error-state__title">订单加载失败</p>
      <p class="error-state__desc">网络可能不稳定，请稍后重试</p>
      <el-button type="primary" round @click="loadOrders">重新加载</el-button>
    </div>

    <!-- Skeleton 加载 -->
    <div v-else-if="loading && orders.length === 0" class="skeleton-list">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div class="skeleton-card__img"></div>
        <div class="skeleton-card__body">
          <div class="skeleton-card__line skeleton-card__line--lg"></div>
          <div class="skeleton-card__line"></div>
          <div class="skeleton-card__line skeleton-card__line--sm"></div>
        </div>
        <div class="skeleton-card__actions"></div>
      </div>
    </div>

    <!-- 正常列表 -->
    <div v-else class="order-list">
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
          <span class="order-card__status-badge" :class="`status-badge--${statusClass(order.orderStatus)}`">
            {{ statusText(order.orderStatus) }}
          </span>
        </div>

        <!-- 主体信息 -->
        <div class="order-card__body">
          <div class="order-card__head">
            <h3 class="order-card__title" @click="goGoods(order.goodsId)">
              {{ order.goodsName || '商品已删除' }}
            </h3>
            <div class="order-card__price">{{ formatPrice(order.price) }}</div>
          </div>

          <div class="order-card__meta">
            <span class="meta-chip">
              <el-icon><Tickets /></el-icon>
              #{{ order.orderId }}
            </span>
            <span class="meta-chip" v-if="order.campus">
              <el-icon><School /></el-icon>
              {{ order.campus }}
            </span>
            <span class="meta-chip" v-if="order.location">
              <el-icon><Location /></el-icon>
              {{ order.location }}
            </span>
            <span class="meta-chip">
              <el-icon><User /></el-icon>
              {{ counterpartyLabel(order) }}{{ counterpartyName(order) || '已注销' }}
            </span>
            <span class="meta-chip">
              <el-icon><Clock /></el-icon>
              {{ formatDateTime(order.createTime) }}
            </span>
          </div>
        </div>

        <!-- 操作区 -->
        <div class="order-card__actions">
          <el-button size="default" class="action-btn" @click="openDetail(order)">
            <el-icon><View /></el-icon>
            订单详情
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
        >去逛逛</el-button>
        <el-button
            v-else-if="activeTab === 'seller' && statusFilter === 'all'"
            type="primary"
            round
            @click="$router.push('/publish')"
        >去发布</el-button>
      </div>
    </div>

    <!-- ==================== 订单详情 Drawer ==================== -->
    <el-drawer
        v-model="detailVisible"
        direction="rtl"
        size="460px"
        :with-header="false"
        class="detail-drawer"
    >
      <template v-if="detailOrder">
        <!-- 商品区 -->
        <div class="detail-goods" @click="goGoods(detailOrder.goodsId)">
          <div class="detail-goods__image">
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
            <div class="detail-goods__price">{{ formatPrice(detailOrder.price) }}</div>
            <el-button size="small" type="primary" plain @click.stop="goGoods(detailOrder.goodsId)">
              查看商品
            </el-button>
          </div>
        </div>

        <!-- 交易信息 -->
        <div class="detail-section">
          <h4 class="detail-section__title">交易信息</h4>
          <div class="detail-grid">
            <div class="detail-cell">
              <span class="detail-cell__label">订单编号</span>
              <span class="detail-cell__value">#{{ detailOrder.orderId }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">下单时间</span>
              <span class="detail-cell__value">{{ formatDateTime(detailOrder.createTime) }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">买家</span>
              <span class="detail-cell__value">
                {{ detailOrder.buyerName || '已注销' }}
                <el-tag v-if="Number(detailOrder.buyerId) === currentUserId" size="small" type="success" effect="plain" round class="me-tag">我</el-tag>
              </span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">卖家</span>
              <span class="detail-cell__value">
                {{ detailOrder.sellerName || '已注销' }}
                <el-tag v-if="Number(detailOrder.sellerId) === currentUserId" size="small" type="warning" effect="plain" round class="me-tag">我</el-tag>
              </span>
            </div>
            <div class="detail-cell" v-if="detailOrder.campus">
              <span class="detail-cell__label">校区</span>
              <span class="detail-cell__value">{{ detailOrder.campus }}</span>
            </div>
            <div class="detail-cell" v-if="detailOrder.location">
              <span class="detail-cell__label">面交地点</span>
              <span class="detail-cell__value">{{ detailOrder.location }}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-cell__label">当前状态</span>
              <span class="detail-cell__value">
                <span class="status-badge" :class="`status-badge--${statusClass(detailOrder.orderStatus)}`">
                  {{ statusText(detailOrder.orderStatus) }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- 交易时间线 -->
        <div class="detail-section">
          <h4 class="detail-section__title">交易进度</h4>
          <div class="timeline">
            <div class="timeline__item timeline__item--done">
              <div class="timeline__dot"></div>
              <div class="timeline__content">
                <div class="timeline__title">下单成功</div>
                <div class="timeline__time">{{ formatDateTime(detailOrder.createTime) }}</div>
              </div>
            </div>
            <div class="timeline__line" :class="{ 'timeline__line--done': Number(detailOrder.orderStatus) === 1 }"></div>
            <div class="timeline__item" :class="{ 'timeline__item--done': Number(detailOrder.orderStatus) === 1 }">
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
        </div>

        <!-- 操作区 -->
        <div v-if="Number(detailOrder.orderStatus) === 0" class="detail-footer">
          <el-button
              type="success"
              size="large"
              :loading="finishingId === detailOrder.orderId"
              @click="handleFinish(detailOrder)"
          >确认交易完成</el-button>
        </div>
      </template>
    </el-drawer>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh, ShoppingBag, Shop, Picture, View,
  CircleCheck, CircleCheckFilled, Box, Tickets,
  School, Location, User, Clock, CircleCloseFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

const activeTab = ref(route.query.tab === 'seller' ? 'seller' : 'buyer')
const statusFilter = ref('all')

const orders = ref([])
const loading = ref(false)
const loadError = ref(false)
const finishingId = ref(null)

const buyerCount = ref(0)
const sellerCount = ref(0)

const detailVisible = ref(false)
const detailOrder = ref(null)

// =========================
// 数据加载
// =========================

const loadOrders = async () => {
  loading.value = true
  loadError.value = false

  try {
    const url = activeTab.value === 'buyer' ? '/orders/buyer' : '/orders/seller'
    const result = await request.get(url)
    orders.value = Array.isArray(result) ? result : []

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
// 统计（基于当前 Tab 真实数据计算）
// =========================

const totalCount = computed(() => orders.value.length)
const pendingCount = computed(() => orders.value.filter(o => Number(o.orderStatus) === 0).length)
const doneCount = computed(() => orders.value.filter(o => Number(o.orderStatus) === 1).length)

// =========================
// 状态筛选（前端过滤，不额外打后端）
// =========================

const filteredOrders = computed(() => {
  if (statusFilter.value === 'all') return orders.value
  const target = statusFilter.value === 'pending' ? 0 : 1
  return orders.value.filter(o => Number(o.orderStatus) === target)
})

const onFilterChange = () => {}

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

const statusClass = (status) => {
  const s = Number(status)
  if (s === 0) return 'pending'
  if (s === 1) return 'done'
  return 'unknown'
}

// =========================
// 对方信息
// =========================

const counterpartyLabel = (order) => {
  return activeTab.value === 'buyer' ? '卖家：' : '买家：'
}

const counterpartyName = (order) => {
  if (!order) return ''
  return activeTab.value === 'buyer' ? (order.sellerName || '') : (order.buyerName || '')
}

// =========================
// 图片处理
// =========================

const resolveImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // 后端返回的 URL 已含 /api 前缀（如 /api/files/goods/xxx.png），不再二次拼接
  return url
}

const onImageError = (order) => {
  order.imageUrl = ''
}

// =========================
// 跳转商品详情
// =========================

const goGoods = (goodsId) => {
  if (goodsId) router.push(`/goods/${goodsId}`)
}

// =========================
// 确认完成：PUT /orders/{id}/status { orderStatus: 1 }
// 后端 finishOrder 校验：订单存在 + 当前用户是买家或卖家 + 状态必须是待交易(0)
// =========================

const handleFinish = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确认订单「${order.goodsName || '#' + order.orderId}」已经线下交易完成吗？完成后不可撤销。`,
      '确认交易完成',
      { confirmButtonText: '确认完成', cancelButtonText: '取消', type: 'warning' }
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
      await reload()
      if (detailVisible.value && detailOrder.value?.orderId === order.orderId) {
        detailVisible.value = false
      }
    } else {
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
// 详情 Drawer
// =========================

const openDetail = (order) => {
  detailOrder.value = order
  detailVisible.value = true
}

// =========================
// 空状态文案
// =========================

const emptyTitle = computed(() => {
  if (statusFilter.value === 'pending') return '当前没有待交易的订单'
  if (statusFilter.value === 'done') return '还没有完成的订单'
  return activeTab.value === 'buyer' ? '还没有买过东西' : '还没有产生交易'
})

const emptyDesc = computed(() => {
  if (statusFilter.value === 'pending') return '待交易订单会在这里等你确认'
  if (statusFilter.value === 'done') return '完成的订单会留作记录'
  return activeTab.value === 'buyer'
    ? '去校园市场看看，也许下一件宝贝正在等你。'
    : '发布一件商品，开始你的第一笔校园交易。'
})


onMounted(() => {
  loadOrders()
  loadCounts()
})
</script>


<style scoped>

.trade-page {
  width: 100%;
}

/* ========== Hero ========== */

.hero {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  padding: 36px 32px 30px;
  margin-bottom: 22px;
  background: linear-gradient(135deg, #fbf6f0 0%, #fef9f3 50%, #f9f0f1 100%);
  border: 1px solid #f0e6dc;
}

.hero__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.55;
  pointer-events: none;
}

.hero__blob--pink {
  width: 200px;
  height: 200px;
  background: #f0d6d8;
  top: -60px;
  right: 40%;
}

.hero__blob--butter {
  width: 180px;
  height: 180px;
  background: #f5e6c8;
  bottom: -50px;
  right: 8%;
}

.hero__inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.hero__copy {
  flex: 1;
  min-width: 220px;
}

.hero__eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: #c9a85c;
  font-weight: 600;
  text-transform: uppercase;
}

.hero__title {
  margin: 6px 0 4px;
  font-size: 28px;
  font-weight: 800;
  color: #4a4548;
  letter-spacing: 1px;
}

.hero__sub {
  margin: 0;
  font-size: 14px;
  color: #9a8e88;
}

.hero__stats {
  display: flex;
  gap: 10px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #f0e6dc;
  min-width: 72px;
}

.stat-pill__num {
  font-size: 22px;
  font-weight: 800;
  color: #4a4548;
  line-height: 1.1;
}

.stat-pill__label {
  font-size: 11px;
  color: #9a8e88;
  margin-top: 2px;
}

/* ========== Tab 栏 ========== */

.tab-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 12px;
  border: 1px solid #ece3dc;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #9a8e88;
  cursor: pointer;
  transition: all 0.22s ease;
}

.tab-item:hover {
  border-color: #f0d6d8;
  color: #4a4548;
}

.tab-item--active {
  background: linear-gradient(135deg, #d8a8ad 0%, #e5c1c4 100%);
  border-color: #d8a8ad;
  color: #fff;
  box-shadow: 0 4px 14px rgba(216, 168, 173, 0.3);
}

.tab-item__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.5);
  color: #4a4548;
}

.tab-item--active .tab-item__badge {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.tab-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

/* ========== Skeleton ========== */

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-card {
  display: grid;
  grid-template-columns: 132px 1fr auto;
  gap: 22px;
  align-items: center;
  padding: 16px;
  background: #fff;
  border: 1px solid #ece3dc;
  border-radius: 16px;
}

.skeleton-card__img {
  width: 132px;
  height: 132px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f6ecdf 25%, #fbf6f0 50%, #f6ecdf 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-card__line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f6ecdf 25%, #fbf6f0 50%, #f6ecdf 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-card__line--lg { width: 60%; height: 18px; }
.skeleton-card__line--sm { width: 40%; }

.skeleton-card__actions {
  width: 100px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f6ecdf 25%, #fbf6f0 50%, #f6ecdf 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
  border: 1px solid #ece3dc;
  border-radius: 16px;
  transition: all 0.22s ease;
}

.order-card:hover {
  border-color: #f0d6d8;
  box-shadow: 0 8px 24px rgba(216, 168, 173, 0.12);
  transform: translateY(-1px);
}

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

.order-card__status-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  backdrop-filter: blur(4px);
}

.status-badge--pending {
  background: rgba(245, 158, 11, 0.82);
  color: #fff;
}

.status-badge--done {
  background: rgba(143, 174, 108, 0.82);
  color: #fff;
}

.status-badge--unknown {
  background: rgba(154, 142, 136, 0.82);
  color: #fff;
}

/* 主体信息 */

.order-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card__head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.order-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #4a4548;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  transition: color 0.2s ease;
}

.order-card__title:hover {
  color: #d8a8ad;
}

.order-card__price {
  font-size: 20px;
  font-weight: 800;
  color: #d8a8ad;
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
  gap: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 8px;
  background: #fbf6f0;
  font-size: 12px;
  color: #9a8e88;
}

.meta-chip .el-icon {
  font-size: 13px;
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
  color: #f0d6d8;
  margin-bottom: 12px;
}

.empty-state__title {
  margin: 0 0 4px;
  font-size: 15.5px;
  font-weight: 600;
  color: #4a4548;
}

.empty-state__desc {
  margin: 0 0 18px;
  font-size: 13px;
  color: #9a8e88;
  max-width: 360px;
}

/* ========== 错误状态 ========== */

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.error-state__icon {
  font-size: 52px;
  color: #e0a8a8;
  margin-bottom: 12px;
}

.error-state__title {
  margin: 0 0 4px;
  font-size: 15.5px;
  font-weight: 600;
  color: #4a4548;
}

.error-state__desc {
  margin: 0 0 18px;
  font-size: 13px;
  color: #9a8e88;
}

/* ========== 详情 Drawer ========== */

.detail-drawer :deep(.el-drawer__body) {
  padding: 0;
}

.detail-goods {
  display: flex;
  gap: 16px;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #fbf6f0 0%, #fff 100%);
  border-bottom: 1px solid #ece3dc;
  cursor: pointer;
}

.detail-goods__image {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  overflow: hidden;
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
  color: #4a4548;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-goods__price {
  font-size: 19px;
  font-weight: 800;
  color: #d8a8ad;
}

.detail-goods__price .currency {
  font-size: 12px;
  margin-right: 1px;
}

.detail-section {
  padding: 18px 24px;
  border-bottom: 1px solid #f5ede5;
}

.detail-section__title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #4a4548;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.detail-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.detail-cell__label {
  font-size: 11.5px;
  color: #9a8e88;
}

.detail-cell__value {
  font-size: 13.5px;
  font-weight: 600;
  color: #4a4548;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.me-tag {
  transform: scale(0.85);
  transform-origin: left center;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

/* 时间线 */

.timeline {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
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
  background: #d8a8ad;
  box-shadow: 0 0 0 2px #d8a8ad;
}

.timeline__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline__title {
  font-size: 13.5px;
  font-weight: 600;
  color: #9a8e88;
}

.timeline__item--done .timeline__title {
  color: #4a4548;
}

.timeline__time {
  font-size: 12px;
  color: #9a8e88;
}

.timeline__line {
  width: 2px;
  height: 18px;
  margin-left: 5px;
  background: linear-gradient(to bottom, #d8a8ad, #e8ddd0);
}

.detail-footer {
  display: flex;
  justify-content: center;
  padding: 16px 24px 24px;
}

/* ========== 响应式 ========== */

@media (max-width: 768px) {

  .hero {
    padding: 24px 20px 22px;
  }

  .hero__title {
    font-size: 23px;
  }

  .hero__stats {
    gap: 8px;
  }

  .stat-pill {
    padding: 8px 14px;
    min-width: 60px;
  }

  .stat-pill__num {
    font-size: 19px;
  }

  .tab-bar__right {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }

  .skeleton-card,
  .order-card {
    grid-template-columns: 100px 1fr;
    grid-template-rows: auto auto;
    gap: 12px;
    padding: 12px;
  }

  .skeleton-card__img,
  .order-card__image {
    width: 100px;
    height: 100px;
    grid-row: 1 / 3;
  }

  .skeleton-card__actions,
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

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {

  .order-card__head {
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
