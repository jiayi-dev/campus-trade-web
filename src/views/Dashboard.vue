<template>
  <div class="dashboard-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>数据统计</h2>
        <p>校园二手交易平台运营数据概览</p>
      </div>

      <el-button @click="loadDashboard">
        刷新数据
      </el-button>
    </div>

    <!-- 数据概览卡片 -->
    <div class="stat-cards">

      <el-card class="stat-card">
        <div class="stat-title">商品总数</div>
        <div class="stat-value">{{ statistics.goodsCount ?? 0 }}</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">用户总数</div>
        <div class="stat-value">{{ statistics.userCount ?? 0 }}</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">分类数量</div>
        <div class="stat-value">{{ statistics.categoryCount ?? 0 }}</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">商品总价值</div>
        <div class="stat-value">
          ¥{{ statistics.totalPrice ?? 0 }}
        </div>
      </el-card>

    </div>

    <!-- 图表区域 -->
    <div class="chart-row">

      <el-card class="chart-card">
        <template #header>
          <span>各分类平均价格</span>
        </template>

        <div ref="categoryChartRef" class="chart"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <span>商品价格区间分布</span>
        </template>

        <div ref="priceChartRef" class="chart"></div>
      </el-card>

    </div>

  </div>
</template>


<script setup>

import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import request from '../utils/request'


// ================================
// 1. 保存后端统计数据
// ================================

const statistics = ref({})

const categoryAvg = ref([])

const priceLevelCount = ref([])


// ================================
// 2. 保存图表DOM元素
// ================================

const categoryChartRef = ref(null)

const priceChartRef = ref(null)


// ================================
// 3. 保存ECharts实例
// ================================

let categoryChart = null

let priceChart = null


// ================================
// 4. 查询后端统计数据
// ================================

const loadDashboard = async () => {

  try {

    // 查询首页统计数据
    statistics.value = await request.get('/goods/statistics')

    // 查询分类平均价格
    categoryAvg.value = await request.get('/goods/categoryAvg')

    // 查询价格区间统计
    priceLevelCount.value = await request.get('/goods/priceLevelCount')


    // 数据获取成功以后绘制图表
    renderCategoryChart()

    renderPriceChart()

  } catch (error) {

    console.error('加载统计数据失败：', error)

  }

}


// ================================
// 5. 绘制分类平均价格柱状图
// ================================

const renderCategoryChart = () => {

  if (!categoryChartRef.value) {
    return
  }

  if (!categoryChart) {
    categoryChart = echarts.init(categoryChartRef.value)
  }


  const categoryNames = categoryAvg.value.map(
      item => item.categoryName
  )

  const avgPrices = categoryAvg.value.map(
      item => item.avgPrice
  )


  const option = {

    tooltip: {
      trigger: 'axis'
    },

    xAxis: {
      type: 'category',
      data: categoryNames
    },

    yAxis: {
      type: 'value',
      name: '平均价格'
    },

    series: [
      {
        name: '平均价格',
        type: 'bar',
        data: avgPrices
      }
    ]

  }


  categoryChart.setOption(option)

}


// ================================
// 6. 绘制价格区间环形图
// ================================

const renderPriceChart = () => {

  if (!priceChartRef.value) {
    return
  }

  if (!priceChart) {
    priceChart = echarts.init(priceChartRef.value)
  }


  const data = priceLevelCount.value.map(
      item => ({
        name: item.priceRange,
        value: item.goodsCount
      })
  )


  const option = {

    tooltip: {
      trigger: 'item'
    },

    legend: {
      bottom: 0
    },

    series: [
      {
        name: '商品数量',
        type: 'pie',
        radius: ['45%', '70%'],
        data: data
      }
    ]

  }


  priceChart.setOption(option)

}


// ================================
// 7. 浏览器窗口变化时调整图表
// ================================

const handleResize = () => {

  categoryChart?.resize()

  priceChart?.resize()

}


// ================================
// 8. 页面加载
// ================================

onMounted(() => {

  loadDashboard()

  window.addEventListener(
      'resize',
      handleResize
  )

})


// ================================
// 9. 页面销毁
// ================================

onBeforeUnmount(() => {

  window.removeEventListener(
      'resize',
      handleResize
  )


  categoryChart?.dispose()

  priceChart?.dispose()

  categoryChart = null

  priceChart = null

})

</script>


<style scoped>

.dashboard-page {
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
  min-height: 120px;
}

.stat-title {
  color: #909399;
  font-size: 14px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 30px;
  font-weight: 600;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  min-height: 420px;
}

.chart {
  width: 100%;
  height: 350px;
}

@media (max-width: 900px) {

  .stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-row {
    grid-template-columns: 1fr;
  }

}

</style>