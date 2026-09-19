<template>
  <div class="goods-page">

    <!-- 页面标题与操作 -->
    <div class="page-header">
      <div>
        <h2>商品中心</h2>
        <p>浏览、筛选与管理平台上的闲置商品</p>
      </div>

      <div class="page-header__actions">
        <!-- 卡片 / 表格双视图切换 -->
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="card">
            <el-icon><Grid /></el-icon>
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><Menu /></el-icon>
          </el-radio-button>
        </el-radio-group>

        <el-button @click="handleBatchAdd">
          <el-icon><DocumentAdd /></el-icon>批量发布
        </el-button>

        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>发布商品
        </el-button>
      </div>
    </div>

    <!-- 筛选区 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-bar">

        <el-input
            v-model="goodsName"
            placeholder="搜索商品名称"
            clearable
            class="filter-bar__name"
            :prefix-icon="Search"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
        />

        <el-select
            v-model="categoryId"
            placeholder="商品分类"
            clearable
            class="filter-bar__category"
        >
          <el-option
              v-for="cat in categories"
              :key="cat.categoryId"
              :label="cat.categoryName"
              :value="cat.categoryId"
          />
        </el-select>

        <div class="filter-bar__price">
          <el-input-number
              v-model="minPrice"
              :min="0"
              :controls="false"
              placeholder="最低价"
              class="price-input"
          />
          <span class="price-sep">—</span>
          <el-input-number
              v-model="maxPrice"
              :min="0"
              :controls="false"
              placeholder="最高价"
              class="price-input"
          />
        </div>

        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>查询
        </el-button>

        <el-button @click="handleReset">
          <el-icon><RefreshLeft /></el-icon>重置
        </el-button>

      </div>
    </el-card>

    <!-- 卡片视图 -->
    <div v-if="viewMode === 'card'" v-loading="loading" class="card-view">

      <div v-if="goodsList.length > 0" class="goods-grid">
        <GoodsCard
            v-for="goods in goodsList"
            :key="goods.goodsId"
            :goods="goods"
            :category-name="getCategoryName(goods.categoryId)"
            :editable="goods.userId === currentUserId"
            @edit="handleEdit"
            @delete="handleDelete"
        />
      </div>

      <el-empty
          v-else-if="!loading"
          class="goods-empty"
          :description="emptyText"
      >
        <el-button type="primary" @click="hasFilters ? handleReset() : handleAdd()">
          {{ hasFilters ? '清空筛选条件' : '发布第一件商品' }}
        </el-button>
      </el-empty>

    </div>

    <!-- 表格视图 -->
    <el-card
        v-else
        shadow="never"
        class="table-card"
        v-loading="loading"
    >

      <el-table :data="goodsList" border stripe style="width: 100%">

        <el-table-column prop="goodsId" label="商品ID" width="90" />

        <el-table-column prop="goodsName" label="商品名称" min-width="160" show-overflow-tooltip>
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

        <el-table-column label="价格" width="120">
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

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <!-- 编辑/删除只对自己发布的商品展示，越权请求由后端兜底拒绝 -->
            <template v-if="scope.row.userId === currentUserId">
              <el-button type="primary" link @click="handleEdit(scope.row.goodsId)">
                编辑
              </el-button>
              <el-button type="danger" link @click="handleDelete(scope.row.goodsId)">
                删除
              </el-button>
            </template>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty :description="emptyText" />
        </template>

      </el-table>

    </el-card>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination">
      <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadGoods"
      />
    </div>

    <!-- 新增 / 编辑商品弹窗 -->
    <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑商品' : '发布商品'"
        width="500px"
    >

      <el-form label-width="90px">

        <el-form-item label="商品名称">
          <el-input
              v-model="form.goodsName"
              placeholder="请输入商品名称"
          />
        </el-form-item>

        <el-form-item label="商品分类">
          <el-select
              v-model="form.categoryId"
              placeholder="请选择分类"
              style="width: 100%"
          >
            <el-option
                v-for="cat in categories"
                :key="cat.categoryId"
                :label="cat.categoryName"
                :value="cat.categoryId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="商品价格">
          <el-input-number
              v-model="form.price"
              :min="0"
              :precision="2"
              controls-position="right"
              placeholder="请输入商品价格"
              style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="商品描述">
          <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="请输入商品描述"
          />
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>

    </el-dialog>

    <!-- 批量发布商品弹窗 -->
    <el-dialog v-model="batchDialogVisible" title="批量发布商品" width="900px">

      <el-table :data="batchGoodsList" border>

        <el-table-column type="index" label="行号" width="70" />

        <el-table-column label="商品名称">
          <template #default="scope">
            <el-input
                v-model="scope.row.goodsName"
                placeholder="商品名称"
            />
          </template>
        </el-table-column>

        <el-table-column label="分类" width="150">
          <template #default="scope">
            <el-select
                v-model="scope.row.categoryId"
                placeholder="选择分类"
                size="small"
                style="width: 120px"
            >
              <el-option
                  v-for="cat in categories"
                  :key="cat.categoryId"
                  :label="cat.categoryName"
                  :value="cat.categoryId"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="价格" width="150">
          <template #default="scope">
            <el-input-number
                v-model="scope.row.price"
                :min="0"
                :controls="false"
                placeholder="价格"
                size="small"
                style="width: 120px"
            />
          </template>
        </el-table-column>

        <el-table-column label="商品描述">
          <template #default="scope">
            <el-input
                v-model="scope.row.description"
                placeholder="商品描述"
            />
          </template>
        </el-table-column>

      </el-table>

      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSave">批量发布</el-button>
      </template>

    </el-dialog>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Grid,
  Menu,
  Search,
  RefreshLeft,
  Plus,
  DocumentAdd
} from '@element-plus/icons-vue'
import GoodsCard from '../components/GoodsCard.vue'
import { formatPrice, formatDateTime } from '../utils/format'
import request from '../utils/request'

const router = useRouter()

// 当前登录用户：编辑/删除按钮只对自己的商品展示（真正的权限由后端兜底）
const currentUserId = Number(localStorage.getItem('userId'))

// 表格视图点击商品名称进入详情
const goDetail = (goodsId) => {
  router.push(`/goods/${goodsId}`)
}


// =========================
// 页面数据
// =========================

// 视图模式：card 卡片 / table 表格，默认卡片
const viewMode = ref('card')

// 筛选条件
const goodsName = ref('')
const categoryId = ref(null)
const minPrice = ref(null)
const maxPrice = ref(null)

const categories = ref([])
const goodsList = ref([])

const pageNum = ref(1)
const pageSize = ref(8)
const total = ref(0)
const loading = ref(false)

// 当前是否存在筛选条件（用于空状态文案与按钮）
const hasFilters = computed(() => {
  return !!(goodsName.value || categoryId.value
      || minPrice.value !== null || maxPrice.value !== null)
})

const emptyText = computed(() => {
  return hasFilters.value
      ? '没有找到符合条件的商品，换个关键词试试'
      : '还没有商品，去发布第一件闲置吧'
})

// 分类ID → 分类名称映射
const categoryNameMap = computed(() => {
  const map = {}
  categories.value.forEach(cat => {
    map[cat.categoryId] = cat.categoryName
  })
  return map
})

const getCategoryName = (id) => categoryNameMap.value[id] || '未分类'


// =========================
// 查询分类
// =========================

const loadCategories = async () => {
  try {
    categories.value = await request.get('/categories')
  } catch (error) {
    // 分类加载失败不阻塞商品浏览，下拉为空时仍可按名称查询
    console.error('加载分类失败：', error)
  }
}


// =========================
// 查询商品（携带全部筛选条件，后端 V1.0 已支持）
// =========================

const loadGoods = async () => {
  loading.value = true

  try {
    const result = await request.get('/goods/page', {
      params: {
        goodsName: goodsName.value || undefined,
        categoryId: categoryId.value ?? undefined,
        minPrice: minPrice.value ?? undefined,
        maxPrice: maxPrice.value ?? undefined,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    })

    goodsList.value = result.list || []
    total.value = result.total || 0

  } catch (error) {
    // request.js 已经统一提示错误
  } finally {
    loading.value = false
  }
}


// =========================
// 搜索 / 重置
// =========================

const handleSearch = () => {
  // 价格区间合法性
  if (minPrice.value !== null && maxPrice.value !== null
      && minPrice.value > maxPrice.value) {
    ElMessage.warning('最低价不能高于最高价')
    return
  }

  pageNum.value = 1
  loadGoods()
}

const handleReset = () => {
  goodsName.value = ''
  categoryId.value = null
  minPrice.value = null
  maxPrice.value = null
  pageNum.value = 1
  loadGoods()
}


// =========================
// 弹窗相关
// =========================

const dialogVisible = ref(false)
const isEdit = ref(false)

const batchDialogVisible = ref(false)
const batchGoodsList = ref([])

const form = ref({
  goodsId: null,
  userId: null,
  categoryId: null,
  goodsName: '',
  description: '',
  price: null
})


// =========================
// 点击“发布商品”
// =========================

const handleAdd = () => {
  isEdit.value = false

  form.value = {
    goodsId: null,
    userId: Number(localStorage.getItem('userId')),
    categoryId: null,
    goodsName: '',
    description: '',
    price: null
  }

  dialogVisible.value = true
}


// =========================
// 点击“批量发布”
// =========================

const handleBatchAdd = () => {
  batchGoodsList.value = Array.from(
      { length: 5 },
      () => ({
        userId: Number(localStorage.getItem('userId')),
        categoryId: null,
        goodsName: '',
        description: '',
        price: null,
        status: 1
      })
  )

  batchDialogVisible.value = true
}


// =========================
// 点击“编辑”
// =========================

const handleEdit = async (goodsId) => {
  try {
    const result = await request.get(`/goods/${goodsId}`)

    isEdit.value = true

    // 编辑不携带状态字段：商品上下架走工作台的专门操作，不能借编辑改动
    form.value = {
      goodsId: result.goodsId,
      userId: result.userId,
      categoryId: result.categoryId,
      goodsName: result.goodsName,
      description: result.description,
      price: result.price
    }

    dialogVisible.value = true

  } catch (error) {
    // request.js 已经统一提示错误
  }
}


// =========================
// 保存商品
// =========================

const handleSave = async () => {
  if (!form.value.goodsName) {
    ElMessage.warning('请输入商品名称')
    return
  }

  if (!form.value.categoryId) {
    ElMessage.warning('请选择商品分类')
    return
  }

  if (form.value.price === null || form.value.price === '') {
    ElMessage.warning('请输入商品价格')
    return
  }

  try {
    if (isEdit.value) {
      const result = await request.put('/goods', form.value)

      // 后端业务失败以文本返回（HTTP 仍为 200），需按内容区分
      if (result === '商品修改成功') {
        ElMessage.success(result)
        dialogVisible.value = false
        loadGoods()
      } else {
        ElMessage.error(result || '商品修改失败')
      }

    } else {
      const result = await request.post('/goods', {
        ...form.value,
        userId: Number(localStorage.getItem('userId'))
      })

      if (String(result).startsWith('商品发布成功')) {
        ElMessage.success(result)
        dialogVisible.value = false
        loadGoods()
      } else {
        ElMessage.error(result || '商品发布失败')
      }
    }

  } catch (error) {
    // request.js 已经统一提示错误
  }
}


// =========================
// 批量发布商品
// =========================

const handleBatchSave = async () => {
  // 过滤完全没有填写的空行
  const validGoodsList = batchGoodsList.value.filter(item => {
    return (
        item.goodsName ||
        item.categoryId !== null ||
        item.price !== null ||
        item.description
    )
  })

  if (validGoodsList.length === 0) {
    ElMessage.warning('请至少填写一条商品信息')
    return
  }

  // 逐行校验
  for (let i = 0; i < validGoodsList.length; i++) {
    const goods = validGoodsList[i]

    if (!goods.goodsName || !goods.goodsName.trim()) {
      ElMessage.warning(`第${i + 1}行：商品名称不能为空`)
      return
    }

    if (!goods.categoryId) {
      ElMessage.warning(`第${i + 1}行：请选择商品分类`)
      return
    }

    if (goods.price === null || goods.price === '') {
      ElMessage.warning(`第${i + 1}行：商品价格不能为空`)
      return
    }

    if (goods.price < 0) {
      ElMessage.warning(`第${i + 1}行：商品价格不能小于0`)
      return
    }
  }

  try {
    const result = await request.post('/goods/batch', validGoodsList)
    ElMessage.success(result)
    batchDialogVisible.value = false
    loadGoods()

  } catch (error) {
    // request.js 已经统一提示错误
  }
}


// =========================
// 删除商品
// =========================

const handleDelete = async (goodsId) => {
  try {
    await ElMessageBox.confirm(
        '确定要删除这个商品吗？',
        '删除确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    const result = await request.delete(`/goods/${goodsId}`)

    // 已产生交易记录的商品会被后端拒绝，这里按返回文本区分成功与失败
    if (result === '商品删除成功') {
      ElMessage.success(result)

      // 删除的是当前页最后一条时，回退一页避免停留在空页
      if (goodsList.value.length === 1 && pageNum.value > 1) {
        pageNum.value--
      }

      loadGoods()
    } else {
      ElMessage.error(result || '商品删除失败')
    }

  } catch (error) {
    // 用户点击取消时不做处理
  }
}


// =========================
// 页面加载
// =========================

onMounted(() => {
  loadCategories()
  loadGoods()
})
</script>


<style scoped>

.goods-page {
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

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 筛选区 */
.filter-card {
  margin-bottom: 18px;
  border-radius: var(--brand-radius-lg);
}

.filter-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-bar__name {
  width: 210px;
}

.filter-bar__category {
  width: 160px;
}

.filter-bar__price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-input {
  width: 110px;
}

.price-sep {
  color: var(--brand-text-secondary);
}

/* 卡片视图 */
.card-view {
  min-height: 260px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 18px;
}

.goods-empty {
  padding: 60px 0;
}

.table-card {
  border-radius: var(--brand-radius-lg);
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

</style>
