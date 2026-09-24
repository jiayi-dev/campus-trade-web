<template>
  <div class="goods-page">

    <!-- 1. 页面标题与操作 -->
    <div class="page-header">
      <div>
        <h2>校园闲置市场</h2>
        <p>挑选身边同学发布的真实闲置好物</p>
      </div>

      <div class="page-header__actions">
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

    <!-- 2. 校园特色快捷入口（取真实分类列表前 7 个） -->
    <div v-if="quickEntries.length > 0" class="quick-entries">
      <div
          class="quick-entry"
          :class="{ 'is-active': isAllSelected }"
          @click="selectAllGoods"
      >
        <el-icon class="quick-entry__icon"><Goods /></el-icon>
        <span class="quick-entry__label">全部商品</span>
      </div>

      <div
          v-for="cat in quickEntries"
          :key="cat.categoryId"
          class="quick-entry"
          :class="{ 'is-active': categoryId === cat.categoryId }"
          @click="selectCategory(cat.categoryId)"
      >
        <el-icon class="quick-entry__icon"><Box /></el-icon>
        <span class="quick-entry__label">{{ cat.categoryName }}</span>
      </div>
    </div>

    <!-- 3. 筛选区 -->
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
            placeholder="全部分类"
            clearable
            class="filter-bar__category"
            @change="handleSearch"
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

        <el-select
            v-model="conditionLevel"
            placeholder="成色"
            clearable
            class="filter-bar__condition"
            @change="handleSearch"
        >
          <el-option label="全新" :value="1" />
          <el-option label="99新" :value="2" />
          <el-option label="95新" :value="3" />
          <el-option label="9成新" :value="4" />
          <el-option label="8成新及以下" :value="5" />
        </el-select>

        <el-select
            v-model="campus"
            placeholder="校区"
            clearable
            class="filter-bar__campus"
            @change="handleSearch"
        >
          <el-option label="东区" value="东区" />
          <el-option label="西区" value="西区" />
          <el-option label="南区" value="南区" />
          <el-option label="北区" value="北区" />
        </el-select>

        <el-select
            v-model="sortBy"
            class="filter-bar__sort"
            @change="handleSearch"
        >
          <el-option label="最新发布" value="latest" />
          <el-option label="价格从低到高" value="price_asc" />
          <el-option label="价格从高到低" value="price_desc" />
          <el-option label="热度优先" value="hot" />
          <el-option label="本周宝藏" value="treasure" />
        </el-select>

        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>查询
        </el-button>

        <el-button @click="handleReset">
          <el-icon><RefreshLeft /></el-icon>重置
        </el-button>

      </div>
    </el-card>

    <!-- 3.5 场景筛选状态条：从首页场景导航进入时展示
         场景 = 带语义的关键词筛选状态，不是独立页面 -->
    <div v-if="activeScene" class="scene-banner">
      <div class="scene-banner__info">
        <el-icon class="scene-banner__icon"><Compass /></el-icon>
        <div>
          <div class="scene-banner__name">{{ activeScene.name }}</div>
          <div class="scene-banner__desc">
            {{ activeScene.desc }} · 按「{{ activeScene.keyword }}」筛选，共 {{ total }} 件
          </div>
        </div>
      </div>
      <el-button size="small" round @click="clearScene">
        <el-icon><Close /></el-icon>清除场景
      </el-button>
    </div>

    <!-- 4. 结果信息条 -->
    <div class="result-bar">
      <span class="result-bar__count">
        共 <strong>{{ total }}</strong> 件商品
      </span>
      <span v-if="hasFilters" class="result-bar__hint">
        已按筛选条件展示
      </span>
    </div>

    <!-- 5. 卡片视图 -->
    <div v-if="viewMode === 'card'" v-loading="loading" class="card-view">

      <div v-if="goodsList.length > 0" class="goods-grid">
        <GoodsCard
            v-for="goods in goodsList"
            :key="goods.goodsId"
            :goods="goods"
            :category-name="getCategoryName(goods.categoryId)"
            :editable="goods.userId === currentUserId"
            :favorite="favoriteIds.has(goods.goodsId)"
            :fav-loading="favLoadingId === goods.goodsId"
            @edit="handleEdit"
            @delete="handleDelete"
            @toggle-favorite="handleToggleFavorite"
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

    <!-- 6. 表格视图（辅助） -->
    <el-card
        v-else
        shadow="never"
        class="table-card"
        v-loading="loading"
    >

      <el-table :data="goodsList" border stripe style="width: 100%">

        <el-table-column prop="goodsId" label="ID" width="70" />

        <el-table-column prop="goodsName" label="商品名称" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <el-link type="primary" :underline="false" @click="goDetail(scope.row.goodsId)">
              {{ scope.row.goodsName }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="100">
          <template #default="scope">
            {{ getCategoryName(scope.row.categoryId) }}
          </template>
        </el-table-column>

        <el-table-column label="成色" width="90">
          <template #default="scope">
            {{ conditionLabel(scope.row.conditionLevel) }}
          </template>
        </el-table-column>

        <el-table-column label="校区" width="80">
          <template #default="scope">
            {{ scope.row.campus || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="价格" width="110">
          <template #default="scope">
            <span class="price-text">{{ formatPrice(scope.row.price) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="收藏" width="70">
          <template #default="scope">{{ scope.row.favoriteCount ?? 0 }}</template>
        </el-table-column>

        <el-table-column label="浏览" width="70">
          <template #default="scope">{{ scope.row.viewCount ?? 0 }}</template>
        </el-table-column>

        <el-table-column label="状态" width="90">
          <template #default="scope">
            <el-tag
                :type="scope.row.status === 1 ? 'success' : 'info'"
                size="small"
            >
              {{ scope.row.status === 1 ? '在售' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" min-width="150">
          <template #default="scope">{{ formatDateTime(scope.row.createTime) }}</template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
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

    <!-- 7. 分页 -->
    <div v-if="total > 0" class="pagination">
      <el-pagination
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="loadGoods"
      />
    </div>

    <!-- 8. 新增 / 编辑商品弹窗（升级：加成色/校区/交易地点） -->
    <el-dialog
        v-model="dialogVisible"
        :title="isEdit ? '编辑商品' : '发布商品'"
        width="640px"
    >

      <el-form label-width="90px">

        <el-form-item label="商品名称" required>
          <el-input
              v-model="form.goodsName"
              placeholder="请输入商品名称"
          />
        </el-form-item>

        <el-form-item label="商品分类" required>
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

        <el-form-item label="商品价格" required>
          <el-input-number
              v-model="form.price"
              :min="0"
              :precision="2"
              controls-position="right"
              placeholder="请输入商品价格"
              style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="商品成色">
          <el-select
              v-model="form.conditionLevel"
              placeholder="请选择成色"
              clearable
              style="width: 100%"
          >
            <el-option label="全新（带吊牌）" :value="1" />
            <el-option label="99新（仅拆封）" :value="2" />
            <el-option label="95新（轻微痕迹）" :value="3" />
            <el-option label="9成新（正常痕迹）" :value="4" />
            <el-option label="8成新及以下" :value="5" />
          </el-select>
        </el-form-item>

        <el-form-item label="交易校区">
          <el-select
              v-model="form.campus"
              placeholder="请选择校区"
              clearable
              style="width: 100%"
          >
            <el-option label="东区" value="东区" />
            <el-option label="西区" value="西区" />
            <el-option label="南区" value="南区" />
            <el-option label="北区" value="北区" />
          </el-select>
        </el-form-item>

        <el-form-item label="面交地点">
          <el-input
              v-model="form.location"
              placeholder="如：三食堂门口 / 图书馆一楼"
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

        <el-form-item label="商品图片">
          <el-upload
              v-model:file-list="uploadFileList"
              action="/api/upload/image"
              name="file"
              list-type="picture-card"
              :headers="uploadHeaders"
              :limit="9"
              accept="image/jpeg,image/png,image/gif,image/webp"
              :before-upload="beforeImageUpload"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
          >
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="form-upload-tip">
                选择图片后立即上传，最多 9 张、单张不超过 5MB，第一张将作为列表封面主图
              </div>
            </template>
          </el-upload>
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>

    </el-dialog>

    <!-- 9. 批量发布商品弹窗（保持简化，不强制新字段） -->
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Grid, Menu, Search, RefreshLeft, Plus, DocumentAdd,
  Goods, Box, Compass, Close
} from '@element-plus/icons-vue'
import GoodsCard from '../components/GoodsCard.vue'
import { formatPrice, formatDateTime } from '../utils/format'
import { findScene } from '../utils/scenes'
import request from '../utils/request'

const router = useRouter()
const route = useRoute()

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
const conditionLevel = ref(null)
const campus = ref(null)
const sortBy = ref('latest')

// 场景筛选状态：来自首页场景导航 /goods?scene=<key>
// 场景不是独立页面，本质是"带语义的关键词筛选状态"（utils/scenes.js 统一定义）
const activeScene = ref(null)

const categories = ref([])
const goodsList = ref([])

const pageNum = ref(1)
const pageSize = ref(12)
const total = ref(0)
const loading = ref(false)

// 收藏状态集合（当前用户已收藏的商品ID）+ 正在切换收藏的商品ID（防重复点击）
const favoriteIds = ref(new Set())
const favLoadingId = ref(null)

// 当前是否存在筛选条件（用于空状态文案与按钮）
const hasFilters = computed(() => {
  return !!(goodsName.value || categoryId.value
      || minPrice.value !== null || maxPrice.value !== null
      || conditionLevel.value !== null || campus.value)
})

// 全部商品模式（用于快捷入口"全部"高亮）
const isAllSelected = computed(() => {
  return !categoryId.value && !hasFilters.value
})

const emptyText = computed(() => {
  return hasFilters.value
      ? '没有找到符合条件的商品，换个关键词或清空筛选试试'
      : '校园市场还没有商品，去发布第一件闲置吧'
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

// 成色字典（与后端 TINYINT 一致）
const CONDITION_MAP = {
  1: '全新',
  2: '99新',
  3: '95新',
  4: '9成新',
  5: '8成新'
}
const conditionLabel = (level) => CONDITION_MAP[level] || '—'


// 校园快捷入口：取真实分类列表前 7 个（不硬编码，保证数据真实）
const quickEntries = computed(() => {
  return [...categories.value].slice(0, 7)
})

const selectAllGoods = () => {
  goodsName.value = ''
  categoryId.value = null
  minPrice.value = null
  maxPrice.value = null
  conditionLevel.value = null
  campus.value = null
  sortBy.value = 'latest'
  pageNum.value = 1
  loadGoods()
}

const selectCategory = (id) => {
  // 点击已选中的分类再次点击：取消筛选
  if (categoryId.value === id) {
    categoryId.value = null
  } else {
    categoryId.value = id
  }
  pageNum.value = 1
  loadGoods()
}


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
// 查询商品（携带全部筛选条件，后端 V1.1 已支持成色/校区/排序）
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
        conditionLevel: conditionLevel.value ?? undefined,
        campus: campus.value || undefined,
        sortBy: sortBy.value,
        pageNum: pageNum.value,
        pageSize: pageSize.value
      }
    })

    goodsList.value = result.list || []
    total.value = result.total || 0

    // 商品列表加载成功后，一次请求回显整页卡片的收藏状态
    loadFavoriteStates()

  } catch (error) {
    // request.js 已经统一提示错误
  } finally {
    loading.value = false
  }
}


// =========================
// 收藏状态回显与切换（列表页直接收藏，无需进入详情页）
// =========================

// 批量查询当前页商品的收藏状态（一次请求，避免每张卡片单独请求）
const loadFavoriteStates = async () => {
  const ids = goodsList.value
      .filter(g => g.userId !== currentUserId)
      .map(g => g.goodsId)

  if (ids.length === 0) {
    favoriteIds.value = new Set()
    return
  }

  try {
    const result = await request.get('/favorite/checkBatch', {
      params: { goodsIds: ids.join(',') }
    })

    favoriteIds.value = new Set(result.favoriteGoodsIds || [])
  } catch (error) {
    // 收藏状态回显失败不阻塞列表浏览，默认全部未收藏
    favoriteIds.value = new Set()
  }
}

// 收藏 / 取消收藏：后端幂等（重复收藏只刷新时间不重复计数），
// 前端再以 favLoadingId 防止连点导致的并发请求
const handleToggleFavorite = async (goodsId) => {
  if (favLoadingId.value !== null) return

  const goods = goodsList.value.find(g => g.goodsId === goodsId)
  if (!goods) return

  const isFav = favoriteIds.value.has(goodsId)

  favLoadingId.value = goodsId

  try {
    const result = isFav
        ? await request.delete(`/favorite/${goodsId}`)
        : await request.post(`/favorite/${goodsId}`)

    if (result === '收藏成功' || result === '已取消收藏') {
      // 本地同步：收藏集合增减 + favorite_count 实时 +1/-1（无需重新拉列表）
      const next = new Set(favoriteIds.value)
      if (isFav) {
        next.delete(goodsId)
        goods.favoriteCount = Math.max((goods.favoriteCount ?? 0) - 1, 0)
      } else {
        next.add(goodsId)
        goods.favoriteCount = (goods.favoriteCount ?? 0) + 1
      }
      favoriteIds.value = next
      ElMessage.success(result)
    } else {
      // 业务失败：自己的商品 / 已下架 / 商品不存在等，后端文本直接透出
      ElMessage.error(result || '操作失败，请稍后再试')
    }
  } catch (error) {
    // request.js 已经统一提示错误
  } finally {
    favLoadingId.value = null
  }
}


// =========================
// 搜索 / 重置
// =========================

// =========================
// 路由 query → 筛选状态还原
// 首页/场景卡片带来的 goodsName / categoryId / campus / sortBy / scene 全部生效
// =========================

const VALID_SORTS = ['latest', 'price_asc', 'price_desc', 'hot', 'treasure']

const applyRouteQuery = () => {
  const q = route.query
  const scene = findScene(q.scene)
  activeScene.value = scene
  // 场景本质是关键词筛选：场景关键词优先于普通搜索词
  goodsName.value = scene ? scene.keyword : (q.goodsName || '')
  categoryId.value = q.categoryId ? Number(q.categoryId) : null
  campus.value = q.campus || null
  sortBy.value = VALID_SORTS.includes(q.sortBy) ? q.sortBy : 'latest'
  pageNum.value = 1
}

// 已在商品中心时再次从首页跳入（如换场景）：query 变化即重新还原并加载
watch(() => route.query, () => {
  if (route.path !== '/goods') return
  applyRouteQuery()
  loadGoods()
})

// 清除场景状态：退出场景关键词与 query，回到普通商品市场
const clearScene = () => {
  activeScene.value = null
  router.replace({ path: '/goods', query: {} })
  // watch 感知 query 变化后会统一 applyRouteQuery + loadGoods
}

// =========================
// 列表状态快照：商品列表 → 商品详情 → 返回 时恢复筛选条件 / 分页 / 视图 / 滚动位置
// 不引入 Pinia：sessionStorage 承载快照，history.state 标记浏览器后退返回
// =========================

const SNAPSHOT_KEY = 'campus_goods_list_snapshot'
const HISTORY_MARK = '__goodsListRestore'

// Layout 的内容区是真正的滚动容器（.content { overflow-y: auto }），window 不滚动
const getScrollContainer = () => document.querySelector('.content')

const buildSnapshot = () => ({
  goodsName: goodsName.value,
  categoryId: categoryId.value,
  minPrice: minPrice.value,
  maxPrice: maxPrice.value,
  conditionLevel: conditionLevel.value,
  campus: campus.value,
  sortBy: sortBy.value,
  pageNum: pageNum.value,
  pageSize: pageSize.value,
  viewMode: viewMode.value,
  sceneKey: activeScene.value?.key || null,
  scrollTop: getScrollContainer()?.scrollTop || 0,
  savedAt: Date.now()
})

const persistSnapshot = () => {
  const snapshot = buildSnapshot()
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
  // 在当前列表历史条目标记 restore：浏览器后退回到本条目时仍可识别
  const state = window.history.state || {}
  if (!state[HISTORY_MARK]) {
    window.history.replaceState({ ...state, [HISTORY_MARK]: true }, '')
  }
}

const readSnapshot = () => {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

// 离开商品列表进入商品详情时：保存快照，并给详情路由打上 from=list 标记，
// 让详情页"返回商品列表"按钮知道要回到"原浏览位置"而不是全新列表
onBeforeRouteLeave((to) => {
  if (/^\/goods\/\d+/.test(to.path)) {
    persistSnapshot()
    if (!to.query.from) {
      return { path: to.path, query: { ...to.query, from: 'list' } }
    }
  }
  return true
})

const applySnapshot = (snap) => {
  goodsName.value = snap.goodsName || ''
  categoryId.value = snap.categoryId ?? null
  minPrice.value = snap.minPrice ?? null
  maxPrice.value = snap.maxPrice ?? null
  conditionLevel.value = snap.conditionLevel ?? null
  campus.value = snap.campus || null
  sortBy.value = VALID_SORTS.includes(snap.sortBy) ? snap.sortBy : 'latest'
  pageNum.value = snap.pageNum || 1
  pageSize.value = snap.pageSize || 12
  viewMode.value = snap.viewMode === 'table' ? 'table' : 'card'
  activeScene.value = findScene(snap.sceneKey)
}

// 数据渲染完成后再恢复滚动：商品卡片封面为固定高度，nextTick 后布局已稳定；
// 再用 rAF + 延时两次兜底，吸收图片解码等微小位移
const restoreScroll = (top) => {
  nextTick(() => {
    requestAnimationFrame(() => {
      const el = getScrollContainer()
      if (el) el.scrollTop = top
      setTimeout(() => {
        const el2 = getScrollContainer()
        if (el2) el2.scrollTop = top
      }, 180)
    })
  })
}

const consumeHistoryMark = () => {
  const state = window.history.state
  if (state && state[HISTORY_MARK]) {
    const { [HISTORY_MARK]: unused, ...rest } = state
    window.history.replaceState(rest, '')
  }
}

const handleSearch = () => {
  // 价格区间合法性
  if (minPrice.value !== null && maxPrice.value !== null
      && minPrice.value > maxPrice.value) {
    ElMessage.warning('最低价不能高于最高价')
    return
  }

  // 用户手动修改了搜索词：视为退出场景筛选状态
  if (activeScene.value && goodsName.value !== activeScene.value.keyword) {
    activeScene.value = null
    const { scene, ...rest } = route.query
    router.replace({ path: '/goods', query: rest })
  }

  pageNum.value = 1
  loadGoods()
}

const handleReset = () => {
  goodsName.value = ''
  categoryId.value = null
  minPrice.value = null
  maxPrice.value = null
  conditionLevel.value = null
  campus.value = null
  sortBy.value = 'latest'
  pageNum.value = 1
  // 重置同时退出场景筛选状态
  if (activeScene.value) {
    activeScene.value = null
    router.replace({ path: '/goods', query: {} })
    return // watch 会统一触发重新加载
  }
  loadGoods()
}


// =========================
// 弹窗相关
// =========================

const dialogVisible = ref(false)
const isEdit = ref(false)

const batchDialogVisible = ref(false)
const batchGoodsList = ref([])

// ===== 图片上传状态 =====
// el-upload 直传 /api/upload/image（不走 axios 实例），手动携带 Token
const uploadFileList = ref([])

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

// 统一取当前图片 URL 列表：已上传文件取服务端返回的 url，
// 编辑回显的历史图片直接取 entry.url
const getImageUrls = () => {
  return uploadFileList.value
      .map(f => (f.response && f.response.url) ? f.response.url : f.url)
      .filter(Boolean)
}

// 上传前校验：类型白名单 + 5MB（后端 UploadController 有同规则兜底）
const beforeImageUpload = (file) => {
  const allowTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowTypes.includes(file.type)) {
    ElMessage.warning('仅支持 jpg / png / gif / webp 格式图片')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  return true
}

// 上传成功：后端 HTTP 200 + {url} 或 {error}（项目既有风格），按字段区分
const handleUploadSuccess = (response, uploadFile) => {
  if (response && response.url) {
    uploadFile.url = response.url
    return
  }
  // 失败：从列表中移除该文件并提示原因
  const index = uploadFileList.value.findIndex(f => f.uid === uploadFile.uid)
  if (index > -1) {
    uploadFileList.value.splice(index, 1)
  }
  ElMessage.error((response && response.error) || '图片上传失败')
}

const handleUploadError = () => {
  ElMessage.error('图片上传失败，请检查网络后重试')
}

// 把当前图片列表保存到 goods_image 表（发布成功后 / 编辑保存时调用）
const saveGoodsImages = async (goodsId) => {
  const result = await request.post(`/goods/${goodsId}/images`, {
    imageUrls: getImageUrls()
  })

  if (result !== '商品图片保存成功') {
    // 图片保存失败不阻断商品主流程，但要明确告知
    ElMessage.warning(result || '商品图片保存失败')
  }
}

const form = ref({
  goodsId: null,
  userId: null,
  categoryId: null,
  goodsName: '',
  description: '',
  price: null,
  conditionLevel: null,
  campus: '',
  location: ''
})


// =========================
// 点击"发布商品"
// =========================

const handleAdd = () => {
  isEdit.value = false

  form.value = {
    goodsId: null,
    userId: Number(localStorage.getItem('userId')),
    categoryId: null,
    goodsName: '',
    description: '',
    price: null,
    conditionLevel: null,
    campus: '',
    location: ''
  }

  // 新发布：清空图片列表
  uploadFileList.value = []

  dialogVisible.value = true
}


// =========================
// 点击"批量发布"
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
// 点击"编辑"
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
      price: result.price,
      conditionLevel: result.conditionLevel,
      campus: result.campus || '',
      location: result.location || ''
    }

    // 回显已有图片（主图在前），回显失败不阻塞编辑
    uploadFileList.value = []
    try {
      const urls = await request.get(`/goods/${goodsId}/images`)
      uploadFileList.value = (Array.isArray(urls) ? urls : []).map(
          (url, index) => ({
            name: `图片${index + 1}`,
            url,
            status: 'success'
          })
      )
    } catch (error) {
      // 忽略图片回显失败
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
        // 编辑场景：全量替换商品图片（先删后插幂等，增删改图都走这里）
        await saveGoodsImages(form.value.goodsId)

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
        // 发布场景：从返回文本解析新商品ID，把已上传图片关联到该商品
        const match = String(result).match(/商品ID：(\d+)/)

        if (match) {
          await saveGoodsImages(Number(match[1]))
        }

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

onMounted(async () => {
  // 返回路径 1：详情页"返回商品列表"按钮 → /goods?restore=1
  // 返回路径 2：浏览器后退 → 列表历史条目上的 history.state 标记
  const byButton = route.query.restore === '1'
  const byHistory = !!(window.history.state && window.history.state[HISTORY_MARK])

  if (byButton || byHistory) {
    const snap = readSnapshot()
    if (snap) {
      consumeHistoryMark()
      applySnapshot(snap)
      // 分类字典仍需加载（快捷入口/分类名映射依赖），与商品请求并行
      loadCategories()
      await loadGoods()
      restoreScroll(snap.scrollTop || 0)
      return
    }
  }

  // 正常进入：先还原首页/场景卡片带来的路由筛选状态，再加载
  applyRouteQuery()
  loadCategories()
  loadGoods()
})
</script>


<style scoped>

.goods-page {
  width: 100%;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: var(--brand-text);
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

/* 校园特色快捷入口 */
.quick-entries {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f7f1e8 0%, #faf5ee 60%, #f1ede6 100%);
  border-radius: var(--brand-radius-lg);
  overflow-x: auto;
  scrollbar-width: thin;
}

.quick-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  min-width: 78px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.quick-entry:hover {
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(166, 140, 100, 0.12);
}

.quick-entry.is-active {
  background: #fff;
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(166, 140, 100, 0.18);
}

.quick-entry__icon {
  font-size: 22px;
  color: var(--brand-primary);
}

.quick-entry__label {
  font-size: 12.5px;
  color: var(--brand-text);
  font-weight: 500;
  white-space: nowrap;
}

/* 筛选区 */
.filter-card {
  margin-bottom: 14px;
  border-radius: var(--brand-radius-lg);
}

.filter-card :deep(.el-card__body) {
  padding: 14px 18px;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-bar__name {
  width: 200px;
}

.filter-bar__category {
  width: 140px;
}

.filter-bar__price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-input {
  width: 100px;
}

.price-sep {
  color: var(--brand-text-secondary);
}

.filter-bar__condition {
  width: 130px;
}

.filter-bar__campus {
  width: 110px;
}

.filter-bar__sort {
  width: 140px;
}

/* 场景筛选状态条：奶油粉渐变，明确"当前处于场景浏览模式" */
.scene-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f7e1e3 0%, #f3e6d4 100%);
  border: 1px solid #f0d9dc;
}

.scene-banner__info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.scene-banner__icon {
  font-size: 26px;
  color: #c8969b;
  flex-shrink: 0;
}

.scene-banner__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
}

.scene-banner__desc {
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--brand-text-regular);
}

/* 结果信息条 */
.result-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.result-bar__count strong {
  color: var(--brand-text);
  font-size: 14px;
  margin: 0 3px;
}

.result-bar__hint {
  padding: 2px 8px;
  font-size: 11.5px;
  background: #f0e9df;
  color: #a08560;
  border-radius: 10px;
}

/* 卡片视图 */
.card-view {
  min-height: 260px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
  gap: 16px;
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

/* 上传提示 */
.form-upload-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--brand-text-secondary);
}

</style>
