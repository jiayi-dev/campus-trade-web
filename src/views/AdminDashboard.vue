<template>
  <div class="admin-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>管理后台</h2>
        <p>校园二手交易平台系统运营管理</p>
      </div>

      <el-button @click="loadAdminData">
        刷新数据
      </el-button>
    </div>

    <!-- 系统数据概览 -->
    <div class="stat-cards">

      <el-card class="stat-card">
        <div class="stat-title">商品总数</div>
        <div class="stat-value">
          {{ statistics.goodsCount ?? 0 }}
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">用户总数</div>
        <div class="stat-value">
          {{ statistics.userCount ?? 0 }}
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">分类数量</div>
        <div class="stat-value">
          {{ statistics.categoryCount ?? 0 }}
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">商品总价值</div>
        <div class="stat-value">
          ¥{{ statistics.totalPrice ?? 0 }}
        </div>
      </el-card>

    </div>

    <!-- 订单管理 -->
    <el-card class="order-card">

      <template #header>
        <div class="table-header">
          <span>订单信息</span>
          <span class="order-count">
            共 {{ orders.length }} 条
          </span>
        </div>
      </template>

      <el-table
          :data="orders"
          border
          style="width: 100%"
          v-loading="loading"
      >

        <el-table-column
            prop="orderId"
            label="订单ID"
            width="90"
        />

        <el-table-column
            prop="goodsId"
            label="商品ID"
            width="90"
        />

        <el-table-column
            prop="buyerId"
            label="买家ID"
            width="100"
        />

        <el-table-column
            prop="sellerId"
            label="卖家ID"
            width="100"
        />

        <el-table-column
            label="订单状态"
            width="120"
        >
          <template #default="scope">

            <el-tag
                v-if="scope.row.orderStatus === 0"
            >
              待交易
            </el-tag>

            <el-tag
                v-else-if="scope.row.orderStatus === 1"
                type="success"
            >
              已完成
            </el-tag>

            <el-tag
                v-else
                type="info"
            >
              其他
            </el-tag>

          </template>
        </el-table-column>

        <el-table-column
            prop="createTime"
            label="创建时间"
        />

      </el-table>

      <el-empty
          v-if="!loading && orders.length === 0"
          description="暂无订单数据"
      />

    </el-card>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const statistics = ref({})
const orders = ref([])
const loading = ref(false)

// 加载管理员页面数据
const loadAdminData = async () => {
  loading.value = true

  try {
    // 查询系统统计数据
    statistics.value = await request.get('/goods/statistics')

    // 查询订单数据
    orders.value = await request.get('/orders')

  } catch (error) {
    console.error('加载管理后台数据失败：', error)
    ElMessage.error('管理后台数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAdminData()
})
</script>

<style scoped>

.admin-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  min-height: 110px;
}

.stat-title {
  color: #909399;
  font-size: 14px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
}

.order-card {
  margin-top: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.order-count {
  color: #909399;
  font-size: 13px;
  font-weight: normal;
}

@media (max-width: 1000px) {
  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
}

</style>
