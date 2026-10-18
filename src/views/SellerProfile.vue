<template>
  <!-- 卖家主页：展示卖家公开信息 + 信誉画像 + 在售商品 -->
  <div class="seller-profile">

    <!-- 顶部：卖家信息 + 信誉画像 -->
    <div class="seller-header">
      <el-card shadow="never" class="seller-info-card" v-loading="sellerLoading">
        <div class="seller-info">
          <!-- 头像 -->
          <div class="seller-avatar">
            {{ seller ? (seller.username || '?').charAt(0) : '?' }}
          </div>

          <div class="seller-meta" v-if="seller">
            <div class="seller-name-row">
              <span class="seller-name">{{ seller.username }}</span>
              <el-tag
                :type="roleTagType(seller.role)"
                size="small"
                effect="light"
              >
                {{ roleText(seller.role) }}
              </el-tag>
            </div>

            <!-- 联系方式：登录后可见（与详情页一致） -->
            <div class="seller-contact" v-if="!isGuest">
              <span class="contact-item">
                <el-icon><Phone /></el-icon>
                {{ seller.phone || '未填写手机号' }}
              </span>
              <span class="contact-item">
                <el-icon><Message /></el-icon>
                {{ seller.email || '未填写邮箱' }}
              </span>
            </div>
            <div class="seller-guest-tip" v-else>
              <el-icon><Lock /></el-icon>
              <span>登录后查看卖家联系方式</span>
            </div>
          </div>

          <div class="seller-meta" v-else-if="!sellerLoading && !seller">
            <div class="seller-name-row">
              <span class="seller-name text-muted">卖家信息暂时无法获取</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 卖家信誉画像（公开，游客也能看） -->
      <el-card shadow="never" class="seller-credit-card" v-loading="creditLoading">
        <template #header>
          <div class="card-header">
            <el-icon><Medal /></el-icon>
            <span>卖家信誉</span>
            <el-tag
              v-if="credit"
              :type="creditLevelType(credit.creditLevel)"
              size="small"
              effect="dark"
              class="credit-level-tag"
            >
              {{ credit.creditLevel }}
            </el-tag>
          </div>
        </template>

        <div v-if="credit" class="credit-body">
          <div class="credit-score-row">
            <div class="credit-score-block">
              <el-rate
                :model-value="Number(credit.avgScore)"
                disabled
                show-score
                text-color="#ff9900"
                class="credit-rate"
              />
              <span class="credit-count">
                共 <strong>{{ credit.totalCount }}</strong> 条评价
              </span>
            </div>
          </div>

          <div class="credit-stats">
            <div class="credit-stat">
              <div class="credit-stat__num">{{ credit.completedCount }}</div>
              <div class="credit-stat__label">完成交易</div>
            </div>
            <div class="credit-stat">
              <div class="credit-stat__num">{{ credit.creditScore }}</div>
              <div class="credit-stat__label">信用积分</div>
            </div>
          </div>
        </div>

        <el-empty
          v-else-if="!creditLoading"
          description="暂无信誉数据"
          :image-size="80"
        />
      </el-card>
    </div>

    <!-- 主体：在售商品 -->
    <div class="seller-goods-section">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Goods /></el-icon>
          在售商品
          <span class="section-count" v-if="total > 0">{{ total }} 件</span>
        </h2>
      </div>

      <div class="goods-grid" v-if="goodsList.length > 0" v-loading="goodsLoading">
        <GoodsCard
          v-for="goods in goodsList"
          :key="goods.goodsId"
          :goods="goods"
          :category-name="getCategoryName(goods.categoryId)"
        />
      </div>

      <el-empty
        v-else-if="!goodsLoading"
        description="该卖家暂无在售商品"
        :image-size="120"
      >
        <el-button type="primary" plain @click="router.push('/goods')">
          去逛逛其他商品
        </el-button>
      </el-empty>

      <!-- 分页 -->
      <div class="pagination-wrap" v-if="total > pageSize">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="pageNum"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Phone, Message, Lock, Medal, Goods } from '@element-plus/icons-vue'
import GoodsCard from '../components/GoodsCard.vue'
import request from '../utils/request'
import { isLoggedIn } from '../utils/auth'

const route = useRoute()
const router = useRouter()

// 卖家信息（需登录，游客 401 时显示"登录后查看"）
const seller = ref(null)
const sellerLoading = ref(false)

// 卖家信誉画像（公开）
const credit = ref(null)
const creditLoading = ref(false)

// 在售商品（公开）
const goodsList = ref([])
const goodsLoading = ref(false)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(12)

// 分类列表（GoodsCard 需要 categoryName）
const categories = ref([])

const isGuest = !isLoggedIn()

// 角色映射
const roleText = (role) => ({ seller: '卖家', admin: '管理员', student: '学生' }[role] || '用户')
const roleTagType = (role) => ({ seller: 'warning', admin: 'danger', student: 'info' }[role] || 'info')
const creditLevelType = (level) => {
  if (!level) return 'info'
  if (level.includes('钻石') || level.includes('金牌')) return 'success'
  if (level.includes('银')) return 'info'
  return 'warning'
}

// 分类名映射
const getCategoryName = (categoryId) => {
  const cat = categories.value.find(c => c.categoryId === categoryId)
  return cat ? cat.categoryName : ''
}

// 加载卖家信息（登录后可查；游客 401 静默处理）
const loadSeller = async (sellerId) => {
  if (isGuest) {
    seller.value = null
    return
  }
  sellerLoading.value = true
  try {
    seller.value = await request.get(`/user/${sellerId}`)
  } catch (e) {
    // 401/403 等静默处理，页面已显示"无法获取"或"登录后查看"
    seller.value = null
  } finally {
    sellerLoading.value = false
  }
}

// 加载卖家信誉画像（公开，游客也能看）
const loadCredit = async (sellerId) => {
  creditLoading.value = true
  try {
    credit.value = await request.get(`/evaluations/seller/${sellerId}`)
  } catch (e) {
    credit.value = null
  } finally {
    creditLoading.value = false
  }
}

// 加载该卖家的在售商品（公开）
const loadGoods = async (sellerId) => {
  goodsLoading.value = true
  try {
    const res = await request.get('/goods/page', {
      params: { sellerId, pageNum: pageNum.value, pageSize: pageSize.value }
    })
    goodsList.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    goodsList.value = []
    total.value = 0
  } finally {
    goodsLoading.value = false
  }
}

// 加载分类列表（GoodsCard 需要 categoryName）
const loadCategories = async () => {
  try {
    categories.value = await request.get('/categories')
  } catch (e) {
    categories.value = []
  }
}

// 分页切换
const handlePageChange = (p) => {
  pageNum.value = p
  loadGoods(route.params.id)
}

// 初始化 + 路由参数变化时重新加载
const loadAll = (sellerId) => {
  loadSeller(sellerId)
  loadCredit(sellerId)
  loadGoods(sellerId)
}

onMounted(async () => {
  await loadCategories()
  loadAll(route.params.id)
})

watch(() => route.params.id, (newId) => {
  if (newId) {
    pageNum.value = 1
    loadAll(newId)
  }
})
</script>

<style scoped>
.seller-profile {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 顶部：卖家信息 + 信誉 并排 */
.seller-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

@media (max-width: 768px) {
  .seller-header {
    grid-template-columns: 1fr;
  }
}

.seller-info-card,
.seller-credit-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
}

/* 卖家信息 */
.seller-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.seller-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.seller-meta {
  flex: 1;
  min-width: 0;
}

.seller-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.seller-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.text-muted {
  color: var(--el-text-color-secondary);
}

.seller-contact {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.seller-guest-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 6px 12px;
  border-radius: 8px;
}

/* 信誉卡片 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.credit-level-tag {
  margin-left: auto;
}

.credit-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.credit-score-row {
  display: flex;
  justify-content: center;
}

.credit-score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.credit-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.credit-count strong {
  color: var(--el-color-primary);
}

.credit-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.credit-stat {
  text-align: center;
  background: var(--el-fill-color-light);
  border-radius: 10px;
  padding: 12px;
}

.credit-stat__num {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.credit-stat__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

/* 商品区域 */
.seller-goods-section {
  margin-top: 8px;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.section-count {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .goods-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .goods-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}
</style>
