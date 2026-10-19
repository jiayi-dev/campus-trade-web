<template>
  <div class="an-page">

    <!-- ===== 顶部工具条：标题 + 日期范围 + 刷新 ===== -->
    <header class="an-head">
      <div class="an-head__main">
        <h2 class="an-head__title">
          <el-icon class="an-head__badge"><DataAnalysis /></el-icon>
          平台运营数据中心
        </h2>
        <p class="an-head__sub">
          平台用户、商品、订单与分布趋势总览（数据来自后端真实统计接口，仅管理员可见）
        </p>
      </div>

      <div class="an-head__ops">
        <div class="range-switch">
          <button
              v-for="d in dayOptions"
              :key="d"
              class="range-switch__btn"
              :class="{ 'is-active': days === d }"
              @click="setDays(d)"
          >
            {{ d }} 天
          </button>
        </div>
        <el-button :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
      </div>
    </header>

    <!-- ===== 请求失败态（首次加载失败）===== -->
    <el-card v-if="error && !loaded" shadow="never" class="an-panel an-error">
      <el-icon class="an-error__icon"><WarningFilled /></el-icon>
      <div class="an-error__title">运营数据加载失败</div>
      <div class="an-error__text">{{ error }}</div>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadData">重新加载</el-button>
    </el-card>

    <!-- ===== 骨架屏（首次加载中）===== -->
    <el-skeleton v-else-if="loading && !loaded" :rows="10" animated class="an-skeleton" />

    <template v-else>

      <!-- ===== 核心指标：总量卡片 ===== -->
      <section class="an-kpi">

        <!-- 用户 -->
        <article class="kpi kpi--user">
          <div class="kpi__head">
            <span class="kpi__label">用户总数</span>
            <el-icon class="kpi__icon"><User /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ num(totals.userCount) }}</div>
          <div class="kpi__sub">
            <span class="kpi__sub-item">学生 <b class="is-num">{{ num(totals.studentCount) }}</b></span>
            <span class="kpi__sub-item">卖家 <b class="is-num">{{ num(totals.sellerCount) }}</b></span>
            <span class="kpi__sub-item">管理员 <b class="is-num">{{ num(totals.adminCount) }}</b></span>
          </div>
        </article>

        <!-- 商品 -->
        <article class="kpi kpi--goods">
          <div class="kpi__head">
            <span class="kpi__label">商品总数</span>
            <el-icon class="kpi__icon"><Goods /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ num(totals.goodsCount) }}</div>
          <div class="kpi__sub">
            <span class="kpi__sub-item">在售 <b class="is-num">{{ num(totals.onSaleCount) }}</b></span>
            <span class="kpi__sub-item">下架 <b class="is-num">{{ num(totals.offSaleCount) }}</b></span>
          </div>
        </article>

        <!-- 订单 -->
        <article class="kpi kpi--order">
          <div class="kpi__head">
            <span class="kpi__label">订单总数</span>
            <el-icon class="kpi__icon"><Tickets /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ num(totals.orderCount) }}</div>
          <div class="kpi__sub">
            <span class="kpi__sub-item">待交易 <b class="is-num">{{ num(totals.orderPendingCount) }}</b></span>
            <span class="kpi__sub-item">待买家确认 <b class="is-num">{{ num(totals.orderConfirmingCount) }}</b></span>
            <span class="kpi__sub-item">已完成 <b class="is-num">{{ num(totals.orderDoneCount) }}</b></span>
          </div>
        </article>

        <!-- 收藏 -->
        <article class="kpi kpi--fav">
          <div class="kpi__head">
            <span class="kpi__label">收藏总数</span>
            <el-icon class="kpi__icon"><Star /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ num(totals.favoriteCount) }}</div>
          <div class="kpi__sub">
            <span class="kpi__sub-item">评价累计 <b class="is-num">{{ num(totals.evaluationCount) }}</b></span>
          </div>
        </article>

      </section>

      <!-- 次级总量小条 -->
      <div class="an-chips">
        <span class="chip">
          <el-icon><User /></el-icon>活跃用户
          <b class="is-num">{{ num(totals.activeUserCount) }}</b>
        </span>
        <span class="chip">
          <el-icon><Histogram /></el-icon>商品分类
          <b class="is-num">{{ num(totals.categoryCount) }}</b>
        </span>
      </div>

      <!-- ===== 分布区：商品分类 + 订单状态 ===== -->
      <section class="an-grid-2">

        <!-- 商品分类分布 -->
        <el-card shadow="never" class="an-panel">
          <template #header>
            <div class="panel__head">
              <span class="panel__title">
                <el-icon><Histogram /></el-icon>商品分类分布
              </span>
              <span class="panel__hint">按分类统计商品数量，含无商品分类</span>
            </div>
          </template>

          <div v-if="categoryHasData" class="bars">
            <div v-for="row in categoryRows" :key="row.id" class="bar-row">
              <span class="bar-row__name" :title="row.name">{{ row.name }}</span>
              <div class="bar-row__track">
                <div class="bar-row__fill bar-row__fill--primary" :style="{ width: row.width + '%' }"></div>
              </div>
              <span class="bar-row__value is-num">{{ row.count }}</span>
              <span class="bar-row__pct is-num">{{ row.percent }}%</span>
            </div>
          </div>

          <div v-else class="an-empty">暂无数据</div>
        </el-card>

        <!-- 订单状态分布 -->
        <el-card shadow="never" class="an-panel">
          <template #header>
            <div class="panel__head">
              <span class="panel__title">
                <el-icon><PieChart /></el-icon>订单状态分布
              </span>
              <span class="panel__hint">待交易 / 待买家确认 / 已完成</span>
            </div>
          </template>

          <div v-if="orderStatusTotal > 0" class="donut-wrap">
            <div class="donut">
              <svg viewBox="0 0 160 160" class="donut__svg">
                <circle cx="80" cy="80" r="58" class="donut__track" />
                <g transform="rotate(-90 80 80)">
                  <circle
                      v-for="seg in donutSegments"
                      :key="seg.label"
                      cx="80" cy="80" r="58"
                      class="donut__seg"
                      :stroke="seg.color"
                      :stroke-dasharray="seg.dash"
                      :stroke-dashoffset="seg.offset"
                  />
                </g>
              </svg>
              <div class="donut__center">
                <span class="donut__total is-num">{{ orderStatusTotal }}</span>
                <span class="donut__cap">订单</span>
              </div>
            </div>

            <ul class="donut-legend">
              <li v-for="row in orderStatusRows" :key="row.status" class="donut-legend__item">
                <i class="dot" :style="{ background: row.color }"></i>
                <span class="donut-legend__name">{{ row.label }}</span>
                <span class="donut-legend__count is-num">{{ row.count }}</span>
                <span class="donut-legend__pct is-num">{{ formatPct(row.percent) }}%</span>
              </li>
            </ul>
          </div>

          <div v-else class="an-empty">暂无数据</div>
        </el-card>

      </section>

      <!-- ===== 时间趋势 ===== -->
      <el-card shadow="never" class="an-panel an-trend-card">
        <template #header>
          <div class="panel__head panel__head--wrap">
            <span class="panel__title">
              <el-icon><TrendCharts /></el-icon>时间趋势
            </span>
            <div class="trend-switch">
              <button
                  v-for="m in trendMetrics"
                  :key="m.key"
                  class="trend-switch__btn"
                  :class="[{ 'is-active': trendMetric === m.key }, `trend-switch__btn--${m.color}`]"
                  @click="trendMetric = m.key"
              >
                {{ m.name }}
              </button>
              <span class="panel__hint">近 {{ days }} 天 · 合计 <b class="is-num">{{ trendTotal }}</b></span>
            </div>
          </div>
        </template>

        <div v-if="trendHasData" class="trend" :class="`trend--${activeTrendDef.color}`">
          <div class="trend__plot">
            <svg class="trend__svg" :viewBox="`0 0 ${SVG_W} ${SVG_H}`" preserveAspectRatio="none">
              <!-- 水平参考线 -->
              <line :x1="0" :y1="GRID_TOP" :x2="SVG_W" :y2="GRID_TOP" class="trend__grid" vector-effect="non-scaling-stroke" />
              <line :x1="0" :y1="GRID_MID" :x2="SVG_W" :y2="GRID_MID" class="trend__grid" vector-effect="non-scaling-stroke" />
              <line :x1="0" :y1="GRID_BASE" :x2="SVG_W" :y2="GRID_BASE" class="trend__grid trend__grid--base" vector-effect="non-scaling-stroke" />

              <polygon class="trend__area" :points="areaPoints" />
              <polyline class="trend__line" :points="linePoints" vector-effect="non-scaling-stroke" />

              <g v-if="showDots">
                <circle
                    v-for="(p, i) in trendSeries"
                    :key="p.date"
                    :cx="pointX(i)" :cy="pointY(p.count)" r="3.4"
                    class="trend__dot"
                />
              </g>
            </svg>

            <!-- 悬浮命中层：每个日期一列，悬停显示真实数值 -->
            <div class="trend__hover">
              <span
                  v-for="p in trendSeries"
                  :key="p.date"
                  class="trend__hover-cell"
                  :title="`${p.date}：${activeTrendDef.name} ${p.count}`"
              ></span>
            </div>

            <span class="trend__ymax is-num">{{ trendMax }}</span>
            <span class="trend__yzero is-num">0</span>
          </div>

          <div class="trend__xaxis">
            <span
                v-for="(p, i) in trendSeries"
                :key="p.date"
                class="trend__xlabel"
            >{{ showLabels(i) ? shortDate(p.date) : '' }}</span>
          </div>
        </div>

        <div v-else class="an-empty">暂无数据</div>
      </el-card>

      <!-- ===== 校区分布 + 异常提示 ===== -->
      <section class="an-grid-2">

        <!-- 校区分布 -->
        <el-card shadow="never" class="an-panel">
          <template #header>
            <div class="panel__head">
              <span class="panel__title">
                <el-icon><Location /></el-icon>在售商品校区分布
              </span>
              <span class="panel__hint">空校区归为「未标注」</span>
            </div>
          </template>

          <div v-if="campusTotal > 0" class="bars">
            <div v-for="row in campusRows" :key="row.name" class="bar-row bar-row--campus">
              <span class="bar-row__name" :title="row.name">{{ row.name }}</span>
              <div class="bar-row__track">
                <div class="bar-row__fill bar-row__fill--aux" :style="{ width: row.width + '%' }"></div>
              </div>
              <span class="bar-row__value is-num">{{ row.count }}</span>
              <span class="bar-row__pct is-num">{{ row.percent }}%</span>
            </div>
          </div>

          <div v-else class="an-empty">暂无数据</div>
        </el-card>

        <!-- 异常数据提示 -->
        <el-card shadow="never" class="an-panel">
          <template #header>
            <div class="panel__head">
              <span class="panel__title">
                <el-icon><WarningFilled /></el-icon>异常数据提示
              </span>
              <span class="panel__hint">由真实计数派生</span>
            </div>
          </template>

          <ul v-if="anomalies.length" class="anomaly-list">
            <li
                v-for="(item, idx) in anomalies"
                :key="idx"
                class="anomaly"
                :class="`anomaly--${item.level}`"
            >
              <el-icon class="anomaly__icon">
                <WarningFilled v-if="item.level === 'warn'" />
                <InfoFilled v-else />
              </el-icon>
              <div class="anomaly__body">
                <div class="anomaly__head">
                  <span class="anomaly__label">{{ item.label }}</span>
                  <span class="anomaly__count is-num">{{ item.count }}</span>
                </div>
                <div class="anomaly__hint">{{ item.hint }}</div>
              </div>
            </li>
          </ul>

          <div v-else class="an-empty">暂无数据</div>
        </el-card>

      </section>

      <!-- ===== 近期活动：订单 + 商品 ===== -->
      <section class="an-grid-2">

        <!-- 近期订单 -->
        <el-card shadow="never" class="an-panel">
          <template #header>
            <div class="panel__head">
              <span class="panel__title">
                <el-icon><Tickets /></el-icon>近期订单
              </span>
              <span class="panel__hint">最新 6 笔</span>
            </div>
          </template>

          <div v-if="recentOrders.length" class="feed">
            <div v-for="o in recentOrders" :key="o.orderId" class="feed__row">
              <div class="feed__main">
                <div class="feed__title">
                  <span class="feed__name" @click="goGoods(o.goodsId)">
                    {{ o.goodsName || '商品已删除' }}
                  </span>
                </div>
                <div class="feed__meta">
                  <span class="feed__no is-num">#{{ o.orderId }}</span>
                  <span>{{ o.buyerName || '—' }} → {{ o.sellerName || '—' }}</span>
                </div>
                <div class="feed__time">{{ formatRelativeTime(o.createTime) }}</div>
              </div>
              <div class="feed__side">
                <span class="feed__price is-num">{{ formatPrice(o.price) }}</span>
                <el-tag size="small" round :type="orderStatusTag(o.orderStatus)">
                  {{ orderStatusLabel(o.orderStatus) }}
                </el-tag>
              </div>
            </div>
          </div>

          <div v-else class="an-empty">暂无数据</div>
        </el-card>

        <!-- 近期商品 -->
        <el-card shadow="never" class="an-panel">
          <template #header>
            <div class="panel__head">
              <span class="panel__title">
                <el-icon><Goods /></el-icon>近期发布商品
              </span>
              <span class="panel__hint">最新 6 件</span>
            </div>
          </template>

          <div v-if="recentGoods.length" class="feed">
            <div v-for="g in recentGoods" :key="g.goodsId" class="feed__row">
              <div class="feed__main">
                <div class="feed__title">
                  <span class="feed__name" @click="goGoods(g.goodsId)">{{ g.goodsName || '未命名商品' }}</span>
                </div>
                <div class="feed__meta">
                  <span class="feed__no is-num">#{{ g.goodsId }}</span>
                  <span>卖家 {{ g.sellerName || '—' }}</span>
                </div>
                <div class="feed__time">{{ formatRelativeTime(g.createTime) }}</div>
              </div>
              <div class="feed__side">
                <span class="feed__price is-num">{{ formatPrice(g.price) }}</span>
                <el-tag size="small" round :type="goodsStatusTag(g.status)">
                  {{ goodsStatusLabel(g.status) }}
                </el-tag>
              </div>
            </div>
          </div>

          <div v-else class="an-empty">暂无数据</div>
        </el-card>

      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  Refresh,
  User,
  Goods,
  Tickets,
  Star,
  DataAnalysis,
  TrendCharts,
  PieChart,
  Histogram,
  Location,
  WarningFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatRelativeTime } from '../utils/format'

const router = useRouter()

// ===== 日期范围 =====
const dayOptions = [7, 14, 30, 90]
const days = ref(14)

// ===== 页面状态 =====
const loading = ref(false)
const loaded = ref(false)
const error = ref('')

// 全部数据唯一来源：GET /api/admin/analytics/overview?days=N
const overview = ref(null)
const totals = computed(() => overview.value?.totals || {})

const loadData = async () => {
  loading.value = true
  error.value = ''

  try {
    const res = await request.get('/admin/analytics/overview', {
      params: { days: days.value }
    })

    overview.value = res || null
    loaded.value = true
    runCountUp()
  } catch (e) {
    // request.js 已统一提示错误，这里只维护页面级错误态
    error.value = e?.response?.status === 403
        ? '当前账号没有查看平台运营数据的权限'
        : '运营数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const setDays = (d) => {
  if (days.value === d) return
  days.value = d
  loadData()
}

// ===== 数值递增（纯前端轻量动效，仅对真实数值做 0→1 插值）=====
const animP = ref(1)
let rafId = 0

const runCountUp = () => {
  const reduce = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduce) {
    animP.value = 1
    return
  }

  cancelAnimationFrame(rafId)
  const start = performance.now()
  const duration = 650

  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration)
    // easeOutCubic
    animP.value = 1 - Math.pow(1 - p, 3)
    if (p < 1) rafId = requestAnimationFrame(tick)
  }

  animP.value = 0
  rafId = requestAnimationFrame(tick)
}

const num = (value) => Math.round((Number(value) || 0) * animP.value)

onBeforeUnmount(() => cancelAnimationFrame(rafId))

// ===== 订单状态（严格对应后端 0/1/2，系统无取消状态）=====
const ORDER_STATUS_META = {
  0: { label: '待交易', color: '#c9a85c', tag: 'warning' },
  1: { label: '待买家确认', color: '#8fa7b5', tag: 'info' },
  2: { label: '已完成', color: '#c78e94', tag: 'success' }
}

const orderStatusLabel = (s) => ORDER_STATUS_META[Number(s)]?.label || '未知'
const orderStatusTag = (s) => ORDER_STATUS_META[Number(s)]?.tag || 'info'

// ===== 商品状态（1 在售 / 0 下架）=====
const goodsStatusLabel = (s) => (Number(s) === 1 ? '在售' : '下架')
const goodsStatusTag = (s) => (Number(s) === 1 ? 'success' : 'info')

// ===== 商品分类分布（横向条形）=====
const categoryDistribution = computed(() => overview.value?.categoryDistribution || [])

const categoryHasData = computed(
    () => categoryDistribution.value.some(r => (Number(r.goodsCount) || 0) > 0)
)

const categoryRows = computed(() => {
  const list = categoryDistribution.value
  const total = list.reduce((s, r) => s + (Number(r.goodsCount) || 0), 0)
  const max = Math.max(1, ...list.map(r => Number(r.goodsCount) || 0))

  return list.map(r => {
    const count = Number(r.goodsCount) || 0
    return {
      id: r.categoryId,
      name: r.categoryName || '未命名分类',
      count,
      // 条宽按最大值等比，非零值保留最小可见宽度
      width: count > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0
    }
  })
})

// ===== 订单状态分布（环形图）=====
const orderStatusRows = computed(() => {
  const list = overview.value?.orderStatusDistribution || []
  const map = new Map(list.map(r => [Number(r.status), Number(r.count) || 0]))

  const rows = [0, 1, 2].map(s => ({
    status: s,
    label: ORDER_STATUS_META[s].label,
    color: ORDER_STATUS_META[s].color,
    count: map.get(s) || 0
  }))

  const total = rows.reduce((s, r) => s + r.count, 0)

  return rows.map(r => ({
    ...r,
    percent: total ? (r.count / total) * 100 : 0
  }))
})

const orderStatusTotal = computed(
    () => orderStatusRows.value.reduce((s, r) => s + r.count, 0)
)

const DONUT_R = 58
const DONUT_C = 2 * Math.PI * DONUT_R

const donutSegments = computed(() => {
  const total = orderStatusTotal.value
  if (!total) return []

  let acc = 0

  return orderStatusRows.value.map(r => {
    const len = (r.count / total) * DONUT_C
    const seg = {
      label: r.label,
      color: r.color,
      dash: `${len} ${DONUT_C - len}`,
      offset: -acc
    }
    acc += len
    return seg
  })
})

// ===== 校区分布（横向条形）=====
const campusDistribution = computed(() => overview.value?.campusDistribution || [])

const campusTotal = computed(
    () => campusDistribution.value.reduce((s, r) => s + (Number(r.count) || 0), 0)
)

const campusRows = computed(() => {
  const list = campusDistribution.value
  const total = list.reduce((s, r) => s + (Number(r.count) || 0), 0)
  const max = Math.max(1, ...list.map(r => Number(r.count) || 0))

  return list.map(r => {
    const count = Number(r.count) || 0
    return {
      name: r.campus || '未标注',
      count,
      width: Math.max(4, Math.round((count / max) * 100)),
      percent: total ? Math.round((count / total) * 1000) / 10 : 0
    }
  })
})

// ===== 时间趋势（SVG 折线）=====
const trendMetrics = [
  { key: 'goods', name: '新增商品', field: 'goodsTrend', color: 'primary' },
  { key: 'order', name: '新增订单', field: 'orderTrend', color: 'accent' },
  { key: 'user', name: '新增用户', field: 'userTrend', color: 'aux' }
]

const trendMetric = ref('goods')
const activeTrendDef = computed(
    () => trendMetrics.find(m => m.key === trendMetric.value) || trendMetrics[0]
)
const trendSeries = computed(() => overview.value?.[activeTrendDef.value.field] || [])

const SVG_W = 1000
const SVG_H = 260
const GRID_TOP = 26
const GRID_MID = (GRID_TOP + 222) / 2
const GRID_BASE = 222

const trendMax = computed(
    () => Math.max(1, ...trendSeries.value.map(p => Number(p.count) || 0))
)

const pointX = (i) => ((i + 0.5) / (trendSeries.value.length || 1)) * SVG_W
const pointY = (c) => GRID_BASE - ((Number(c) || 0) / trendMax.value) * (GRID_BASE - GRID_TOP)

const linePoints = computed(
    () => trendSeries.value
        .map((p, i) => `${pointX(i).toFixed(1)},${pointY(p.count).toFixed(1)}`)
        .join(' ')
)

const areaPoints = computed(() => {
  const list = trendSeries.value
  if (!list.length) return ''

  const first = pointX(0).toFixed(1)
  const last = pointX(list.length - 1).toFixed(1)

  return `${linePoints.value} ${last},${GRID_BASE} ${first},${GRID_BASE}`
})

const trendHasData = computed(
    () => trendSeries.value.some(p => (Number(p.count) || 0) > 0)
)

const trendTotal = computed(
    () => trendSeries.value.reduce((s, p) => s + (Number(p.count) || 0), 0)
)

// 点过多时稀疏显示日期标签
const labelStep = computed(() => Math.max(1, Math.ceil((trendSeries.value.length || 1) / 10)))
const showLabels = (i) => i % labelStep.value === 0 || i === trendSeries.value.length - 1

// 仅日期点较少时绘制数据点，避免 90 天时拥挤
const showDots = computed(
    () => trendSeries.value.length > 1 && trendSeries.value.length <= 31
)

const shortDate = (date) => {
  const parts = String(date).split('-')
  return parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : date
}

// ===== 近期活动 =====
const recentOrders = computed(() => overview.value?.recentOrders || [])
const recentGoods = computed(() => overview.value?.recentGoods || [])

// ===== 异常提示 =====
const anomalies = computed(() => overview.value?.anomalies || [])

// ===== 工具方法 =====
const formatPct = (value) => Math.round((Number(value) || 0) * 10) / 10
const goGoods = (id) => {
  if (id) router.push(`/goods/${id}`)
}

onMounted(loadData)
</script>

<style scoped>

.an-page {
  padding: 24px 28px 40px;
  max-width: 1360px;
  margin: 0 auto;
}

/* ===== 顶部工具条 ===== */
.an-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.an-head__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-text);
}

.an-head__badge {
  font-size: 21px;
  color: var(--brand-primary);
}

.an-head__sub {
  margin: 0;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.an-head__ops {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.range-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
}

.range-switch__btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.range-switch__btn:hover {
  color: var(--brand-primary-active);
}

.range-switch__btn.is-active {
  background: var(--brand-white);
  color: var(--brand-primary-active);
  font-weight: 600;
  box-shadow: var(--brand-shadow-sm);
}

/* ===== 状态：错误 / 骨架 ===== */
.an-error {
  text-align: center;
  padding: 26px 0;
}

.an-error__icon {
  font-size: 34px;
  color: #c07a55;
}

.an-error__title {
  margin: 10px 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--brand-text);
}

.an-error__text {
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.an-skeleton {
  padding: 8px 4px;
}

/* ===== 核心指标卡 ===== */
.an-kpi {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 12px;
}

.kpi {
  position: relative;
  padding: 16px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.kpi:hover {
  transform: translateY(-3px);
  box-shadow: var(--brand-shadow);
}

.kpi::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.kpi--user::before { background: var(--brand-primary); }
.kpi--goods::before { background: var(--brand-accent); }
.kpi--order::before { background: var(--brand-aux); }
.kpi--fav::before { background: #d8a08a; }

.kpi__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi__label {
  font-size: 13px;
  color: var(--brand-text-regular);
}

.kpi__icon {
  font-size: 16px;
  color: var(--brand-text-secondary);
}

.kpi__value {
  margin: 8px 0 10px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.05;
  color: var(--brand-text);
}

.kpi__sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.kpi__sub-item b {
  color: var(--brand-text-regular);
  font-weight: 600;
}

/* 次级总量小条 */
.an-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
  border: 1px solid var(--brand-border);
  font-size: 12.5px;
  color: var(--brand-text-regular);
}

.chip b {
  color: var(--brand-text);
  font-weight: 700;
}

/* ===== 面板通用 ===== */
.an-panel {
  border-radius: var(--brand-radius-lg);
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel__head--wrap {
  flex-wrap: wrap;
}

.panel__title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text);
}

.panel__title .el-icon {
  color: var(--brand-primary);
}

.panel__hint {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.panel__hint b {
  color: var(--brand-text-regular);
}

/* ===== 两列栅格 ===== */
.an-grid-2 {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.an-trend-card {
  margin-bottom: 16px;
}

/* ===== 横向条形图 ===== */
.bars {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.bar-row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) 46px 44px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.bar-row__name {
  color: var(--brand-text-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-row__track {
  height: 10px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
  overflow: hidden;
}

.bar-row__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.45s ease;
}

.bar-row__fill--primary {
  background: linear-gradient(90deg, var(--brand-primary-soft) 0%, var(--brand-primary) 100%);
}

.bar-row__fill--aux {
  background: linear-gradient(90deg, #cfd8de 0%, var(--brand-aux) 100%);
}

.bar-row__value {
  text-align: right;
  font-weight: 600;
  color: var(--brand-text);
}

.bar-row__pct {
  text-align: right;
  color: var(--brand-text-secondary);
}

/* ===== 环形图 ===== */
.donut-wrap {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.donut {
  position: relative;
  width: 168px;
  height: 168px;
  flex-shrink: 0;
}

.donut__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.donut__track {
  fill: none;
  stroke: var(--brand-bg-soft);
  stroke-width: 22;
}

.donut__seg {
  fill: none;
  stroke-width: 22;
  transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
}

.donut__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut__total {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--brand-text);
}

.donut__cap {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.donut-legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.donut-legend__item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.donut-legend__name {
  color: var(--brand-text-regular);
}

.donut-legend__count {
  font-weight: 600;
  color: var(--brand-text);
}

.donut-legend__pct {
  width: 46px;
  text-align: right;
  color: var(--brand-text-secondary);
}

/* ===== 趋势图 ===== */
.trend-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trend-switch__btn {
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.trend-switch__btn:hover {
  border-color: var(--brand-primary);
}

.trend-switch__btn.is-active {
  font-weight: 600;
  color: #fff;
}

.trend-switch__btn--primary.is-active { background: var(--brand-primary); border-color: var(--brand-primary); }
.trend-switch__btn--accent.is-active { background: var(--brand-accent); border-color: var(--brand-accent); }
.trend-switch__btn--aux.is-active { background: var(--brand-aux); border-color: var(--brand-aux); }

.trend-switch .panel__hint {
  margin-left: 6px;
}

.trend {
  padding-top: 4px;
}

.trend__plot {
  position: relative;
  height: 260px;
}

.trend__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.trend__grid {
  stroke: var(--brand-border);
  stroke-width: 1;
  stroke-dasharray: 4 6;
}

.trend__grid--base {
  stroke-dasharray: none;
}

.trend__area {
  opacity: 0.16;
}

.trend__line {
  fill: none;
  stroke-width: 2.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.trend--primary .trend__area { fill: var(--brand-primary); }
.trend--primary .trend__line { stroke: var(--brand-primary); }
.trend--primary .trend__dot { fill: var(--brand-primary); }

.trend--accent .trend__area { fill: var(--brand-accent); }
.trend--accent .trend__line { stroke: var(--brand-accent); }
.trend--accent .trend__dot { fill: var(--brand-accent); }

.trend--aux .trend__area { fill: var(--brand-aux); }
.trend--aux .trend__line { stroke: var(--brand-aux); }
.trend--aux .trend__dot { fill: var(--brand-aux); }

.trend__dot {
  stroke: var(--brand-white);
  stroke-width: 1.4;
}

/* 悬浮命中层 */
.trend__hover {
  position: absolute;
  inset: 0;
  display: flex;
}

.trend__hover-cell {
  flex: 1 1 0;
  min-width: 0;
  transition: background 0.15s ease;
}

.trend__hover-cell:hover {
  background: rgba(216, 168, 173, 0.12);
}

.trend__ymax,
.trend__yzero {
  position: absolute;
  left: 2px;
  font-size: 11px;
  color: var(--brand-text-secondary);
  pointer-events: none;
}

.trend__ymax { top: 0; }
.trend__yzero { bottom: 26px; }

.trend__xaxis {
  display: flex;
  margin-top: 8px;
}

.trend__xlabel {
  flex: 1 1 0;
  min-width: 0;
  text-align: center;
  font-size: 11px;
  color: var(--brand-text-secondary);
  white-space: nowrap;
  overflow: hidden;
}

/* ===== 异常提示 ===== */
.anomaly-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.anomaly {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--brand-radius);
}

.anomaly--warn {
  background: #fbf3ec;
  border: 1px solid #f0ddca;
}

.anomaly--info {
  background: var(--brand-bg-soft);
  border: 1px solid var(--brand-border);
}

.anomaly__icon {
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.anomaly--warn .anomaly__icon { color: #c07a55; }
.anomaly--info .anomaly__icon { color: var(--brand-aux); }

.anomaly__body {
  flex: 1;
  min-width: 0;
}

.anomaly__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.anomaly__label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.anomaly--warn .anomaly__label { color: #96603f; }

.anomaly__count {
  font-size: 17px;
  font-weight: 700;
  color: var(--brand-text);
}

.anomaly--warn .anomaly__count { color: #b06a41; }

.anomaly__hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--brand-text-secondary);
}

/* ===== 近期活动流 ===== */
.feed {
  display: flex;
  flex-direction: column;
}

.feed__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 4px;
  border-bottom: 1px solid var(--brand-border);
}

.feed__row:last-child {
  border-bottom: none;
}

.feed__row:hover {
  background: var(--brand-bg-soft);
}

.feed__main {
  min-width: 0;
}

.feed__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feed__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.feed__name:hover {
  color: var(--brand-primary-active);
}

.feed__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.feed__no {
  color: var(--brand-text-regular);
}

.feed__time {
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.feed__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.feed__price {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-accent);
}

/* ===== 空状态 ===== */
.an-empty {
  padding: 28px 4px;
  font-size: 13px;
  color: var(--brand-text-secondary);
  text-align: center;
}

/* ===== 响应式 ===== */
@media (max-width: 1180px) {
  .an-kpi {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .an-grid-2 {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .an-page {
    padding: 18px 14px 32px;
  }

  .an-kpi {
    grid-template-columns: minmax(0, 1fr);
  }

  .an-head__ops {
    width: 100%;
  }

  .range-switch {
    flex: 1;
    justify-content: space-between;
  }

  .bar-row {
    grid-template-columns: 84px minmax(0, 1fr) 38px 42px;
    font-size: 12px;
  }

  .donut-wrap {
    justify-content: center;
  }

  .trend__plot {
    height: 200px;
  }

  .trend__xlabel {
    font-size: 10px;
  }
}

/* 尊重系统「减少动效」偏好 */
@media (prefers-reduced-motion: reduce) {
  .kpi,
  .bar-row__fill,
  .donut__seg,
  .trend__hover-cell {
    transition: none;
  }

  .kpi:hover {
    transform: none;
  }
}

</style>
