<template>
  <div class="order-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>交易中心</h2>
        <p>管理你买到的商品与卖出的订单</p>
      </div>

      <el-button :icon="Refresh" @click="loadOrders">刷新</el-button>
    </div>

    <!-- 买家 / 卖家视角切换 -->
    <el-card shadow="never" class="order-card">

      <el-radio-group v-model="activeTab" class="order-tabs" @change="handleTabChange">
        <el-radio-button value="buyer">
          <el-icon><ShoppingBag /></el-icon>
          我的购买
          <span class="order-tabs__count">{{ buyerCount }}</span>
        </el-radio-button>
        <el-radio-button value="seller">
          <el-icon><Shop /></el-icon>
          我的出售
          <span class="order-tabs__count">{{ sellerCount }}</span>
        </el-radio-button>
      </el-radio-group>

      <el-table
          v-loading="loading"
          :data="orders"
          border
          stripe
          class="order-table"
      >

        <el-table-column prop="orderId" label="订单ID" width="90" />

        <el-table-column label="商品" min-width="180">
          <template #default="scope">
            <el-link
                type="primary"
                :underline="false"
                @click="goGoods(scope.row.goodsId)"
            >
              {{ scope.row.goodsName || '商品已删除' }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="成交价" width="120">
          <template #default="scope">
            <span class="price-text">{{ formatPrice(scope.row.price) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="买家" min-width="130">
          <template #default="scope">
            <span>{{ scope.row.buyerName || '已注销用户' }}</span>
            <el-tag
                v-if="scope.row.buyerId === currentUserId"
                size="small"
                type="success"
                effect="plain"
                class="me-tag"
            >我</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="卖家" min-width="130">
          <template #default="scope">
            <span>{{ scope.row.sellerName || '已注销用户' }}</span>
            <el-tag
                v-if="scope.row.sellerId === currentUserId"
                size="small"
                type="warning"
                effect="plain"
                class="me-tag"
            >我</el-tag>
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
            <el-button
                v-if="scope.row.orderStatus === 0"
                type="success"
                link
                :loading="finishingId === scope.row.orderId"
                @click="handleFinish(scope.row)"
            >
              确认完成
            </el-button>
            <span v-else class="order-done-text">交易已结束</span>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty :description="activeTab === 'buyer' ? '你还没有买到任何商品，去商品中心逛逛吧' : '你还没有卖出的订单'" />
        </template>

      </el-table>

    </el-card>

  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, ShoppingBag, Shop } from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

// buyer = 我买到的；seller = 我卖出的（支持 ?tab=buyer/seller 从详情页跳入）
const activeTab = ref(route.query.tab === 'seller' ? 'seller' : 'buyer')

const orders = ref([])
const loading = ref(false)
const finishingId = ref(null)

// 两个视角的数量角标
const buyerCount = ref(0)
const sellerCount = ref(0)


// =========================
// 加载订单
// =========================

const loadOrders = async () => {
  loading.value = true

  try {
    const url = activeTab.value === 'buyer'
        ? '/orders/buyer'
        : '/orders/seller'

    const result = await request.get(url)

    orders.value = Array.isArray(result) ? result : []

    if (activeTab.value === 'buyer') {
      buyerCount.value = orders.value.length
    } else {
      sellerCount.value = orders.value.length
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    loading.value = false
  }
}

// 首次进入时把两个角标数量都拉出来（失败不阻塞）
const loadCounts = async () => {
  try {
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
  } catch (error) {
    // 角标失败可忽略
  }
}


// =========================
// 切换视角
// =========================

const handleTabChange = () => {
  loadOrders()
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
// 确认完成：待交易 → 已完成
// 买家或卖家本人操作，归属与状态合法性由后端兜底
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
      loadOrders()
    } else {
      // 非参与者 / 订单状态已变化 / 订单不存在
      ElMessage.error(result || '操作失败')
      loadOrders()
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    finishingId.value = null
  }
}


onMounted(() => {
  loadOrders()
  loadCounts()
})
</script>


<style scoped>

.order-page {
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

.order-card {
  border-radius: var(--brand-radius-lg);
}

.order-tabs {
  margin-bottom: 18px;
}

.order-tabs__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--brand-primary-soft, #e7f6f6);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
}

.order-table {
  width: 100%;
}

.me-tag {
  margin-left: 6px;
}

.order-done-text {
  font-size: 13px;
  color: var(--brand-text-secondary);
}

</style>
