<template>
  <div class="workbench">

    <!-- ===== 顶部：标题 + 时间范围 + 刷新 ===== -->
    <header class="wb-head">
      <div class="wb-head__main">
        <h2 class="wb-head__title">卖家经营工作台</h2>
        <p class="wb-head__sub">
          我的商品、订单处理与信誉数据一览（数据来自真实交易记录，实时读取）
        </p>
      </div>

      <div class="wb-head__ops">
        <div class="range-switch">
          <button
              v-for="item in ranges"
              :key="item.value"
              class="range-switch__btn"
              :class="{ 'is-active': range === item.value }"
              @click="range = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <el-button :icon="Refresh" :loading="loading" @click="loadAll">刷新</el-button>
      </div>
    </header>

    <!-- ===== 加载骨架 ===== -->
    <el-skeleton v-if="loading && !loaded" :rows="8" animated class="wb-skeleton" />

    <template v-else>

      <!-- ===== 指标卡：全部由真实数据聚合 ===== -->
      <section class="kpi-row">

        <div class="kpi kpi--rose">
          <div class="kpi__top">
            <span class="kpi__label">在售商品</span>
            <el-icon class="kpi__icon"><Sell /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ onSaleGoods.length }}</div>
          <div class="kpi__foot">共发布 {{ myGoods.length }} 件 · 下架/已售 {{ myGoods.length - onSaleGoods.length }} 件</div>
        </div>

        <div class="kpi kpi--gold">
          <div class="kpi__top">
            <span class="kpi__label">已售商品</span>
            <el-icon class="kpi__icon"><CircleCheck /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ soldGoods.length }}</div>
          <div class="kpi__foot">已产生订单的商品数量</div>
        </div>

        <div class="kpi kpi--warn">
          <div class="kpi__top">
            <span class="kpi__label">待我交付</span>
            <el-icon class="kpi__icon"><AlarmClock /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ toDeliver.length }}</div>
          <div class="kpi__foot">
            <span v-if="toDeliver.length" class="kpi__warn">买家已下单，等待线下交付</span>
            <span v-else>暂无待处理交付</span>
          </div>
        </div>

        <div class="kpi kpi--aux">
          <div class="kpi__top">
            <span class="kpi__label">待买家确认</span>
            <el-icon class="kpi__icon"><LoadingIcon /></el-icon>
          </div>
          <div class="kpi__value is-num">{{ waitingBuyer.length }}</div>
          <div class="kpi__foot">我已交付，等待买家收货确认</div>
        </div>

        <div class="kpi kpi--rose">
          <div class="kpi__top">
            <span class="kpi__label">累计成交额</span>
            <el-icon class="kpi__icon"><Money /></el-icon>
          </div>
          <div class="kpi__value kpi__value--money is-num">{{ formatPrice(completedRevenue) }}</div>
          <div class="kpi__foot">已完成订单 {{ completedOrders.length }} 笔</div>
        </div>

      </section>

      <!-- ===== 主区：趋势图 + 待办泳道 ===== -->
      <section class="wb-grid">

        <!-- 左：经营趋势 + 分类分布 -->
        <el-card shadow="never" class="panel panel--chart">

          <template #header>
            <div class="panel__head">
              <span class="panel__title">经营趋势</span>
              <span class="panel__hint">{{ rangeLabel }}内「商品发布 / 成交订单」数量对比</span>
            </div>
          </template>

          <!-- 图例 -->
          <div class="chart-legend">
            <span class="chart-legend__item">
              <i class="dot dot--goods"></i>商品发布
            </span>
            <span class="chart-legend__item">
              <i class="dot dot--order"></i>成交订单
            </span>
            <span class="chart-legend__sum is-num">
              区间内发布 {{ trendSum.goods }} 件 · 订单 {{ trendSum.orders }} 笔
            </span>
          </div>

          <!-- 纯 CSS 分组柱状图（无额外图表依赖） -->
          <div v-if="trendHasData" class="chart">
            <div class="chart__plot">
              <div
                  v-for="bucket in trend"
                  :key="bucket.key"
                  class="chart__group"
                  :title="`${bucket.label}：发布 ${bucket.goods} 件 / 订单 ${bucket.orders} 笔`"
              >
                <div class="chart__bars">
                  <div
                      class="chart__bar chart__bar--goods"
                      :style="{ height: barHeight(bucket.goods) }"
                  >
                    <span v-if="bucket.goods" class="chart__bar-num is-num">{{ bucket.goods }}</span>
                  </div>
                  <div
                      class="chart__bar chart__bar--order"
                      :style="{ height: barHeight(bucket.orders) }"
                  >
                    <span v-if="bucket.orders" class="chart__bar-num is-num">{{ bucket.orders }}</span>
                  </div>
                </div>
                <div class="chart__label">{{ bucket.label }}</div>
              </div>
            </div>
          </div>

          <div v-else class="empty-mini">
            该时间范围内暂无发布或成交记录
          </div>

          <!-- 分类分布：真实商品数量 -->
          <div class="cat-block">
            <div class="cat-block__head">
              <span class="panel__title panel__title--sm">在售商品分类分布</span>
              <span class="panel__hint">基于我的商品分类统计</span>
            </div>

            <div v-if="categoryRows.length" class="cat-rows">
              <div v-for="row in categoryRows" :key="row.name" class="cat-row">
                <span class="cat-row__name">{{ row.name }}</span>
                <div class="cat-row__track">
                  <div
                      class="cat-row__fill"
                      :style="{ width: row.percent + '%' }"
                  ></div>
                </div>
                <span class="cat-row__count is-num">{{ row.count }}</span>
              </div>
            </div>

            <div v-else class="empty-mini">还没有发布任何商品，发布后可在此查看分类结构</div>
          </div>

        </el-card>

        <!-- 右：待办 + 信誉 -->
        <div class="wb-col">

          <!-- 待处理订单 -->
          <el-card shadow="never" class="panel">
            <template #header>
              <div class="panel__head">
                <span class="panel__title">待处理订单</span>
                <router-link class="panel__link" to="/orders/center">全部订单 →</router-link>
              </div>
            </template>

            <div v-if="pendingOrders.length" class="task-list">
              <div
                  v-for="order in pendingOrders.slice(0, 4)"
                  :key="order.orderId"
                  class="task"
                  @click="goOrder(order.orderId)"
              >
                <div class="task__thumb">
                  <img
                      v-if="order.imageUrl"
                      :src="order.imageUrl"
                      :alt="order.goodsName"
                      @error="onImgError($event)"
                  />
                  <el-icon v-else><Picture /></el-icon>
                </div>

                <div class="task__body">
                  <div class="task__title">{{ order.goodsName || '商品已删除' }}</div>
                  <div class="task__meta">
                    订单 #{{ order.orderId }} · 买家 {{ order.buyerName || '—' }} ·
                    <span class="price-text">{{ formatPrice(order.price) }}</span>
                  </div>
                  <div class="task__time">{{ formatRelativeTime(order.createTime) }}</div>
                </div>

                <el-tag
                    size="small"
                    round
                    :type="order.orderStatus === 0 ? 'warning' : 'info'"
                    class="task__tag"
                >
                  {{ order.orderStatus === 0 ? '待交付' : '待买家确认' }}
                </el-tag>
              </div>
            </div>

            <div v-else class="empty-mini">当前没有需要处理的订单，交易状态都已推进完成</div>
          </el-card>

          <!-- 信誉摘要 -->
          <el-card shadow="never" class="panel panel--rep">
            <template #header>
              <div class="panel__head">
                <span class="panel__title">
                  信誉摘要
                  <el-tag type="warning" size="small" effect="plain" round>
                    {{ rep.creditLevel || '校园新生' }}
                  </el-tag>
                </span>
                <span class="panel__hint">来自买家的真实评价</span>
              </div>
            </template>

            <div class="rep">
              <div class="rep__score">
                <div class="rep__num is-num">{{ avgScoreText }}</div>
                <el-rate :model-value="avgScoreValue" disabled allow-half size="small" />
                <div class="rep__cap">平均评分</div>
              </div>

              <div class="rep__stats">
                <div class="rep__stat">
                  <span class="rep__stat-num is-num">{{ rep.totalCount || 0 }}</span>
                  <span class="rep__stat-cap">收到评价</span>
                </div>
                <div class="rep__stat">
                  <span class="rep__stat-num is-num">{{ rep.completedCount || 0 }}</span>
                  <span class="rep__stat-cap">完成交易</span>
                </div>
                <div class="rep__stat">
                  <span class="rep__stat-num is-num">{{ rep.creditScore || 100 }}</span>
                  <span class="rep__stat-cap">信用分</span>
                </div>
              </div>

              <div v-if="(rep.totalCount || 0) > 0" class="rep__recent">
                <div
                    v-for="(item, idx) in (rep.recentList || []).slice(0, 2)"
                    :key="idx"
                    class="rep__item"
                >
                  <el-rate :model-value="Number(item.score) || 0" disabled size="small" />
                  <div class="rep__item-text">{{ item.content }}</div>
                </div>
              </div>

              <div v-else class="empty-mini">
                暂无买家评价，完成交易后买家可对你的服务打分
              </div>
            </div>
          </el-card>

        </div>
      </section>

      <!-- ===== 商品表现榜 ===== -->
      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel__head">
            <span class="panel__title">商品表现榜</span>
            <span class="panel__hint">按浏览量排序，浏览量 / 收藏量均为真实计数</span>
          </div>
        </template>

        <div v-if="topGoods.length" class="perf">
          <div
              v-for="(goods, idx) in topGoods"
              :key="goods.goodsId"
              class="perf__row"
              @click="goGoods(goods.goodsId)"
          >
            <span class="perf__rank" :class="`perf__rank--${idx + 1}`">{{ idx + 1 }}</span>

            <div class="perf__thumb">
              <img
                  v-if="goods.imageUrl"
                  :src="goods.imageUrl"
                  :alt="goods.goodsName"
                  @error="onImgError($event)"
              />
              <el-icon v-else><Picture /></el-icon>
            </div>

            <div class="perf__main">
              <div class="perf__name">
                {{ goods.goodsName }}
                <el-tag
                    v-if="goods.status !== 1"
                    size="small"
                    type="info"
                    round
                >
                  已下架
                </el-tag>
              </div>
              <div class="perf__meta">
                {{ categoryNameOf(goods.categoryId) }} · {{ goods.campus || '校区未填' }} ·
                成色 {{ conditionLabelOf(goods.conditionLevel) }}
              </div>
            </div>

            <div class="perf__price is-num">{{ formatPrice(goods.price) }}</div>

            <div class="perf__stats">
              <span class="perf__stat">
                <el-icon><View /></el-icon>
                <span class="is-num">{{ goods.viewCount ?? 0 }}</span>
              </span>
              <span class="perf__stat">
                <el-icon><Star /></el-icon>
                <span class="is-num">{{ goods.favoriteCount ?? 0 }}</span>
              </span>
            </div>
          </div>
        </div>

        <div v-else class="empty-mini">
          还没有可统计的商品，先去发布一件吧
        </div>
      </el-card>

      <!-- ===== 待办提示 + 快捷操作 ===== -->
      <section class="wb-bottom">

        <el-card shadow="never" class="panel panel--tips">
          <template #header>
            <span class="panel__title">经营提醒</span>
          </template>

          <ul v-if="tips.length" class="tips">
            <li v-for="(tip, idx) in tips" :key="idx" :class="`tips__item tips__item--${tip.level}`">
              <el-icon><WarningFilled v-if="tip.level === 'warn'" /><InfoFilled v-else /></el-icon>
              <span>{{ tip.text }}</span>
            </li>
          </ul>

          <div v-else class="empty-mini">一切正常，没有需要额外关注的经营项</div>
        </el-card>

        <el-card shadow="never" class="panel panel--quick">
          <template #header>
            <span class="panel__title">快捷操作</span>
          </template>

          <div class="quick">
            <button class="quick__btn" @click="router.push('/goods/publish')">
              <el-icon class="quick__icon"><CirclePlus /></el-icon>
              <span class="quick__label">发布新商品</span>
              <span class="quick__desc">进入四步发布向导</span>
            </button>

            <button class="quick__btn" @click="router.push('/orders/center')">
              <el-icon class="quick__icon"><Tickets /></el-icon>
              <span class="quick__label">订单中心</span>
              <span class="quick__desc">查看买家订单与交易进度</span>
            </button>

            <button class="quick__btn" @click="router.push('/goods')">
              <el-icon class="quick__icon"><ShoppingBag /></el-icon>
              <span class="quick__label">商品市场</span>
              <span class="quick__desc">查看我的商品在市场上的样子</span>
            </button>

            <button class="quick__btn" @click="router.push(`/seller/${userId}`)">
              <el-icon class="quick__icon"><Shop /></el-icon>
              <span class="quick__label">我的店铺主页</span>
              <span class="quick__desc">买家看到的公开主页</span>
            </button>
          </div>
        </el-card>

      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Refresh,
  Sell,
  CircleCheck,
  AlarmClock,
  Loading as LoadingIcon,
  Money,
  Picture,
  View,
  Star,
  WarningFilled,
  InfoFilled,
  CirclePlus,
  Tickets,
  ShoppingBag,
  Shop
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatRelativeTime } from '../utils/format'

const router = useRouter()

const userId = Number(localStorage.getItem('userId')) || null

// ===== 数据源（全部为后端真实接口）=====
const myGoods = ref([])        // GET /goods/my
const sellerOrders = ref([])   // GET /orders/seller
const categories = ref([])     // GET /categories
const rep = ref({})            // GET /evaluations/seller/{id}

const loading = ref(false)
const loaded = ref(false)

// ===== 时间范围 =====
const ranges = [
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
  { label: '近 6 个月', value: '6m' }
]
const range = ref('30d')
const rangeLabel = computed(
    () => ranges.find(r => r.value === range.value)?.label || ''
)

// ===== 商品口径（在售 / 已售均基于真实状态与订单）=====
const onSaleGoods = computed(() => myGoods.value.filter(g => g.status === 1))

const orderGoodsIds = computed(
    () => new Set(sellerOrders.value.map(o => o.goodsId))
)

// 已售：已下架且确实产生过订单（仅有订单的商品才算卖出，避免把纯下架算成已售）
const soldGoods = computed(
    () => myGoods.value.filter(g => g.status !== 1 && orderGoodsIds.value.has(g.goodsId))
)

// ===== 订单口径（严格对应后端 0/1/2 三种状态，不臆造状态）=====
const toDeliver = computed(() => sellerOrders.value.filter(o => o.orderStatus === 0))
const waitingBuyer = computed(() => sellerOrders.value.filter(o => o.orderStatus === 1))
const completedOrders = computed(() => sellerOrders.value.filter(o => o.orderStatus === 2))
const pendingOrders = computed(() => sellerOrders.value.filter(o => o.orderStatus !== 2))

const completedRevenue = computed(() =>
    completedOrders.value.reduce((sum, o) => sum + (Number(o.price) || 0), 0)
)

// ===== 趋势图：按时间范围把真实记录分桶统计 =====
const pad = n => String(n).padStart(2, '0')

const bucketDefs = computed(() => {
  const now = new Date()
  const list = []

  if (range.value === '6m') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push({
        key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
        label: `${d.getMonth() + 1}月`,
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1)
      })
    }
    return list
  }

  const days = range.value === '7d' ? 7 : 30
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    list.push({
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      // 7 天全部显示；30 天只每 5 天显示一个刻度，避免标签挤压
      label: days === 7 || i % 5 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : '',
      start: d,
      end: next
    })
  }
  return list
})

const trend = computed(() => {
  const inBucket = (time, start, end) => {
    if (!time) return false
    const t = new Date(time).getTime()
    return !Number.isNaN(t) && t >= start.getTime() && t < end.getTime()
  }

  return bucketDefs.value.map(b => ({
    key: b.key,
    label: b.label,
    goods: myGoods.value.filter(g => inBucket(g.createTime, b.start, b.end)).length,
    orders: sellerOrders.value.filter(o => inBucket(o.createTime, b.start, b.end)).length
  }))
})

const trendMax = computed(() =>
    Math.max(1, ...trend.value.map(b => Math.max(b.goods, b.orders)))
)

const trendHasData = computed(
    () => trend.value.some(b => b.goods > 0 || b.orders > 0)
)

const trendSum = computed(() => ({
  goods: trend.value.reduce((s, b) => s + b.goods, 0),
  orders: trend.value.reduce((s, b) => s + b.orders, 0)
}))

// 柱高按区间内最大值等比缩放（非零值保留最小可见高度，避免看不见）
const barHeight = (value) => {
  if (!value) return '0%'
  return `${Math.max(6, Math.round((value / trendMax.value) * 100))}%`
}

// ===== 分类分布（真实商品 + 分类名来自 /categories）=====
const categoryNameOf = (categoryId) => {
  const hit = categories.value.find(c => c.categoryId === categoryId)
  return hit ? hit.categoryName : '未分类'
}

const conditionLabelOf = (level) => {
  const map = { 1: '全新', 2: '99新', 3: '95新', 4: '9成新', 5: '8成新及以下' }
  return map[level] || '未标注'
}

const categoryRows = computed(() => {
  const counts = new Map()
  myGoods.value.forEach(g => {
    const name = categoryNameOf(g.categoryId)
    counts.set(name, (counts.get(name) || 0) + 1)
  })

  const total = myGoods.value.length || 1

  return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
})

// ===== 商品表现榜（浏览量降序，同浏览量按收藏量）=====
const topGoods = computed(() =>
    [...myGoods.value]
        .sort((a, b) =>
            (b.viewCount ?? 0) - (a.viewCount ?? 0) ||
            (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0)
        )
        .slice(0, 5)
)

// ===== 信誉 =====
const avgScoreValue = computed(() => Number(rep.value.avgScore) || 0)
const avgScoreText = computed(() =>
    rep.value.totalCount ? Number(rep.value.avgScore || 0).toFixed(1) : '暂无'
)

// ===== 经营提醒（基于真实数据推导，不是伪造的风险检测）=====
const tips = computed(() => {
  const list = []

  if (toDeliver.value.length) {
    list.push({
      level: 'warn',
      text: `有 ${toDeliver.value.length} 笔订单等待你线下交付，确认后请及时点击「确认已交付」`
    })
  }

  const noImage = myGoods.value.filter(g => g.status === 1 && !g.imageUrl).length
  if (noImage) {
    list.push({
      level: 'warn',
      text: `有 ${noImage} 件在售商品没有主图，补图后更容易被买家点击`
    })
  }

  const stale = onSaleGoods.value.filter(g => {
    const days = (Date.now() - new Date(g.createTime).getTime()) / 86400000
    return days > 45
  }).length
  if (stale) {
    list.push({
      level: 'info',
      text: `有 ${stale} 件商品上架超过 45 天仍未售出，可以考虑降价或重新描述`
    })
  }

  if (!myGoods.value.length) {
    list.push({ level: 'info', text: '还没有发布商品，从「发布新商品」开始你的第一笔交易' })
  }

  return list
})

// ===== 数据加载 =====
const loadAll = async () => {
  loading.value = true
  try {
    // 商品与订单是本页核心数据，必须成功；分类与信誉失败不阻断整体渲染
    const [goodsRes, orderRes] = await Promise.all([
      request.get('/goods/my'),
      request.get('/orders/seller')
    ])
    myGoods.value = goodsRes || []
    sellerOrders.value = orderRes || []

    const [catRes, repRes] = await Promise.allSettled([
      request.get('/categories'),
      userId ? request.get(`/evaluations/seller/${userId}`) : Promise.resolve(null)
    ])

    categories.value = catRes.status === 'fulfilled' ? (catRes.value || []) : []
    rep.value = repRes.status === 'fulfilled' ? (repRes.value || {}) : {}

    loaded.value = true
  } catch (e) {
    // request.js 已统一提示错误
  } finally {
    loading.value = false
  }
}

// ===== 跳转与兜底 =====
const goOrder = (orderId) => router.push(`/orders/center/${orderId}`)
const goGoods = (goodsId) => router.push(`/goods/${goodsId}`)
const onImgError = (e) => { e.target.style.display = 'none' }

onMounted(loadAll)
</script>

<style scoped>
.workbench {
  padding: 24px 28px 40px;
  max-width: 1320px;
  margin: 0 auto;
}

/* ===== 顶部 ===== */
.wb-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.wb-head__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-text);
}

.wb-head__sub {
  margin: 0;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.wb-head__ops {
  display: flex;
  align-items: center;
  gap: 12px;
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

.wb-skeleton {
  padding: 8px 4px;
}

/* ===== 指标卡 ===== */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
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

/* 左侧色条：五张卡各自不同，形成数据驾驶舱的节奏 */
.kpi::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.kpi--rose::before { background: var(--brand-primary); }
.kpi--gold::before { background: var(--brand-accent); }
.kpi--warn::before { background: #d98b6a; }
.kpi--aux::before { background: var(--brand-aux); }

.kpi__top {
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
  margin: 8px 0 6px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--brand-text);
}

.kpi__value--money {
  font-size: 24px;
  color: var(--brand-accent);
}

.kpi__foot {
  font-size: 12px;
  color: var(--brand-text-secondary);
  line-height: 1.5;
}

.kpi__warn {
  color: #c07a55;
}

/* ===== 主网格 ===== */
.wb-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.wb-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel {
  border-radius: var(--brand-radius-lg);
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.panel__title--sm {
  font-size: 14px;
}

.panel__hint {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.panel__link {
  font-size: 13px;
}

/* ===== 趋势图 ===== */
.chart-legend {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--brand-text-regular);
}

.chart-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.dot--goods { background: var(--brand-primary); }
.dot--order { background: var(--brand-accent); }

.chart-legend__sum {
  margin-left: auto;
  color: var(--brand-text-secondary);
}

.chart {
  padding: 4px 2px 0;
}

.chart__plot {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 200px;
  padding-bottom: 22px;
  border-bottom: 1px dashed var(--brand-border);
}

/* 30 天会有 30 组，用 flex:1 自适应宽度 */
.chart__group {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
}

.chart__bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 100%;
  padding-bottom: 20px;
}

.chart__bar {
  position: relative;
  width: 100%;
  max-width: 16px;
  min-height: 0;
  border-radius: 4px 4px 0 0;
  transition: height 0.35s ease, filter 0.2s ease;
}

.chart__bar--goods {
  background: linear-gradient(180deg, #e6c2c6 0%, var(--brand-primary) 100%);
}

.chart__bar--order {
  background: linear-gradient(180deg, #e5d49a 0%, var(--brand-accent) 100%);
}

.chart__group:hover .chart__bar {
  filter: saturate(1.15) brightness(0.97);
}

.chart__bar-num {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--brand-text-regular);
}

.chart__label {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--brand-text-secondary);
  white-space: nowrap;
}

/* ===== 分类分布 ===== */
.cat-block {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--brand-border);
}

.cat-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.cat-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cat-row {
  display: grid;
  grid-template-columns: 92px 1fr 34px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.cat-row__name {
  color: var(--brand-text-regular);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-row__track {
  height: 8px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
  overflow: hidden;
}

.cat-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--brand-primary-soft) 0%, var(--brand-primary) 100%);
  transition: width 0.4s ease;
}

.cat-row__count {
  text-align: right;
  color: var(--brand-text-secondary);
}

/* ===== 待办列表 ===== */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.task:hover {
  background: var(--brand-primary-soft);
  transform: translateX(2px);
}

.task__thumb {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: var(--brand-radius-sm);
  overflow: hidden;
  background: var(--brand-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-text-secondary);
}

.task__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.task__body {
  flex: 1;
  min-width: 0;
}

.task__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task__meta,
.task__time {
  font-size: 12px;
  color: var(--brand-text-secondary);
  margin-top: 3px;
}

.task__tag {
  flex-shrink: 0;
}

/* ===== 信誉 ===== */
.rep__score {
  text-align: center;
  padding: 6px 0 12px;
}

.rep__num {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--brand-accent);
}

.rep__cap {
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.rep__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--brand-border);
  border-bottom: 1px solid var(--brand-border);
}

.rep__stat {
  text-align: center;
}

.rep__stat-num {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: var(--brand-text);
}

.rep__stat-cap {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.rep__recent {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rep__item {
  padding: 10px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
}

.rep__item-text {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--brand-text-regular);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== 商品表现榜 ===== */
.perf {
  display: flex;
  flex-direction: column;
}

.perf__row {
  display: grid;
  grid-template-columns: 26px 52px minmax(0, 1fr) 90px 110px;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  border-bottom: 1px solid var(--brand-border);
  cursor: pointer;
  transition: background 0.2s ease;
}

.perf__row:last-child {
  border-bottom: none;
}

.perf__row:hover {
  background: var(--brand-bg-soft);
}

.perf__rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-text-secondary);
  background: var(--brand-bg-soft);
}

.perf__rank--1 {
  background: linear-gradient(135deg, #f0d9a8, var(--brand-accent));
  color: #fff;
}

.perf__rank--2 {
  background: linear-gradient(135deg, #efe4d6, #cfc0ad);
  color: #fff;
}

.perf__rank--3 {
  background: linear-gradient(135deg, #f3ded8, #d8a8ad);
  color: #fff;
}

.perf__thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--brand-radius-sm);
  overflow: hidden;
  background: var(--brand-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-text-secondary);
}

.perf__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.perf__main {
  min-width: 0;
}

.perf__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.perf__meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.perf__price {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-accent);
  text-align: right;
}

.perf__stats {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  font-size: 12px;
  color: var(--brand-text-regular);
}

.perf__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ===== 底部两块 ===== */
.wb-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 16px;
}

.tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tips__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--brand-radius);
  font-size: 13px;
  line-height: 1.6;
}

.tips__item--warn {
  background: #fbf3ec;
  color: #96603f;
}

.tips__item--info {
  background: var(--brand-bg-soft);
  color: var(--brand-text-regular);
}

.quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick__btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  background: var(--brand-white);
  cursor: pointer;
  text-align: left;
  transition: all 0.22s ease;
}

.quick__btn:hover {
  border-color: var(--brand-primary);
  background: var(--brand-primary-soft);
  transform: translateY(-2px);
  box-shadow: var(--brand-shadow-sm);
}

.quick__icon {
  font-size: 18px;
  color: var(--brand-primary);
  margin-bottom: 2px;
}

.quick__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
}

.quick__desc {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

/* ===== 空状态 ===== */
.empty-mini {
  padding: 16px 4px;
  font-size: 13px;
  color: var(--brand-text-secondary);
  text-align: center;
}

/* ===== 响应式 ===== */
@media (max-width: 1180px) {
  .kpi-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .wb-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .wb-bottom {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .workbench {
    padding: 18px 14px 32px;
  }

  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .perf__row {
    grid-template-columns: 22px 44px minmax(0, 1fr) 84px;
  }

  .perf__thumb {
    width: 44px;
    height: 44px;
  }

  .perf__stats {
    display: none;
  }

  .chart__plot {
    height: 160px;
  }

  .quick {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
