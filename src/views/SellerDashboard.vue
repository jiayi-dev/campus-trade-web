<template>
  <div class="seller-page">

    <!-- 页面标题 -->
    <div class="page-header">
      <div>
        <h2>我的店铺</h2>
        <p>管理我发布的商品</p>
      </div>

      <el-button type="primary" @click="loadGoods" :loading="loading">
        刷新商品
      </el-button>
    </div>

    <!-- 数据概览 -->
    <div class="stat-cards">
      <el-card class="stat-card">
        <div class="stat-title">我的商品</div>
        <div class="stat-value">{{ myGoods.length }}</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">在售商品</div>
        <div class="stat-value">{{ onSaleCount }}</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">已下架</div>
        <div class="stat-value">{{ offSaleCount }}</div>
      </el-card>
    </div>

    <!-- 商品列表 -->
    <el-card>
      <template #header>
        <div class="table-header">
          <span>我的商品列表</span>
          <span class="username">
            当前用户：{{ username }}
          </span>
        </div>
      </template>

      <el-table
          :data="myGoods"
          border
          stripe
          v-loading="loading"
          style="width: 100%"
      >
        <el-table-column
            prop="goodsId"
            label="商品ID"
            width="90"
        />

        <el-table-column
            prop="goodsName"
            label="商品名称"
            min-width="160"
        />

        <el-table-column
            prop="description"
            label="商品描述"
            min-width="220"
            show-overflow-tooltip
        />

        <el-table-column
            prop="price"
            label="价格"
            width="120"
        >
          <template #default="scope">
            ¥{{ scope.row.price }}
          </template>
        </el-table-column>

        <el-table-column
            prop="categoryId"
            label="分类ID"
            width="100"
        />

        <el-table-column
            label="商品状态"
            width="110"
        >
          <template #default="scope">
            <el-tag
                v-if="scope.row.status === 1"
                type="success"
            >
              在售
            </el-tag>

            <el-tag
                v-else
                type="info"
            >
              已下架
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
            prop="createTime"
            label="发布时间"
            min-width="180"
        />

        <el-table-column
            label="操作"
            width="100"
            fixed="right"
        >
          <template #default="scope">
            <el-button
                link
                type="primary"
                @click="goToGoods"
            >
              商品管理
            </el-button>
          </template>
        </el-table-column>

        <!-- 空数据 -->
        <template #empty>
          <el-empty description="暂无商品" />
        </template>
      </el-table>
    </el-card>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import request from '../utils/request'

const router = useRouter()

// 当前登录用户
const username = ref(
    localStorage.getItem('username') || ''
)

// 我的商品
const myGoods = ref([])

// 加载状态
const loading = ref(false)

// 查询当前用户自己的商品
const loadGoods = async () => {
  loading.value = true

  try {
    const result = await request.get('/goods/my')

    myGoods.value = result || []
  } catch (error) {
    console.error('查询我的商品失败：', error)
    ElMessage.error('商品数据加载失败')
  } finally {
    loading.value = false
  }
}

// 在售商品数量
const onSaleCount = computed(() => {
  return myGoods.value.filter(
      goods => goods.status === 1
  ).length
})

// 已下架商品数量
const offSaleCount = computed(() => {
  return myGoods.value.filter(
      goods => goods.status !== 1
  ).length
})

// 跳转到商品管理
const goToGoods = () => {
  router.push('/goods')
}

// 页面加载时查询商品
onMounted(() => {
  loadGoods()
})
</script>

<style scoped>
.seller-page {
  width: 100%;
}

/* 页面标题 */
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

/* 数据卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

/* 表格头部 */
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.username {
  color: #909399;
  font-size: 14px;
}

/* 小屏适配 */
@media (max-width: 900px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
}
</style>