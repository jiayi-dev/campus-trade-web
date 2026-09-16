cd /d D:\code\campus-trade-web
<template>
  <div class="order-page">
    <div class="page-header">
      <h2>交易中心</h2>
    </div>

    <el-card>
      <el-table :data="orders" border style="width: 100%">
        <el-table-column prop="orderId" label="订单ID" width="100" />
        <el-table-column prop="goodsId" label="商品ID" width="100" />
        <el-table-column prop="buyerId" label="买家ID" width="100" />
        <el-table-column prop="sellerId" label="卖家ID" width="100" />

        <el-table-column label="订单状态">
          <template #default="scope">
            <el-tag v-if="scope.row.orderStatus === 0">
              待交易
            </el-tag>

            <el-tag
                v-else-if="scope.row.orderStatus === 1"
                type="success"
            >
              已完成
            </el-tag>

            <el-tag v-else type="info">
              其他
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
            prop="createTime"
            label="创建时间"
        />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'

const orders = ref([])

// 页面加载完成后，查询订单
const loadOrders = async () => {
  try {
    const result = await request.get('/orders')
    orders.value = result
  } catch (error) {
    console.error('查询订单失败：', error)
  }
}

// 进入交易中心页面时自动执行
onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.order-page {
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}
</style>
