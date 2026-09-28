<template>
  <!--
    /landing 登录前产品首页（品牌官网 / 产品门面）
    与登录后的 /home（逛商品的市场页）刻意区分：
    - 信息架构：品牌 Hero → 编辑式好物精选 → 流转故事 → 校园场景 → 真实数据 → AI 预告 → CTA
    - 视觉气质：象牙纸感 + 衬线大数字 + 非对称编辑排版，而非市场页的商品 Grid
    数据仅来自两个公开只读接口：/home/overview、/home/showcase，不新增任何接口
  -->
  <div class="lp">

    <!-- ============ 顶部导航（品牌官网级：大 logo / 15px 导航 / 明显 CTA 层级 / 滚动高亮） ============ -->
    <header class="nav">
      <div class="nav__inner">
        <div class="nav__brand" @click="goLanding">
          <div class="nav__logo"><el-icon><RefreshRight /></el-icon></div>
          <div class="nav__word">
            <span class="nav__name">校园二手</span>
            <span class="nav__en">CAMPUS&nbsp;RELOVED</span>
          </div>
        </div>

        <nav class="nav__links">
          <a
            v-for="a in anchors"
            :key="a.id"
            :class="{ active: activeAnchor === a.id }"
            @click="scrollTo(a.id)"
          >{{ a.label }}</a>
        </nav>

        <div class="nav__actions">
          <template v-if="isLogin">
            <button class="lp-btn lp-btn--primary lp-btn--sm nav__cta" @click="goMarket">
              进入市场<el-icon><ArrowRight /></el-icon>
            </button>
          </template>
          <template v-else>
            <button class="nav__login" @click="goLogin">登录</button>
            <button class="lp-btn lp-btn--primary lp-btn--sm nav__cta" @click="goRegister">
              免费注册<el-icon><ArrowRight /></el-icon>
            </button>
          </template>
        </div>
      </div>
    </header>

    <!-- ============ 01 · 品牌 Hero ============ -->
    <section id="top" class="hero" @mousemove="onHeroMove" @mouseleave="resetHero">
      <!-- 柔和动态背景光斑（裸粉 / 奶杏桃 / 奶油黄，三层低饱和暖色，禁止赛博朋克式强光） -->
      <div class="hero__blob hero__blob--pink" :style="parallax(10)"></div>
      <div class="hero__blob hero__blob--peach" :style="parallax(14)"></div>
      <div class="hero__blob hero__blob--butter" :style="parallax(16)"></div>
      <div class="hero__grain"></div>

      <div class="hero__inner">
        <div class="hero__copy">
          <span class="eyebrow hero__enter hero__enter--1">CAMPUS RELOVED · 校园闲置循环计划</span>

          <h1 class="hero__title">
            <span class="hero__enter hero__enter--2">宿舍里的一切，</span>
            <span class="hero__enter hero__enter--3">都值得<span class="serif accent">第二次相遇</span></span>
          </h1>

          <p class="hero__sub hero__enter hero__enter--4">
            一个只属于本校同学的二手市场：同校面交、价格温柔、身份真实。
            从考研教材到宿舍小桌，从显示器到自行车——让带不走的好物，在楼下遇见新主人。
          </p>

          <div class="hero__cta hero__enter hero__enter--5">
            <button class="lp-btn lp-btn--primary" @click="goRegister">
              免费注册<el-icon><ArrowRight /></el-icon>
            </button>
            <button class="lp-btn lp-btn--outline" @click="goLogin">登录</button>
            <button class="lp-btn lp-btn--text" @click="goMarket">
              先逛逛市场<el-icon><ArrowRight /></el-icon>
            </button>
          </div>

          <div class="hero__proof hero__enter hero__enter--6">
            <div class="proof">
              <strong class="serif">{{ anim.onSaleCount }}</strong>
              <span>件真实在售</span>
            </div>
            <i></i>
            <div class="proof">
              <strong class="serif">{{ anim.totalTradeCount }}</strong>
              <span>笔校园交易</span>
            </div>
            <i></i>
            <div class="proof">
              <strong class="serif">{{ anim.sellerCount }}</strong>
              <span>位同学卖家</span>
            </div>
          </div>
        </div>

        <!-- 右侧：真实商品编辑式拼贴（非商品 Grid） -->
        <div class="hero__stage">
          <template v-if="heroCards.length">
            <article
              v-if="heroCards[0]"
              class="hc hc--lg"
              :style="parallax(8)"
              @click="goGoods(heroCards[0].goodsId)"
            >
              <div class="hc__bob" style="animation-delay:.2s">
                <img v-if="heroCards[0].imageUrl" :src="heroCards[0].imageUrl" :alt="heroCards[0].goodsName" />
                <div v-else class="hc__fallback hc__fallback--a"><el-icon><Picture /></el-icon></div>
                <div class="hc__caption">
                  <span class="hc__name">{{ heroCards[0].goodsName }}</span>
                  <span class="hc__price">{{ formatPrice(heroCards[0].price) }}</span>
                </div>
              </div>
            </article>

            <article
              v-if="heroCards[1]"
              class="hc hc--sm hc--a"
              :style="parallax(20)"
              @click="goGoods(heroCards[1].goodsId)"
            >
              <div class="hc__bob" style="animation-delay:.9s">
                <img v-if="heroCards[1].imageUrl" :src="heroCards[1].imageUrl" :alt="heroCards[1].goodsName" />
                <div v-else class="hc__fallback hc__fallback--b"><el-icon><Picture /></el-icon></div>
                <span class="hc__tag">{{ formatPrice(heroCards[1].price) }}</span>
              </div>
            </article>

            <article
              v-if="heroCards[2]"
              class="hc hc--sm hc--b"
              :style="parallax(30)"
              @click="goGoods(heroCards[2].goodsId)"
            >
              <div class="hc__bob" style="animation-delay:1.6s">
                <img v-if="heroCards[2].imageUrl" :src="heroCards[2].imageUrl" :alt="heroCards[2].goodsName" />
                <div v-else class="hc__fallback hc__fallback--c"><el-icon><Picture /></el-icon></div>
                <span class="hc__tag">{{ formatPrice(heroCards[2].price) }}</span>
              </div>
            </article>

            <div class="hc-chip" :style="parallax(38)">
              <div class="hc-chip__bob">
                <el-icon><Switch /></el-icon>
                <span>平均 <strong class="serif">{{ overview.avgTradeDays ?? '—' }}</strong> 天完成流转</span>
              </div>
            </div>
          </template>

          <template v-else-if="loading.showcase">
            <div class="hc-skel hc-skel--lg"></div>
            <div class="hc-skel hc-skel--a"></div>
            <div class="hc-skel hc-skel--b"></div>
          </template>
        </div>
      </div>

      <button class="hero__scroll" @click="scrollTo('showcase')" aria-label="向下浏览">
        <el-icon><ArrowDown /></el-icon>
      </button>
    </section>

    <!-- ============ 02 · 编辑式好物精选（复用 /home/showcase，呈现方式完全区别于 Home Grid） ============ -->
    <section id="showcase" class="editorial">
      <div class="wrap">
        <div class="sec-head" v-reveal>
          <span class="sec-head__no serif">01</span>
          <div>
            <h2>同学们正在出的好物</h2>
            <p>全部来自校园在售商品 · 按真实热度呈现 · 登录后即可联系卖家</p>
          </div>
          <button class="lp-btn lp-btn--text lp-btn--sm sec-head__more" @click="goMarket">
            查看全部<el-icon><ArrowRight /></el-icon>
          </button>
        </div>

        <!-- 加载中：与编辑式版式同构的骨架 -->
        <div v-if="loading.showcase" class="edit-grid">
          <div class="skel skel--feature"></div>
          <div class="edit-side">
            <div v-for="i in 4" :key="i" class="skel skel--small"></div>
          </div>
          <div v-for="i in 3" :key="'r'+i" class="skel skel--row"></div>
        </div>

        <!-- 有数据：1 张主视觉 + 4 张错落小卡 + 3 行清单式商品 -->
        <div v-else-if="showcase.length" class="edit-grid">
          <article
            v-if="feature"
            class="feature"
            v-reveal
            @click="goGoods(feature.goodsId)"
          >
            <div class="feature__media">
              <img v-if="feature.imageUrl" :src="feature.imageUrl" :alt="feature.goodsName" loading="lazy" />
              <div v-else class="feature__nofeature"><el-icon><Picture /></el-icon></div>
            </div>
            <div class="feature__veil"></div>
            <div class="feature__info">
              <div class="feature__tags">
                <span v-if="feature.campus" class="pill"><el-icon><Location /></el-icon>{{ feature.campus }}</span>
                <span class="pill pill--gold"><el-icon><Star /></el-icon>{{ feature.favoriteCount ?? 0 }} 人收藏</span>
              </div>
              <h3>{{ feature.goodsName }}</h3>
              <p>{{ feature.description || '卖家暂时没有填写描述，登录后可以直接留言询问' }}</p>
              <div class="feature__foot">
                <span class="feature__price serif">{{ formatPrice(feature.price) }}</span>
                <span class="feature__cta">登录后联系卖家<el-icon><ArrowRight /></el-icon></span>
              </div>
            </div>
          </article>

          <div class="edit-side">
            <article
              v-for="(g, i) in sideGoods"
              :key="g.goodsId"
              class="mini"
              v-reveal="i * 90"
              @click="goGoods(g.goodsId)"
            >
              <div class="mini__media">
                <img v-if="g.imageUrl" :src="g.imageUrl" :alt="g.goodsName" loading="lazy" />
                <div v-else class="mini__fallback"><el-icon><Picture /></el-icon></div>
              </div>
              <div class="mini__info">
                <span class="mini__name">{{ g.goodsName }}</span>
                <span class="mini__price serif">{{ formatPrice(g.price) }}</span>
              </div>
            </article>
          </div>

          <button
            v-for="(g, i) in rowGoods"
            :key="'row'+g.goodsId"
            class="crow"
            v-reveal="i * 90"
            @click="goGoods(g.goodsId)"
          >
            <span class="crow__no serif">0{{ i + 1 }}</span>
            <div class="crow__thumb">
              <img v-if="g.imageUrl" :src="g.imageUrl" :alt="g.goodsName" loading="lazy" />
              <div v-else class="crow__fallback"><el-icon><Picture /></el-icon></div>
            </div>
            <div class="crow__main">
              <span class="crow__name">{{ g.goodsName }}</span>
              <span class="crow__meta">
                <el-icon><Star /></el-icon>{{ g.favoriteCount ?? 0 }}
                <template v-if="g.campus"><i></i><el-icon><Location /></el-icon>{{ g.campus }}</template>
              </span>
            </div>
            <span class="crow__price serif">{{ formatPrice(g.price) }}</span>
            <el-icon class="crow__arrow"><ArrowRight /></el-icon>
          </button>
        </div>

        <!-- 无数据：真实空态，不伪造 -->
        <div v-else class="edit-empty" v-reveal>
          <el-icon class="edit-empty__icon"><Box /></el-icon>
          <h3>校园市场正在上新中</h3>
          <p>还没有在售商品。成为第一个发布闲置的人，让好物开始流转。</p>
          <button class="lp-btn lp-btn--primary" @click="goRegister">立即加入校园市场</button>
        </div>
      </div>
    </section>

    <!-- ============ 03 · 产品流转故事（不是 StatCard，讲清楚业务怎么跑） ============ -->
    <section id="flow" class="flow">
      <div class="wrap">
        <div class="sec-head sec-head--center" v-reveal>
          <span class="sec-head__no serif">02</span>
          <div>
            <h2>一次校园闲置交易，是这样发生的</h2>
            <p>没有复杂物流，四步就在校园里完成</p>
          </div>
        </div>

        <div class="flow__line" v-reveal="120"></div>

        <div class="flow__steps">
          <div
            v-for="(s, i) in steps"
            :key="s.no"
            class="step"
            v-reveal="i * 120"
          >
            <div class="step__icon" :style="{ background: s.bg }">
              <el-icon><component :is="s.icon" /></el-icon>
            </div>
            <span class="step__no serif">{{ s.no }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 04 · 校园生活场景（品牌展示，非筛选区） ============ -->
    <section id="scenes" class="scenes">
      <div class="wrap">
        <div class="sec-head" v-reveal>
          <span class="sec-head__no serif">03</span>
          <div>
            <h2>按校园生活的样子逛</h2>
            <p>不是冷冰冰的商品分类，而是你每天真实的生活场景</p>
          </div>
        </div>

        <div class="scenes__grid">
          <button
            v-for="(s, i) in sceneCards"
            :key="s.key"
            class="sc"
            :class="`sc--${s.key}`"
            v-reveal="(i % 3) * 100"
            @click="goScene(s.key)"
          >
            <span class="sc__no serif">{{ String(i + 1).padStart(2, '0') }}</span>
            <el-icon class="sc__icon"><component :is="s.icon" /></el-icon>
            <span class="sc__name">{{ s.name }}</span>
            <span class="sc__desc">{{ s.desc }}</span>
            <span class="sc__go">{{ isLogin ? '进入场景逛逛' : '登录后去逛逛' }}<el-icon><ArrowRight /></el-icon></span>
          </button>
        </div>
      </div>
    </section>

    <!-- ============ 05 · 真实平台数据（大数字 + 数字动画，区别于 Home 的统计卡片） ============ -->
    <section id="stats" ref="statsRef" class="stats">
      <div class="stats__blob stats__blob--a"></div>
      <div class="stats__blob stats__blob--b"></div>

      <div class="wrap stats__inner">
        <div class="stats__lead">
          <span class="eyebrow eyebrow--dark">04 · BY THE NUMBERS</span>
          <h2>真实交易，<br />才值得被展示</h2>
          <p>以下数据全部来自平台数据库实时统计，随每一笔交易变化——不做演示用的虚假数字。</p>
        </div>

        <div class="stats__nums">
          <div class="num">
            <strong class="serif">{{ anim.onSaleCount }}</strong>
            <span>在售好物</span>
          </div>
          <div class="num">
            <strong class="serif">{{ anim.totalTradeCount }}</strong>
            <span>已完成交易</span>
          </div>
          <div class="num">
            <strong class="serif">{{ anim.sellerCount }}</strong>
            <span>校园卖家</span>
          </div>
          <div class="num">
            <strong class="serif">{{ anim.totalFavoriteCount }}</strong>
            <span>收藏心意</span>
          </div>
          <div class="num num--days">
            <strong class="serif">{{ overview.avgTradeDays ?? '—' }}<small> 天</small></strong>
            <span>平均流转周期</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 06 · AI 助手预告 ============ -->
    <section id="ai" class="ai">
      <div class="wrap ai__inner">
        <div class="ai__copy" v-reveal>
          <span class="eyebrow">05 · AI CAMPUS AGENT</span>
          <h2>不知道该找什么？<br />让 AI 帮你找。</h2>
          <p>
            用一句自然语言描述需求，AI 助手会理解你的意图、调用商品与订单工具，
            把合适的校园好物整理给你。它是平台级 Agent，而不是一个普通聊天框。
          </p>

          <div class="ai__qs">
            <button
              v-for="(q, i) in aiExamples"
              :key="i"
              class="ai__q"
              @click="goAi"
            >
              <el-icon><ChatLineSquare /></el-icon>
              <span>{{ q }}</span>
              <el-icon class="ai__q-arrow"><ArrowRight /></el-icon>
            </button>
          </div>

          <div class="ai__hint">
            <span class="ai__soon">即将上线</span>
            AI 能力正在接入中，登录后可第一时间体验
          </div>
        </div>

        <!-- 能力预览示意卡（静态示意，不代表真实对话结果） -->
        <div class="ai__mock" v-reveal="140">
          <div class="ai__mock-bar">
            <i></i><i></i><i></i>
            <span>AI 校园闲置助手 · 能力预览</span>
          </div>
          <div class="ai__mock-body">
            <div class="bubble bubble--user">500 元以内，有什么适合宿舍用的？</div>
            <div class="bubble bubble--ai">
              明白，我按<b>「宿舍使用 + 500 元以内 + 在售」</b>帮你筛选——
              <div class="bubble__lines">
                <span><i class="dot"></i>宿舍折叠桌 · ¥35 · 东区</span>
                <span><i class="dot"></i>护眼台灯 · ¥69 · 南区</span>
                <span><i class="dot"></i>床头置物架 · ¥28 · 东区</span>
              </div>
            </div>
            <div class="bubble bubble--tool">
              <el-icon><Cpu /></el-icon>已调用工具：searchGoods(price≤500, keyword=宿舍)
            </div>
            <div class="ai__mock-note">* 示意图，最终结果以真实上线为准</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 07 · 最终 CTA ============ -->
    <section class="final">
      <div class="final__wash"></div>
      <div class="wrap final__inner" v-reveal>
        <h2>让闲置在校园里，<span class="serif accent">开始第二次旅行</span></h2>
        <p>出闲置、淘好物、认识同校同学——从一次注册开始</p>
        <div class="final__cta">
          <button class="lp-btn lp-btn--primary lp-btn--lg" @click="goRegister">免费注册</button>
          <button class="lp-btn lp-btn--outline lp-btn--lg" @click="goLogin">已有账号，去登录</button>
          <button class="lp-btn lp-btn--text" @click="goMarket">先逛逛市场<el-icon><ArrowRight /></el-icon></button>
        </div>
      </div>
    </section>

    <!-- ============ Footer ============ -->
    <footer class="footer">
      <div class="wrap footer__inner">
        <div class="footer__brand" @click="goLanding">
          <div class="nav__logo nav__logo--sm"><el-icon><RefreshRight /></el-icon></div>
          <div>
            <div class="footer__name">校园二手交易平台</div>
            <div class="footer__sub">宿舍到宿舍的可信交易</div>
          </div>
        </div>
        <div class="footer__links">
          <a @click="goLogin">登录</a>
          <a @click="goRegister">注册</a>
          <a @click="scrollTo('showcase')">好物</a>
          <a @click="scrollTo('ai')">AI 助手</a>
        </div>
        <div class="footer__copy">© 2026 校园二手交易平台 · 学生课程作品</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  RefreshRight, ArrowRight, ArrowDown, Picture, Location, Star, Switch,
  ChatLineSquare, Cpu, Box,
  Search, ChatDotRound, Position,
  House, Reading, Cellphone, Coffee, Bicycle, Basketball
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice } from '../utils/format'
import { SCENES } from '../utils/scenes'

const router = useRouter()
const isLogin = !!localStorage.getItem('token')

// ============ 公开只读数据 ============
const overview = ref({})
const showcase = ref([])
const loading = reactive({ showcase: true })

// 编辑式精选切分：1 主视觉 + 4 小卡 + 3 清单行
const feature = computed(() => showcase.value[0] || null)
const sideGoods = computed(() => showcase.value.slice(1, 5))
const rowGoods = computed(() => showcase.value.slice(5, 8))
// Hero 拼贴用前 3 件
const heroCards = computed(() => showcase.value.slice(0, 3))

// ============ 场景（品牌展示用配色，不复用 Home 的卡片配色） ============
const sceneIconMap = { dorm: House, study: Reading, digital: Cellphone, life: Coffee, bike: Bicycle, sport: Basketball }
const sceneCards = SCENES.map(s => ({ ...s, icon: sceneIconMap[s.key] }))

// ============ 流转故事四步 ============
const steps = [
  { no: '01', title: '发现闲置', desc: '按校园生活场景逛，或直接搜索你正在找的东西', icon: Search, bg: 'linear-gradient(135deg,#f7e2e5,#f3d2d7)' },
  { no: '02', title: '收藏心仪', desc: '先收藏、慢慢挑，好东西不怕多看一眼', icon: Star, bg: 'linear-gradient(135deg,#f6e7b4,#f1dd9e)' },
  { no: '03', title: '留言沟通', desc: '成色、配件、面交时间，直接和卖家逐条确认', icon: ChatDotRound, bg: 'linear-gradient(135deg,#f2dcc9,#eac8ac)' },
  { no: '04', title: '同校面交', desc: '宿舍楼下、图书馆门口，交易在校园里完成', icon: Position, bg: 'linear-gradient(135deg,#dbe3e8,#c9d5dc)' }
]

const aiExamples = [
  '500 元以内有什么适合宿舍用的？',
  '帮我找适合考研党的学习装备',
  '有没有适合女生宿舍的收纳用品？'
]

const anchors = [
  { id: 'top', label: '首页' },
  { id: 'showcase', label: '好物' },
  { id: 'flow', label: '使用流程' },
  { id: 'scenes', label: '校园场景' },
  { id: 'ai', label: 'AI 助手' }
]

// ============ 导航意图（所有 CTA 都有真实去向，无死链） ============
const goLogin = () => router.push('/login')
const goRegister = () => router.push('/register')
// 逛市场：游客可直接进入商品市场浏览，无需登录
// 已登录用户也进 /goods（市场是公开的，/home 是登录后的个人工作台）
const goMarket = () => router.push('/goods')
// AI 需要登录态：未登录先进登录流程，已登录进入正式 AI 页面
const goAi = () => router.push(isLogin ? '/ai-assistant' : '/login')
// 真实商品卡：游客可直达商品详情，受限操作在详情页内部门禁
const goGoods = (id) => router.push(`/goods/${id}`)
// 场景卡：复用 GoodsList.applyRouteQuery 的 /goods?scene=<key>，游客同样可进入
const goScene = (key) => router.push({ path: '/goods', query: { scene: key } })
// Logo：回到 /landing（导航只存在于 Landing，本页时回顶，跨页时回落地页）
const goLanding = () => {
  if (router.currentRoute.value.path !== '/landing') {
    router.push('/landing')
  } else {
    scrollTop()
  }
}

const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// ============ 导航滚动高亮（scroll-spy：当前区块对应导航项显示下划线） ============
const activeAnchor = ref('top')
let spyObserver = null
const initScrollSpy = () => {
  spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) activeAnchor.value = e.target.id
    })
  }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 })
  anchors.forEach(a => {
    const el = document.getElementById(a.id)
    if (el) spyObserver.observe(el)
  })
}

// ============ 数字滚动动画（进入数据区时触发一次） ============
const anim = reactive({ onSaleCount: 0, totalTradeCount: 0, sellerCount: 0, totalFavoriteCount: 0 })
const statsRef = ref(null)
let statsObserver = null
let statDone = false

const animate = () => {
  if (statDone) return
  statDone = true
  const targets = {
    onSaleCount: Number(overview.value.onSaleCount) || 0,
    totalTradeCount: Number(overview.value.totalTradeCount) || 0,
    sellerCount: Number(overview.value.sellerCount) || 0,
    totalFavoriteCount: Number(overview.value.totalFavoriteCount) || 0
  }
  const dur = 1500
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1)
    const ease = 1 - Math.pow(1 - p, 3)
    Object.keys(targets).forEach(k => { anim[k] = Math.round(targets[k] * ease) })
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

const observeStats = () => {
  if (!statsRef.value || statsObserver) return
  statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animate()
      statsObserver.disconnect()
    }
  }, { threshold: 0.35 })
  statsObserver.observe(statsRef.value)
}

// ============ 区块进入动画（指令式：异步数据晚挂载也能被观察） ============
let revealObserver = null
const ensureReveal = () => {
  if (revealObserver) return revealObserver
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible')
        revealObserver.unobserve(e.target)
      }
    })
  }, { threshold: 0.1 })
  return revealObserver
}
const vReveal = {
  mounted(el, binding) {
    el.classList.add('lp-reveal')
    if (binding.value) el.style.transitionDelay = `${binding.value}ms`
    ensureReveal().observe(el)
  },
  unmounted(el) {
    revealObserver?.unobserve(el)
  }
}

// ============ Hero 鼠标视差（rAF 节流，多层不同深度） ============
const mouse = reactive({ x: 0, y: 0 })
let rafId = null
const onHeroMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width - 0.5
  const y = (e.clientY - rect.top) / rect.height - 0.5
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    mouse.x = x
    mouse.y = y
    rafId = null
  })
}
const resetHero = () => { mouse.x = 0; mouse.y = 0 }
const parallax = (depth) => ({
  transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0)`
})

// ============ 加载公开数据（接口失败不影响品牌内容展示） ============
const loadOverview = async () => {
  try {
    overview.value = await request.get('/home/overview') || {}
  } catch (e) {
    overview.value = {}
  } finally {
    observeStats()
    // 数据区可能已在视口内，observer 之外兜底一次
    animate()
  }
}
const loadShowcase = async () => {
  try {
    const res = await request.get('/home/showcase', { params: { limit: 8 } })
    showcase.value = Array.isArray(res) ? res : []
  } catch (e) {
    showcase.value = []
  } finally {
    loading.showcase = false
  }
}

onMounted(() => {
  loadOverview()
  loadShowcase()
  initScrollSpy()
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  statsObserver?.disconnect()
  spyObserver?.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
/* ============================================================
   /landing · 品牌官网气质（同品牌色系，更亮、更轻、编辑式）
   象牙纸感底 / 奶油粉 / 奶杏 / 香槟 / 奶油黄 / 少量灰蓝，无紫色
   ============================================================ */
.lp {
  --paper: #fdfaf5;
  --card: #fffefb;
  --ink: #4d4341;
  --ink-2: #8d7f7a;
  --ink-3: #b6a9a1;
  --blush: #f3d9dd;
  --blush-deep: #c4878f;
  --peach: #f4dccb;
  --apricot: #eedfc2;
  --butter: #f6e7b4;
  --champagne: #f0e4c8;
  --mist: #d7dee3;
  --blue: #8b99a5;
  --gold: #c9a45c;
  --line: #ece1d6;

  --serif: Georgia, 'Times New Roman', 'Songti SC', 'STSong', serif;

  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.wrap { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
.serif { font-family: var(--serif); font-weight: 600; }
.accent { color: var(--blush-deep); padding-left: 6px; }

.eyebrow {
  display: inline-block;
  font-size: 11px; font-weight: 700; letter-spacing: 2.5px;
  color: var(--blush-deep);
}
.eyebrow--dark { color: #9c7a34; }

/* 页面进入 */
.lp { animation: pageIn .5s ease both; }
@keyframes pageIn { from { opacity: 0; } to { opacity: 1; } }

/* 通用按钮 */
.lp-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border: none; cursor: pointer; border-radius: 999px;
  font-size: 14.5px; font-weight: 600;
  padding: 13px 26px;
  transition: transform .22s ease, box-shadow .22s ease, background .22s ease, color .22s ease;
}
.lp-btn .el-icon { font-size: 15px; }
.lp-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #d99aa1, var(--blush-deep));
  box-shadow: 0 10px 24px rgba(196, 135, 143, .32);
}
.lp-btn--primary:hover { transform: translateY(-2px); box-shadow: 0 15px 32px rgba(196, 135, 143, .42); }
.lp-btn--outline {
  background: rgba(255,255,255,.75); color: var(--ink);
  box-shadow: inset 0 0 0 1.5px var(--line);
}
.lp-btn--outline:hover { background: #fff; transform: translateY(-2px); box-shadow: inset 0 0 0 1.5px #e2c9cd; }
.lp-btn--text { background: transparent; color: var(--ink-2); padding-inline: 10px; }
.lp-btn--text:hover { color: var(--blush-deep); }
.lp-btn--text:hover .el-icon { transform: translateX(3px); }
.lp-btn--text .el-icon { transition: transform .2s ease; }
.lp-btn--sm { padding: 9px 20px; font-size: 13px; }
.lp-btn--lg { padding: 15px 34px; font-size: 15.5px; }

/* 区块进入 */
.lp-reveal { opacity: 0; transform: translateY(28px); transition: opacity .75s ease, transform .75s ease; }
.lp-reveal.is-visible { opacity: 1; transform: none; }

/* ============ 导航（品牌官网级：更大字号 / 更宽间距 / 三级 CTA 层级 / 毛玻璃） ============ */
.nav {
  position: sticky; top: 0; z-index: 60;
  background: rgba(253, 250, 245, .78);
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
  border-bottom: 1px solid rgba(236, 225, 214, .65);
  box-shadow: 0 4px 24px rgba(77, 67, 65, .05);
}
.nav__inner {
  max-width: 1200px; margin: 0 auto; padding: 16px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
.nav__brand { display: flex; align-items: center; gap: 13px; cursor: pointer; }
.nav__logo {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, #e2aab0, var(--blush-deep));
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px;
  box-shadow: 0 8px 20px rgba(196,135,143,.32);
  transition: transform .25s ease;
}
.nav__brand:hover .nav__logo { transform: rotate(-10deg) scale(1.05); }
.nav__logo--sm { width: 36px; height: 36px; font-size: 18px; }
.nav__word { line-height: 1.2; }
.nav__name { display: block; font-size: 17.5px; font-weight: 800; letter-spacing: 1.2px; color: var(--ink); }
.nav__en { display: block; font-size: 9px; font-weight: 700; letter-spacing: 2.4px; color: var(--ink-3); margin-top: 2px; }
.nav__links { display: flex; gap: 6px; }
.nav__links a {
  font-size: 15px; color: var(--ink-2); cursor: pointer; font-weight: 500;
  padding: 8px 14px; border-radius: 999px;
  transition: color .2s ease, background .2s ease;
  position: relative; white-space: nowrap;
}
.nav__links a::after {
  content: ''; position: absolute; left: 50%; bottom: 2px; height: 2px; width: 0;
  background: var(--blush-deep); border-radius: 2px;
  transition: width .25s ease, left .25s ease;
}
.nav__links a:hover { color: var(--blush-deep); background: rgba(243, 217, 221, .35); }
.nav__links a:hover::after { width: 22px; left: calc(50% - 11px); }
.nav__links a.active { color: var(--blush-deep); font-weight: 700; }
.nav__links a.active::after { width: 22px; left: calc(50% - 11px); }
.nav__actions { display: flex; align-items: center; gap: 12px; }
/* 层级 1：文字按钮（登录）—— hover 有浅色胶囊底，存在感次于注册 */
.nav__login {
  border: none; background: transparent; cursor: pointer;
  font-size: 15px; font-weight: 600; color: var(--ink-2);
  padding: 9px 16px; border-radius: 999px;
  transition: color .2s ease, background .2s ease;
}
.nav__login:hover { color: var(--blush-deep); background: rgba(243, 217, 221, .42); }
/* 层级 2：实心 pill（注册 / 进入市场）——视觉主行动 */
.nav__cta { padding: 11px 22px !important; font-size: 14.5px !important; }

/* ============ Hero（奶油象牙 + 裸粉 + 桃米，三层暖光斑） ============ */
.hero {
  position: relative; overflow: hidden;
  background: linear-gradient(160deg, #fdfaf5 0%, #fdf3ee 52%, #fbf6e9 100%);
}
.hero__blob {
  position: absolute; border-radius: 50%; filter: blur(70px);
  pointer-events: none; transition: transform .35s ease-out;
}
.hero__blob--pink {
  width: 480px; height: 480px; top: -160px; right: -80px;
  background: radial-gradient(circle, rgba(243,217,221,.9), rgba(243,217,221,0) 70%);
  animation: blobDrift 16s ease-in-out infinite;
}
.hero__blob--peach {
  width: 360px; height: 360px; top: 32%; left: 42%;
  background: radial-gradient(circle, rgba(244,220,203,.55), rgba(244,220,203,0) 72%);
  animation: blobDrift 22s ease-in-out infinite;
}
.hero__blob--butter {
  width: 420px; height: 420px; bottom: -180px; left: -120px;
  background: radial-gradient(circle, rgba(246,231,180,.75), rgba(246,231,180,0) 70%);
  animation: blobDrift 20s ease-in-out infinite reverse;
}
@keyframes blobDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, 24px) scale(1.08); }
}
.hero__grain {
  position: absolute; inset: 0; pointer-events: none; opacity: .35;
  background-image: radial-gradient(rgba(77,67,65,.05) 1px, transparent 1px);
  background-size: 22px 22px;
}
.hero__inner {
  position: relative; z-index: 2;
  max-width: 1180px; margin: 0 auto;
  padding: 92px 32px 110px;
  display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; align-items: center;
}
.hero__title {
  margin: 22px 0 20px;
  font-size: 54px; line-height: 1.24; font-weight: 800; letter-spacing: 1px;
}
.hero__title span { display: block; }
.hero__sub {
  margin: 0 0 30px; max-width: 480px;
  font-size: 15.5px; line-height: 2; color: var(--ink-2);
}
.hero__cta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hero__proof {
  margin-top: 38px; padding-top: 24px;
  border-top: 1px solid var(--line);
  display: flex; align-items: center; gap: 22px;
}
.proff, .proof { display: flex; flex-direction: column; gap: 3px; }
.proof strong { font-size: 26px; line-height: 1; color: var(--ink); }
.proof span { font-size: 12px; color: var(--ink-3); letter-spacing: .5px; }
.hero__proof i { width: 1px; height: 30px; background: var(--line); }

.hero__enter { opacity: 0; animation: heroUp .7s cubic-bezier(.22,.8,.36,1) forwards; }
.hero__enter--1 { animation-delay: .05s; }
.hero__enter--2 { animation-delay: .15s; }
.hero__enter--3 { animation-delay: .25s; }
.hero__enter--4 { animation-delay: .38s; }
.hero__enter--5 { animation-delay: .5s; }
.hero__enter--6 { animation-delay: .62s; }
@keyframes heroUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }

.hero__scroll {
  position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: 3; width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--line); background: rgba(255,255,255,.8);
  color: var(--ink-2); cursor: pointer; display: flex; align-items: center; justify-content: center;
  animation: scrollBob 2.2s ease-in-out infinite;
}
@keyframes scrollBob { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,6px); } }

/* Hero 商品拼贴 */
.hero__stage { position: relative; height: 470px; }
.hc {
  position: absolute; margin: 0; padding: 0; border: none;
  border-radius: 20px; overflow: hidden; cursor: pointer;
  background: var(--card);
  box-shadow: 0 22px 50px rgba(77,67,65,.16);
  border: 5px solid #fff;
  transition: box-shadow .3s ease;
}
.hc:hover { box-shadow: 0 28px 60px rgba(77,67,65,.24); }
.hc__bob { width: 100%; height: 100%; position: relative; animation: bob 7s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-11px); } }
.hc img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hc__fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 34px; }
.hc__fallback--a { background: linear-gradient(135deg, var(--blush), var(--peach)); color: var(--blush-deep); }
.hc__fallback--b { background: linear-gradient(135deg, var(--butter), var(--champagne)); color: var(--gold); }
.hc__fallback--c { background: linear-gradient(135deg, var(--mist), #e7edf0); color: var(--blue); }
.hc--lg { width: 300px; height: 380px; left: 40px; top: 40px; z-index: 2; }
.hc--sm { width: 168px; height: 196px; }
.hc--a { right: 10px; top: 0; z-index: 3; }
.hc--b { right: 64px; bottom: 0; z-index: 4; }
.hc__caption {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 40px 16px 14px;
  background: linear-gradient(transparent, rgba(77,67,65,.55));
  display: flex; align-items: flex-end; justify-content: space-between; gap: 8px;
}
.hc__name {
  color: #fff; font-size: 13px; font-weight: 600; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.hc__price {
  flex-shrink: 0; color: #fff; font-size: 15px; font-weight: 700;
  background: rgba(196,135,143,.85); border-radius: 999px; padding: 3px 10px;
}
.hc__tag {
  position: absolute; left: 10px; bottom: 10px;
  background: rgba(255,255,255,.92); color: var(--gold);
  border-radius: 999px; padding: 3px 11px; font-size: 12.5px; font-weight: 700;
}
.hc-chip {
  position: absolute; left: 0; bottom: 36px; z-index: 5;
  background: rgba(255,255,255,.92); backdrop-filter: blur(6px);
  border: 1px solid var(--line); border-radius: 999px;
  padding: 10px 18px; box-shadow: 0 12px 28px rgba(77,67,65,.14);
  font-size: 12.5px; color: var(--ink-2);
}
.hc-chip__bob { display: flex; align-items: center; gap: 8px; animation: bob 6s ease-in-out infinite; }
.hc-chip .el-icon { color: var(--blush-deep); }
.hc-chip strong { color: var(--ink); font-size: 16px; }

.hc-skel {
  position: absolute; border-radius: 20px; border: 5px solid #fff;
  background: linear-gradient(90deg,#f3ebe2 25%,#faf4ec 37%,#f3ebe2 63%);
  background-size: 400% 100%; animation: shimmer 1.4s infinite;
  box-shadow: 0 18px 40px rgba(77,67,65,.1);
}
.hc-skel--lg { width: 300px; height: 380px; left: 40px; top: 40px; }
.hc-skel--a { width: 168px; height: 196px; right: 10px; top: 0; }
.hc-skel--b { width: 168px; height: 196px; right: 64px; bottom: 0; }
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

/* ============ 通用区块头 ============ */
.sec-head { display: flex; align-items: flex-start; gap: 18px; margin-bottom: 38px; }
.sec-head--center { flex-direction: column; align-items: center; text-align: center; gap: 12px; }
.sec-head__no {
  font-size: 30px; color: var(--blush-deep); opacity: .55; line-height: 1.1;
}
.sec-head h2 { margin: 0; font-size: 30px; font-weight: 800; letter-spacing: .5px; }
.sec-head p { margin: 8px 0 0; font-size: 13.5px; color: var(--ink-2); }
.sec-head__more { margin-left: auto; align-self: center; }

/* ============ 02 编辑式精选（象牙白 + 浅杏 + 柔粉，卡片底带极浅暖杏，与 Hero 拉开层次） ============ */
.editorial {
  padding: 88px 0 92px;
  background: linear-gradient(180deg, #fffdf8 0%, #fdf8f0 100%);
}
.edit-grid {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  grid-template-areas:
    'feature side'
    'row1 row1'
    'row2 row2'
    'row3 row3';
  gap: 20px;
}
.feature { grid-area: feature; position: relative; border: none; padding: 0; cursor: pointer; border-radius: 22px; overflow: hidden; min-height: 430px; background: var(--card); box-shadow: 0 10px 30px rgba(77,67,65,.08); }
.feature__media { position: absolute; inset: 0; overflow: hidden; }
.feature__media img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform .8s cubic-bezier(.22,.8,.36,1);
}
.feature:hover .feature__media img { transform: scale(1.06); }
.feature__nofeature {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 60px; color: var(--blush-deep); background: linear-gradient(135deg, var(--blush), var(--peach));
}
.feature__veil {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(77,67,65,0) 38%, rgba(77,67,65,.72) 100%);
}
.feature__info {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 26px 28px; color: #fff;
  transform: translateY(8px); transition: transform .4s ease;
}
.feature:hover .feature__info { transform: translateY(0); }
.feature__tags { display: flex; gap: 8px; margin-bottom: 12px; }
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,.9); color: var(--ink);
  border-radius: 999px; padding: 4px 12px; font-size: 11.5px; font-weight: 600;
}
.pill--gold { background: rgba(201,164,92,.92); color: #fff; }
.feature__info h3 { margin: 0 0 8px; font-size: 24px; font-weight: 800; }
.feature__info p {
  margin: 0 0 16px; font-size: 13px; line-height: 1.7;
  color: rgba(255,255,255,.82);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.feature__foot { display: flex; align-items: center; justify-content: space-between; }
.feature__price { font-size: 28px; font-weight: 700; }
.feature__cta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 13px; font-weight: 600; color: #fff;
}
.feature__cta .el-icon { transition: transform .25s ease; }
.feature:hover .feature__cta .el-icon { transform: translateX(4px); }

.edit-side { grid-area: side; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.mini {
  border: none; padding: 0; cursor: pointer; text-align: left;
  border-radius: 18px; overflow: hidden; background: var(--card);
  box-shadow: 0 8px 24px rgba(77,67,65,.07);
  transition: transform .3s ease, box-shadow .3s ease;
  display: flex; flex-direction: column;
}
.mini:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(77,67,65,.14); }
.mini__media { height: 132px; overflow: hidden; }
.mini__media img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s ease; }
.mini:hover .mini__media img { transform: scale(1.07); }
.mini__fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: var(--gold);
  background: linear-gradient(135deg, var(--butter), var(--champagne));
}
.mini__info {
  padding: 11px 13px 13px;
  display: flex; flex-direction: column; gap: 6px;
}
.mini__name {
  font-size: 13px; font-weight: 600; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mini__price { font-size: 17px; font-weight: 700; color: var(--gold); }

.crow {
  border: none; cursor: pointer;
  display: flex; align-items: center; gap: 18px;
  background: var(--card); border-radius: 16px;
  padding: 14px 22px; text-align: left;
  box-shadow: 0 4px 16px rgba(77,67,65,.05);
  transition: transform .25s ease, box-shadow .25s ease;
}
.crow:nth-of-type(1) { grid-area: row1; }
.crow:nth-of-type(2) { grid-area: row2; }
.crow:nth-of-type(3) { grid-area: row3; }
.crow:hover { transform: translateX(6px); box-shadow: 0 10px 26px rgba(77,67,65,.12); }
.crow__no { font-size: 15px; color: var(--ink-3); width: 22px; }
.crow__thumb { width: 64px; height: 64px; border-radius: 12px; overflow: hidden; flex-shrink: 0; }
.crow__thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.crow:hover .crow__thumb img { transform: scale(1.08); }
.crow__fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: var(--blush-deep); background: var(--blush);
}
/* 清单行交替使用奶杏 / 奶油黄占位底，增加同色系层次 */
.crow:nth-of-type(2) .crow__fallback { background: var(--apricot); color: #a68a5b; }
.crow:nth-of-type(3) .crow__fallback { background: var(--butter); color: var(--gold); }
.crow__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.crow__name {
  font-size: 14.5px; font-weight: 600; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.crow__meta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--ink-3);
}
.crow__meta i { width: 1px; height: 11px; background: var(--line); margin: 0 5px; }
.crow__price { font-size: 18px; font-weight: 700; color: var(--gold); }
.crow__arrow { color: var(--ink-3); transition: transform .25s ease, color .25s ease; }
.crow:hover .crow__arrow { transform: translateX(5px); color: var(--blush-deep); }

.skel { border-radius: 18px; background: linear-gradient(90deg,#f3ebe2 25%,#faf4ec 37%,#f3ebe2 63%); background-size: 400% 100%; animation: shimmer 1.4s infinite; }
.skel--feature { grid-area: feature; min-height: 430px; }
.skel--small { height: 196px; }
.skel--row { height: 92px; border-radius: 16px; }
.edit-grid .skel--row:nth-of-type(3) { grid-area: row1; }

.edit-empty {
  text-align: center; padding: 70px 30px;
  border-radius: 24px;
  background: linear-gradient(135deg, #fdf2f4, #faf1e2);
  border: 1px dashed var(--blush);
}
.edit-empty__icon { font-size: 46px; color: var(--blush-deep); opacity: .7; }
.edit-empty h3 { margin: 16px 0 8px; font-size: 20px; }
.edit-empty p { margin: 0 0 22px; color: var(--ink-2); font-size: 14px; }

/* ============ 03 流转故事（淡黄 + 奶杏，与前后区块的粉/象牙拉开） ============ */
.flow {
  padding: 92px 0;
  background: linear-gradient(180deg, #fbf5e2 0%, #f7ecd6 100%);
}
.flow__line {
  position: relative;
  max-width: 900px; margin: -10px auto 8px; height: 2px;
  background: repeating-linear-gradient(90deg, var(--line) 0 8px, transparent 8px 16px);
}
.flow__steps {
  max-width: 1060px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
}
.step {
  position: relative; text-align: center;
  background: linear-gradient(180deg, #fffdf8, #fdf6ea);
  border-radius: 20px;
  padding: 30px 20px 28px;
  border: 1px solid rgba(236,225,214,.8);
  box-shadow: 0 10px 28px rgba(156,122,52,.07);
  transition: transform .3s ease, box-shadow .3s ease;
}
.step:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(77,67,65,.1); }
.step__icon {
  width: 62px; height: 62px; margin: 0 auto 14px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--ink);
}
.step__no { display: block; font-size: 12px; color: var(--ink-3); letter-spacing: 2px; margin-bottom: 6px; }
.step h3 { margin: 0 0 8px; font-size: 17px; font-weight: 800; }
.step p { margin: 0; font-size: 12.5px; line-height: 1.8; color: var(--ink-2); }

/* ============ 04 场景（象牙底，每张卡一种低饱和品牌色：裸粉/奶油黄/灰蓝/桃米/沙金/奶杏） ============ */
.scenes {
  padding: 92px 0;
  background: linear-gradient(180deg, #fdf8f0 0%, #fdfaf5 100%);
}
.scenes__grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
}
.sc {
  position: relative; overflow: hidden;
  border: none; cursor: pointer; text-align: left;
  border-radius: 22px; padding: 28px 26px 24px;
  min-height: 188px;
  display: flex; flex-direction: column;
  background: var(--card);
  box-shadow: 0 6px 20px rgba(77,67,65,.06);
  transition: transform .3s ease, box-shadow .3s ease;
}
.sc::before {
  content: ''; position: absolute; inset: 0; opacity: .9;
  transition: transform .5s ease;
}
.sc > * { position: relative; z-index: 1; }
.sc:hover { transform: translateY(-6px); box-shadow: 0 20px 44px rgba(77,67,65,.13); }
.sc:hover::before { transform: scale(1.04); }
.sc--dorm::before { background: linear-gradient(135deg, #fbe6e9, #f6d2d8); }
.sc--study::before { background: linear-gradient(135deg, #f9ecca, #f2dda1); }
.sc--digital::before { background: linear-gradient(135deg, #e8eef2, #d0dde6); }
.sc--life::before { background: linear-gradient(135deg, #fae3d2, #f3ccaf); }
.sc--bike::before { background: linear-gradient(135deg, #f1e8d8, #e4d3b8); }
.sc--sport::before { background: linear-gradient(135deg, #f9e2cd, #f0c8a4); }
.sc__no { position: absolute; top: 20px; right: 24px; font-size: 13px; color: rgba(77,67,65,.35); letter-spacing: 1px; }
.sc__icon { font-size: 30px; color: var(--ink); margin-bottom: auto; transition: transform .3s ease; }
.sc:hover .sc__icon { transform: scale(1.12) rotate(-4deg); }
/* 图标使用各场景同色系深色，强化色块记忆点 */
.sc--dorm .sc__icon { color: #b56f7a; }
.sc--study .sc__icon { color: #9c7d2e; }
.sc--digital .sc__icon { color: #6d8291; }
.sc--life .sc__icon { color: #b57f5c; }
.sc--bike .sc__icon { color: #96815c; }
.sc--sport .sc__icon { color: #bd7e52; }
.sc__name { font-size: 19px; font-weight: 800; margin-top: 26px; }
.sc__desc { font-size: 12.5px; color: var(--ink-2); margin-top: 6px; line-height: 1.6; }
.sc__go {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 14px; font-size: 12.5px; font-weight: 600;
  opacity: 0; transform: translateY(6px); transition: opacity .3s ease, transform .3s ease;
}
.sc__go .el-icon { font-size: 13px; }
.sc:hover .sc__go { opacity: 1; transform: translateY(0); }
.sc--dorm .sc__go { color: #b56f7a; }
.sc--study .sc__go { color: #9c7d2e; }
.sc--digital .sc__go { color: #6d8291; }
.sc--life .sc__go { color: #b57f5c; }
.sc--bike .sc__go { color: #96815c; }
.sc--sport .sc__go { color: #bd7e52; }

/* ============ 05 数据 ============ */
.stats { position: relative; overflow: hidden; background: linear-gradient(135deg, #f6ead2, #f3ddc4); }
.stats__blob { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
.stats__blob--a { width: 380px; height: 380px; top: -140px; right: -80px; background: rgba(246,231,180,.7); }
.stats__blob--b { width: 340px; height: 340px; bottom: -150px; left: -90px; background: rgba(243,217,221,.65); }
.stats__inner {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: .85fr 1.4fr; gap: 48px;
  padding: 88px 32px; align-items: center;
}
.stats__lead h2 { margin: 14px 0 16px; font-size: 32px; font-weight: 800; line-height: 1.4; }
.stats__lead p { margin: 0; font-size: 13.5px; line-height: 2; color: #8a7460; max-width: 340px; }
.stats__nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px 20px; }
.num { display: flex; flex-direction: column; gap: 8px; }
.num strong {
  font-size: 52px; line-height: 1; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.num strong small { font-size: 20px; }
.num span { font-size: 13px; color: #8a7460; }
.num--days strong { color: var(--blush-deep); }

/* ============ 06 AI（唯一冷色区：柔和灰蓝雾感，暗示"智能/科技"，不做蓝紫 SaaS） ============ */
.ai {
  padding: 96px 0;
  background: linear-gradient(180deg, #f4f8fa 0%, #ebf1f4 100%);
}
.ai .eyebrow { color: var(--blue); }
.ai__inner {
  display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center;
}
.ai__copy h2 { margin: 14px 0 16px; font-size: 32px; font-weight: 800; line-height: 1.4; }
.ai__copy > p { margin: 0 0 26px; font-size: 14.5px; line-height: 2; color: #6f7d86; max-width: 470px; }
.ai__qs { display: flex; flex-direction: column; gap: 10px; max-width: 460px; }
.ai__q {
  display: flex; align-items: center; gap: 11px;
  border: 1px solid #d9e2e7; background: #fffefb;
  border-radius: 14px; padding: 14px 18px; cursor: pointer; text-align: left;
  font-size: 14px; color: var(--ink);
  transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
}
.ai__q > .el-icon:first-child { color: var(--blue); font-size: 18px; flex-shrink: 0; }
.ai__q span { flex: 1; }
.ai__q-arrow { color: #a8b6bf; transition: transform .25s ease, color .25s ease; }
.ai__q:hover { transform: translateX(6px); border-color: #b9cad4; box-shadow: 0 10px 26px rgba(109,130,145,.16); }
.ai__q:hover .ai__q-arrow { transform: translateX(4px); color: var(--blue); }
.ai__hint { margin-top: 22px; display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #8fa0aa; }
.ai__soon {
  background: #dce8ee; color: #5f7684;
  border-radius: 999px; padding: 3px 12px; font-size: 11.5px; font-weight: 700;
}
.ai__mock {
  border-radius: 24px; overflow: hidden;
  background: var(--card);
  box-shadow: 0 24px 60px rgba(85,105,120,.18);
  border: 1px solid #dde6eb;
}
.ai__mock-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 14px 18px; border-bottom: 1px solid #e4ebef;
  background: #f2f6f8;
}
.ai__mock-bar i { width: 10px; height: 10px; border-radius: 50%; background: var(--blush); }
.ai__mock-bar i:nth-child(2) { background: var(--butter); }
.ai__mock-bar i:nth-child(3) { background: var(--mist); }
.ai__mock-bar span { margin-left: 8px; font-size: 11.5px; color: var(--ink-3); letter-spacing: .5px; }
.ai__mock-body { padding: 24px 22px; display: flex; flex-direction: column; gap: 14px; }
.bubble { max-width: 88%; padding: 13px 16px; border-radius: 16px; font-size: 13.5px; line-height: 1.8; }
.bubble--user {
  align-self: flex-end;
  background: linear-gradient(135deg, #e2aab0, var(--blush-deep)); color: #fff;
  border-bottom-right-radius: 5px;
}
.bubble--ai {
  align-self: flex-start;
  background: #eef3f6; color: var(--ink);
  border-bottom-left-radius: 5px;
}
.bubble__lines { margin-top: 10px; display: flex; flex-direction: column; gap: 7px; }
.bubble__lines span {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.8); border-radius: 10px; padding: 7px 11px; font-size: 12.5px;
}
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); flex-shrink: 0; }
.bubble--tool {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 7px;
  font-size: 11.5px; color: var(--blue);
  background: #eef2f4; border-radius: 10px; padding: 7px 12px;
}
.ai__mock-note { align-self: center; font-size: 11px; color: var(--ink-3); }

/* ============ 07 最终 CTA（暖粉主洗 + 奶油黄侧光，整页暖色收尾） ============ */
.final { position: relative; overflow: hidden; padding: 96px 0 100px; }
.final__wash {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 90% at 18% 0%, #f8d9df 0%, transparent 62%),
    radial-gradient(ellipse 55% 85% at 85% 20%, #f6e7b4 0%, transparent 60%),
    linear-gradient(180deg, #fdfaf5, #fbf1ee);
}
.final__inner { position: relative; text-align: center; }
.final__inner h2 { margin: 0 0 14px; font-size: 36px; font-weight: 800; letter-spacing: 1px; }
.final__inner p { margin: 0 0 32px; font-size: 15px; color: var(--ink-2); }
.final__cta { display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap; }

/* ============ Footer（暖象牙底，与 AI 冷色区形成收尾对比） ============ */
.footer { border-top: 1px solid var(--line); background: linear-gradient(180deg, #fbf1ee, #f7ece2); }
.footer__inner {
  padding: 34px 32px;
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
}
.footer__brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.footer__name { font-size: 14.5px; font-weight: 800; }
.footer__sub { font-size: 12px; color: var(--ink-3); margin-top: 2px; }
.footer__links { display: flex; gap: 22px; }
.footer__links a { font-size: 13px; color: var(--ink-2); cursor: pointer; }
.footer__links a:hover { color: var(--blush-deep); }
.footer__copy { font-size: 11.5px; color: var(--ink-3); }

/* ============ 响应式 ============ */
@media (max-width: 1080px) {
  .hero__inner { grid-template-columns: 1fr; gap: 40px; padding: 64px 28px 90px; }
  .hero__stage { display: none; }
  .hero__title { font-size: 42px; }
  .edit-grid {
    grid-template-columns: 1fr;
    grid-template-areas: 'feature' 'side' 'row1' 'row2' 'row3';
  }
  .feature { min-height: 360px; }
  .flow__steps { grid-template-columns: repeat(2, 1fr); }
  .flow__line { display: none; }
  .scenes__grid { grid-template-columns: repeat(2, 1fr); }
  .stats__inner { grid-template-columns: 1fr; gap: 36px; }
  .ai__inner { grid-template-columns: 1fr; gap: 40px; }
  .nav__links { display: none; }
}
@media (max-width: 620px) {
  .wrap { padding: 0 20px; }
  .hero__title { font-size: 33px; }
  .sec-head { flex-direction: column; gap: 8px; }
  .sec-head__more { margin-left: 0; }
  .edit-side { grid-template-columns: 1fr 1fr; gap: 12px; }
  .flow__steps, .scenes__grid { grid-template-columns: 1fr; }
  .stats__nums { grid-template-columns: repeat(2, 1fr); }
  .num strong { font-size: 40px; }
  .final__inner h2 { font-size: 27px; }
  .crow { gap: 12px; padding: 12px 14px; }
  .footer__inner { flex-direction: column; text-align: center; }
}
</style>
