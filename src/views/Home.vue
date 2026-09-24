<template>
  <div class="home-page">

    <!-- ============================================================
         第一视觉层 · Hero 主视觉
         5 段奶油渐变 + 搜索 + 快捷词 + 双 CTA + 右侧真实商品浮动卡片（视差）
         ============================================================ -->
    <section class="hero" @mousemove="onHeroMove" @mouseleave="resetHero">
      <div class="hero__bg"></div>
      <div class="hero__inner">
        <!-- 左：标题 / 搜索 / CTA -->
        <div class="hero__left">
          <span class="hero__badge">校园闲置 · 让好物重新流动</span>
          <h1 class="hero__title">
            <span class="hero__title-pink">校园</span><span class="hero__title-dark">二手好物</span>
          </h1>
          <p class="hero__subtitle">宿舍到宿舍的交易，便宜、近、可信。</p>

          <div class="hero__search">
            <el-icon class="hero__search-icon"><Search /></el-icon>
            <input
              v-model="keyword"
              class="hero__search-input"
              placeholder="试试 找一张宿舍用的书桌 / 九成新教材 / 300元显示器"
              @keyup.enter="goSearch(keyword)"
            />
            <button class="hero__search-btn" @click="goSearch(keyword)">搜索</button>
          </div>

          <div class="hero__chips">
            <button
              v-for="chip in quickChips"
              :key="chip"
              class="hero__chip"
              @click="goSearch(chip)"
            >{{ chip }}</button>
          </div>

          <div class="hero__cta">
            <button class="btn-primary" @click="goGoodsList">开始逛逛</button>
            <button v-if="role === 'seller'" class="btn-outline" @click="goPublish">
              <el-icon><Plus /></el-icon>发布闲置
            </button>
            <button v-else class="btn-outline" @click="$router.push('/seller-apply')">
              <el-icon><Promotion /></el-icon>成为卖家
            </button>
          </div>
        </div>

        <!-- 右：真实热门商品主图浮动卡片（无图用奶杏 fallback） -->
        <div class="hero__right" ref="heroFloatRef">
          <template v-if="hotGoods.length">
            <div
              v-for="(g, i) in heroFloatCards"
              :key="g.goodsId"
              class="float-card"
              :class="`float-card--${i}`"
              :style="floatStyle(i)"
              @click="goGoods(g.goodsId)"
            >
              <!-- 内层负责上下浮动 bob，外层 transform 留给鼠标视差，两者不冲突 -->
              <div class="float-card__inner" :style="{ animationDelay: `${i * 0.7}s` }">
                <img
                  v-if="g.imageUrl"
                  :src="g.imageUrl"
                  :alt="g.goodsName"
                  loading="lazy"
                  @load="e => e.target.classList.add('is-loaded')"
                />
                <div v-else class="float-card__fallback"><el-icon><Picture /></el-icon></div>
                <span class="float-card__price">{{ formatPrice(g.price) }}</span>
              </div>
            </div>
          </template>
          <div v-else class="hero__float-skeleton">
            <div v-for="i in 4" :key="i" class="float-card float-card--placeholder"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         第二视觉层 · 大家最近都在看（热门） 1 大 + 4 小
         ============================================================ -->
    <section class="block" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">大家最近都在看</h2>
          <p class="block__sub">校园里最被关注的好物</p>
        </div>
        <button class="link-more" @click="goSort('hot')">查看更多 ›</button>
      </div>

      <div v-if="loading.hot" class="hot-grid">
        <div class="hot-main skel"></div>
        <div class="hot-side">
          <div v-for="i in 4" :key="i" class="skel skel--card"></div>
        </div>
      </div>
      <div v-else-if="hotGoods.length" class="hot-grid">
        <!-- 大卡 -->
        <div class="hot-main" @click="goGoods(hotGoods[0].goodsId)">
          <div class="hot-main__cover">
            <img v-if="hotGoods[0].imageUrl" :src="hotGoods[0].imageUrl" :alt="hotGoods[0].goodsName" loading="lazy" />
            <div v-else class="hot-main__fallback"><el-icon><Picture /></el-icon></div>
            <span class="hot-main__tag">热度 TOP1</span>
          </div>
          <div class="hot-main__body">
            <div class="hot-main__name">{{ hotGoods[0].goodsName }}</div>
            <div class="hot-main__stats">
              <span><el-icon><View /></el-icon>{{ hotGoods[0].viewCount ?? 0 }} 浏览</span>
              <span><el-icon><Star /></el-icon>{{ hotGoods[0].favoriteCount ?? 0 }} 收藏</span>
            </div>
            <div class="hot-main__price">{{ formatPrice(hotGoods[0].price) }}</div>
          </div>
        </div>
        <!-- 右侧 4 小卡 -->
        <div class="hot-side">
          <GoodsCard
            v-for="g in hotSide"
            :key="g.goodsId"
            :goods="g"
            :category-name="categoryName(g.categoryId)"
            :editable="false"
            :favorite="favoriteIds.has(g.goodsId)"
            :fav-loading="favLoadingIds.has(g.goodsId)"
            @toggle-favorite="handleToggleFavorite"
          />
        </div>
      </div>
      <el-empty v-else description="暂无热门商品" :image-size="90">
        <button class="btn-outline btn-sm" @click="goGoodsList">去商品中心</button>
      </el-empty>
    </section>

    <!-- ============================================================
         第二视觉层 · 校园场景导航 6 卡
         ============================================================ -->
    <section class="block block--cream" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">按场景找好物</h2>
          <p class="block__sub">从校园生活场景出发，挑到合适的闲置</p>
        </div>
      </div>
      <div class="scene-grid">
        <button
          v-for="s in scenes"
          :key="s.key"
          class="scene-card"
          @click="goScene(s.key)"
        >
          <div class="scene-card__icon" :style="{ background: s.bg }">
            <el-icon><component :is="s.icon" /></el-icon>
          </div>
          <div class="scene-card__name">{{ s.name }}</div>
          <div class="scene-card__desc">{{ s.desc }}</div>
        </button>
      </div>
    </section>

    <!-- ============================================================
         第二视觉层 · 本周宝藏（treasure 排序，4 大卡）
         ============================================================ -->
    <section class="block block--apricot" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">本周宝藏</h2>
          <p class="block__sub">基于浏览量与收藏量的业务加权排序 · 受欢迎的精选</p>
        </div>
        <button class="link-more" @click="goSort('treasure')">查看更多 ›</button>
      </div>

      <div v-if="loading.treasure" class="treasure-grid">
        <div v-for="i in 4" :key="i" class="skel skel--tall"></div>
      </div>
      <div v-else-if="treasureGoods.length" class="treasure-grid">
        <div v-for="g in treasureGoods" :key="g.goodsId" class="treasure-card" @click="goGoods(g.goodsId)">
          <div class="treasure-card__cover">
            <img v-if="g.imageUrl" :src="g.imageUrl" :alt="g.goodsName" loading="lazy" />
            <div v-else class="treasure-card__fallback"><el-icon><Picture /></el-icon></div>
            <span class="treasure-card__fav">已被 {{ g.favoriteCount ?? 0 }} 人收藏</span>
          </div>
          <div class="treasure-card__body">
            <div class="treasure-card__name">{{ g.goodsName }}</div>
            <div class="treasure-card__meta">
              <span v-if="g.campus"><el-icon><Location /></el-icon>{{ g.campus }}</span>
              <span class="treasure-card__price">{{ formatPrice(g.price) }}</span>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无宝藏商品" :image-size="90" />
    </section>

    <!-- ============================================================
         第三视觉层 · 最新发布（8 卡，刚刚发布标签）
         ============================================================ -->
    <section class="block block--pink-soft" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">最新发布</h2>
          <p class="block__sub">刚刚加入校园市场的新商品</p>
        </div>
        <button class="link-more" @click="goSort('latest')">查看更多 ›</button>
      </div>

      <div v-if="loading.latest" class="goods-grid">
        <div v-for="i in 8" :key="i" class="skel skel--card"></div>
      </div>
      <div v-else-if="latestGoods.length" class="goods-grid">
        <GoodsCard
          v-for="g in latestGoods"
          :key="g.goodsId"
          :goods="g"
          :category-name="categoryName(g.categoryId)"
          :editable="false"
          :favorite="favoriteIds.has(g.goodsId)"
          :fav-loading="favLoadingIds.has(g.goodsId)"
          @toggle-favorite="handleToggleFavorite"
        />
      </div>
      <el-empty v-else description="暂无商品" :image-size="90" />
    </section>

    <!-- ============================================================
         第三视觉层 · 动态校园专区（按真实校区数据渲染）
         三种状态：概览加载中 → 骨架屏；无校区数据 → 空态引导（不伪造校区）；
         有校区 → 多校区 Tab 懒加载 / 单校区直接展示
         ============================================================ -->
    <section class="block" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">校园专区</h2>
          <p class="block__sub">同校区好物，面交更近</p>
        </div>
      </div>

      <!-- 状态一：平台概览加载中 -->
      <div v-if="loading.overview" class="goods-grid">
        <div v-for="i in 4" :key="i" class="skel skel--card"></div>
      </div>

      <!-- 状态二：数据库暂无带校区的在售商品 → 真实空状态 + 引导，不伪造校区 -->
      <div v-else-if="!campuses.length" class="campus-empty">
        <el-icon class="campus-empty__icon"><School /></el-icon>
        <div class="campus-empty__title">校园专区正在形成中</div>
        <div class="campus-empty__desc">
          卖家发布商品时填写校区后，这里会自动出现对应校区的好物
        </div>
        <button class="btn-outline btn-sm" @click="goGoodsList">先逛逛全部商品</button>
      </div>

      <!-- 状态三：有真实校区数据 -->
      <template v-else>
        <!-- 多校区才有 Tab；单校区直接展示，不做无意义 Tab -->
        <div v-if="campuses.length > 1" class="campus-tabs">
          <button
            v-for="c in campuses"
            :key="c"
            class="campus-tab"
            :class="{ 'is-active': activeCampus === c }"
            @click="switchCampus(c)"
          >{{ c }}</button>
        </div>

        <div v-if="loading.campus" class="goods-grid">
          <div v-for="i in 4" :key="i" class="skel skel--card"></div>
        </div>
        <div v-else-if="activeCampusGoods.length" class="goods-grid">
          <GoodsCard
            v-for="g in activeCampusGoods"
            :key="g.goodsId"
            :goods="g"
            :category-name="categoryName(g.categoryId)"
            :editable="false"
            :favorite="favoriteIds.has(g.goodsId)"
            :fav-loading="favLoadingIds.has(g.goodsId)"
            @toggle-favorite="handleToggleFavorite"
          />
        </div>
        <el-empty v-else :description="`「${activeCampus}」暂无在售好物`" :image-size="90">
          <button class="btn-outline btn-sm" @click="goGoodsList">去看看全部商品</button>
        </el-empty>
      </template>
    </section>

    <!-- ============================================================
         第三视觉层 · 热门分类九宫格
         ============================================================ -->
    <section class="block block--milky" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">热门分类</h2>
          <p class="block__sub">按品类快速定位</p>
        </div>
      </div>

      <div v-if="loading.category" class="cat-grid">
        <div v-for="i in 8" :key="i" class="skel skel--cat"></div>
      </div>
      <div v-else-if="categories.length" class="cat-grid">
        <button
          v-for="c in categories"
          :key="c.categoryId"
          class="cat-card"
          @click="$router.push(`/goods?categoryId=${c.categoryId}`)"
        >
          <div class="cat-card__icon"><el-icon><Files /></el-icon></div>
          <div class="cat-card__name">{{ c.categoryName }}</div>
        </button>
      </div>
      <div v-else class="campus-empty">
        <el-icon class="campus-empty__icon"><Files /></el-icon>
        <div class="campus-empty__title">分类暂时不可用</div>
        <div class="campus-empty__desc">分类数据加载失败，可直接搜索或浏览全部商品</div>
        <button class="btn-outline btn-sm" @click="goGoodsList">浏览全部商品</button>
      </div>
    </section>

    <!-- ============================================================
         第三视觉层 · 闲置流转故事条（不含金额口径）
         ============================================================ -->
    <section class="story-bar" v-reveal>
      <div class="story-bar__inner">
        <el-icon class="story-bar__icon"><MagicStick /></el-icon>
        <div class="story-bar__text">
          <span class="story-bar__num">{{ animStats.totalTradeCount }}</span> 件闲置已经找到新主人 ·
          平均 <span class="story-bar__num">{{ overview.avgTradeDays ?? 0 }}</span> 天被认领
        </div>
      </div>
    </section>

    <!-- ============================================================
         第四视觉层 · 平台实时数据 4 卡（数字递增）
         ============================================================ -->
    <section class="block" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">平台数据</h2>
          <p class="block__sub">校园闲置流转的真实进展</p>
        </div>
      </div>
      <div ref="statsRef" class="stat-grid">
        <div class="stat-card">
          <div class="stat-card__num is-num">{{ animStats.onSaleCount }}</div>
          <div class="stat-card__label">在售商品</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__num is-num">{{ animStats.totalTradeCount }}</div>
          <div class="stat-card__label">已完成交易</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__num is-num">{{ animStats.sellerCount }}</div>
          <div class="stat-card__label">校园卖家</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__num is-num">{{ animStats.totalFavoriteCount }}</div>
          <div class="stat-card__label">累计收藏</div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         第四视觉层 · 我的最近浏览（localStorage，登录后可见）
         ============================================================ -->
    <section v-if="isLogin" class="block" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">最近浏览</h2>
          <p class="block__sub">接着上次逛过的往下看</p>
        </div>
      </div>

      <div v-if="recentViews.length" class="recent-rail">
        <div
          v-for="r in recentViews"
          :key="r.goodsId"
          class="recent-card"
          @click="goGoods(r.goodsId)"
        >
          <div class="recent-card__cover">
            <img v-if="r.imageUrl" :src="r.imageUrl" :alt="r.goodsName" loading="lazy" />
            <div v-else class="recent-card__fallback"><el-icon><Picture /></el-icon></div>
          </div>
          <div class="recent-card__name">{{ r.goodsName }}</div>
          <div class="recent-card__price">{{ formatPrice(r.price) }}</div>
          <div class="recent-card__time">{{ formatRelativeTime(r.time) }}</div>
        </div>
      </div>

      <!-- 无浏览记录：轻量空状态 + 真实跳转，不留视觉空洞 -->
      <div v-else class="recent-empty">
        <el-icon class="recent-empty__icon"><View /></el-icon>
        <span class="recent-empty__text">还没有浏览记录，去逛逛热门好物</span>
        <button class="link-more" @click="goSort('hot')">去看看 ›</button>
      </div>
    </section>

    <!-- ============================================================
         第四视觉层 · 平台小贴士
         ============================================================ -->
    <section class="block block--milky" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">安全交易小贴士</h2>
          <p class="block__sub">校园面交，请牢记这几条</p>
        </div>
      </div>
      <div class="tips-grid">
        <div v-for="(t, i) in tips" :key="i" class="tip-card">
          <div class="tip-card__num">{{ i + 1 }}</div>
          <div class="tip-card__text">{{ t }}</div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         第五视觉层 · AI 校园闲置助手入口
         ============================================================ -->
    <section class="ai-entry" v-reveal @click="$router.push('/ai-assistant')">
      <div class="ai-entry__left">
        <div class="ai-entry__badge">AI 校园闲置助手</div>
        <h2 class="ai-entry__title">不知道买什么？直接告诉我你想找什么。</h2>
        <div class="ai-entry__chips">
          <span v-for="q in aiExamples" :key="q" class="ai-entry__chip">{{ q }}</span>
        </div>
        <button class="btn-primary">立即体验 ›</button>
      </div>
      <div class="ai-entry__right">
        <el-icon class="ai-entry__icon"><ChatLineSquare /></el-icon>
      </div>
    </section>

    <!-- ============================================================
         Footer
         ============================================================ -->
    <footer class="home-footer">
      <div class="home-footer__inner">
        <div class="home-footer__brand">校园二手交易平台</div>
        <div class="home-footer__desc">让闲置在校园里温柔地重新流动 · 宿舍到宿舍的可信交易</div>
        <div class="home-footer__links">
          <a @click="goGoodsList">商品中心</a>
          <a @click="$router.push('/orders')">交易中心</a>
          <a v-if="role === 'seller'" @click="$router.push('/seller')">我的店铺</a>
          <a v-if="role === 'admin'" @click="$router.push('/admin')">管理后台</a>
        </div>
        <div class="home-footer__copy">© 2026 校园二手交易平台 · 学生课程作品</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, Plus, Promotion, Picture, View, Star, Location,
  Files, MagicStick, ChatLineSquare, School,
  House, Reading, Cellphone, Coffee, Bicycle, Basketball
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'
import GoodsCard from '../components/GoodsCard.vue'
import { formatPrice, formatRelativeTime } from '../utils/format'
import { SCENES } from '../utils/scenes'

const router = useRouter()

// 登录态 / 角色（首页本身公开可见，登录后多展示收藏交互与最近浏览）
const token = localStorage.getItem('token')
const isLogin = !!token
const role = localStorage.getItem('role') || ''

// ===== 数据状态 =====
const overview = ref({})
const categories = ref([])
const hotGoods = ref([])
const treasureGoods = ref([])
const latestGoods = ref([])
const campusGoodsMap = ref({})
const activeCampus = ref('')
const favoriteIds = ref(new Set())
const favLoadingIds = ref(new Set())
const recentViews = ref([])

const loading = reactive({ overview: true, hot: true, treasure: true, latest: true, campus: false, category: true })

const keyword = ref('')

// 快捷搜索词
const quickChips = ['显示器', '九成新教材', '宿舍书桌', '自行车']

// 场景导航：定义与商品中心共享（utils/scenes.js），这里只补充首页卡片需要的图标与配色
// 点击进入 /goods?scene=<key>，由商品中心还原成"带语义的场景筛选状态"
const sceneIcons = { dorm: House, study: Reading, digital: Cellphone, life: Coffee, bike: Bicycle, sport: Basketball }
const sceneBgs = {
  dorm: 'linear-gradient(135deg,#f7e1e3,#f4d5d8)',
  study: 'linear-gradient(135deg,#f3e6d4,#ead9a0)',
  digital: 'linear-gradient(135deg,#f5e7a8,#ead9a0)',
  life: 'linear-gradient(135deg,#f4d5d8,#f7e1e3)',
  bike: 'linear-gradient(135deg,#dde3e8,#ece3dc)',
  sport: 'linear-gradient(135deg,#f3e6d4,#f5ead0)'
}
const scenes = SCENES.map(s => ({ ...s, icon: sceneIcons[s.key], bg: sceneBgs[s.key] }))
const tips = [
  '优先选择同校区的同学面交，避免异地邮寄风险。',
  '面交时约在图书馆、宿舍楼下等公共明亮场所。',
  '数码类商品当面试用确认功能正常再付款。',
  '大额交易保留聊天记录与订单凭证。',
  '不脱离平台私下转账，保障双方权益。',
  '遇到可疑商品或卖家可随时联系管理员处理。'
]
const aiExamples = [
  '帮我找 300 元以内的显示器',
  '有没有适合宿舍用的小桌子？',
  '帮我看看最近有什么数码好物',
  '我想找九成新的教材'
]

// ===== 计算属性 =====
const heroFloatCards = computed(() => hotGoods.value.slice(0, 6))
const hotSide = computed(() => hotGoods.value.slice(1, 5)) // 0 大卡，1-4 小卡
const campuses = computed(() => Array.isArray(overview.value.campuses) ? overview.value.campuses : [])
const activeCampusGoods = computed(() => campusGoodsMap.value[activeCampus.value] || [])

// 分类名映射（卡片展示分类标签用）
const categoryMap = computed(() => {
  const m = {}
  categories.value.forEach(c => { m[c.categoryId] = c.categoryName })
  return m
})
const categoryName = (id) => categoryMap.value[id] || ''

// ===== 平台数据数字递增动画 =====
const animStats = reactive({ onSaleCount: 0, totalTradeCount: 0, sellerCount: 0, totalFavoriteCount: 0 })
const statsRef = ref(null)
let statAnimDone = false
const animateStats = () => {
  if (statAnimDone) return
  statAnimDone = true
  const targets = {
    onSaleCount: Number(overview.value.onSaleCount) || 0,
    totalTradeCount: Number(overview.value.totalTradeCount) || 0,
    sellerCount: Number(overview.value.sellerCount) || 0,
    totalFavoriteCount: Number(overview.value.totalFavoriteCount) || 0
  }
  const dur = 1400
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1)
    const ease = 1 - Math.pow(1 - p, 3) // easeOutCubic
    Object.keys(targets).forEach(k => {
      animStats[k] = Math.round(targets[k] * ease)
    })
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ===== 区块进入动画（IntersectionObserver）=====
// 指令式注册：区块挂载时才加入观察。
// 之前的实现是在 onMounted 一次性 querySelectorAll，异步数据返回后才渲染的
// v-if 区块（校园专区/热门分类/最近浏览）永远拿不到 is-visible，停留在 opacity:0
// 表现为"页面大片空白"。改为 v-reveal 指令后，晚挂载的区块也能正常渐入。
let revealObserver = null
const ensureRevealObserver = () => {
  if (revealObserver) return revealObserver
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible')
        revealObserver.unobserve(e.target)
      }
    })
  }, { threshold: 0.08 })
  return revealObserver
}
const vReveal = {
  mounted(el) {
    el.classList.add('block--reveal')
    ensureRevealObserver().observe(el)
  },
  unmounted(el) {
    if (revealObserver) revealObserver.unobserve(el)
  }
}

// ===== Hero 浮动卡片视差（mousemove + rAF 节流）=====
const heroFloatRef = ref(null)
let parallaxRAF = null
let mouse = { x: 0, y: 0 }
const onHeroMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  mouse.x = (e.clientX - rect.left) / rect.width - 0.5
  mouse.y = (e.clientY - rect.top) / rect.height - 0.5
  if (parallaxRAF) return
  parallaxRAF = requestAnimationFrame(() => {
    parallaxRAF = null
  })
}
const resetHero = () => { mouse.x = 0; mouse.y = 0 }
const floatStyle = (i) => {
  // 越靠后的卡片移动幅度越大，制造层次
  const depth = 6 + i * 5
  const tx = mouse.x * depth
  const ty = mouse.y * depth
  return { transform: `translate(${tx}px, ${ty}px)` }
}

// ===== 导航 =====
const goSearch = (kw) => {
  const q = (kw || '').trim()
  router.push({ path: '/goods', query: q ? { goodsName: q } : {} })
}
const goSort = (sortBy) => router.push({ path: '/goods', query: { sortBy } })
const goGoodsList = () => router.push('/goods')
const goGoods = (id) => router.push(`/goods/${id}`)
const goPublish = () => router.push('/seller')
const goScene = (key) => router.push({ path: '/goods', query: { scene: key } })

// ===== 数据加载 =====
const loadOverview = async () => {
  try {
    const res = await request.get('/home/overview')
    overview.value = res || {}
    // 有真实校区时默认选中第一个并懒加载该校区商品
    if (campuses.value.length) {
      activeCampus.value = campuses.value[0]
      loadCampusGoods(activeCampus.value)
    }
    nextTick(observeStats)
  } catch (e) {
    overview.value = {}
  } finally {
    loading.overview = false
  }
}

let statsObserver = null
const observeStats = () => {
  if (!statsRef.value || statsObserver) return
  statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateStats()
      statsObserver.disconnect()
    }
  }, { threshold: 0.3 })
  statsObserver.observe(statsRef.value)
}

const loadCategories = async () => {
  try {
    const res = await request.get('/categories')
    categories.value = Array.isArray(res) ? res : []
  } catch (e) {
    categories.value = []
  } finally {
    loading.category = false
  }
}

const loadHot = async () => {
  try {
    const res = await request.get('/goods/page', { params: { sortBy: 'hot', pageSize: 6 } })
    hotGoods.value = res?.list || []
  } catch (e) {
    hotGoods.value = []
  } finally {
    loading.hot = false
  }
}

const loadTreasure = async () => {
  try {
    const res = await request.get('/goods/page', { params: { sortBy: 'treasure', pageSize: 4 } })
    treasureGoods.value = res?.list || []
  } catch (e) {
    treasureGoods.value = []
  } finally {
    loading.treasure = false
  }
}

const loadLatest = async () => {
  try {
    const res = await request.get('/goods/page', { params: { sortBy: 'latest', pageSize: 8 } })
    latestGoods.value = res?.list || []
  } catch (e) {
    latestGoods.value = []
  } finally {
    loading.latest = false
  }
}

// 校园专区商品：按校区懒加载并缓存。
// 首次进入只加载默认校区；Tab 切换时若该校区尚未加载则真正发起请求
const loadCampusGoods = async (campus) => {
  if (!campus) return
  loading.campus = true
  try {
    const res = await request.get('/goods/page', { params: { campus, pageSize: 4 } })
    campusGoodsMap.value = { ...campusGoodsMap.value, [campus]: res?.list || [] }
  } catch (e) {
    campusGoodsMap.value = { ...campusGoodsMap.value, [campus]: [] }
  } finally {
    loading.campus = false
    loadFavoriteStates()
  }
}

// Tab 切换：已缓存的校区直接展示，未缓存的校区按需重新加载
const switchCampus = (campus) => {
  activeCampus.value = campus
  if (!(campus in campusGoodsMap.value)) {
    loadCampusGoods(campus)
  }
}

// 收藏状态批量回显：所有已加载商品合并去重后一次性查询
const allGoodsIds = computed(() => {
  const ids = new Set()
  ;[hotGoods.value, treasureGoods.value, latestGoods.value, ...Object.values(campusGoodsMap.value)]
    .forEach(arr => (arr || []).forEach(g => g.goodsId && ids.add(g.goodsId)))
  return [...ids]
})

const loadFavoriteStates = async () => {
  if (!isLogin) { loadRecentViews(); return }
  if (!allGoodsIds.value.length) { loadRecentViews(); return }
  try {
    const res = await request.get('/favorite/checkBatch', {
      params: { goodsIds: allGoodsIds.value.join(',') }
    })
    favoriteIds.value = new Set(res?.favoriteGoodsIds || [])
  } catch (e) {
    favoriteIds.value = new Set()
  }
  loadRecentViews()
}

// 收藏 / 取消收藏：本地同步 + 实时增减 favoriteCount
const findGoods = (id) => {
  for (const arr of [hotGoods.value, treasureGoods.value, latestGoods.value, ...Object.values(campusGoodsMap.value)]) {
    const g = (arr || []).find(x => x.goodsId === id)
    if (g) return g
  }
  return null
}
const handleToggleFavorite = async (goodsId) => {
  if (!isLogin) { ElMessage.warning('请先登录后再收藏'); return }
  if (favLoadingIds.value.has(goodsId)) return
  const loadingSet = new Set(favLoadingIds.value)
  loadingSet.add(goodsId)
  favLoadingIds.value = loadingSet
  const isFav = favoriteIds.value.has(goodsId)
  try {
    const result = isFav
      ? await request.delete(`/favorite/${goodsId}`)
      : await request.post(`/favorite/${goodsId}`)
    if (result === '收藏成功' || result === '已取消收藏') {
      const next = new Set(favoriteIds.value)
      const g = findGoods(goodsId)
      if (isFav) {
        next.delete(goodsId)
        if (g) g.favoriteCount = Math.max((g.favoriteCount ?? 0) - 1, 0)
      } else {
        next.add(goodsId)
        if (g) g.favoriteCount = (g.favoriteCount ?? 0) + 1
      }
      favoriteIds.value = next
    }
  } catch (e) {
    // 错误提示由 axios 拦截器统一处理
  } finally {
    const s = new Set(favLoadingIds.value)
    s.delete(goodsId)
    favLoadingIds.value = s
  }
}

// 最近浏览：localStorage 读取（GoodsDetail 进入详情页时写入）
const loadRecentViews = () => {
  try {
    const raw = localStorage.getItem('campus_recent_views')
    const arr = raw ? JSON.parse(raw) : []
    recentViews.value = Array.isArray(arr) ? arr.slice(0, 8) : []
  } catch (e) {
    recentViews.value = []
  }
}

onMounted(() => {
  loadOverview()
  loadCategories()
  loadRecentViews()
  // hot/treasure/latest 加载完后统一回显收藏状态（校园专区加载完也会再调一次，幂等）
  Promise.all([loadHot(), loadTreasure(), loadLatest()]).then(loadFavoriteStates)
})

onBeforeUnmount(() => {
  if (revealObserver) revealObserver.disconnect()
  if (statsObserver) statsObserver.disconnect()
  if (parallaxRAF) cancelAnimationFrame(parallaxRAF)
})
</script>

<style scoped>
/* ============================================================
 * 首页私有奶油色系（自包含，不污染全局 --brand-*）
 * 严格遵循：奶油白→奶油粉→裸粉→奶杏→浅米杏→奶油黄
 * 灰蓝仅极少量辅助；禁止紫色 / 深粉 / 灰紫 / 棕黄 / 高饱和
 * ============================================================ */
.home-page {
  --home-bg-cream: #fbf6f0;
  --home-bg-pink-soft: #f7e1e3;
  --home-bg-apricot: #f3e6d4;
  --home-bg-milky: #f5ead0;
  --home-bg-yellow: #f5e7a8;
  --home-primary: #e8b4b8;
  --home-primary-hover: #dca0a4;
  --home-primary-soft: #f4d5d8;
  --home-accent: #d8b658;
  --home-accent-soft: #ead9a0;
  --home-aux: #8e9aa6;
  --home-aux-soft: #dde3e8;
  --home-text: #4a4548;
  --home-text-soft: #8a7f80;
  --home-border: #ece3dc;

  /* 首页内 Element Plus 主色覆盖为裸粉，避免 #d8a8ad 旧粉 */
  --el-color-primary: var(--home-primary);
  --el-color-primary-light-9: var(--home-primary-soft);

  padding: 4px 0 40px;
  color: var(--home-text);
}

/* 区块通用 */
.block {
  max-width: 1240px;
  margin: 0 auto;
  padding: 36px 4px;
}
.block--cream { background: linear-gradient(180deg, var(--home-bg-cream), #fff); border-radius: 24px; padding-left: 28px; padding-right: 28px; margin-top: 28px; }
.block--apricot { background: linear-gradient(180deg, #f7efe0, #fbf6f0); border-radius: 24px; padding-left: 28px; padding-right: 28px; margin-top: 28px; }
.block--pink-soft { background: linear-gradient(180deg, var(--home-bg-pink-soft), #fbf6f0); border-radius: 24px; padding-left: 28px; padding-right: 28px; margin-top: 28px; }
.block--milky { background: linear-gradient(180deg, var(--home-bg-milky), #fbf6f0); border-radius: 24px; padding-left: 28px; padding-right: 28px; margin-top: 28px; }

.block__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  gap: 16px;
}
.block__title { font-size: 24px; font-weight: 700; margin: 0; color: var(--home-text); }
.block__sub { margin: 6px 0 0; font-size: 13px; color: var(--home-text-soft); }

.link-more {
  border: none; background: transparent; cursor: pointer;
  color: var(--home-primary); font-size: 13px; font-weight: 600;
  white-space: nowrap;
}
.link-more:hover { color: var(--home-primary-hover); }

/* 区块进入动画 */
.block--reveal { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s ease; }
.block--reveal.is-visible { opacity: 1; transform: none; }

/* 骨架屏 */
.skel { background: linear-gradient(90deg, #f0e6df 25%, #f7eee7 37%, #f0e6df 63%); background-size: 400% 100%; animation: shimmer 1.4s infinite; border-radius: 16px; }
.skel--card { height: 280px; border-radius: 16px; }
.skel--tall { height: 360px; border-radius: 20px; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

/* ========== Hero ========== */
.hero {
  position: relative;
  border-radius: 28px;
  overflow: hidden;
  margin: 0 auto;
  max-width: 1240px;
  padding: 52px 44px;
  color: var(--home-text);
}
.hero__bg {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(135deg, #fbf6f0 0%, #f7e1e3 30%, #f3e6d4 60%, #f5ead0 80%, #f5e7a8 100%);
}
.hero__inner {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 30px; align-items: center;
}
.hero__badge {
  display: inline-block; padding: 5px 14px; border-radius: 999px;
  background: rgba(255,255,255,.7); color: var(--home-primary-hover);
  font-size: 12px; font-weight: 600; letter-spacing: .5px;
  border: 1px solid rgba(232,180,184,.35);
}
.hero__title { font-size: 44px; font-weight: 800; margin: 16px 0 8px; line-height: 1.15; letter-spacing: 1px; }
.hero__title-pink { color: var(--home-primary-hover); }
.hero__title-dark { color: var(--home-text); }
.hero__subtitle { font-size: 15px; color: var(--home-text-soft); margin: 0 0 22px; }
.hero__search {
  display: flex; align-items: center; gap: 0;
  background: #fff; border-radius: 24px; padding: 6px 6px 6px 16px;
  box-shadow: 0 10px 30px rgba(74,69,72,.08);
  border: 2px solid transparent; transition: border-color .2s ease;
}
.hero__search:focus-within { border-color: var(--home-primary); }
.hero__search-icon { color: var(--home-text-soft); font-size: 18px; }
.hero__search-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14px; padding: 8px 10px; color: var(--home-text);
}
.hero__search-btn {
  border: none; cursor: pointer; border-radius: 18px;
  padding: 10px 22px; font-size: 14px; font-weight: 600; color: #fff;
  background: linear-gradient(135deg, var(--home-primary), var(--home-primary-hover));
}
.hero__search-btn:hover { filter: brightness(1.05); }
.hero__chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.hero__chip {
  border: 1px solid var(--home-border); background: rgba(255,255,255,.6);
  color: var(--home-text-soft); border-radius: 999px; padding: 5px 13px;
  font-size: 12.5px; cursor: pointer; transition: all .2s ease;
}
.hero__chip:hover { color: var(--home-primary-hover); border-color: var(--home-primary); background: #fff; }
.hero__cta { display: flex; gap: 12px; margin-top: 26px; flex-wrap: wrap; }

.btn-primary {
  border: none; cursor: pointer; border-radius: 14px; padding: 12px 26px;
  font-size: 14.5px; font-weight: 600; color: #fff;
  background: linear-gradient(135deg, var(--home-primary), var(--home-primary-hover));
  box-shadow: 0 8px 20px rgba(220,160,164,.32); transition: transform .2s ease, box-shadow .2s ease;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(220,160,164,.4); }
.btn-outline {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  border: 1.5px solid var(--home-primary); background: rgba(255,255,255,.7);
  color: var(--home-primary-hover); border-radius: 14px; padding: 11px 22px;
  font-size: 14.5px; font-weight: 600; transition: all .2s ease;
}
.btn-outline:hover { background: #fff; transform: translateY(-2px); }
.btn-sm { padding: 7px 16px; font-size: 13px; border-radius: 12px; }

/* 浮动卡片 */
.hero__right { position: relative; height: 340px; }
.float-card {
  position: absolute; border-radius: 18px; overflow: hidden; cursor: pointer;
  background: #fff; box-shadow: 0 14px 36px rgba(74,69,72,.14);
  border: 4px solid #fff; transition: transform .25s ease;
}
.float-card__inner {
  width: 100%; height: 100%; position: relative;
  animation: floatBob 6s ease-in-out infinite;
}
@keyframes floatBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.float-card img { width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0; transition: opacity .4s ease; }
.float-card img.is-loaded { opacity: 1; }
.float-card__fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #f3e6d4, #ead9a0); color: var(--home-accent); font-size: 28px;
}
.float-card__price {
  position: absolute; left: 8px; bottom: 8px; background: rgba(255,255,255,.92);
  border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 700; color: var(--home-accent);
}
.float-card--0 { width: 150px; height: 150px; top: 10px; right: 40px; z-index: 3; }
.float-card--1 { width: 110px; height: 110px; top: 150px; right: 180px; z-index: 2; }
.float-card--2 { width: 120px; height: 120px; top: 200px; right: 30px; z-index: 4; }
.float-card--3 { width: 96px; height: 96px; top: 30px; right: 200px; z-index: 2; }
.float-card--4 { width: 100px; height: 100px; top: 230px; right: 200px; z-index: 3; }
.float-card--5 { width: 84px; height: 84px; top: 120px; right: 250px; z-index: 1; }
.float-card--placeholder { background: linear-gradient(135deg,#f0e6df,#f7eee7); }
.hero__float-skeleton .float-card { animation: floatBob 4s ease-in-out infinite; }

/* ========== 大家最近都在看（1+4） ========== */
.hot-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; }
.hot-main.skel { height: 360px; }
.hot-main {
  border-radius: 20px; overflow: hidden; background: #fff; cursor: pointer;
  box-shadow: var(--brand-shadow-sm, 0 8px 24px rgba(74,69,72,.08));
  display: flex; flex-direction: column; transition: transform .25s ease, box-shadow .25s ease;
}
.hot-main:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(74,69,72,.14); }
.hot-main__cover { position: relative; height: 230px; background: linear-gradient(135deg,#f7e1e3,#f4d5d8); }
.hot-main__cover img { width: 100%; height: 100%; object-fit: cover; }
.hot-main__fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--home-primary); font-size: 40px; }
.hot-main__tag { position: absolute; top: 12px; left: 12px; background: var(--home-primary); color: #fff; border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
.hot-main__body { padding: 16px 18px; }
.hot-main__name { font-size: 17px; font-weight: 600; color: var(--home-text); }
.hot-main__stats { display: flex; gap: 16px; margin: 8px 0; font-size: 13px; color: var(--home-text-soft); }
.hot-main__stats span { display: inline-flex; align-items: center; gap: 4px; }
.hot-main__price { font-size: 22px; font-weight: 700; color: var(--home-accent); }
.hot-side { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-content: start; }

/* ========== 本周宝藏 ========== */
.treasure-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.treasure-card {
  border-radius: 20px; overflow: hidden; background: #fff; cursor: pointer;
  box-shadow: 0 8px 24px rgba(74,69,72,.08); transition: transform .25s ease, box-shadow .25s ease;
}
.treasure-card:hover { transform: translateY(-6px); box-shadow: 0 18px 44px rgba(74,69,72,.16); }
.treasure-card__cover { position: relative; height: 220px; background: linear-gradient(135deg,#f3e6d4,#ead9a0); }
.treasure-card__cover img { width: 100%; height: 100%; object-fit: cover; }
.treasure-card__fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--home-accent); font-size: 40px; }
.treasure-card__fav { position: absolute; bottom: 10px; left: 10px; background: rgba(255,255,255,.92); border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 600; color: var(--home-accent); }
.treasure-card__body { padding: 14px 16px; }
.treasure-card__name { font-size: 15px; font-weight: 600; color: var(--home-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 42px; }
.treasure-card__meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; font-size: 12.5px; color: var(--home-text-soft); }
.treasure-card__meta span { display: inline-flex; align-items: center; gap: 4px; }
.treasure-card__price { font-size: 18px; font-weight: 700; color: var(--home-accent); }

/* ========== 商品网格（最新/校园专区共用） ========== */
.goods-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }

/* ========== 场景导航 ========== */
.scene-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
.scene-card {
  border: none; cursor: pointer; background: #fff; border-radius: 18px; padding: 18px 12px;
  box-shadow: 0 4px 16px rgba(74,69,72,.05); transition: transform .25s ease, box-shadow .25s ease;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.scene-card:hover { transform: translateY(-6px); box-shadow: 0 14px 32px rgba(74,69,72,.12); }
.scene-card__icon {
  width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
  font-size: 26px; color: var(--home-text); transition: transform .4s ease;
}
.scene-card:hover .scene-card__icon { transform: rotate(-8deg) scale(1.06); }
.scene-card__name { font-size: 14px; font-weight: 600; color: var(--home-text); }
.scene-card__desc { font-size: 11.5px; color: var(--home-text-soft); }

/* ========== 校园专区 tab / 空态 ========== */
.campus-tabs { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.campus-tab {
  border: 1px solid var(--home-border); background: #fff; cursor: pointer;
  border-radius: 999px; padding: 8px 20px; font-size: 13.5px; font-weight: 600;
  color: var(--home-text-soft); transition: all .2s ease;
}
.campus-tab:hover { color: var(--home-primary-hover); border-color: var(--home-primary); }
.campus-tab.is-active { background: var(--home-primary); color: #fff; border-color: var(--home-primary); }

/* 区块通用空态（校园专区 / 热门分类 / 最近浏览共用视觉） */
.campus-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 44px 20px; border-radius: 20px;
  background: linear-gradient(135deg, var(--home-bg-cream), var(--home-bg-pink-soft));
  border: 1px dashed var(--home-primary-soft);
  text-align: center;
}
.campus-empty__icon { font-size: 40px; color: var(--home-primary); opacity: .75; }
.campus-empty__title { font-size: 16px; font-weight: 700; color: var(--home-text); }
.campus-empty__desc { font-size: 13px; color: var(--home-text-soft); max-width: 420px; line-height: 1.7; }

.skel--cat { height: 96px; border-radius: 16px; }

.recent-empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 34px 20px; border-radius: 18px;
  background: linear-gradient(135deg, var(--home-bg-cream), var(--home-bg-pink-soft));
  border: 1px dashed var(--home-primary-soft);
}
.recent-empty__icon { font-size: 22px; color: var(--home-primary); }
.recent-empty__text { font-size: 14px; color: var(--home-text-soft); }

/* ========== 热门分类 ========== */
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 14px; }
.cat-card {
  border: none; cursor: pointer; background: #fff; border-radius: 16px; padding: 18px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  box-shadow: 0 4px 14px rgba(74,69,72,.05); transition: transform .25s ease, box-shadow .25s ease;
}
.cat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(74,69,72,.12); }
.cat-card__icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--home-primary-soft), #fff); display: flex; align-items: center; justify-content: center; color: var(--home-primary-hover); font-size: 22px; }
.cat-card__name { font-size: 13.5px; font-weight: 600; color: var(--home-text); }

/* ========== 闲置流转故事条 ========== */
.story-bar {
  max-width: 1240px; margin: 8px auto; border-radius: 20px; padding: 22px 28px;
  background: linear-gradient(135deg, var(--home-bg-pink-soft), var(--home-bg-apricot));
  box-shadow: 0 8px 24px rgba(74,69,72,.06);
}
.story-bar__inner { display: flex; align-items: center; gap: 14px; }
.story-bar__icon { font-size: 26px; color: var(--home-primary-hover); }
.story-bar__text { font-size: 15px; color: var(--home-text); }
.story-bar__num { font-size: 22px; font-weight: 800; color: var(--home-primary-hover); font-variant-numeric: tabular-nums; }

/* ========== 平台数据 4 卡 ========== */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card {
  background: #fff; border-radius: 18px; padding: 26px 18px; text-align: center;
  box-shadow: 0 4px 16px rgba(74,69,72,.05); transition: transform .25s ease;
}
.stat-card:hover { transform: translateY(-4px); }
.stat-card__num { font-size: 36px; font-weight: 800; color: var(--home-primary-hover); line-height: 1; }
.stat-card__label { margin-top: 10px; font-size: 13px; color: var(--home-text-soft); }

/* ========== 最近浏览 ========== */
.recent-rail { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; }
.recent-card {
  flex: 0 0 150px; cursor: pointer; background: #fff; border-radius: 14px; overflow: hidden;
  box-shadow: 0 4px 14px rgba(74,69,72,.05); transition: transform .2s ease;
}
.recent-card:hover { transform: translateY(-3px); }
.recent-card__cover { height: 110px; background: linear-gradient(135deg,#f3e6d4,#ead9a0); }
.recent-card__cover img { width: 100%; height: 100%; object-fit: cover; }
.recent-card__fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--home-accent); font-size: 24px; }
.recent-card__name { font-size: 13px; font-weight: 600; padding: 8px 10px 0; color: var(--home-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent-card__price { padding: 0 10px; font-size: 14px; font-weight: 700; color: var(--home-accent); }
.recent-card__time { padding: 2px 10px 10px; font-size: 11px; color: var(--home-text-soft); }

/* ========== 小贴士 ========== */
.tips-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.tip-card {
  display: flex; gap: 12px; align-items: flex-start; background: #fff; border-radius: 14px; padding: 16px 18px;
  box-shadow: 0 4px 14px rgba(74,69,72,.05);
}
.tip-card__num { flex: 0 0 28px; width: 28px; height: 28px; border-radius: 50%; background: var(--home-primary-soft); color: var(--home-primary-hover); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.tip-card__text { font-size: 13.5px; line-height: 1.6; color: var(--home-text); }

/* ========== AI 入口 ========== */
.ai-entry {
  max-width: 1240px; margin: 32px auto; border-radius: 24px; padding: 36px 44px;
  background: linear-gradient(135deg, var(--home-bg-pink-soft), var(--home-bg-apricot));
  display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: center; cursor: pointer;
  box-shadow: 0 10px 30px rgba(74,69,72,.08); transition: transform .25s ease, box-shadow .25s ease;
}
.ai-entry:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(74,69,72,.14); }
.ai-entry__badge { display: inline-block; background: rgba(255,255,255,.7); color: var(--home-primary-hover); border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 600; border: 1px solid rgba(232,180,184,.35); }
.ai-entry__title { font-size: 26px; font-weight: 800; margin: 14px 0 16px; color: var(--home-text); line-height: 1.3; }
.ai-entry__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.ai-entry__chip { background: rgba(255,255,255,.7); border-radius: 999px; padding: 6px 14px; font-size: 12.5px; color: var(--home-text); border: 1px solid var(--home-border); }
.ai-entry__right { display: flex; justify-content: center; }
.ai-entry__icon { font-size: 120px; color: var(--home-primary); opacity: .6; }

/* ========== Footer ========== */
.home-footer { max-width: 1240px; margin: 32px auto 0; padding: 30px 28px; border-radius: 20px; background: linear-gradient(180deg, #fbf6f0, #f5ede3); }
.home-footer__brand { font-size: 16px; font-weight: 700; color: var(--home-text); }
.home-footer__desc { margin: 6px 0 14px; font-size: 13px; color: var(--home-text-soft); }
.home-footer__links { display: flex; gap: 18px; flex-wrap: wrap; }
.home-footer__links a { color: var(--home-primary-hover); font-size: 13px; cursor: pointer; }
.home-footer__links a:hover { text-decoration: underline; }
.home-footer__copy { margin-top: 16px; font-size: 12px; color: var(--home-text-soft); }

/* 响应式 */
@media (max-width: 1100px) {
  .hero__inner { grid-template-columns: 1fr; }
  .hero__right { height: 260px; display: none; }
  .hot-grid { grid-template-columns: 1fr; }
  .treasure-grid, .goods-grid { grid-template-columns: repeat(2, 1fr); }
  .scene-grid { grid-template-columns: repeat(3, 1fr); }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .tips-grid { grid-template-columns: 1fr 1fr; }
  .ai-entry { grid-template-columns: 1fr; }
  .ai-entry__right { display: none; }
}
@media (max-width: 640px) {
  .hero { padding: 34px 22px; }
  .hero__title { font-size: 32px; }
  .treasure-grid, .goods-grid, .hot-side { grid-template-columns: 1fr 1fr; }
  .scene-grid, .stat-grid, .tips-grid { grid-template-columns: 1fr 1fr; }
  .block { padding: 24px 4px; }
}
</style>
