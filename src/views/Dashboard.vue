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

      <StatCard label="商品总数" :value="statistics.goodsCount" theme="teal">
        <template #icon><el-icon><Goods /></el-icon></template>
      </StatCard>

      <StatCard label="用户总数" :value="statistics.userCount" theme="blue">
        <template #icon><el-icon><User /></el-icon></template>
      </StatCard>

      <StatCard label="分类数量" :value="statistics.categoryCount" theme="purple">
        <template #icon><el-icon><Files /></el-icon></template>
      </StatCard>

      <StatCard label="商品总价值" prefix="¥" :value="statistics.totalPrice" theme="orange">
        <template #icon><el-icon><Money /></el-icon></template>
      </StatCard>

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
import { Goods, User, Files, Money } from '@element-plus/icons-vue'
import StatCard from '../components/StatCard.vue'
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
      trigger: 'axis',
      borderRadius: 8,
      valueFormatter: value => `¥${value}`
    },

    grid: {
      left: 50,
      right: 20,
      top: 30,
      bottom: 30
    },

    xAxis: {
      type: 'category',
      data: categoryNames,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d6e2e1' } },
      axisLabel: { color: '#9d9aa8' }
    },

    yAxis: {
      type: 'value',
      name: '平均价格',
      nameTextStyle: { color: '#9d9aa8' },
      splitLine: { lineStyle: { color: '#efece6' } },
      axisLabel: { color: '#9d9aa8' }
    },

    series: [
      {
        name: '平均价格',
        type: 'bar',
        data: avgPrices,
        barWidth: '46%',
        itemStyle: {
          color: '#7c90a8',
          borderRadius: [6, 6, 0, 0]
        }
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

    color: ['#7c90a8', '#c9a9b8', '#e3cba8', '#a8b8a0', '#9d8fa5'],

    tooltip: {
      trigger: 'item',
      borderRadius: 8,
      formatter: '{b}：{c} 件（{d}%）'
    },

    legend: {
      bottom: 0,
      textStyle: { color: '#9d9aa8' }
    },

    series: [
      {
        name: '商品数量',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '44%'],
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 3
        },
        label: { color: '#4b5a6a' },
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