<template>
  <div ref="rootEl" class="discover">

    <!-- ================= 编辑式刊头 ================= -->
    <header class="masthead">
      <div class="masthead__main">
        <span class="masthead__kicker">CAMPUS ZINE · 校园专题集市</span>
        <h1 class="masthead__title">
          把校园闲置<br />
          编成本季的<span class="masthead__title-accent">好物专题</span>
        </h1>
        <p class="masthead__desc">
          六个围绕校园生活的真实专题，每期都用不同视角挑选同学正在出售的闲置。
          从新生入学到毕业季，从宿舍改造到环保循环，点击卡片即可进入商品详情。
        </p>

        <div class="masthead__meta">
          <span class="masthead__chip">
            <el-icon><Collection /></el-icon>{{ themes.length }} 个专题
          </span>
          <span class="masthead__chip">
            <el-icon><PriceTag /></el-icon>真实在售 {{ allTotal }} 件
          </span>
          <span v-if="campuses.length" class="masthead__chip">
            <el-icon><Location /></el-icon>{{ campuses.join(' / ') }}
          </span>
        </div>

        <div class="masthead__actions">
          <!-- 分享：纯前端复制真实链接 -->
          <el-button type="primary" @click="shareTheme(null)">
            <el-icon><Share /></el-icon>分享集市
          </el-button>

          <!-- 收藏专题：后端暂无 collection 能力，明确标注不可用 -->
          <el-tooltip
              content="专题收藏需要后端新增 collection 接口，当前暂未开放"
              placement="bottom"
              :show-after="0"
          >
            <span class="masthead__disabled-wrap">
              <el-button disabled>
                <el-icon><Star /></el-icon>收藏专题
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </div>

      <!-- 刊头拼贴装饰（真实生成图） -->
      <div class="masthead__collage">
        <img
            class="masthead__collage-img masthead__collage-img--a"
            :src="mastheadImages.a"
            alt="校园集市拼贴"
            @error="onImgError('mastheadA')"
        />
        <img
            class="masthead__collage-img masthead__collage-img--b"
            :src="mastheadImages.b"
            alt="校园闲置好物"
            @error="onImgError('mastheadB')"
        />
      </div>
    </header>

    <!-- ================= 快捷筛选 + 全部好物 ================= -->
    <section id="all-goods" class="all-section reveal">
      <div class="all-section__head">
        <div>
          <h2 class="all-section__title">全部好物</h2>
          <p class="all-section__desc">
            用真实筛选条件自由浏览：分类来自 /categories，校区来自校园在售数据。
          </p>
        </div>
        <el-button text :icon="ArrowRight" @click="goGoodsCenter">去商品中心</el-button>
      </div>

      <div class="filters">
        <el-select
            v-model="filter.categoryId"
            placeholder="全部分类"
            clearable
            class="filters__item"
            @change="applyFilter"
        >
          <el-option
              v-for="cat in categories"
              :key="cat.categoryId"
              :label="cat.categoryName"
              :value="cat.categoryId"
          />
        </el-select>

        <el-select
            v-model="filter.priceKey"
            placeholder="价格区间"
            clearable
            class="filters__item"
            @change="applyFilter"
        >
          <el-option
              v-for="p in priceRanges"
              :key="p.key"
              :label="p.label"
              :value="p.key"
          />
        </el-select>

        <el-select
            v-model="filter.campus"
            placeholder="选择校区"
            clearable
            class="filters__item"
            @change="applyFilter"
        >
          <el-option
              v-for="c in campuses"
              :key="c"
              :label="c"
              :value="c"
          />
        </el-select>

        <span v-if="hasAllFilters" class="filters__hint">
          已按筛选展示 · 共 {{ allTotal }} 件
        </span>
      </div>

      <div v-loading="allLoading" class="all-section__body">
        <div v-if="allGoods.length > 0" class="all-grid">
          <GoodsCard
              v-for="goods in allGoods"
              :key="goods.goodsId"
              :goods="goods"
              :category-name="getCategoryName(goods.categoryId)"
              :editable="false"
              :favorite="favoriteIds.has(goods.goodsId)"
              :fav-loading="favLoadingId === goods.goodsId"
              @toggle-favorite="handleToggleFavorite"
          />
        </div>

        <!-- 请求失败：可重试 -->
        <div v-else-if="allError" class="state-block">
          <el-icon class="state-block__icon"><Refresh /></el-icon>
          <p class="state-block__text">好物加载失败，请检查网络后重试</p>
          <el-button type="primary" @click="loadAllGoods">重新加载</el-button>
        </div>

        <el-empty
            v-else-if="!allLoading"
            description="没有符合条件的商品，换个筛选条件试试"
        >
          <el-button v-if="hasAllFilters" @click="resetFilter">清空筛选条件</el-button>
        </el-empty>
      </div>

      <div v-if="allTotal > 0" class="pagination">
        <el-pagination
            v-model:current-page="allPage"
            :page-size="allPageSize"
            :total="allTotal"
            layout="total, prev, pager, next, jumper"
            @current-change="loadAllGoods"
        />
      </div>
    </section>

    <!-- ================= 六个专题 ================= -->
    <section
        v-for="(theme, index) in themes"
        :id="`theme-${theme.key}`"
        :key="theme.key"
        class="theme-section reveal"
        :class="[`theme-section--${theme.tone}`, { 'is-active': activeTheme === theme.key }]"
    >
      <!-- 专题头图 + 编辑文案 -->
      <div class="theme-hero">
        <div class="theme-hero__media">
          <img
              v-if="!heroImgError[theme.key]"
              :src="theme.image"
              :alt="theme.title"
              class="theme-hero__img"
              loading="lazy"
              @error="onImgError(theme.key)"
          />
          <div v-else class="theme-hero__img-fallback">
            <el-icon><Picture /></el-icon>
            <span>{{ theme.title }}</span>
          </div>
          <div class="theme-hero__glow"></div>
          <span class="theme-hero__no">NO.{{ String(index + 1).padStart(2, '0') }}</span>
        </div>

        <div class="theme-hero__body">
          <span class="theme-hero__kicker">{{ theme.subtitle }}</span>
          <h2 class="theme-hero__title">{{ theme.title }}</h2>
          <p class="theme-hero__desc">{{ theme.desc }}</p>

          <div class="theme-hero__chips">
            <span class="theme-chip">{{ theme.queryLabel }}</span>
            <span class="theme-chip theme-chip--soft">
              共 {{ theme.total }} 件
            </span>
            <span v-if="theme.list.length" class="theme-chip theme-chip--soft">
              最低 {{ formatPrice(themeMinPrice(theme)) }}
            </span>
            <span v-if="themeLatest(theme)" class="theme-chip theme-chip--soft">
              更新于 {{ formatRelativeTime(themeLatest(theme)) }}
            </span>
          </div>

          <div class="theme-hero__actions">
            <el-button size="small" @click="shareTheme(theme)">
              <el-icon><Share /></el-icon>分享专题
            </el-button>
            <span v-if="activeTheme === theme.key" class="theme-hero__current">
              当前浏览专题
            </span>
          </div>
        </div>
      </div>

      <!-- 商品区：加载中 -->
      <div v-if="theme.loading" class="theme-skeleton">
        <div v-for="n in 4" :key="n" class="theme-skeleton__item"></div>
      </div>

      <!-- 商品区：请求失败 -->
      <div v-else-if="theme.error" class="state-block">
        <el-icon class="state-block__icon"><Refresh /></el-icon>
        <p class="state-block__text">「{{ theme.title }}」加载失败，请稍后重试</p>
        <el-button type="primary" @click="loadTheme(theme)">重新加载</el-button>
      </div>

      <!-- 商品区：空态（绝不虚构商品） -->
      <div v-else-if="theme.list.length === 0" class="state-block state-block--empty">
        <el-icon class="state-block__icon"><Collection /></el-icon>
        <p class="state-block__text">该专题暂时还没有上架商品</p>
        <p class="state-block__sub">换个专题看看，或去商品中心按条件自由浏览</p>
        <el-button type="primary" round @click="goGoodsCenter">
          去商品中心逛逛
        </el-button>
      </div>

      <!-- 商品区：各自版式 -->
      <div v-else class="theme-goods" :class="`layout--${theme.layout}`">
        <div
            v-for="(goods, i) in theme.list"
            :key="goods.goodsId"
            class="theme-goods__item"
            :class="itemClass(theme, i)"
        >
          <span v-if="theme.layout === 'strip'" class="theme-goods__rank">
            {{ i + 1 }}
          </span>
          <GoodsCard
              :goods="goods"
              :category-name="getCategoryName(goods.categoryId)"
              :editable="false"
              :favorite="favoriteIds.has(goods.goodsId)"
              :fav-loading="favLoadingId === goods.goodsId"
              @toggle-favorite="handleToggleFavorite"
          />
        </div>
      </div>
    </section>

    <!-- 页尾说明 -->
    <footer class="discover__foot">
      <span>专题头图由平台图片生成接口生成 · 商品数据均来自真实在售闲置</span>
    </footer>

  </div>
</template>


<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Collection, Star, Share, Refresh, ArrowRight, PriceTag, Location, Picture
} from '@element-plus/icons-vue'
import GoodsCard from '../components/GoodsCard.vue'
import request from '../utils/request'
import { formatPrice, formatRelativeTime } from '../utils/format'
import { isLoggedIn, requireLogin } from '../utils/auth'

const route = useRoute()
const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

// =========================
// 图片：统一走平台图片生成接口（prompt 用 encodeURIComponent 拼接）
// =========================
const buildImage = (prompt, size = 'landscape_16_9') =>
    `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`

const mastheadImages = {
  a: buildImage('college flea market stall with secondhand books and plants, warm cream tones, soft natural light, editorial photography', 'portrait_4_3'),
  b: buildImage('flatlay of campus secondhand goods, notebooks, headphones and a desk lamp on a cream background, editorial photography', 'square_hd')
}

// 头图加载失败占位（真实图片不可用时兜底，不用纯色块冒充头图）
const heroImgError = reactive({})
const onImgError = (key) => {
  heroImgError[key] = true
}

// =========================
// 基础字典：分类 / 校区
// =========================
const categories = ref([])
const campuses = ref([])

const categoryNameMap = computed(() => {
  const map = {}
  categories.value.forEach(cat => { map[cat.categoryId] = cat.categoryName })
  return map
})
const getCategoryName = (id) => categoryNameMap.value[id] || '未分类'

// 分类名模糊匹配 → 真实 categoryId（不写死任何分类ID；匹配不到返回 null 走关键词退化）
const matchCategoryId = (keywords) => {
  for (const kw of keywords) {
    const hit = categories.value.find(c => (c.categoryName || '').includes(kw))
    if (hit) return hit.categoryId
  }
  return null
}

// =========================
// 六个专题定义（每个专题：不同真实查询 + 不同版式 + 不同配色）
// =========================
const THEME_DEFS = [
  {
    key: 'freshman',
    title: '新生入学必备',
    subtitle: '开学第一站',
    desc: '从宿舍台灯到入学教材，把刚安顿下来的刚需好物一次配齐，省去四处打听的麻烦。',
    layout: 'cover',      // 编辑封面式：大幅头图 + 横向滚动卡片带
    tone: 'cream',
    pageSize: 8,
    categories: ['生活用品', '宿舍用品'],
    keyword: '宿舍',
    sortBy: 'latest',
    prompt: 'cozy college freshman dorm room move-in scene with storage boxes, desk lamp and textbooks, warm cream tones, soft natural light, editorial photography'
  },
  {
    key: 'dorm',
    title: '宿舍改造与收纳',
    subtitle: '把小房间住成大空间',
    desc: '收纳盒、折叠桌椅与桌面好物，用有限的预算把六人间收拾成顺手的据点。',
    layout: 'magazine',   // 杂志跨栏式：左右交错图文
    tone: 'rose',
    pageSize: 8,
    categories: ['宿舍用品'],
    keyword: '收纳',
    sortBy: 'latest',
    prompt: 'cozy dorm room desk makeover with storage boxes, organizers and a small plant, soft pink cream tones, natural light, editorial photography'
  },
  {
    key: 'digital',
    title: '数码设备与学习装备',
    subtitle: '上课与自习的硬装备',
    desc: '笔记本、耳机与办公外设，由分类名模糊匹配锁定，挑选正在出售的学习生产力工具。',
    layout: 'collage',    // 拼贴式：不等宽网格
    tone: 'aux',
    pageSize: 8,
    categories: ['数码产品', '办公用品', '乐器设备'],
    sortBy: 'hot',
    prompt: 'flatlay of a laptop, headphones, keyboard and notebook on a light grey desk, soft cool tones, minimal, editorial photography'
  },
  {
    key: 'exam',
    title: '考研考公与毕业季闲置',
    subtitle: '把一起努力的资料转给下一位',
    desc: '以「考研」为关键词检索真题与备考资料，毕业季的认真痕迹值得被继续使用。',
    layout: 'strip',      // 编辑带式：横向滚动 + 名次编号
    tone: 'yellow',
    pageSize: 8,
    keyword: '考研',
    sortBy: 'latest',
    prompt: 'study desk with exam prep textbooks, notes and a warm desk lamp, light yellow cream tones, soft natural light, editorial photography'
  },
  {
    key: 'budget',
    title: '低预算实用好物',
    subtitle: '50 元以内捡漏',
    desc: '用价格升序把 50 元以内的真实闲置排在前面，学生党钱包友好的实用清单。',
    layout: 'collage',    // 拼贴式（价格强调变体）
    tone: 'budget',
    pageSize: 8,
    maxPrice: 50,
    sortBy: 'price_asc',
    prompt: 'flea market flatlay of affordable secondhand campus items, mugs, books and small gadgets, warm cream and yellow tones, editorial photography'
  },
  {
    key: 'eco',
    title: '环保循环与闲置再利用',
    subtitle: '让物品再活一次',
    desc: '以浏览+收藏加权（宝藏排序）挑选高关注度闲置，循环使用本身就是一种环保。',
    layout: 'magazine',   // 杂志跨栏式（循环变体）
    tone: 'eco',
    pageSize: 8,
    sortBy: 'treasure',
    prompt: 'secondhand items being reused, potted green plants and recycled containers on a cream surface, soft natural light, editorial photography'
  }
]

// 专题列表（含各自的加载状态），挂载后由 buildThemes 生成
const themes = ref([])
const activeTheme = ref(route.query.theme || null)

const SORT_LABEL = {
  latest: '最新发布',
  price_asc: '价格升序',
  price_desc: '价格降序',
  hot: '热度优先',
  treasure: '宝藏加权'
}

// 把专题定义 + 真实分类解析成实际查询参数与可读标签
const buildThemes = () => {
  return THEME_DEFS.map(def => {
    const query = {}
    if (def.categories) {
      const id = matchCategoryId(def.categories)
      if (id !== null) query.categoryId = id
    }
    if (def.keyword) query.goodsName = def.keyword
    if (def.minPrice !== undefined) query.minPrice = def.minPrice
    if (def.maxPrice !== undefined) query.maxPrice = def.maxPrice
    if (def.conditionLevel !== undefined) query.conditionLevel = def.conditionLevel
    query.sortBy = def.sortBy || 'latest'

    const parts = []
    if (query.categoryId != null) {
      parts.push(`分类「${categoryNameMap.value[query.categoryId] || query.categoryId}」`)
    }
    if (query.goodsName) parts.push(`关键词「${query.goodsName}」`)
    if (query.minPrice != null) parts.push(`≥ ${query.minPrice} 元`)
    if (query.maxPrice != null) parts.push(`≤ ${query.maxPrice} 元`)
    if (query.conditionLevel != null) parts.push(`成色 ${query.conditionLevel}`)
    parts.push(SORT_LABEL[query.sortBy] || query.sortBy)

    return {
      ...def,
      query,
      queryLabel: parts.join(' · '),
      image: buildImage(def.prompt, 'landscape_16_9'),
      list: [],
      total: 0,
      loading: false,
      error: false
    }
  })
}

// =========================
// 专题商品加载
// =========================
const loadTheme = async (theme) => {
  theme.loading = true
  theme.error = false
  try {
    const res = await request.get('/goods/page', {
      params: { ...theme.query, pageNum: 1, pageSize: theme.pageSize }
    })
    theme.list = res?.list || []
    theme.total = res?.total || 0
  } catch (error) {
    theme.error = true
    theme.list = []
    theme.total = 0
  } finally {
    theme.loading = false
  }
}

const themeMinPrice = (theme) => {
  const prices = theme.list.map(g => Number(g.price)).filter(p => !Number.isNaN(p))
  return prices.length ? Math.min(...prices) : 0
}

const themeLatest = (theme) => {
  const times = theme.list.map(g => g.createTime).filter(Boolean).sort()
  return times.length ? times[times.length - 1] : ''
}

// =========================
// 全部好物：真实快捷筛选 + 分页
// =========================
const allGoods = ref([])
const allPage = ref(1)
const allPageSize = ref(8)
const allTotal = ref(0)
const allLoading = ref(false)
const allError = ref(false)

const filter = reactive({ categoryId: null, priceKey: null, campus: null })

const priceRanges = [
  { key: 'p0', label: '50 元以下', min: 0, max: 50 },
  { key: 'p1', label: '50 - 200 元', min: 50, max: 200 },
  { key: 'p2', label: '200 - 1000 元', min: 200, max: 1000 },
  { key: 'p3', label: '1000 元以上', min: 1000, max: undefined }
]

const hasAllFilters = computed(
    () => !!(filter.categoryId || filter.priceKey || filter.campus)
)

const loadAllGoods = async () => {
  allLoading.value = true
  allError.value = false
  const range = priceRanges.find(p => p.key === filter.priceKey) || null

  try {
    const res = await request.get('/goods/page', {
      params: {
        categoryId: filter.categoryId ?? undefined,
        minPrice: range ? range.min : undefined,
        maxPrice: range ? range.max : undefined,
        campus: filter.campus || undefined,
        sortBy: 'latest',
        pageNum: allPage.value,
        pageSize: allPageSize.value
      }
    })
    allGoods.value = res?.list || []
    allTotal.value = res?.total || 0
  } catch (error) {
    allError.value = true
    allGoods.value = []
    allTotal.value = 0
  } finally {
    allLoading.value = false
  }
}

const applyFilter = () => {
  allPage.value = 1
  loadAllGoods().then(loadFavoriteStates)
}

const resetFilter = () => {
  filter.categoryId = null
  filter.priceKey = null
  filter.campus = null
  allPage.value = 1
  loadAllGoods().then(loadFavoriteStates)
}

// =========================
// 收藏状态：批量回显 + 切换（游客跳过 checkBatch）
// =========================
const favoriteIds = ref(new Set())
const favLoadingId = ref(null)

const loadFavoriteStates = async () => {
  if (!isLoggedIn()) {
    favoriteIds.value = new Set()
    return
  }

  const ids = []
  const collect = (g) => {
    if (g && g.userId !== currentUserId) ids.push(g.goodsId)
  }
  themes.value.forEach(t => (t.list || []).forEach(collect))
  allGoods.value.forEach(collect)

  const unique = [...new Set(ids)]
  if (unique.length === 0) {
    favoriteIds.value = new Set()
    return
  }

  try {
    const res = await request.get('/favorite/checkBatch', {
      params: { goodsIds: unique.join(',') }
    })
    favoriteIds.value = new Set(res?.favoriteGoodsIds || [])
  } catch (error) {
    // 收藏回显失败不阻塞浏览
    favoriteIds.value = new Set()
  }
}

const findGoods = (goodsId) => {
  const inAll = allGoods.value.find(g => g.goodsId === goodsId)
  if (inAll) return inAll
  for (const t of themes.value) {
    const hit = (t.list || []).find(g => g.goodsId === goodsId)
    if (hit) return hit
  }
  return null
}

const handleToggleFavorite = async (goodsId) => {
  if (favLoadingId.value !== null) return

  if (!isLoggedIn()) {
    await requireLogin('登录后即可收藏商品', route.fullPath)
    return
  }

  const goods = findGoods(goodsId)
  if (!goods) return

  const isFav = favoriteIds.value.has(goodsId)
  favLoadingId.value = goodsId

  try {
    const result = isFav
        ? await request.delete(`/favorite/${goodsId}`)
        : await request.post(`/favorite/${goodsId}`)

    if (result === '收藏成功' || result === '已取消收藏') {
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
      ElMessage.error(result || '操作失败，请稍后再试')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    favLoadingId.value = null
  }
}

// =========================
// 分享：真实前端行为（clipboard），失败回退提示手动复制
// =========================
const shareTheme = async (theme) => {
  const themeKey = theme ? theme.key : (activeTheme.value || 'all')
  const url = `${location.origin}/discover?theme=${encodeURIComponent(themeKey)}`

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      ElMessage.success('专题链接已复制到剪贴板，快去分享给同学吧')
      return
    } catch (error) {
      // 落到下面的手动复制兜底
    }
  }
  ElMessage.warning(`当前浏览器不支持一键复制，请手动复制链接：${url}`)
}

const goGoodsCenter = () => {
  router.push('/goods')
}

// =========================
// 版式项样式：不同专题不同排布
// =========================
const itemClass = (theme, i) => {
  if (theme.layout === 'collage') return i % 5 === 0 ? 'is-wide' : ''
  if (theme.layout === 'magazine') return i % 2 === 1 ? 'is-offset' : ''
  if (theme.layout === 'strip') return 'is-rank'
  return ''
}

// =========================
// 滚动进入淡入（IntersectionObserver，尊重 prefers-reduced-motion）
// =========================
const rootEl = ref(null)
let observer = null

const initReveal = () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const nodes = rootEl.value ? rootEl.value.querySelectorAll('.reveal') : []

  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
    nodes.forEach(n => n.classList.add('is-visible'))
    return
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })

  nodes.forEach(n => observer.observe(n))
}

// =========================
// 页面加载
// =========================
const loadCategories = async () => {
  try {
    categories.value = await request.get('/categories') || []
  } catch (error) {
    categories.value = []
  }
}

const loadCampuses = async () => {
  try {
    const res = await request.get('/home/overview')
    campuses.value = Array.isArray(res?.campuses) ? res.campuses : []
  } catch (error) {
    campuses.value = []
  }
}

onMounted(async () => {
  // 分类/校区先就绪：专题查询里的分类ID需要模糊匹配得到
  await Promise.all([loadCategories(), loadCampuses()])

  themes.value = buildThemes()

  // 专题商品与"全部好物"并行加载
  await Promise.all([
    ...themes.value.map(loadTheme),
    loadAllGoods()
  ])

  await loadFavoriteStates()

  await nextTick()
  initReveal()

  // 支持 /discover?theme=xxx 直达某专题
  if (activeTheme.value) {
    const el = document.getElementById(`theme-${activeTheme.value}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>


<style scoped>

.discover {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* ================= 刊头 ================= */

.masthead {
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  padding: 28px;
  border-radius: var(--brand-radius-xl);
  background:
    radial-gradient(circle at 88% 14%, rgba(201, 168, 92, 0.18), transparent 46%),
    linear-gradient(135deg, #fbf3ec 0%, #fdf8f2 52%, #f7eef0 100%);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
}

.masthead__main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.masthead__kicker {
  font-size: 11.5px;
  letter-spacing: 3px;
  font-weight: 700;
  color: var(--brand-primary-hover);
  text-transform: uppercase;
}

.masthead__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.34;
  font-weight: 800;
  color: var(--brand-text);
  letter-spacing: 0.4px;
}

.masthead__title-accent {
  color: var(--brand-accent-hover);
  border-bottom: 3px solid var(--brand-accent-soft);
}

.masthead__desc {
  margin: 0;
  max-width: 620px;
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--brand-text-regular);
}

.masthead__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.masthead__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--brand-text-regular);
  border: 1px solid var(--brand-border);
}

.masthead__chip .el-icon {
  font-size: 13px;
  color: var(--brand-primary);
}

.masthead__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.masthead__disabled-wrap {
  display: inline-flex;
}

/* 刊头装饰拼贴：两张真实生成图 */
.masthead__collage {
  position: relative;
  display: none;
  min-height: 240px;
}

.masthead__collage-img {
  position: absolute;
  object-fit: cover;
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow);
  border: 4px solid var(--brand-white);
}

.masthead__collage-img--a {
  width: 46%;
  height: 74%;
  top: 6%;
  right: 34%;
  transform: rotate(-3deg);
}

.masthead__collage-img--b {
  width: 44%;
  height: 62%;
  right: 2%;
  bottom: 6%;
  transform: rotate(3deg);
}

/* ================= 全部好物 ================= */

.all-section {
  padding: 22px 24px 20px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-white);
  box-shadow: var(--brand-shadow-sm);
  border: 1px solid var(--brand-border);
}

.all-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.all-section__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-text);
}

.all-section__desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg-soft);
}

.filters__item {
  width: 168px;
}

.filters__hint {
  font-size: 12px;
  color: var(--brand-accent-hover);
  background: var(--brand-accent-soft);
  padding: 3px 12px;
  border-radius: 999px;
}

.all-section__body {
  min-height: 120px;
}

.all-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 16px;
}

.pagination {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

/* ================= 专题区块 ================= */

.theme-section {
  border-radius: var(--brand-radius-xl);
  padding: 0 0 22px;
  overflow: hidden;
  background: var(--theme-bg);
  border: 1px solid var(--theme-border);
  box-shadow: var(--brand-shadow-sm);
  transition: box-shadow 0.3s ease;
}

.theme-section.is-active {
  box-shadow: 0 0 0 2px var(--theme-accent), var(--brand-shadow);
}

/* 六个专题配色区块（奶油/浅粉/浅黄/柔和灰蓝体系内，各自比例不同） */
.theme-section--cream {
  --theme-bg: linear-gradient(180deg, #fdf7ee 0%, #ffffff 42%);
  --theme-border: #f0e4d4;
  --theme-accent: var(--brand-accent);
  --theme-panel: #fbf1e2;
  --theme-media-bg: #f4e7d3;
}

.theme-section--rose {
  --theme-bg: linear-gradient(180deg, #fbeff1 0%, #ffffff 42%);
  --theme-border: #f2dfe1;
  --theme-accent: var(--brand-primary);
  --theme-panel: #f9e9eb;
  --theme-media-bg: #f3dfe1;
}

.theme-section--aux {
  --theme-bg: linear-gradient(180deg, #eef1f4 0%, #ffffff 42%);
  --theme-border: #dfe5ea;
  --theme-accent: var(--brand-aux);
  --theme-panel: #e8edf1;
  --theme-media-bg: #dde4e9;
}

.theme-section--yellow {
  --theme-bg: linear-gradient(180deg, #fbf4dd 0%, #ffffff 42%);
  --theme-border: #f0e5c4;
  --theme-accent: var(--brand-accent-hover);
  --theme-panel: #f8f0d5;
  --theme-media-bg: #f4e8c6;
}

.theme-section--budget {
  --theme-bg: linear-gradient(180deg, #fdf6e6 0%, #fbf3f1 44%, #ffffff 100%);
  --theme-border: #efe3d2;
  --theme-accent: var(--brand-accent-hover);
  --theme-panel: #fbf1dc;
  --theme-media-bg: #f3e4cb;
}

.theme-section--eco {
  --theme-bg: linear-gradient(180deg, #f2f5f0 0%, #fdf7f1 46%, #ffffff 100%);
  --theme-border: #e3e8e0;
  --theme-accent: var(--brand-aux);
  --theme-panel: #ecefe9;
  --theme-media-bg: #e2e7de;
}

/* 头图 + 文案：杂志式左图右文 */
.theme-hero {
  display: grid;
  grid-template-columns: 1fr;
  background: var(--theme-panel);
  margin-bottom: 20px;
}

.theme-hero__media {
  position: relative;
  min-height: 232px;
  overflow: hidden;
  background: var(--theme-media-bg);
}

.theme-hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.9s ease;
}

.theme-section:hover .theme-hero__img {
  transform: scale(1.035);
}

/* 头图加载失败兜底：渐变 + 图标（不冒充真实头图） */
.theme-hero__img-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--brand-text-secondary);
  background: linear-gradient(135deg, var(--theme-media-bg), #ffffff);
}

.theme-hero__img-fallback .el-icon {
  font-size: 34px;
  opacity: 0.6;
}

/* 头图上浮光斑 */
.theme-hero__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 26% 28%, rgba(255, 255, 255, 0.55), transparent 52%);
  animation: themeGlow 7s ease-in-out infinite;
  pointer-events: none;
}

@keyframes themeGlow {
  0%, 100% { opacity: 0.55; transform: translateY(0); }
  50% { opacity: 0.95; transform: translateY(-8px); }
}

.theme-hero__no {
  position: absolute;
  left: 16px;
  bottom: 14px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #fff;
  background: rgba(74, 69, 72, 0.42);
  padding: 4px 10px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.theme-hero__body {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-hero__kicker {
  font-size: 11.5px;
  letter-spacing: 2px;
  font-weight: 700;
  color: var(--theme-accent);
  text-transform: uppercase;
}

.theme-hero__title {
  margin: 0;
  font-size: 23px;
  font-weight: 800;
  color: var(--brand-text);
  letter-spacing: 0.5px;
}

.theme-hero__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.theme-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.theme-chip {
  font-size: 11.5px;
  padding: 4px 11px;
  border-radius: 999px;
  color: #fff;
  background: var(--theme-accent);
}

.theme-chip--soft {
  color: var(--brand-text-regular);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--theme-border);
}

.theme-hero__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.theme-hero__current {
  font-size: 11.5px;
  color: var(--brand-accent-hover);
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--brand-accent-soft);
}

/* ================= 商品区通用 ================= */

.theme-goods {
  padding: 0 24px;
}

/* 编辑封面式：横向滚动卡片带 */
.layout--cover {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 6px 24px 16px;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}

.layout--cover .theme-goods__item {
  flex: 0 0 238px;
  scroll-snap-align: start;
  transition: transform 0.25s ease;
}

.layout--cover .theme-goods__item:hover {
  transform: translateY(-6px);
}

/* 拼贴式：不等宽网格 */
.layout--collage {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 编辑带式：横向滚动 + 名次编号 */
.layout--strip {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  padding: 6px 24px 16px;
  scrollbar-width: thin;
}

.layout--strip .theme-goods__item {
  position: relative;
  flex: 0 0 300px;
}

.theme-goods__rank {
  position: absolute;
  top: -10px;
  left: -10px;
  z-index: 3;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  border-radius: 50%;
  background: var(--theme-accent);
  box-shadow: var(--brand-shadow-sm);
}

/* ================= 状态块（空态 / 失败） ================= */

.state-block {
  margin: 0 24px;
  padding: 42px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  border-radius: var(--brand-radius-lg);
  background: rgba(255, 255, 255, 0.72);
  border: 1px dashed var(--theme-border, var(--brand-border));
}

.state-block__icon {
  font-size: 34px;
  color: var(--theme-accent, var(--brand-primary));
  opacity: 0.75;
}

.state-block__text {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
}

.state-block__sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

/* 骨架屏 */
.theme-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 16px;
  padding: 0 24px;
}

.theme-skeleton__item {
  height: 268px;
  border-radius: var(--brand-radius-lg);
  background: linear-gradient(100deg, #f4eee6 30%, #faf6f0 50%, #f4eee6 70%);
  background-size: 200% 100%;
  animation: skeleton 1.4s ease-in-out infinite;
}

@keyframes skeleton {
  0% { background-position: 120% 0; }
  100% { background-position: -20% 0; }
}

/* ================= 页尾 ================= */

.discover__foot {
  padding: 6px 4px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

/* ================= 滚动进入淡入 ================= */

.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: none;
}

/* ================= 响应式 ================= */

/* 桌面：多栏拼贴 + 左图右文头图 */
@media (min-width: 1200px) {
  .masthead {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: center;
    padding: 36px 40px;
  }

  .masthead__collage {
    display: block;
  }

  .theme-hero {
    grid-template-columns: minmax(0, 40%) minmax(0, 60%);
  }

  .theme-hero__media {
    min-height: 268px;
  }

  .layout--collage {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .layout--collage .is-wide {
    grid-column: span 2;
  }
}

/* 平板：两栏 */
@media (min-width: 768px) and (max-width: 1199px) {
  .layout--collage {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout--collage .is-wide {
    grid-column: span 2;
  }
}

/* 杂志跨栏式：桌面 3 栏，平板 2 栏，交错位移 */
@media (min-width: 768px) {
  .layout--magazine {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .layout--magazine .is-offset {
    margin-top: 30px;
  }
}

@media (min-width: 1200px) {
  .layout--magazine {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.layout--magazine {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px 16px;
}

/* 窄屏：单列 */
@media (max-width: 767px) {
  .masthead__title {
    font-size: 24px;
  }

  .discover {
    gap: 22px;
  }

  .theme-hero__body,
  .theme-goods,
  .theme-skeleton {
    padding-left: 16px;
    padding-right: 16px;
  }

  .layout--cover,
  .layout--strip {
    padding-left: 16px;
    padding-right: 16px;
  }

  .state-block {
    margin: 0 16px;
  }

  .all-section {
    padding: 18px 16px;
  }

  .filters__item {
    width: 100%;
  }
}

/* 减少动态偏好兜底 */
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .theme-hero__glow {
    animation: none;
  }

  .theme-section:hover .theme-hero__img,
  .layout--cover .theme-goods__item:hover {
    transform: none;
  }

  .theme-skeleton__item {
    animation: none;
  }
}

</style>
