<template>
  <div class="seller-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>卖家工作台</h2>
        <p>管理我发布的商品与出售订单</p>
      </div>

      <el-button :icon="Refresh" :loading="loadingGoods" @click="loadGoods">
        刷新
      </el-button>
    </div>

    <!-- 销售概览：全部基于真实业务数据（我的商品 + 我卖出的订单） -->
    <div class="stat-cards">
      <StatCard label="我的商品" :value="myGoods.length" theme="teal">
        <template #icon><el-icon><Goods /></el-icon></template>
      </StatCard>

      <StatCard label="在售中" :value="onSaleCount" theme="orange">
        <template #icon><el-icon><Sell /></el-icon></template>
      </StatCard>

      <StatCard label="已完成交易" :value="completedCount" theme="blue">
        <template #icon><el-icon><CircleCheck /></el-icon></template>
      </StatCard>

      <StatCard label="成交金额" :value="revenue" prefix="¥" theme="purple">
        <template #icon><el-icon><Money /></el-icon></template>
      </StatCard>
    </div>

    <!-- 我的信誉（B2：评价 + 卖家信誉画像，卡片墙而非后台表格） -->
    <el-card shadow="never" class="block-card rep-card" v-loading="repLoading">

      <template #header>
        <div class="block-header">
          <span class="block-header__title">
            我的信誉
            <el-tag type="warning" size="small" effect="plain" round>
              {{ rep.creditLevel || '校园新生' }}
            </el-tag>
          </span>
          <span class="rep-card__hint">来自买家的真实评价，交易完成后持续积累</span>
        </div>
      </template>

      <!-- 信誉概览：评分印章 + 统计 + 评分分布 -->
      <div class="rep-overview">

        <div class="rep-score">
          <div class="rep-score__num is-num">{{ avgScoreText }}</div>
          <el-rate :model-value="avgScoreValue" disabled allow-half size="small" />
          <div class="rep-score__label">平均评分</div>
        </div>

        <div class="rep-metric">
          <div class="rep-metric__num is-num">{{ rep.totalCount || 0 }}</div>
          <div class="rep-metric__label">收到评价</div>
        </div>

        <div class="rep-metric">
          <div class="rep-metric__num is-num">{{ rep.completedCount || 0 }}</div>
          <div class="rep-metric__label">完成交易</div>
        </div>

        <div class="rep-dist">
          <div v-for="row in distRows" :key="row.star" class="rep-dist__row">
            <span class="rep-dist__star">{{ row.star }}星</span>
            <div class="rep-dist__track">
              <div class="rep-dist__fill" :style="{ width: row.percent + '%' }"></div>
            </div>
            <span class="rep-dist__count is-num">{{ row.count }}</span>
          </div>
        </div>

      </div>

      <!-- 最近评价 -->
      <div class="rep-recent">
        <div class="rep-recent__title">最近评价</div>

        <el-empty
            v-if="recentEvaluations.length === 0"
            description="暂无评价，完成交易后将逐步积累校园信誉"
            :image-size="90"
        />

        <div v-else class="rep-eval-list">
          <div
              v-for="ev in recentEvaluations"
              :key="ev.evaluationId"
              class="rep-eval"
          >
            <div class="rep-eval__head">
              <span class="rep-eval__buyer">{{ ev.buyerName || '匿名买家' }}</span>
              <el-rate :model-value="Number(ev.score || 0)" disabled size="small" />
              <span class="rep-eval__time">{{ formatRelativeTime(ev.createTime) }}</span>
            </div>
            <p class="rep-eval__content">{{ ev.content }}</p>
            <el-link
                v-if="ev.goodsId"
                type="primary"
                :underline="false"
                class="rep-eval__goods"
                @click="goDetail(ev.goodsId)"
            >
              「{{ ev.goodsName || '商品已删除' }}」
            </el-link>
            <span v-else class="rep-eval__goods rep-eval__goods--plain">
              「{{ ev.goodsName || '商品已删除' }}」
            </span>
          </div>
        </div>
      </div>

    </el-card>

    <!-- 我的商品 -->
    <el-card shadow="never" class="block-card">

      <template #header>
        <div class="block-header">
          <span class="block-header__title">我的商品</span>

          <el-radio-group v-model="goodsTab" size="small">
            <el-radio-button value="all">
              全部 <span class="tab-count">{{ myGoods.length }}</span>
            </el-radio-button>
            <el-radio-button value="onSale">
              在售 <span class="tab-count">{{ onSaleCount }}</span>
            </el-radio-button>
            <el-radio-button value="offSale">
              已下架 <span class="tab-count">{{ myGoods.length - onSaleCount }}</span>
            </el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table
          :data="filteredGoods"
          border
          stripe
          v-loading="loadingGoods"
          class="goods-table"
      >

        <el-table-column label="商品名称" min-width="170" show-overflow-tooltip>
          <template #default="scope">
            <el-link type="primary" :underline="false" @click="goDetail(scope.row.goodsId)">
              {{ scope.row.goodsName }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="110">
          <template #default="scope">
            {{ getCategoryName(scope.row.categoryId) }}
          </template>
        </el-table-column>

        <el-table-column label="价格" width="110">
          <template #default="scope">
            <span class="price-text">{{ formatPrice(scope.row.price) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag
                :type="scope.row.status === 1 ? 'success' : 'info'"
                size="small"
            >
              {{ scope.row.status === 1 ? '在售' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" min-width="160">
          <template #default="scope">
            {{ formatDateTime(scope.row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="170" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="goEdit(scope.row)">
              编辑
            </el-button>
            <el-button
                v-if="scope.row.status === 1"
                type="warning"
                link
                :loading="statusChangingId === scope.row.goodsId"
                @click="handleOffSale(scope.row)"
            >
              下架
            </el-button>
            <el-button
                v-else
                type="success"
                link
                :loading="statusChangingId === scope.row.goodsId"
                @click="handleOnSale(scope.row)"
            >
              上架
            </el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty
              :description="goodsTab === 'all' ? '还没有发布过商品，去商品中心发布第一件闲置吧' : '该状态下暂无商品'"
          />
        </template>

      </el-table>

    </el-card>

    <!-- 最近出售订单 -->
    <el-card shadow="never" class="block-card">

      <template #header>
        <div class="block-header">
          <span class="block-header__title">
            最近出售订单
            <el-tag v-if="pendingCount > 0" type="warning" size="small" effect="plain">
              {{ pendingCount }} 笔待处理
            </el-tag>
          </span>

          <el-button link type="primary" @click="goOrders">
            查看全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>

      <el-table
          :data="recentOrders"
          border
          stripe
          v-loading="loadingOrders"
          class="goods-table"
      >

        <el-table-column label="商品" min-width="170" show-overflow-tooltip>
          <template #default="scope">
            <el-link type="primary" :underline="false" @click="goDetail(scope.row.goodsId)">
              {{ scope.row.goodsName || '商品已删除' }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="买家" min-width="120">
          <template #default="scope">
            {{ scope.row.buyerName || '已注销用户' }}
          </template>
        </el-table-column>

        <el-table-column label="成交价" width="110">
          <template #default="scope">
            <span class="price-text">{{ formatPrice(scope.row.price) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="110">
          <template #default="scope">
            <el-tag
                v-if="scope.row.orderStatus === 0"
                type="warning"
                size="small"
            >
              待交易
            </el-tag>
            <el-tag
                v-else-if="scope.row.orderStatus === 1"
                type="info"
                size="small"
            >
              待买家确认
            </el-tag>
            <el-tag
                v-else-if="scope.row.orderStatus === 2"
                type="success"
                size="small"
            >
              已完成
            </el-tag>
            <el-tag v-else type="info" size="small">未知</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="下单时间" min-width="160">
          <template #default="scope">
            {{ formatDateTime(scope.row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="130" fixed="right">
          <template #default="scope">
            <!-- 待交易：卖家确认已交付（0→1） -->
            <el-button
                v-if="scope.row.orderStatus === 0"
                type="primary"
                link
                :loading="finishingId === scope.row.orderId"
                @click="handleDeliver(scope.row)"
            >
              确认已交付
            </el-button>
            <!-- 待买家确认：卖家无需再操作，等待买家确认收货 -->
            <span v-else-if="scope.row.orderStatus === 1" class="order-wait-text">等待买家确认</span>
            <!-- 已完成 -->
            <span v-else-if="scope.row.orderStatus === 2" class="order-done-text">交易已完成</span>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="还没有卖出的订单" />
        </template>

      </el-table>

    </el-card>

    <!-- 编辑已迁移到发布工作台的编辑模式（/publish?id=N）：
         与发布共用完整表单 + 图片上传/排序/主图，不再维护第二套简化弹窗 -->

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Goods,
  Sell,
  CircleCheck,
  Money,
  ArrowRight
} from '@element-plus/icons-vue'
import request from '../utils/request'
import StatCard from '../components/StatCard.vue'
import { formatPrice, formatDateTime, formatRelativeTime } from '../utils/format'

const router = useRouter()


// =========================
// 页面数据
// =========================

const myGoods = ref([])
const sellerOrders = ref([])
const categories = ref([])

const loadingGoods = ref(false)
const loadingOrders = ref(false)
const statusChangingId = ref(null)
const finishingId = ref(null)

// 商品状态筛选：all / onSale / offSale
const goodsTab = ref('all')


// =========================
// 数据加载
// =========================

// 我的商品：主数据，失败时页面核心不可用
const loadGoods = async () => {
  loadingGoods.value = true

  try {
    const result = await request.get('/goods/my')

    myGoods.value = Array.isArray(result) ? result : []
  } catch (error) {
    // request.js 已统一提示
  } finally {
    loadingGoods.value = false
  }
}

// 出售订单与分类为附加数据，失败不阻塞工作台（allSettled 容错）
const loadExtras = async () => {
  const [ordersRes, categoriesRes] = await Promise.allSettled([
    request.get('/orders/seller'),
    request.get('/categories')
  ])

  if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value)) {
    sellerOrders.value = ordersRes.value
  }

  if (categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value)) {
    categories.value = categoriesRes.value
  }
}


// =========================
// 统计指标（全部来自真实订单/商品数据）
// =========================

const onSaleCount = computed(() => {
  return myGoods.value.filter(goods => goods.status === 1).length
})

// 已完成订单：状态 2（买家已确认收货）
// 注意状态 1 是“待买家确认”，尚未真正成交，不计入完成数与成交金额
const completedOrders = computed(() => {
  return sellerOrders.value.filter(order => Number(order.orderStatus) === 2)
})

const completedCount = computed(() => completedOrders.value.length)

// 成交金额 = 已完成订单的成交价之和（订单里的 price 是真实成交价）
const revenue = computed(() => {
  return completedOrders.value.reduce(
      (sum, order) => sum + Number(order.price || 0),
      0
  )
})

const pendingCount = computed(() => {
  return sellerOrders.value.filter(order => order.orderStatus === 0).length
})

// 最近 5 笔出售订单（后端已按下单时间倒序）
const recentOrders = computed(() => {
  return sellerOrders.value.slice(0, 5)
})


// =========================
// 我的信誉（B2：评价 + 卖家信誉画像）
// 数据来源 GET /evaluations/seller/{userId}：
// 后端汇总 evaluation JOIN orders 的真实评价 + B1 统一信誉规则
// =========================

const rep = ref({})
const repLoading = ref(false)

// 平均评分：无评价时显示占位符，避免伪造 “0.0 分” 口碑
const avgScoreText = computed(() => {
  return (rep.value.totalCount || 0) > 0
      ? Number(rep.value.avgScore || 0).toFixed(1)
      : '--'
})

const avgScoreValue = computed(() => Number(rep.value.avgScore || 0))

// 评分分布条：5 → 1 星，占比基于真实评价总数
const distRows = computed(() => {
  const total = rep.value.totalCount || 0
  return [5, 4, 3, 2, 1].map(star => {
    const count = Number(rep.value['star' + star] || 0)
    return {
      star,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0
    }
  })
})

const recentEvaluations = computed(() => rep.value.recentList || [])

const loadReputation = async () => {
  const userId = Number(localStorage.getItem('userId'))

  if (!userId) return

  repLoading.value = true

  try {
    rep.value = (await request.get(`/evaluations/seller/${userId}`)) || {}
  } catch (error) {
    // 信誉为附加信息，失败不阻塞工作台
  } finally {
    repLoading.value = false
  }
}


// =========================
// 商品筛选与分类
// =========================

const filteredGoods = computed(() => {
  if (goodsTab.value === 'onSale') {
    return myGoods.value.filter(goods => goods.status === 1)
  }

  if (goodsTab.value === 'offSale') {
    return myGoods.value.filter(goods => goods.status !== 1)
  }

  return myGoods.value
})

const getCategoryName = (categoryId) => {
  const cat = categories.value.find(
      item => item.categoryId === categoryId
  )

  return cat ? cat.categoryName : '未分类'
}


// =========================
// 页面跳转
// =========================

const goDetail = (goodsId) => {
  if (goodsId) {
    router.push(`/goods/${goodsId}`)
  }
}

const goOrders = () => {
  router.push({ path: '/orders', query: { tab: 'seller' } })
}


// =========================
// 编辑商品：跳转发布工作台的编辑模式（/publish?id=N）
// 与发布共用完整表单 + 图片上传/排序/主图，不再维护第二套简化弹窗
// =========================

const goEdit = (goods) => {
  router.push({ path: '/publish', query: { id: goods.goodsId } })
}


// =========================
// 下架 / 上架
// =========================

const handleOffSale = async (goods) => {
  try {
    await ElMessageBox.confirm(
        `确定下架「${goods.goodsName}」吗？下架后买家无法购买。`,
        '下架商品',
        {
          confirmButtonText: '确定下架',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )
  } catch (action) {
    return
  }

  await changeStatus(goods.goodsId, 0)
}

// 上架是低风险操作，不弹确认；能否上架（有无交易记录）由后端判断
const handleOnSale = async (goods) => {
  await changeStatus(goods.goodsId, 1)
}

const changeStatus = async (goodsId, targetStatus) => {
  statusChangingId.value = goodsId

  try {
    const result = await request.put(`/goods/${goodsId}/status`, {
      status: targetStatus
    })

    if (result === '商品已上架' || result === '商品已下架') {
      ElMessage.success(result)

      // 本地同步状态，避免整表重拉闪烁
      const goods = myGoods.value.find(item => item.goodsId === goodsId)

      if (goods) {
        goods.status = targetStatus
      }
    } else {
      ElMessage.error(result || '操作失败')
      loadGoods()
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    statusChangingId.value = null
  }
}


// =========================
// 删除商品
// =========================

const handleDelete = async (goods) => {
  try {
    await ElMessageBox.confirm(
        `确定删除「${goods.goodsName}」吗？已产生交易记录的商品无法删除。`,
        '删除商品',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )
  } catch (action) {
    return
  }

  try {
    const result = await request.delete(`/goods/${goods.goodsId}`)

    if (result === '商品删除成功') {
      ElMessage.success(result)
      myGoods.value = myGoods.value.filter(
          item => item.goodsId !== goods.goodsId
      )
    } else {
      ElMessage.error(result || '商品删除失败')
    }
  } catch (error) {
    // request.js 已统一提示
  }
}


// =========================
// 卖家确认已交付：待交易(0) → 待买家确认(1)
// 买家收到后由买家在交易中心确认收货(1→2)，卖家不能直接完成订单
// =========================

const handleDeliver = async (order) => {
  try {
    await ElMessageBox.confirm(
        `确认已将「${order.goodsName || '#' + order.orderId}」线下交付给买家吗？交付后将等待买家确认收货。`,
        '确认已交付',
        {
          confirmButtonText: '确认已交付',
          cancelButtonText: '再等等',
          type: 'info'
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

    if (result === '已确认交付，等待买家确认收货') {
      ElMessage.success(result)
      order.orderStatus = 1
    } else {
      // 后端状态机拒绝（越权 / 状态已改变等），重新拉取真实数据
      ElMessage.error(result || '操作失败')
      loadExtras()
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    finishingId.value = null
  }
}


onMounted(() => {
  loadGoods()
  loadExtras()
  loadReputation()
})
</script>


<style scoped>

.seller-page {
  width: 100%;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: var(--brand-text-secondary);
  font-size: 13.5px;
}

/* 统计卡 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}

/* 区块卡片 */
.block-card {
  border-radius: var(--brand-radius-lg);
  margin-bottom: 18px;
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block-header__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-text);
}

.tab-count {
  margin-left: 2px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.goods-table {
  width: 100%;
}

.order-done-text {
  font-size: 13px;
  color: var(--brand-text-secondary);
}

/* 待买家确认：卖家无需操作的等待态，灰蓝中性提示 */
.order-wait-text {
  font-size: 13px;
  color: #5d7d87;
}

/* ============ 我的信誉（B2） ============ */

.rep-card__hint {
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

/* 信誉概览：评分印章 + 两项统计 + 评分分布 */
.rep-overview {
  display: grid;
  grid-template-columns: auto repeat(2, auto) 1fr;
  gap: 34px;
  align-items: center;
  padding-bottom: 18px;
  border-bottom: 1px dashed var(--brand-border);
}

.rep-score { text-align: center; }

.rep-score__num {
  font-size: 34px;
  font-weight: 700;
  line-height: 1.05;
  color: var(--brand-accent);
}

.rep-score__label { margin-top: 5px; font-size: 12px; color: var(--brand-text-secondary); }

.rep-metric__num { font-size: 26px; font-weight: 700; color: var(--brand-text); line-height: 1.1; }
.rep-metric__label { margin-top: 4px; font-size: 12px; color: var(--brand-text-secondary); }

/* 评分分布条 */
.rep-dist__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
}

.rep-dist__row:last-child { margin-bottom: 0; }

.rep-dist__star { width: 30px; flex-shrink: 0; font-size: 12px; color: var(--brand-text-secondary); }

.rep-dist__track {
  flex: 1;
  height: 7px;
  border-radius: 99px;
  background: rgba(74, 69, 72, 0.07);
  overflow: hidden;
}

.rep-dist__fill {
  height: 100%;
  width: 0;
  border-radius: 99px;
  background: linear-gradient(90deg, #e3c887, var(--brand-accent));
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.rep-dist__count { width: 22px; text-align: right; font-size: 12px; color: var(--brand-text-regular); }

/* 最近评价卡片墙 */
.rep-recent { padding-top: 16px; }

.rep-recent__title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-regular);
}

.rep-eval-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.rep-eval {
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--brand-border);
  background:
      linear-gradient(135deg, rgba(201, 168, 92, 0.05), transparent 55%),
      var(--brand-bg);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.rep-eval:hover { transform: translateY(-3px); box-shadow: var(--brand-shadow-sm); }

.rep-eval__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rep-eval__buyer { font-size: 13px; font-weight: 600; color: var(--brand-text); }

.rep-eval__time { margin-left: auto; font-size: 11.5px; color: var(--brand-text-secondary); }

.rep-eval__content {
  margin: 9px 0 8px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--brand-text-regular);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rep-eval__goods { font-size: 12px; }
.rep-eval__goods--plain { color: var(--brand-text-secondary); }

/* 小屏统计卡降为两列 */
@media (max-width: 1100px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
}

</style>
