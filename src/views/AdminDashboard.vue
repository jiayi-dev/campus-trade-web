<template>
  <div class="admin-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>管理后台</h2>
        <p>平台用户、商品、订单与操作记录管理</p>
      </div>

      <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
    </div>

    <!-- 数据概览：用户/商品来自统计接口，订单来自管理员订单接口 -->
    <div class="stat-cards">
      <StatCard label="用户总数" :value="statistics.userCount ?? 0" theme="teal">
        <template #icon><el-icon><User /></el-icon></template>
      </StatCard>
      <StatCard label="商品总数" :value="statistics.goodsCount ?? 0" theme="orange">
        <template #icon><el-icon><Goods /></el-icon></template>
      </StatCard>
      <StatCard label="订单总数" :value="orders.length" theme="blue">
        <template #icon><el-icon><Tickets /></el-icon></template>
      </StatCard>
      <StatCard label="待处理订单" :value="pendingOrderCount" theme="purple">
        <template #icon><el-icon><Clock /></el-icon></template>
      </StatCard>
    </div>

    <!-- 四个管理区用 Tab 切换，避免单页过长 -->
    <el-card shadow="never" class="tabs-card">

      <el-tabs v-model="activeTab" class="admin-tabs">

        <!-- ===================== 用户管理 ===================== -->
        <el-tab-pane label="用户管理" name="users">

          <div class="filter-bar">
            <el-input
                v-model="userFilter.username"
                placeholder="用户名"
                clearable
                class="filter-input"
                @keyup.enter="loadUsers"
            />
            <el-input
                v-model="userFilter.phone"
                placeholder="手机号"
                clearable
                class="filter-input"
                @keyup.enter="loadUsers"
            />
            <el-select
                v-model="userFilter.role"
                placeholder="角色"
                clearable
                class="filter-select"
            >
              <el-option label="学生" value="student" />
              <el-option label="卖家" value="seller" />
              <el-option label="管理员" value="admin" />
            </el-select>
            <el-select
                v-model="userFilter.status"
                placeholder="状态"
                clearable
                class="filter-select"
            >
              <el-option label="正常" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
            <el-button type="primary" @click="loadUsers">查询</el-button>
            <el-button @click="resetUserFilter">重置</el-button>
          </div>

          <el-table :data="users" border stripe v-loading="loadingUsers">
            <el-table-column prop="userId" label="ID" width="70" />
            <el-table-column prop="username" label="用户名" min-width="120" />
            <el-table-column prop="phone" label="手机号" min-width="130" />
            <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
            <el-table-column label="角色" width="90">
              <template #default="scope">
                <el-tag :type="roleTagType(scope.row.role)" size="small">
                  {{ roleLabel(scope.row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="small">
                  {{ scope.row.status === 1 ? '正常' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="注册时间" min-width="160">
              <template #default="scope">{{ formatDateTime(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <el-button
                    v-if="scope.row.status === 1"
                    type="danger"
                    link
                    :loading="userStatusLoading === scope.row.userId"
                    @click="toggleUserStatus(scope.row, 0)"
                >禁用</el-button>
                <el-button
                    v-else
                    type="success"
                    link
                    :loading="userStatusLoading === scope.row.userId"
                    @click="toggleUserStatus(scope.row, 1)"
                >启用</el-button>
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无用户" /></template>
          </el-table>

          <div v-if="userTotal > 0" class="pagination">
            <el-pagination
                v-model:current-page="userPage.pageNum"
                :page-size="userPage.pageSize"
                :total="userTotal"
                layout="total, prev, pager, next"
                @current-change="loadUsers"
            />
          </div>

        </el-tab-pane>

        <!-- ===================== 商品管理 ===================== -->
        <el-tab-pane label="商品管理" name="goods">

          <div class="filter-bar">
            <el-input
                v-model="goodsFilter.goodsName"
                placeholder="商品名称"
                clearable
                class="filter-input"
                @keyup.enter="loadGoods"
            />
            <el-select
                v-model="goodsFilter.categoryId"
                placeholder="分类"
                clearable
                class="filter-select"
            >
              <el-option
                  v-for="cat in categories"
                  :key="cat.categoryId"
                  :label="cat.categoryName"
                  :value="cat.categoryId"
              />
            </el-select>
            <el-select
                v-model="goodsFilter.status"
                placeholder="状态"
                clearable
                class="filter-select"
            >
              <el-option label="在售" :value="1" />
              <el-option label="已下架" :value="0" />
            </el-select>
            <el-button type="primary" @click="loadGoods">查询</el-button>
            <el-button @click="resetGoodsFilter">重置</el-button>
          </div>

          <el-table :data="goodsList" border stripe v-loading="loadingGoods">
            <el-table-column prop="goodsId" label="ID" width="70" />
            <el-table-column label="商品名称" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                <el-link type="primary" :underline="false" @click="goGoods(scope.row.goodsId)">
                  {{ scope.row.goodsName }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="categoryName" label="分类" width="100" />
            <el-table-column prop="sellerName" label="卖家" width="110" />
            <el-table-column label="价格" width="110">
              <template #default="scope">
                <span class="price-text">{{ formatPrice(scope.row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
                  {{ scope.row.status === 1 ? '在售' : '已下架' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发布时间" min-width="150">
              <template #default="scope">{{ formatDateTime(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="scope">
                <el-button
                    v-if="scope.row.status === 1"
                    type="warning"
                    link
                    :loading="goodsStatusLoading === scope.row.goodsId"
                    @click="offSaleGoods(scope.row)"
                >下架</el-button>
                <el-button
                    type="danger"
                    link
                    @click="deleteGoods(scope.row)"
                >删除</el-button>
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无商品" /></template>
          </el-table>

          <div v-if="goodsTotal > 0" class="pagination">
            <el-pagination
                v-model:current-page="goodsPage.pageNum"
                :page-size="goodsPage.pageSize"
                :total="goodsTotal"
                layout="total, prev, pager, next"
                @current-change="loadGoods"
            />
          </div>

        </el-tab-pane>

        <!-- ===================== 订单管理 ===================== -->
        <el-tab-pane label="订单管理" name="orders">

          <div class="filter-bar">
            <el-select
                v-model="orderStatus"
                placeholder="订单状态"
                clearable
                class="filter-select"
                @change="loadOrders"
            >
              <el-option label="待交易" :value="0" />
              <el-option label="已完成" :value="1" />
            </el-select>
            <el-button type="primary" @click="loadOrders">查询</el-button>
            <el-button @click="resetOrderFilter">重置</el-button>
          </div>

          <el-table :data="orders" border stripe v-loading="loadingOrders">
            <el-table-column prop="orderId" label="订单ID" width="90" />
            <el-table-column label="商品" min-width="160" show-overflow-tooltip>
              <template #default="scope">
                <el-link type="primary" :underline="false" @click="goGoods(scope.row.goodsId)">
                  {{ scope.row.goodsName || '商品已删除' }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="buyerName" label="买家" width="110" />
            <el-table-column prop="sellerName" label="卖家" width="110" />
            <el-table-column label="成交价" width="110">
              <template #default="scope">
                <span class="price-text">{{ formatPrice(scope.row.price) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.orderStatus === 0" type="warning" size="small">待交易</el-tag>
                <el-tag v-else-if="scope.row.orderStatus === 1" type="success" size="small">已完成</el-tag>
                <el-tag v-else type="info" size="small">未知</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="下单时间" min-width="160">
              <template #default="scope">{{ formatDateTime(scope.row.createTime) }}</template>
            </el-table-column>
            <template #empty><el-empty description="暂无订单" /></template>
          </el-table>

        </el-tab-pane>

        <!-- ===================== 操作记录 ===================== -->
        <el-tab-pane label="操作记录" name="records">

          <el-table :data="records" border stripe v-loading="loadingRecords">
            <el-table-column prop="recordId" label="记录ID" width="90" />
            <el-table-column prop="adminId" label="管理员ID" width="110" />
            <el-table-column prop="operation" label="操作内容" min-width="300" />
            <el-table-column label="操作时间" min-width="170">
              <template #default="scope">{{ formatDateTime(scope.row.createTime) }}</template>
            </el-table-column>
            <template #empty><el-empty description="暂无操作记录" /></template>
          </el-table>

        </el-tab-pane>

      </el-tabs>

    </el-card>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  User,
  Goods,
  Tickets,
  Clock
} from '@element-plus/icons-vue'
import request from '../utils/request'
import StatCard from '../components/StatCard.vue'
import { formatPrice, formatDateTime } from '../utils/format'

const router = useRouter()

const activeTab = ref('users')

// =========================
// 统计概览
// =========================

const statistics = ref({})
const orders = ref([])
const pendingOrderCount = computed(() => {
  return orders.value.filter(o => o.orderStatus === 0).length
})


// =========================
// 用户管理
// =========================

const users = ref([])
const userTotal = ref(0)
const loadingUsers = ref(false)
const userStatusLoading = ref(null)

const userFilter = ref({ username: '', phone: '', role: null, status: null })
const userPage = ref({ pageNum: 1, pageSize: 8 })

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const result = await request.get('/admin/users', {
      params: {
        username: userFilter.value.username || undefined,
        phone: userFilter.value.phone || undefined,
        role: userFilter.value.role ?? undefined,
        status: userFilter.value.status ?? undefined,
        pageNum: userPage.value.pageNum,
        pageSize: userPage.value.pageSize
      }
    })
    users.value = result.list || []
    userTotal.value = result.total || 0
  } catch (error) {
    // request.js 已统一提示
  } finally {
    loadingUsers.value = false
  }
}

const resetUserFilter = () => {
  userFilter.value = { username: '', phone: '', role: null, status: null }
  userPage.value.pageNum = 1
  loadUsers()
}

const toggleUserStatus = async (user, status) => {
  const action = status === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
        `确定${action}用户「${user.username}」吗？`,
        `${action}用户`,
        {
          confirmButtonText: `确定${action}`,
          cancelButtonText: '取消',
          type: 'warning'
        }
    )
  } catch (action) {
    return
  }

  userStatusLoading.value = user.userId

  try {
    const result = await request.put(`/admin/users/${user.userId}/status`, { status })

    if (result === '用户已启用' || result === '用户已禁用') {
      ElMessage.success(result)
      user.status = status
    } else {
      ElMessage.error(result || '操作失败')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    userStatusLoading.value = null
  }
}


// =========================
// 商品管理
// =========================

const categories = ref([])
const goodsList = ref([])
const goodsTotal = ref(0)
const loadingGoods = ref(false)
const goodsStatusLoading = ref(null)

const goodsFilter = ref({ goodsName: '', categoryId: null, status: null })
const goodsPage = ref({ pageNum: 1, pageSize: 8 })

const loadCategories = async () => {
  try {
    categories.value = await request.get('/categories')
  } catch (error) {
    // 分类失败不阻塞
  }
}

const loadGoods = async () => {
  loadingGoods.value = true
  try {
    const result = await request.get('/admin/goods', {
      params: {
        goodsName: goodsFilter.value.goodsName || undefined,
        categoryId: goodsFilter.value.categoryId ?? undefined,
        status: goodsFilter.value.status ?? undefined,
        pageNum: goodsPage.value.pageNum,
        pageSize: goodsPage.value.pageSize
      }
    })
    goodsList.value = result.list || []
    goodsTotal.value = result.total || 0
  } catch (error) {
    // request.js 已统一提示
  } finally {
    loadingGoods.value = false
  }
}

const resetGoodsFilter = () => {
  goodsFilter.value = { goodsName: '', categoryId: null, status: null }
  goodsPage.value.pageNum = 1
  loadGoods()
}

const offSaleGoods = async (goods) => {
  goodsStatusLoading.value = goods.goodsId
  try {
    const result = await request.put(`/admin/goods/${goods.goodsId}/offSale`)
    if (result === '商品已下架') {
      ElMessage.success(result)
      goods.status = 0
    } else {
      ElMessage.error(result || '操作失败')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    goodsStatusLoading.value = null
  }
}

const deleteGoods = async (goods) => {
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
    const result = await request.delete(`/admin/goods/${goods.goodsId}`)
    if (result === '商品删除成功') {
      ElMessage.success(result)
      goodsList.value = goodsList.value.filter(g => g.goodsId !== goods.goodsId)
    } else {
      ElMessage.error(result || '商品删除失败')
    }
  } catch (error) {
    // request.js 已统一提示
  }
}


// =========================
// 订单管理
// =========================

const loadingOrders = ref(false)
const orderStatus = ref(null)

const loadOrders = async () => {
  loadingOrders.value = true
  try {
    const result = await request.get('/admin/orders', {
      params: { orderStatus: orderStatus.value ?? undefined }
    })
    orders.value = Array.isArray(result) ? result : []
  } catch (error) {
    // request.js 已统一提示
  } finally {
    loadingOrders.value = false
  }
}

const resetOrderFilter = () => {
  orderStatus.value = null
  loadOrders()
}


// =========================
// 操作记录
// =========================

const records = ref([])
const loadingRecords = ref(false)

const loadRecords = async () => {
  loadingRecords.value = true
  try {
    records.value = await request.get('/admin/records')
  } catch (error) {
    // request.js 已统一提示
  } finally {
    loadingRecords.value = false
  }
}


// =========================
// 工具方法
// =========================

const goGoods = (goodsId) => {
  if (goodsId) router.push(`/goods/${goodsId}`)
}

const roleLabel = (role) => ({ admin: '管理员', seller: '卖家', student: '学生' }[role] || role)
const roleTagType = (role) => ({ admin: 'danger', seller: 'warning', student: 'success' }[role] || 'info')

// 全部刷新：统计 + 订单 + 当前 Tab 数据
const refreshAll = async () => {
  const tasks = [loadStatistics(), loadOrders(), loadCategories(), loadRecords()]

  if (activeTab.value === 'users') tasks.push(loadUsers())
  if (activeTab.value === 'goods') tasks.push(loadGoods())

  await Promise.allSettled(tasks)
}

// 统计接口（用户/商品总数）失败不阻塞主功能
const loadStatistics = async () => {
  try {
    statistics.value = await request.get('/goods/statistics')
  } catch (error) {
    // request.js 已统一提示
  }
}


onMounted(() => {
  loadStatistics()
  loadOrders()
  loadCategories()
  loadRecords()
  loadUsers()
})
</script>


<style scoped>

.admin-page {
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

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}

.tabs-card {
  border-radius: var(--brand-radius-lg);
}

.admin-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-input {
  width: 180px;
}

.filter-select {
  width: 140px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

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
