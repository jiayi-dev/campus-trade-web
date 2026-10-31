<template>
  <div class="home-page">

    <!-- ============================================================
         第一视觉层 · 主视觉轮播（左文案 + 右胶带相框实拍图，非对称布局）
         自动播放 / 悬停暂停 / 触摸滑动 / 键盘左右 / 胶囊进度指示器
         ============================================================ -->
    <section
      class="hero-carousel"
      tabindex="0"
      aria-roledescription="carousel"
      @mouseenter="stopCarousel"
      @mouseleave="startCarousel"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
      @keydown.left.prevent="prevSlide"
      @keydown.right.prevent="nextSlide"
    >
      <article
        v-for="(s, i) in slides"
        :key="s.key"
        class="hero-carousel__slide"
        :class="[`hero-carousel__slide--${s.theme}`, { 'is-active': i === carouselIndex }]"
        :aria-hidden="i !== carouselIndex"
      >
        <!-- 左：文案 + CTA -->
        <div class="hero-carousel__content">
          <span class="hero-carousel__badge">{{ s.badge }}</span>
          <h2 class="hero-carousel__title">{{ s.title }}</h2>
          <p class="hero-carousel__desc">{{ s.desc }}</p>
          <button class="hero-carousel__cta" @click="router.push(s.to)">
            {{ s.cta }}
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>

        <!-- 右：胶带相框实拍图 + CSS 光斑（图加载失败时隐藏图卡，保留渐变装饰） -->
        <div class="hero-carousel__visual" aria-hidden="true">
          <span class="hero-carousel__blob hero-carousel__blob--1"></span>
          <span class="hero-carousel__blob hero-carousel__blob--2"></span>
          <div v-if="!s.imgError" class="hero-carousel__photo">
            <span class="hero-carousel__tape"></span>
            <img :src="s.img" :alt="s.title" loading="lazy" @error="s.imgError = true" />
          </div>
        </div>
      </article>

      <button class="hero-carousel__arrow hero-carousel__arrow--prev" aria-label="上一张" @click="prevSlide">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <button class="hero-carousel__arrow hero-carousel__arrow--next" aria-label="下一张" @click="nextSlide">
        <el-icon><ArrowRight /></el-icon>
      </button>

      <div class="hero-carousel__dots">
        <button
          v-for="(s, i) in slides"
          :key="s.key"
          class="hero-carousel__dot"
          :class="{ 'is-active': i === carouselIndex }"
          :aria-label="`切换到第 ${i + 1} 张`"
          @click="goSlide(i)"
        >
          <span
            v-if="i === carouselIndex"
            :key="carouselIndex"
            class="hero-carousel__dot-progress"
            :style="{ animationDuration: `${slideInterval}ms` }"
          ></span>
        </button>
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
            <img v-if="resolveGoodsImage(hotGoods[0].imageUrl)" :src="resolveGoodsImage(hotGoods[0].imageUrl)" :alt="hotGoods[0].goodsName" loading="lazy" @error="hotGoods[0].imageUrl = ''" />
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
            <img v-if="resolveGoodsImage(g.imageUrl)" :src="resolveGoodsImage(g.imageUrl)" :alt="g.goodsName" loading="lazy" @error="g.imageUrl = ''" />
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
         第四视觉层 · 平台实时数据（ECharts 真实统计 + 数字递增）
         数据来源：GET /api/home/overview（数据库实时聚合）
         ============================================================ -->
    <section class="block block--apricot" v-reveal>
      <div class="block__head">
        <div>
          <h2 class="block__title">平台数据</h2>
          <p class="block__sub">数据库实时聚合 · 每次进入首页自动刷新</p>
        </div>
        <span class="data-live"><i></i>REAL DATA</span>
      </div>

      <div ref="statsRef" class="data-panel">
        <div class="data-panel__chart">
          <div v-if="loading.overview" class="data-chart__skeleton skel"></div>
          <div v-else-if="!hasOverviewData" class="data-chart__empty">
            暂无统计数据
          </div>
          <div v-show="!loading.overview && hasOverviewData" ref="overviewChartRef" class="overview-chart"></div>
        </div>

        <div class="data-panel__side">
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
      </div>

      <div class="data-scope">
        统计口径：全平台数据库当前值（在售 = 状态在售商品数；已完成交易 = 订单状态为「已完成」的数量；
        校园卖家 = 卖家角色账号数；累计收藏 = 收藏关系总数）。平均认领
        {{ overview.avgTradeDays ?? 0 }} 天，覆盖 {{ campuses.length }} 个校区。
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
            <img v-if="resolveGoodsImage(r.imageUrl)" :src="resolveGoodsImage(r.imageUrl)" :alt="r.goodsName" loading="lazy" @error="r.imageUrl = ''" />
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

    <!-- 首次进入的轻量彩带（4.5s 自动结束，可手动关闭，不拦截页面点击） -->
    <transition name="confetti-fade">
      <div v-if="confettiVisible" class="confetti-layer" aria-hidden="true">
        <span
          v-for="c in confetti"
          :key="c.i"
          class="confetti"
          :style="c.style"
        ></span>
        <button class="confetti__close" @click="dismissConfetti">关闭特效</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Picture, View, Star, Location,
  Files, MagicStick, ChatLineSquare, School,
  House, Reading, Cellphone, Coffee, Bicycle, Basketball,
  ArrowLeft, ArrowRight
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'
import GoodsCard from '../components/GoodsCard.vue'
import { formatPrice, formatRelativeTime } from '../utils/format'
import { resolveGoodsImage } from '../utils/image'
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

// ===== 主视觉轮播 =====
// 左文案 + 右胶带相框实拍图的非对称布局；实拍图加载失败时隐藏图卡，
// 仅保留渐变背景与 CSS 光斑装饰，不留空白大块
const slides = reactive([
  {
    key: 'market',
    theme: 'coral',
    badge: '校园市场',
    title: '发现校园好物',
    desc: '宿舍到宿舍的交易，便宜、近、可信，学长学姐的好物正在低价流转。',
    cta: '去逛逛',
    to: '/goods',
    img: '/api/files/goods/seed-phone.jpg',
    imgError: false
  },
  {
    key: 'publish',
    theme: 'violet',
    badge: '发布闲置',
    title: '让带不走的好物，遇见下一位主人',
    desc: '拍照、定价、写句话，三分钟上架，闲置也能陪你体面告别。',
    cta: '发布闲置',
    to: '/goods/publish',
    img: '/api/files/goods/seed-camera.jpg',
    imgError: false
  },
  {
    key: 'wanted',
    theme: 'teal',
    badge: '求购广场',
    title: '同学们正在找这些，你有货吗',
    desc: '教材、台灯、显示器……顺手翻翻求购清单，闲置秒变零花钱。',
    cta: '去看看',
    to: '/wanted',
    img: '/api/files/goods/seed-notes.jpg',
    imgError: false
  },
  {
    key: 'discover',
    theme: 'amber',
    badge: '编辑精选',
    title: '专题集市，按场景逛好物',
    desc: '宿舍焕新、开学季、数码升级，编辑帮你把同场景好物聚在一起。',
    cta: '逛专题',
    to: '/discover',
    img: '/api/files/goods/seed-storage.jpg',
    imgError: false
  }
])

const slideInterval = 5000
const carouselIndex = ref(0)
let carouselTimer = null

// 尊重系统「减少动态效果」偏好：不自动播放，仍可手动切换
const prefersReducedMotion = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

const startCarousel = () => {
  if (prefersReducedMotion || carouselTimer) return
  carouselTimer = setInterval(() => {
    carouselIndex.value = (carouselIndex.value + 1) % slides.length
  }, slideInterval)
}
const stopCarousel = () => {
  if (carouselTimer) {
    clearInterval(carouselTimer)
    carouselTimer = null
  }
}
const nextSlide = () => {
  carouselIndex.value = (carouselIndex.value + 1) % slides.length
  stopCarousel()
  startCarousel()
}
const prevSlide = () => {
  carouselIndex.value = (carouselIndex.value - 1 + slides.length) % slides.length
  stopCarousel()
  startCarousel()
}
const goSlide = (i) => {
  carouselIndex.value = i
  stopCarousel()
  startCarousel()
}

// 触摸滑动切换：横向位移 > 40px 且明显大于纵向位移时触发，避免误拦滚动
let touchStartX = 0
let touchStartY = 0
const onTouchStart = (e) => {
  touchStartX = e.changedTouches[0].clientX
  touchStartY = e.changedTouches[0].clientY
}
const onTouchEnd = (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) nextSlide()
    else prevSlide()
  }
}

// ===== 首次进入彩带（会话级只播放一次，可关闭）=====
const confettiVisible = ref(false)
const confettiColors = ['#e8b4b8', '#f4d5d8', '#d8b658', '#ead9a0', '#dde3e8']
const confetti = Array.from({ length: 22 }, (_, i) => ({
  i,
  style: {
    left: `${(i * 17 + 4) % 96}%`,
    width: `${7 + (i % 3) * 3}px`,
    height: `${10 + (i % 4) * 3}px`,
    background: confettiColors[i % confettiColors.length],
    animationDelay: `${(i % 11) * 0.16}s`,
    animationDuration: `${2.8 + (i % 5) * 0.35}s`,
    transform: `rotate(${(i * 37) % 360}deg)`
  }
}))
let confettiTimer = null
const dismissConfetti = () => {
  confettiVisible.value = false
  if (confettiTimer) {
    clearTimeout(confettiTimer)
    confettiTimer = null
  }
}

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
const hotSide = computed(() => hotGoods.value.slice(1, 5)) // 0 大卡，1-4 小卡
const campuses = computed(() => Array.isArray(overview.value.campuses) ? overview.value.campuses : [])
const activeCampusGoods = computed(() => campusGoodsMap.value[activeCampus.value] || [])

// 平台概览是否存在可绘制的真实数据（全 0 时按空状态处理，不画假图）
const hasOverviewData = computed(() => {
  const o = overview.value || {}
  return ['onSaleCount', 'totalTradeCount', 'sellerCount', 'totalFavoriteCount']
    .some(k => Number(o[k]) > 0)
})

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
  // 用户偏好减少动态效果时直接呈现最终值，不做数字递增
  if (prefersReducedMotion) {
    Object.assign(animStats, targets)
    return
  }
  // 进度统一用 performance.now() 计算，避免 rAF 时间戳与 performance.now()
  // 不同源（无头浏览器/虚拟时钟）时出现负进度
  const start = performance.now()
  const tick = () => {
    const p = Math.min(Math.max((performance.now() - start) / dur, 0), 1)
    const ease = 1 - Math.pow(1 - p, 3) // easeOutCubic
    Object.keys(targets).forEach(k => {
      animStats[k] = Math.round(targets[k] * ease)
    })
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ===== ECharts：平台真实统计 =====
// 数据全部来自 /home/overview，不生成随机/演示数值
const overviewChartRef = ref(null)
let overviewChart = null
const renderOverviewChart = async () => {
  if (!hasOverviewData.value || !overviewChartRef.value) return
  // 按需加载 ECharts：首屏不必为图表付出整包体积（与 Dashboard 共享 chunk）
  let echarts
  try {
    echarts = await import('echarts')
  } catch (e) {
    // 图表库加载失败时静默降级，不影响首页其它区块
    return
  }
  if (!overviewChartRef.value) return
  if (!overviewChart) overviewChart = echarts.init(overviewChartRef.value)

  const o = overview.value || {}
  const rows = [
    { name: '在售商品', value: Number(o.onSaleCount) || 0, color: '#e8b4b8' },
    { name: '已完成交易', value: Number(o.totalTradeCount) || 0, color: '#d8b658' },
    { name: '校园卖家', value: Number(o.sellerCount) || 0, color: '#c7b3ab' },
    { name: '累计收藏', value: Number(o.totalFavoriteCount) || 0, color: '#a8b6c0' }
  ]

  overviewChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,.96)',
      borderColor: '#ece3dc',
      textStyle: { color: '#4a4548' }
    },
    grid: { left: 6, right: 42, top: 8, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2ebe4' } },
      axisLabel: { color: '#a89e9f', fontSize: 11 }
    },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#4a4548', fontWeight: 600, fontSize: 12 }
    },
    series: [{
      type: 'bar',
      barWidth: 16,
      data: rows.map(r => ({
        value: r.value,
        itemStyle: { color: r.color, borderRadius: [0, 8, 8, 0] }
      })),
      label: {
        show: true,
        position: 'right',
        color: '#8a7f80',
        fontSize: 12,
        fontWeight: 600
      },
      animationDuration: prefersReducedMotion ? 0 : 700
    }]
  }, true)
}

const handleChartResize = () => {
  if (overviewChart) overviewChart.resize()
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

// ===== 导航 =====
const goSort = (sortBy) => router.push({ path: '/goods', query: { sortBy } })
const goGoodsList = () => router.push('/goods')
const goGoods = (id) => router.push(`/goods/${id}`)
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
    nextTick(() => {
      observeStats()
      renderOverviewChart()
    })
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

  // 轮播自动播放（prefers-reduced-motion 时 startCarousel 内部会直接跳过）
  startCarousel()
  window.addEventListener('resize', handleChartResize)

  // 首次进入首页的轻量彩带：会话级仅一次，动画结束自动移除
  let played = false
  try { played = sessionStorage.getItem('campus_home_confetti') === '1' } catch (e) { played = false }
  if (!played && !prefersReducedMotion) {
    try { sessionStorage.setItem('campus_home_confetti', '1') } catch (e) { /* 隐私模式忽略 */ }
    setTimeout(() => { confettiVisible.value = true }, 600)
    confettiTimer = setTimeout(dismissConfetti, 5200)
  }
})

onBeforeUnmount(() => {
  if (revealObserver) revealObserver.disconnect()
  if (statsObserver) statsObserver.disconnect()
  stopCarousel()
  if (confettiTimer) clearTimeout(confettiTimer)
  window.removeEventListener('resize', handleChartResize)
  if (overviewChart) {
    overviewChart.dispose()
    overviewChart = null
  }
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

/* ========== 通用按钮（轮播下方区块复用） ========== */
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

/* ========== 第一屏主视觉轮播 ========== */
.hero-carousel {
  position: relative;
  max-width: 1220px;
  height: clamp(340px, 36vw, 430px);
  margin: 16px auto 0;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(74,69,72,.16);
  outline: none;
}
.hero-carousel:focus-visible { box-shadow: 0 18px 48px rgba(74,69,72,.16), 0 0 0 3px rgba(232,180,184,.55); }

.hero-carousel__slide {
  position: absolute; inset: 0;
  display: grid; grid-template-columns: 1.05fr 0.95fr; align-items: center;
  gap: 24px; padding: 40px 96px 40px 56px;
  opacity: 0; transform: translateX(28px); pointer-events: none;
  transition: opacity .55s ease, transform .55s ease;
}
.hero-carousel__slide.is-active { opacity: 1; transform: none; pointer-events: auto; }
.hero-carousel__slide--coral { background: var(--grad-coral-warm); }
.hero-carousel__slide--violet { background: var(--grad-violet-pink); }
.hero-carousel__slide--teal { background: var(--grad-teal-mint); }
.hero-carousel__slide--amber { background: var(--grad-amber-honey); }

/* 左：文案（渐变底上用白色系文字） */
.hero-carousel__badge {
  display: inline-block; padding: 5px 14px; border-radius: 999px;
  background: rgba(255,255,255,.22); color: #fff;
  font-size: 12.5px; font-weight: 600; letter-spacing: .06em;
  border: 1px solid rgba(255,255,255,.38);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
}
.hero-carousel__title {
  margin: 16px 0 10px; font-size: 38px; font-weight: 800; line-height: 1.2;
  color: #fff; letter-spacing: .02em; text-shadow: 0 2px 14px rgba(0,0,0,.14);
}
.hero-carousel__desc {
  margin: 0 0 26px; font-size: 15px; line-height: 1.75;
  color: rgba(255,255,255,.94); max-width: 430px;
}
.hero-carousel__cta {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; cursor: pointer; border-radius: 999px; padding: 12px 26px;
  font-size: 14.5px; font-weight: 700; color: var(--home-text);
  background: rgba(255,255,255,.96);
  box-shadow: 0 10px 24px rgba(0,0,0,.16);
  transition: transform .2s ease, box-shadow .2s ease;
}
.hero-carousel__cta:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(0,0,0,.2); }

/* 右：CSS 光斑 + 胶带相框实拍图卡 */
.hero-carousel__visual {
  position: relative; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.hero-carousel__blob { position: absolute; border-radius: 50%; }
.hero-carousel__blob--1 {
  width: 250px; height: 250px; right: 4%; top: 6%;
  background: radial-gradient(circle at 35% 35%, rgba(255,255,255,.5), rgba(255,255,255,0) 68%);
  animation: heroBlobFloat 9s ease-in-out infinite;
}
.hero-carousel__blob--2 {
  width: 160px; height: 160px; left: 0; bottom: 8%;
  background: radial-gradient(circle at 40% 40%, rgba(255,255,255,.34), rgba(255,255,255,0) 70%);
  animation: heroBlobFloat 12s ease-in-out infinite reverse;
}
@keyframes heroBlobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(10px, -14px) scale(1.05); }
}
.hero-carousel__photo {
  position: relative; z-index: 1;
  width: min(330px, 90%);
  background: #fff; border-radius: 10px; padding: 12px 12px 34px;
  box-shadow: 0 20px 44px rgba(0,0,0,.24);
  transform: rotate(-3deg);
  transition: transform .35s ease;
}
.hero-carousel__slide.is-active .hero-carousel__photo:hover { transform: rotate(-1deg) scale(1.02); }
.hero-carousel__photo img {
  display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 6px;
}
.hero-carousel__tape {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%) rotate(-2deg);
  width: 96px; height: 26px; border-radius: 3px;
  background: rgba(255,247,224,.85);
  box-shadow: 0 2px 6px rgba(0,0,0,.12);
  border-left: 1px dashed rgba(0,0,0,.08); border-right: 1px dashed rgba(0,0,0,.08);
}

/* 毛玻璃圆形箭头 */
.hero-carousel__arrow {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 3;
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.42); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.22); color: #fff; font-size: 16px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: background .2s ease, transform .2s ease;
}
.hero-carousel__arrow:hover { background: rgba(255,255,255,.38); transform: translateY(-50%) scale(1.06); }
.hero-carousel__arrow--prev { left: 20px; }
.hero-carousel__arrow--next { right: 20px; }

/* 胶囊指示器 + 当前项进度条 */
.hero-carousel__dots {
  position: absolute; left: 56px; bottom: 24px; z-index: 3;
  display: flex; align-items: center; gap: 8px;
}
.hero-carousel__dot {
  position: relative; width: 28px; height: 6px; padding: 0; border: none; cursor: pointer;
  border-radius: 999px; background: rgba(255,255,255,.35); overflow: hidden;
  transition: width .25s ease, background .25s ease;
}
.hero-carousel__dot.is-active { width: 52px; background: rgba(255,255,255,.26); }
.hero-carousel__dot-progress {
  position: absolute; inset: 0; transform-origin: left center;
  background: rgba(255,255,255,.96); border-radius: 999px;
  animation: heroDotProgress linear forwards;
}
@keyframes heroDotProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* ========== 平台数据（ECharts + 统计卡） ========== */
.data-live {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; letter-spacing: .08em;
  color: var(--home-text-soft); background: #fff;
  border: 1px solid var(--home-border); border-radius: 999px; padding: 5px 11px;
}
.data-live i {
  width: 7px; height: 7px; border-radius: 50%; background: #8bbd9a;
  box-shadow: 0 0 0 3px rgba(139,189,154,.18);
  animation: livePulse 2s ease-out infinite;
}
@keyframes livePulse {
  0% { box-shadow: 0 0 0 0 rgba(139,189,154,.35); }
  70% { box-shadow: 0 0 0 6px rgba(139,189,154,0); }
  100% { box-shadow: 0 0 0 0 rgba(139,189,154,0); }
}

.data-panel { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
.data-panel__chart {
  background: #fff; border-radius: 20px; padding: 14px 16px;
  box-shadow: 0 8px 24px rgba(74,69,72,.06); min-height: 268px;
}
.overview-chart { width: 100%; height: 240px; }
.data-chart__skeleton { height: 240px; border-radius: 14px; }
.data-chart__empty {
  height: 240px; display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: var(--home-text-soft);
}
.data-panel__side { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.data-panel__side .stat-card { display: flex; flex-direction: column; justify-content: center; padding: 20px 14px; }
.data-scope {
  margin-top: 14px; padding: 10px 15px; border-radius: 14px;
  font-size: 12px; line-height: 1.8; color: var(--home-text-soft);
  background: rgba(255,255,255,.62); border: 1px dashed var(--home-border);
}

/* ========== 首次进入彩带 ========== */
.confetti-layer { position: fixed; inset: 0; z-index: 2000; pointer-events: none; overflow: hidden; }
.confetti {
  position: absolute; top: -26px; border-radius: 2px; opacity: 0;
  animation-name: confettiFall; animation-timing-function: ease-in;
  animation-iteration-count: 1; animation-fill-mode: both;
}
@keyframes confettiFall {
  0% { opacity: 1; transform: translateY(0) rotate(0deg); }
  100% { opacity: 0; transform: translateY(88vh) rotate(460deg); }
}
.confetti__close {
  pointer-events: auto; position: fixed; right: 20px; bottom: 20px;
  border: 1px solid var(--home-border); background: rgba(255,255,255,.92);
  color: var(--home-text-soft); font-size: 12px; padding: 7px 14px;
  border-radius: 999px; cursor: pointer; box-shadow: 0 6px 18px rgba(74,69,72,.12);
}
.confetti__close:hover { color: var(--home-primary-hover); }
.confetti-fade-enter-active, .confetti-fade-leave-active { transition: opacity .4s ease; }
.confetti-fade-enter-from, .confetti-fade-leave-to { opacity: 0; }

/* ========== 大家最近都在看（1+4） ========== */
.hot-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; }
.hot-main.skel { height: 360px; }
.hot-main {
  border-radius: 20px; overflow: hidden; background: #fff; cursor: pointer;
  box-shadow: var(--brand-shadow-sm, 0 8px 24px rgba(74,69,72,.08));
  display: flex; flex-direction: column; transition: transform .25s ease, box-shadow .25s ease;
}
.hot-main:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(74,69,72,.14); }
.hot-main__cover { position: relative; flex: 1 1 auto; min-height: 230px; background: linear-gradient(135deg,#f7e1e3,#f4d5d8); }
.hot-main__cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hot-main__fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--home-primary); font-size: 40px; }
.hot-main__tag { position: absolute; top: 12px; left: 12px; background: var(--home-primary); color: #fff; border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
.hot-main__body { flex: 0 0 auto; padding: 16px 18px; }
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
  /* 右视觉区隐藏图卡、保留光斑装饰，文案居中 */
  .hero-carousel { height: clamp(320px, 44vw, 400px); }
  .hero-carousel__slide { grid-template-columns: 1fr; padding: 32px 84px; text-align: center; }
  .hero-carousel__photo { display: none; }
  .hero-carousel__badge { margin: 0 auto; }
  .hero-carousel__desc { margin-left: auto; margin-right: auto; }
  .hero-carousel__dots { left: 50%; transform: translateX(-50%); }
  .hero-carousel__title { font-size: 30px; }
  .hot-grid { grid-template-columns: 1fr; }
  .treasure-grid, .goods-grid { grid-template-columns: repeat(2, 1fr); }
  .scene-grid { grid-template-columns: repeat(3, 1fr); }
  .data-panel { grid-template-columns: 1fr; }
  .tips-grid { grid-template-columns: 1fr 1fr; }
  .ai-entry { grid-template-columns: 1fr; }
  .ai-entry__right { display: none; }
}
@media (max-width: 640px) {
  /* 高度随屏宽自适应，箭头内收、指示器靠左 */
  .hero-carousel { height: clamp(300px, 82vw, 390px); margin-top: 12px; border-radius: 18px; }
  .hero-carousel__slide { padding: 26px 56px 66px 26px; text-align: left; }
  .hero-carousel__badge { margin: 0; }
  .hero-carousel__title { font-size: 24px; margin: 12px 0 8px; }
  .hero-carousel__desc { font-size: 13px; margin-bottom: 20px; }
  .hero-carousel__cta { padding: 10px 20px; font-size: 13.5px; }
  .hero-carousel__dots { left: 26px; bottom: 18px; transform: none; }
  .hero-carousel__arrow { width: 34px; height: 34px; }
  .hero-carousel__arrow--prev { left: 8px; }
  .hero-carousel__arrow--next { right: 8px; }
  .treasure-grid, .goods-grid, .hot-side { grid-template-columns: 1fr 1fr; }
  .scene-grid, .tips-grid { grid-template-columns: 1fr 1fr; }
  .block { padding: 24px 4px; }
  .data-panel__side { grid-template-columns: 1fr 1fr; }
  .overview-chart { height: 220px; }
}

/* 尊重减少动态效果偏好：关闭装饰性动画（业务切换仍可用） */
@media (prefers-reduced-motion: reduce) {
  .hero-carousel__slide { transition: none; }
  .hero-carousel__blob { animation: none !important; }
  .hero-carousel__dot-progress { animation: none !important; transform: scaleX(1); }
  .data-live i { animation: none !important; }
  .confetti { display: none; }
  .block--reveal { opacity: 1; transform: none; transition: none; }
}
</style>
