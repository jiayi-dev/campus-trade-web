<template>
  <div class="mc-page">

    <!-- ============ 顶部标题 ============ -->
    <header class="mc-head">
      <div class="mc-head__main">
        <h2 class="mc-head__title">收藏与足迹</h2>
        <p class="mc-head__sub">
          收藏是服务器上的真实数据；浏览足迹只留在当前浏览器本地
        </p>
      </div>
      <div class="mc-head__stat">
        <div class="mc-head__stat-item">
          <span class="mc-head__stat-num">{{ favorites.length }}</span>
          <span class="mc-head__stat-label">已收藏</span>
        </div>
        <div class="mc-head__stat-divider"></div>
        <div class="mc-head__stat-item">
          <span class="mc-head__stat-num">{{ footprints.length }}</span>
          <span class="mc-head__stat-label">足迹（本机）</span>
        </div>
      </div>
    </header>

    <!-- ============ 两个 Tab：完全不同的信息布局 ============ -->
    <el-tabs v-model="activeTab" class="mc-tabs">

      <!-- ================= 我的收藏：图像化商品墙 ================= -->
      <el-tab-pane name="favorite">
        <template #label>
          <span class="mc-tab-label">
            <el-icon><StarFilled /></el-icon>我的收藏
            <span v-if="favorites.length" class="mc-tab-badge">{{ favorites.length }}</span>
          </span>
        </template>

        <section class="fav-wall">

          <!-- 工具条 -->
          <div class="fav-toolbar">
            <div class="fav-toolbar__left">
              <el-select
                  v-model="categoryFilter"
                  placeholder="全部分类"
                  clearable
                  size="default"
                  class="fav-toolbar__select"
              >
                <el-option label="全部分类" :value="null" />
                <el-option
                    v-for="cat in categories"
                    :key="cat.categoryId"
                    :label="cat.categoryName"
                    :value="cat.categoryId"
                />
              </el-select>

              <el-select
                  v-model="sortBy"
                  size="default"
                  class="fav-toolbar__select"
              >
                <el-option label="按收藏时间" value="time" />
                <el-option label="价格从低到高" value="priceAsc" />
                <el-option label="价格从高到低" value="priceDesc" />
                <el-option label="按热度（浏览量）" value="views" />
              </el-select>
            </div>

            <div class="fav-toolbar__right">
              <el-button
                  v-if="!managing"
                  :icon="Operation"
                  @click="enterManage"
                  :disabled="!favorites.length"
              >
                管理
              </el-button>

              <template v-else>
                <el-checkbox
                    :model-value="allSelected"
                    :indeterminate="partialSelected"
                    :disabled="!visibleFavorites.length"
                    @change="toggleSelectAll"
                >
                  全选
                </el-checkbox>
                <el-button
                    type="danger"
                    plain
                    :icon="Delete"
                    :disabled="!selectedIds.length"
                    :loading="batchLoading"
                    @click="cancelBatch"
                >
                  取消收藏({{ selectedIds.length }})
                </el-button>
                <el-button @click="exitManage">退出管理</el-button>
              </template>
            </div>
          </div>

          <!-- 加载中：骨架屏 -->
          <div v-if="favLoading" class="fav-grid">
            <div v-for="n in 8" :key="n" class="fav-skeleton">
              <div class="fav-skeleton__img"></div>
              <div class="fav-skeleton__line"></div>
              <div class="fav-skeleton__line fav-skeleton__line--short"></div>
            </div>
          </div>

          <!-- 加载失败：重试 -->
          <div v-else-if="favError" class="fav-error">
            <el-icon class="fav-error__icon"><WarningFilled /></el-icon>
            <p class="fav-error__title">收藏列表加载失败</p>
            <p class="fav-error__desc">可能是网络波动或登录状态失效，请重试</p>
            <el-button type="primary" :icon="Refresh" @click="loadFavorites">重试</el-button>
          </div>

          <!-- 空状态：无收藏 -->
          <div v-else-if="!favorites.length" class="fav-empty">
            <div class="fav-empty__icon"><el-icon><Star /></el-icon></div>
            <p class="fav-empty__title">还没有收藏任何闲置</p>
            <p class="fav-empty__desc">看到心仪的商品点一下星标，就会出现在这里</p>
            <div class="fav-empty__actions">
              <el-button type="primary" @click="$router.push('/goods')">
                去市场逛逛
              </el-button>
              <el-button plain @click="$router.push('/discover')">
                去专题集市
              </el-button>
            </div>
          </div>

          <!-- 有收藏但被筛选筛空 -->
          <div v-else-if="!visibleFavorites.length" class="fav-empty fav-empty--slim">
            <p class="fav-empty__title">当前筛选下没有收藏</p>
            <p class="fav-empty__desc">换一个分类或清空筛选条件试试</p>
            <el-button plain @click="categoryFilter = null">清空筛选</el-button>
          </div>

          <!-- 商品图像墙（网格） -->
          <div v-else class="fav-grid">
            <div
                v-for="item in visibleFavorites"
                :key="item.goodsId"
                class="fav-card"
                :class="{
                  'is-offline': !isOnSale(item),
                  'is-selected': selectedIds.includes(item.goodsId)
                }"
                @click="onCardClick(item)"
            >
              <!-- 图片为视觉重点 -->
              <div class="fav-card__media" :class="`media--${coverTheme(item)}`">
                <img
                    v-if="item.imageUrl && !imgErrorMap[item.goodsId]"
                    :src="item.imageUrl"
                    :alt="item.goodsName"
                    class="fav-card__img"
                    @error="handleImgError(item.goodsId)"
                />
                <div v-else class="fav-card__img-ph">
                  <el-icon><ShoppingBag /></el-icon>
                  <span>{{ categoryName(item.categoryId) }}</span>
                </div>

                <!-- 已下架标签（status !== 1 统一标注为已下架 / 已不可交易） -->
                <span v-if="!isOnSale(item)" class="fav-card__offline-tag">
                  已下架
                </span>

                <!-- 管理模式下：选择框 -->
                <div v-if="managing" class="fav-card__check">
                  <el-checkbox
                      :model-value="selectedIds.includes(item.goodsId)"
                      @click.stop="toggleSelect(item.goodsId)"
                  />
                </div>

                <!-- hover 操作层：单张取消收藏 / 查看 -->
                <div v-else class="fav-card__overlay">
                  <button
                      class="fav-card__act fav-card__act--danger"
                      :disabled="singleLoading === item.goodsId"
                      @click.stop="cancelSingle(item)"
                  >
                    <el-icon><Delete /></el-icon>
                    {{ singleLoading === item.goodsId ? '取消中' : '取消收藏' }}
                  </button>
                  <button class="fav-card__act" @click.stop="goDetail(item.goodsId)">
                    <el-icon><View /></el-icon>查看
                  </button>
                </div>
              </div>

              <!-- 信息区 -->
              <div class="fav-card__body">
                <div class="fav-card__name" :title="item.goodsName">
                  {{ item.goodsName }}
                </div>

                <div class="fav-card__price-row">
                  <span class="fav-card__price price-text">{{ formatPrice(item.price) }}</span>
                  <span class="fav-card__views">
                    <el-icon><View /></el-icon>{{ item.viewCount ?? 0 }}
                  </span>
                </div>

                <div class="fav-card__meta">
                  <span v-if="item.campus" class="fav-card__chip">
                    <el-icon><Location /></el-icon>{{ item.campus }}
                  </span>
                  <span class="fav-card__chip fav-card__chip--time">
                    <el-icon><Clock /></el-icon>{{ formatRelativeTime(item.favoriteTime) }}
                  </span>
                </div>

                <div v-if="!isOnSale(item)" class="fav-card__offline-note">
                  卖家已下架，无法继续交易，可取消收藏
                </div>
              </div>
            </div>
          </div>

        </section>
      </el-tab-pane>

      <!-- ================= 浏览足迹：按时间分组的记录流 ================= -->
      <el-tab-pane name="footprint">
        <template #label>
          <span class="mc-tab-label">
            <el-icon><Timer /></el-icon>浏览足迹
            <span v-if="footprints.length" class="mc-tab-badge">{{ footprints.length }}</span>
          </span>
        </template>

        <section class="fp-flow">

          <!-- 本地持久化提示（显著但不刺眼） -->
          <div class="fp-notice">
            <el-icon class="fp-notice__icon"><InfoFilled /></el-icon>
            <div class="fp-notice__text">
              浏览足迹<strong>仅保存在当前浏览器本地（localStorage）</strong>，未保存到服务器。
              换设备或清理浏览器数据后会丢失；登录用户的多设备之间也不同步。
              如需长期留存心仪商品，请点收藏。
            </div>
          </div>

          <!-- localStorage 不可用时的降级提示 -->
          <el-alert
              v-if="!fpStoreAvailable"
              class="fp-degrade"
              type="warning"
              :closable="false"
              show-icon
              title="当前浏览器不可用本地存储"
              description="可能处于隐私模式或已禁用本地存储，浏览足迹无法记录与展示。"
          />

          <!-- 工具条 -->
          <div class="fp-toolbar">
            <div class="fp-toolbar__left">
              <el-select
                  v-model="fpCategoryFilter"
                  placeholder="全部分类"
                  clearable
                  size="default"
                  class="fp-toolbar__select"
              >
                <el-option label="全部分类" :value="null" />
                <el-option
                    v-for="cat in categories"
                    :key="cat.categoryId"
                    :label="cat.categoryName"
                    :value="cat.categoryId"
                />
              </el-select>

              <el-select v-model="fpSortBy" size="default" class="fp-toolbar__select">
                <el-option label="最近浏览" value="recent" />
                <el-option label="价格从低到高" value="priceAsc" />
                <el-option label="价格从高到低" value="priceDesc" />
              </el-select>
            </div>

            <div class="fp-toolbar__right">
              <el-button
                  :icon="Delete"
                  plain
                  :disabled="!footprints.length"
                  @click="clearAll"
              >
                清空足迹
              </el-button>
            </div>
          </div>

          <!-- 空状态：无足迹 -->
          <div v-if="!footprints.length" class="fp-empty">
            <div class="fp-empty__icon"><el-icon><Timer /></el-icon></div>
            <p class="fp-empty__title">这里还没有浏览记录</p>
            <p class="fp-empty__desc">去商品市场逛逛，浏览过的商品会自动记录在这里</p>
            <el-button type="primary" @click="$router.push('/goods')">去商品市场</el-button>
          </div>

          <!-- 有足迹但被筛选筛空 -->
          <div v-else-if="!visibleGroups.length" class="fp-empty fp-empty--slim">
            <p class="fp-empty__title">当前筛选下没有足迹</p>
            <el-button plain @click="fpCategoryFilter = null">清空筛选</el-button>
          </div>

          <!-- 时间分组记录流 -->
          <div v-else class="fp-groups">
            <div
                v-for="group in visibleGroups"
                :key="group.key"
                class="fp-group"
            >
              <div class="fp-group__head">
                <span class="fp-group__dot"></span>
                <span class="fp-group__label">{{ group.label }}</span>
                <span class="fp-group__count">{{ group.items.length }} 条</span>
              </div>

              <div class="fp-group__body">
                <div
                    v-for="item in group.items"
                    :key="item.goodsId"
                    class="fp-item"
                    @click="goDetail(item.goodsId)"
                >
                  <div class="fp-item__thumb" :class="`media--${coverTheme(item)}`">
                    <img
                        v-if="item.imageUrl && !imgErrorMap['fp-' + item.goodsId]"
                        :src="item.imageUrl"
                        :alt="item.goodsName"
                        @error="handleImgError('fp-' + item.goodsId)"
                    />
                    <el-icon v-else><ShoppingBag /></el-icon>
                  </div>

                  <div class="fp-item__info">
                    <div class="fp-item__name" :title="item.goodsName">{{ item.goodsName }}</div>
                    <div class="fp-item__sub">
                      <span class="fp-item__price price-text">{{ formatPrice(item.price) }}</span>
                      <span v-if="item.campus" class="fp-item__campus">
                        <el-icon><Location /></el-icon>{{ item.campus }}
                      </span>
                    </div>
                  </div>

                  <div class="fp-item__time">
                    <el-icon><Clock /></el-icon>{{ formatRelativeTime(item.viewTime) }}
                  </div>

                  <div class="fp-item__actions" @click.stop>
                    <el-button link type="primary" @click="goDetail(item.goodsId)">
                      查看
                    </el-button>
                    <el-button link type="danger" @click="removeOne(item.goodsId)">
                      移除
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </section>
      </el-tab-pane>

    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Star,
  StarFilled,
  Delete,
  View,
  Location,
  Clock,
  ShoppingBag,
  Refresh,
  Operation,
  Timer,
  InfoFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatRelativeTime } from '../utils/format'
import {
  readFootprints,
  removeFootprint,
  clearFootprints,
  isFootprintStoreAvailable
} from '../utils/footprint'

const router = useRouter()

// ================= 通用 =================

const activeTab = ref('favorite')
const categories = ref([])

// 分类ID → 分类名
const categoryNameMap = computed(() => {
  const map = {}
  categories.value.forEach(cat => {
    map[cat.categoryId] = cat.categoryName
  })
  return map
})
const categoryName = (id) => categoryNameMap.value[id] || '未分类'

// status === 1 为在售，其余（0 / null）统一视为已下架 / 已不可交易
const isOnSale = (item) => item.status === 1

// 无图占位配色（复用 GoodsCard 的浅粉→浅黄主题）
const coverThemes = ['cream', 'rose', 'yellow', 'sage']
const coverTheme = (item) => {
  const seed = item.categoryId ?? item.goodsId ?? 0
  return coverThemes[Math.abs(seed) % coverThemes.length]
}

// 图片加载失败兜底（key 支持 'fp-{id}' 前缀复用）
const imgErrorMap = ref({})
const handleImgError = (key) => {
  imgErrorMap.value = { ...imgErrorMap.value, [key]: true }
}

const goDetail = (goodsId) => router.push(`/goods/${goodsId}`)

// ================= 我的收藏（服务端真实数据） =================

const favorites = ref([])
const favLoading = ref(false)
const favError = ref(false)
const categoryFilter = ref(null)
const sortBy = ref('time')

// 管理模式（多选批量取消）
const managing = ref(false)
const selectedIds = ref([])
const batchLoading = ref(false)
const singleLoading = ref(null)

const loadFavorites = async () => {
  favLoading.value = true
  favError.value = false
  try {
    const res = await request.get('/favorite/my')
    // 后端不返回假数据：没有收藏就是空数组，页面展示明确空状态
    favorites.value = Array.isArray(res) ? res : []
  } catch (e) {
    // request.js 已统一 ElMessage 提示，这里只负责渲染失败态与重试
    favError.value = true
    favorites.value = []
  } finally {
    favLoading.value = false
  }
}

const loadCategories = async () => {
  try {
    const res = await request.get('/categories')
    categories.value = Array.isArray(res) ? res : []
  } catch (e) {
    categories.value = []
  }
}

// 分类筛选 + 排序后的收藏列表
const visibleFavorites = computed(() => {
  let list = favorites.value

  if (categoryFilter.value !== null && categoryFilter.value !== undefined) {
    list = list.filter(item => item.categoryId === categoryFilter.value)
  }

  const sorted = [...list]
  if (sortBy.value === 'priceAsc') {
    sorted.sort((a, b) => Number(a.price) - Number(b.price))
  } else if (sortBy.value === 'priceDesc') {
    sorted.sort((a, b) => Number(b.price) - Number(a.price))
  } else if (sortBy.value === 'views') {
    sorted.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
  } else {
    // 默认按收藏时间倒序
    sorted.sort((a, b) => new Date(b.favoriteTime) - new Date(a.favoriteTime))
  }
  return sorted
})

const allSelected = computed(
    () => visibleFavorites.value.length > 0
        && selectedIds.value.length === visibleFavorites.value.length
)

const partialSelected = computed(
    () => selectedIds.value.length > 0
        && selectedIds.value.length < visibleFavorites.value.length
)

const enterManage = () => {
  managing.value = true
  selectedIds.value = []
}

const exitManage = () => {
  managing.value = false
  selectedIds.value = []
}

const toggleSelect = (goodsId) => {
  const idx = selectedIds.value.indexOf(goodsId)
  if (idx >= 0) {
    selectedIds.value = selectedIds.value.filter(id => id !== goodsId)
  } else {
    selectedIds.value = [...selectedIds.value, goodsId]
  }
}

const toggleSelectAll = (checked) => {
  selectedIds.value = checked
      ? visibleFavorites.value.map(item => item.goodsId)
      : []
}

// 卡片点击：管理模式下切换选中，否则进入详情
const onCardClick = (item) => {
  if (managing.value) {
    toggleSelect(item.goodsId)
    return
  }
  goDetail(item.goodsId)
}

// 批量取消收藏：DELETE /favorite/batch，body 为 goodsId 数组
const cancelBatch = async () => {
  const ids = [...selectedIds.value]
  if (!ids.length) return

  try {
    await ElMessageBox.confirm(
        `确认取消收藏选中的 ${ids.length} 件商品吗？`,
        '取消收藏',
        { confirmButtonText: '确认取消', cancelButtonText: '再想想', type: 'warning' }
    )
  } catch (e) {
    return
  }

  batchLoading.value = true
  try {
    const res = await request.delete('/favorite/batch', { data: ids })

    if (typeof res === 'string' && res.startsWith('已取消收藏')) {
      // 本地移除，避免整页重拉
      favorites.value = favorites.value.filter(item => !ids.includes(item.goodsId))
      selectedIds.value = []
      ElMessage.success(res)
    } else {
      // 后端业务错误也以 200 + 文本返回，这里给出明确提示
      ElMessage.warning(res || '取消收藏失败')
    }
  } catch (e) {
    // request.js 已提示网络/服务异常
  } finally {
    batchLoading.value = false
  }
}

// 单张卡片取消收藏：DELETE /favorite/{goodsId}
const cancelSingle = async (item) => {
  try {
    await ElMessageBox.confirm(
        `确认取消收藏「${item.goodsName}」吗？`,
        '取消收藏',
        { confirmButtonText: '确认取消', cancelButtonText: '再想想', type: 'warning' }
    )
  } catch (e) {
    return
  }

  singleLoading.value = item.goodsId
  try {
    await request.delete(`/favorite/${item.goodsId}`)
    favorites.value = favorites.value.filter(it => it.goodsId !== item.goodsId)
    selectedIds.value = selectedIds.value.filter(id => id !== item.goodsId)
    ElMessage.success('已取消收藏')
  } catch (e) {
    // request.js 已提示
  } finally {
    singleLoading.value = null
  }
}

// ================= 浏览足迹（仅本地 localStorage） =================

const footprints = ref([])
const fpStoreAvailable = ref(true)
const fpCategoryFilter = ref(null)
const fpSortBy = ref('recent')

const loadFootprints = () => {
  fpStoreAvailable.value = isFootprintStoreAvailable()
  footprints.value = fpStoreAvailable.value ? readFootprints() : []
}

// 按分类筛选 + 排序后的足迹
const visibleFootprints = computed(() => {
  let list = footprints.value

  if (fpCategoryFilter.value !== null && fpCategoryFilter.value !== undefined) {
    list = list.filter(item => item.categoryId === fpCategoryFilter.value)
  }

  const sorted = [...list]
  if (fpSortBy.value === 'priceAsc') {
    sorted.sort((a, b) => Number(a.price) - Number(b.price))
  } else if (fpSortBy.value === 'priceDesc') {
    sorted.sort((a, b) => Number(b.price) - Number(a.price))
  } else {
    sorted.sort((a, b) => (b.viewTime ?? 0) - (a.viewTime ?? 0))
  }
  return sorted
})

const pad = (n) => String(n).padStart(2, '0')
const dayKey = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 分组规则：今天 / 昨天 / 更早按 YYYY-MM-DD 分组；组内按浏览时间倒序
const visibleGroups = computed(() => {
  const todayKey = dayKey(Date.now())
  const yesterdayKey = dayKey(Date.now() - 24 * 60 * 60 * 1000)

  const map = new Map()
  visibleFootprints.value.forEach(item => {
    const key = dayKey(item.viewTime || 0)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  })

  return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, items]) => {
        items.sort((a, b) => (b.viewTime ?? 0) - (a.viewTime ?? 0))
        const label = key === todayKey ? '今天'
            : key === yesterdayKey ? '昨天'
                : key
        return { key, label, items }
      })
})

const removeOne = (goodsId) => {
  removeFootprint(goodsId)
  footprints.value = readFootprints()
  ElMessage.success('已移除该条足迹')
}

const clearAll = async () => {
  try {
    await ElMessageBox.confirm(
        '清空后当前浏览器上的全部浏览足迹将被删除，且无法恢复。是否继续？',
        '清空足迹',
        { confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }

  clearFootprints()
  footprints.value = readFootprints()
  ElMessage.success('已清空浏览足迹')
}

// ================= 初始化 =================

onMounted(() => {
  loadFavorites()
  loadCategories()
  loadFootprints()
})

// 切回足迹 Tab 时重读本地存储（避免在其它页面浏览后回来数据过期）
watch(activeTab, (tab) => {
  if (tab === 'footprint') {
    loadFootprints()
  }
})
</script>

<style scoped>

.mc-page {
  max-width: 1180px;
  margin: 0 auto;
}

/* ========== 顶部标题 ========== */

.mc-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.mc-head__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-text);
  letter-spacing: 0.5px;
}

.mc-head__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.mc-head__stat {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  box-shadow: var(--brand-shadow-sm);
}

.mc-head__stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.mc-head__stat-num {
  font-size: 19px;
  font-weight: 700;
  color: var(--brand-primary);
  font-variant-numeric: tabular-nums;
}

.mc-head__stat-label {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.mc-head__stat-divider {
  width: 1px;
  height: 26px;
  background: var(--brand-border);
}

/* ========== Tab 标签 ========== */

.mc-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}

.mc-tabs :deep(.el-tabs__item) {
  font-size: 14.5px;
  font-weight: 600;
}

.mc-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mc-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: var(--brand-primary-soft);
  color: var(--brand-primary-active);
}

/* ============================================================
 * 我的收藏：图像化商品墙（暖粉 + 奶油底，图片为主）
 * ============================================================ */

.fav-wall {
  padding: 18px;
  border-radius: var(--brand-radius-xl);
  background:
    radial-gradient(circle at 100% 0, rgba(216, 168, 173, 0.16), transparent 45%),
    var(--brand-bg-soft);
}

.fav-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.fav-toolbar__left,
.fav-toolbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fav-toolbar__select {
  width: 168px;
}

/* 网格墙 */
.fav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}

/* 卡片 */
.fav-card {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
  animation: fav-in 0.32s ease both;
}

@keyframes fav-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fav-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--brand-shadow);
}

.fav-card.is-selected {
  box-shadow: 0 0 0 2px var(--brand-primary), var(--brand-shadow);
}

.fav-card.is-offline {
  opacity: 0.82;
}

/* 图片区 */
.fav-card__media {
  position: relative;
  height: 168px;
  overflow: hidden;
}

.fav-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.fav-card:hover .fav-card__img {
  transform: scale(1.08);
}

.fav-card__img-ph {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.fav-card__img-ph .el-icon {
  font-size: 34px;
  opacity: 0.55;
}

/* 无图占位渐变（浅粉→浅黄） */
.media--cream { background: linear-gradient(135deg, #fdf6e3 0%, #fbf0d8 100%); color: #b8985a; }
.media--rose { background: linear-gradient(135deg, #f5d9dc 0%, #fce6e8 100%); color: #c0848a; }
.media--yellow { background: linear-gradient(135deg, #f5e4b8 0%, #fbeec8 100%); color: #b8985a; }
.media--sage { background: linear-gradient(135deg, #d2d8de 0%, #e2e8ec 100%); color: #70808c; }

/* 已下架标签 */
.fav-card__offline-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  color: #fff;
  background: rgba(74, 69, 72, 0.66);
  backdrop-filter: blur(2px);
}

/* 管理选择框 */
.fav-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 7px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 8px rgba(74, 69, 72, 0.14);
}

/* hover 操作层 */
.fav-card__overlay {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(to top, rgba(74, 69, 72, 0.55), transparent);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fav-card:hover .fav-card__overlay {
  opacity: 1;
  transform: translateY(0);
}

.fav-card__act {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  border: none;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.94);
  color: var(--brand-text-regular);
  transition: all 0.2s ease;
}

.fav-card__act:hover {
  background: #fff;
  transform: scale(1.04);
}

.fav-card__act--danger {
  color: #c0848a;
}

.fav-card__act:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

/* 信息区 */
.fav-card__body {
  padding: 12px 13px 13px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.fav-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 39px;
}

.fav-card__price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fav-card__price {
  font-size: 17px;
  font-weight: 700;
}

.fav-card__views {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.fav-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fav-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--brand-bg-soft);
  color: var(--brand-text-secondary);
}

.fav-card__chip--time {
  background: #dde3e8;
  color: #70808c;
}

.fav-card__offline-note {
  margin-top: 2px;
  padding: 6px 8px;
  border-radius: var(--brand-radius-sm);
  font-size: 11px;
  line-height: 1.5;
  background: rgba(74, 69, 72, 0.06);
  color: var(--brand-text-secondary);
}

/* 骨架屏 */
.fav-skeleton {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
  padding-bottom: 14px;
}

.fav-skeleton__img {
  height: 168px;
  background: linear-gradient(100deg, #f2ece5 30%, #faf5ef 50%, #f2ece5 70%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite linear;
}

.fav-skeleton__line {
  height: 12px;
  margin: 12px 14px 0;
  border-radius: 6px;
  background: linear-gradient(100deg, #f2ece5 30%, #faf5ef 50%, #f2ece5 70%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite linear;
}

.fav-skeleton__line--short {
  width: 55%;
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

/* 失败 / 空状态 */
.fav-error,
.fav-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 20px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
}

.fav-empty--slim {
  padding: 34px 20px;
}

.fav-error__icon,
.fav-empty__icon {
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 30px;
  margin-bottom: 14px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
}

.fav-error__icon {
  background: #f5edd6;
  color: var(--brand-accent);
}

.fav-error__title,
.fav-empty__title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.fav-error__desc,
.fav-empty__desc {
  margin: 6px 0 18px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.fav-empty__actions {
  display: flex;
  gap: 10px;
}

/* ============================================================
 * 浏览足迹：按时间分组的记录流（中性卡其 / 灰蓝，时间流为主）
 * ============================================================ */

.fp-flow {
  padding: 18px;
  border-radius: var(--brand-radius-xl);
  background: #f4f1ec;
}

/* 本地持久化提示条 */
.fp-notice {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: var(--brand-radius);
  background: #e8eaec;
  border-left: 3px solid var(--brand-aux);
}

.fp-notice__icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 16px;
  color: var(--brand-aux);
}

.fp-notice__text {
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--brand-text-regular);
}

.fp-notice__text strong {
  color: #4d5b66;
}

.fp-degrade {
  margin-bottom: 14px;
}

/* 工具条 */
.fp-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.fp-toolbar__left,
.fp-toolbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fp-toolbar__select {
  width: 168px;
}

/* 分组 */
.fp-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.fp-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.fp-group__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-aux);
}

.fp-group__label {
  font-size: 13.5px;
  font-weight: 700;
  color: #55606a;
  letter-spacing: 0.5px;
}

.fp-group__count {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

/* 时间线（卡片左侧竖线） */
.fp-group__body {
  position: relative;
  padding-left: 14px;
  border-left: 2px solid #d9dee2;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: var(--brand-radius);
  background: var(--brand-white);
  box-shadow: 0 1px 6px rgba(74, 69, 72, 0.04);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.fp-item:hover {
  transform: translateX(3px);
  box-shadow: var(--brand-shadow-sm);
}

.fp-item__thumb {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: var(--brand-radius-sm);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.fp-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fp-item__info {
  flex: 1;
  min-width: 0;
}

.fp-item__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-item__sub {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.fp-item__price {
  font-size: 14px;
  font-weight: 700;
}

.fp-item__campus {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.fp-item__time {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
  white-space: nowrap;
}

.fp-item__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0;
}

/* 空状态 */
.fp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56px 20px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
}

.fp-empty--slim {
  padding: 34px 20px;
}

.fp-empty__icon {
  width: 62px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 30px;
  margin-bottom: 14px;
  background: #dde3e8;
  color: #70808c;
}

.fp-empty__title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.fp-empty__desc {
  margin: 6px 0 18px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

/* ========== 响应式 ========== */

@media (max-width: 900px) {
  .fav-grid {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  }
}

@media (max-width: 680px) {
  .mc-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .fav-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .fav-toolbar__select,
  .fp-toolbar__select {
    width: 100%;
  }

  .fav-toolbar__left,
  .fav-toolbar__right,
  .fp-toolbar__left,
  .fp-toolbar__right {
    width: 100%;
  }

  .fp-item {
    flex-wrap: wrap;
  }

  .fp-item__time {
    margin-left: 66px;
  }
}

</style>
