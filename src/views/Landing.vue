<template>
  <!--
    /landing 登录前产品首页
    定位：品牌/产品门面，未登录用户进入平台的第一站。
    数据全部来自公开只读接口（/home/overview、/home/showcase），
    与登录后的 /home 市场首页是两个不同页面，不复制其结构。
  -->
  <div class="landing">

    <!-- ============ 顶部导航 ============ -->
    <header class="nav">
      <div class="nav__inner">
        <div class="nav__brand">
          <div class="nav__logo"><el-icon><RefreshRight /></el-icon></div>
          <div class="nav__name">校园二手<span>CAMPUS TRADE</span></div>
        </div>
        <div class="nav__actions">
          <template v-if="isLogin">
            <button class="btn-primary btn-sm" @click="$router.push('/home')">进入首页</button>
          </template>
          <template v-else>
            <button class="btn-ghost" @click="$router.push('/login')">登录</button>
            <button class="btn-primary btn-sm" @click="$router.push('/register')">免费注册</button>
          </template>
        </div>
      </div>
    </header>

    <!-- ============ Hero 主视觉 ============ -->
    <section class="hero" @mousemove="onHeroMove" @mouseleave="resetHero">
      <div class="hero__bg"></div>
      <div class="hero__inner">
        <div class="hero__left">
          <span class="hero__badge">校园闲置 · 让好物重新流动</span>
          <h1 class="hero__title">
            宿舍里的一切<br />都值得<span class="hero__title-pink">第二次相遇</span>
          </h1>
          <p class="hero__subtitle">
            同校同学真实发布的二手好物，面交更近、价格更软、交易更可信。
            从教材到显示器，从宿舍小桌到自行车——楼下就能完成交易。
          </p>
          <div class="hero__cta">
            <button class="btn-primary" @click="goEntry">立即逛逛</button>
            <button class="btn-outline" @click="scrollTo('ai')">
              <el-icon><MagicStick /></el-icon>认识 AI 助手
            </button>
          </div>
          <div class="hero__proof">
            <span><strong class="is-num">{{ animStats.onSaleCount }}</strong> 件在售</span>
            <i></i>
            <span><strong class="is-num">{{ animStats.totalTradeCount }}</strong> 笔完成交易</span>
            <i></i>
            <span><strong class="is-num">{{ animStats.sellerCount }}</strong> 位校园卖家</span>
          </div>
        </div>

        <!-- 右侧真实商品浮动卡片 -->
        <div class="hero__right">
          <template v-if="floatCards.length">
            <div
              v-for="(g, i) in floatCards"
              :key="g.goodsId"
              class="float-card"
              :class="`float-card--${i}`"
              :style="floatStyle(i)"
              @click="goEntry"
            >
              <div class="float-card__inner" :style="{ animationDelay: `${i * 0.7}s` }">
                <img v-if="g.imageUrl" :src="g.imageUrl" :alt="g.goodsName" loading="lazy" />
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
      <button class="hero__scroll" @click="scrollTo('showcase')">
        <el-icon><ArrowDown /></el-icon>
      </button>
    </section>

    <!-- ============ 平台数据条 ============ -->
    <section class="stats" ref="statsRef" v-reveal>
      <div class="stats__inner">
        <div class="stat">
          <div class="stat__num is-num">{{ animStats.onSaleCount }}</div>
          <div class="stat__label">在售商品</div>
        </div>
        <div class="stat">
          <div class="stat__num is-num">{{ animStats.totalTradeCount }}</div>
          <div class="stat__label">已完成交易</div>
        </div>
        <div class="stat">
          <div class="stat__num is-num">{{ animStats.sellerCount }}</div>
          <div class="stat__label">校园卖家</div>
        </div>
        <div class="stat">
          <div class="stat__num is-num">{{ animStats.totalFavoriteCount }}</div>
          <div class="stat__label">累计收藏</div>
        </div>
        <div class="stat">
          <div class="stat__num is-num">{{ overview.avgTradeDays ?? 0 }}<small>天</small></div>
          <div class="stat__label">平均流转周期</div>
        </div>
      </div>
    </section>

    <!-- ============ 真实商品精选 ============ -->
    <section class="showcase" id="showcase" v-reveal>
      <div class="section__head">
        <h2>同学们正在出的好物</h2>
        <p>全部来自校园在售商品，登录后即可联系卖家</p>
      </div>

      <div v-if="loading.showcase" class="showcase__grid">
        <div v-for="i in 8" :key="i" class="skel"></div>
      </div>
      <div v-else-if="showcase.length" class="showcase__grid">
        <div v-for="g in showcase" :key="g.goodsId" class="goods" @click="goEntry">
          <div class="goods__cover">
            <img v-if="g.imageUrl" :src="g.imageUrl" :alt="g.goodsName" loading="lazy" />
            <div v-else class="goods__fallback"><el-icon><Picture /></el-icon></div>
            <span v-if="g.campus" class="goods__campus"><el-icon><Location /></el-icon>{{ g.campus }}</span>
          </div>
          <div class="goods__body">
            <div class="goods__name">{{ g.goodsName }}</div>
            <div class="goods__meta">
              <span class="goods__price">{{ formatPrice(g.price) }}</span>
              <span class="goods__stat"><el-icon><Star /></el-icon>{{ g.favoriteCount ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="showcase__empty">
        <p>校园市场正在上新中，成为第一个发布闲置的人</p>
        <button class="btn-primary btn-sm" @click="$router.push('/register')">立即加入</button>
      </div>
    </section>

    <!-- ============ 平台价值 ============ -->
    <section class="values" v-reveal>
      <div class="section__head">
        <h2>为什么是校园二手？</h2>
        <p>不是又一个商城，而是属于本校同学的闲置流转圈</p>
      </div>
      <div class="values__grid">
        <div v-for="v in values" :key="v.title" class="value">
          <div class="value__icon" :style="{ background: v.bg }">
            <el-icon><component :is="v.icon" /></el-icon>
          </div>
          <div class="value__title">{{ v.title }}</div>
          <div class="value__desc">{{ v.desc }}</div>
        </div>
      </div>
    </section>

    <!-- ============ 校园场景 ============ -->
    <section class="scenes" v-reveal>
      <div class="section__head">
        <h2>按校园生活场景逛逛</h2>
        <p>登录后进入对应场景的专属筛选</p>
      </div>
      <div class="scenes__grid">
        <button v-for="s in scenes" :key="s.key" class="scene" @click="goEntry">
          <div class="scene__icon" :style="{ background: s.bg }">
            <el-icon><component :is="s.icon" /></el-icon>
          </div>
          <div class="scene__name">{{ s.name }}</div>
          <div class="scene__desc">{{ s.desc }}</div>
        </button>
      </div>
    </section>

    <!-- ============ AI 助手入口 ============ -->
    <section class="ai" id="ai" v-reveal>
      <div class="ai__inner">
        <div class="ai__left">
          <span class="ai__badge">即将上线</span>
          <h2>AI 校园闲置助手</h2>
          <p>
            不知道买什么？直接告诉它你想找什么。
            自然语言理解 → 智能调用商品工具 → 为你整理推荐，
            校园二手交易平台即将拥有自己的 Agent。
          </p>
          <div class="ai__examples">
            <span v-for="q in aiExamples" :key="q" class="ai__chip">{{ q }}</span>
          </div>
          <button class="btn-primary" @click="goEntry">上线后第一时间体验</button>
        </div>
        <div class="ai__right">
          <el-icon class="ai__icon"><ChatLineSquare /></el-icon>
        </div>
      </div>
    </section>

    <!-- ============ 底部 CTA + Footer ============ -->
    <section class="final" v-reveal>
      <h2>让闲置在校园里温柔地重新流动</h2>
      <p>注册即成为校园市场的一员，出闲置、淘好物、认识同校同学</p>
      <div class="final__cta">
        <button class="btn-primary" @click="$router.push('/register')">免费注册</button>
        <button class="btn-outline" @click="$router.push('/login')">已有账号，去登录</button>
      </div>
    </section>

    <footer class="footer">
      <div class="footer__inner">
        <div class="footer__brand">校园二手交易平台</div>
        <div class="footer__desc">宿舍到宿舍的可信交易</div>
        <div class="footer__copy">© 2026 校园二手交易平台 · 学生课程作品</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  RefreshRight, MagicStick, Picture, ArrowDown, Location, Star,
  ChatLineSquare, School, CircleCheck, Switch, Cpu,
  House, Reading, Cellphone, Coffee, Bicycle, Basketball
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice } from '../utils/format'
import { SCENES } from '../utils/scenes'

const router = useRouter()
const isLogin = !!localStorage.getItem('token')

// ============ 数据 ============
const overview = ref({})
const showcase = ref([])
const loading = reactive({ showcase: true })

// Hero 浮动卡片：精选商品前 5 件
const floatCards = computed(() => showcase.value.slice(0, 5))

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

const values = [
  { title: '同校面交', desc: '宿舍楼下、图书馆门口就能完成交易，不寄快递不等物流', icon: School, bg: 'linear-gradient(135deg,#f7e1e3,#f4d5d8)' },
  { title: '真实学生', desc: '卖家都是经过审核的本校同学，身份可信、沟通无障碍', icon: CircleCheck, bg: 'linear-gradient(135deg,#f3e6d4,#ead9a0)' },
  { title: '闲置流转', desc: '毕业的带不走，刚好的你需要，让每件好物都被继续珍惜', icon: Switch, bg: 'linear-gradient(135deg,#f5e7a8,#ead9a0)' },
  { title: 'AI 助手', desc: '自然语言找好物、问订单、写文案，平台级 Agent 即将上线', icon: Cpu, bg: 'linear-gradient(135deg,#dde3e8,#ece3dc)' }
]

const aiExamples = [
  '帮我找 300 元以内的显示器',
  '有没有适合宿舍用的小桌子？',
  '我想找九成新的教材'
]

// ============ 导航 ============
const goEntry = () => {
  // 已登录直接进市场首页；未登录统一引导到登录页
  router.push(isLogin ? '/home' : '/login')
}
const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// ============ 数字递增 ============
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
    const ease = 1 - Math.pow(1 - p, 3)
    Object.keys(targets).forEach(k => { animStats[k] = Math.round(targets[k] * ease) })
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

let statsObserver = null
const observeStats = () => {
  if (!statsRef.value || statsObserver) return
  statsObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateStats()
      statsObserver.disconnect()
    }
  }, { threshold: 0.25 })
  statsObserver.observe(statsRef.value)
}

// ============ 区块进入动画（指令式，同 Home 根因修复）============
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
    el.classList.add('lp-reveal')
    ensureRevealObserver().observe(el)
  },
  unmounted(el) {
    if (revealObserver) revealObserver.unobserve(el)
  }
}

// ============ Hero 视差 ============
let mouse = { x: 0, y: 0 }
const onHeroMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  mouse.x = (e.clientX - rect.left) / rect.width - 0.5
  mouse.y = (e.clientY - rect.top) / rect.height - 0.5
}
const resetHero = () => { mouse.x = 0; mouse.y = 0 }
const floatStyle = (i) => {
  const depth = 6 + i * 5
  return { transform: `translate(${mouse.x * depth}px, ${mouse.y * depth}px)` }
}

// ============ 加载公开数据 ============
const loadOverview = async () => {
  try {
    overview.value = await request.get('/home/overview') || {}
  } catch (e) {
    overview.value = {}
  } finally {
    observeStats()
    // 数字条在首屏内，observer 兜底外再直接尝试一次
    animateStats()
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
})

onBeforeUnmount(() => {
  if (revealObserver) revealObserver.disconnect()
  if (statsObserver) statsObserver.disconnect()
})
</script>

<style scoped>
/* ============================================================
 * /landing 登录前产品首页 · 奶油色系（与全站方向一致）
 * ============================================================ */
.landing {
  --lp-bg-cream: #fbf6f0;
  --lp-pink-soft: #f7e1e3;
  --lp-apricot: #f3e6d4;
  --lp-milky: #f5ead0;
  --lp-yellow: #f5e7a8;
  --lp-primary: #e8b4b8;
  --lp-primary-hover: #dca0a4;
  --lp-primary-soft: #f4d5d8;
  --lp-accent: #d8b658;
  --lp-aux: #8e9aa6;
  --lp-text: #4a4548;
  --lp-text-soft: #8a7f80;
  --lp-border: #ece3dc;

  min-height: 100vh;
  background: var(--lp-bg-cream);
  color: var(--lp-text);
}

.is-num { font-variant-numeric: tabular-nums; }

/* 通用按钮 */
.btn-primary {
  border: none; cursor: pointer; border-radius: 14px; padding: 13px 30px;
  font-size: 15px; font-weight: 600; color: #fff;
  background: linear-gradient(135deg, var(--lp-primary), var(--lp-primary-hover));
  box-shadow: 0 10px 24px rgba(220, 160, 164, 0.35);
  transition: transform .2s ease, box-shadow .2s ease;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(220, 160, 164, 0.45); }
.btn-primary.btn-sm { padding: 9px 22px; font-size: 13.5px; border-radius: 12px; }
.btn-outline {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  border: 1.5px solid var(--lp-primary); background: rgba(255, 255, 255, 0.7);
  color: var(--lp-primary-hover); border-radius: 14px; padding: 12px 26px;
  font-size: 15px; font-weight: 600; transition: all .2s ease;
}
.btn-outline:hover { background: #fff; transform: translateY(-2px); }
.btn-ghost {
  border: none; background: transparent; cursor: pointer;
  color: var(--lp-text); font-size: 14px; font-weight: 600; padding: 9px 16px;
}
.btn-ghost:hover { color: var(--lp-primary-hover); }

/* 区块进入动画 */
.lp-reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
.lp-reveal.is-visible { opacity: 1; transform: none; }

/* ============ 顶部导航 ============ */
.nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(251, 246, 240, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--lp-border);
}
.nav__inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 28px;
  display: flex; align-items: center; justify-content: space-between;
}
.nav__brand { display: flex; align-items: center; gap: 10px; }
.nav__logo {
  width: 38px; height: 38px; border-radius: 12px;
  background: linear-gradient(135deg, var(--lp-primary), var(--lp-primary-hover));
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
}
.nav__name { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.1; }
.nav__name span { display: block; font-size: 9px; font-weight: 600; letter-spacing: 2px; color: var(--lp-text-soft); }
.nav__actions { display: flex; align-items: center; gap: 8px; }

/* ============ Hero ============ */
.hero { position: relative; overflow: hidden; }
.hero__bg {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, #fbf6f0 0%, #f7e1e3 30%, #f3e6d4 60%, #f5ead0 80%, #f5e7a8 100%);
}
.hero__inner {
  position: relative; z-index: 1;
  max-width: 1200px; margin: 0 auto; padding: 84px 28px 96px;
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 40px; align-items: center;
}
.hero__badge {
  display: inline-block; padding: 6px 16px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.7); color: var(--lp-primary-hover);
  font-size: 12.5px; font-weight: 600; letter-spacing: 0.5px;
  border: 1px solid rgba(232, 180, 184, 0.35);
}
.hero__title {
  font-size: 52px; font-weight: 800; line-height: 1.2;
  margin: 20px 0 16px; letter-spacing: 1px;
}
.hero__title-pink { color: var(--lp-primary-hover); }
.hero__subtitle {
  font-size: 16px; color: var(--lp-text-soft); line-height: 1.9;
  margin: 0 0 30px; max-width: 520px;
}
.hero__cta { display: flex; gap: 14px; flex-wrap: wrap; }
.hero__proof {
  margin-top: 34px; display: flex; align-items: center; gap: 16px;
  font-size: 13.5px; color: var(--lp-text-soft);
}
.hero__proof strong { font-size: 19px; font-weight: 800; color: var(--lp-text); margin-right: 2px; }
.hero__proof i { width: 1px; height: 16px; background: var(--lp-border); }
.hero__scroll {
  position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%);
  z-index: 2; width: 40px; height: 40px; border-radius: 50%;
  border: none; background: rgba(255, 255, 255, 0.75); color: var(--lp-primary-hover);
  font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  animation: bobDown 2s ease-in-out infinite;
}
@keyframes bobDown { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 6px); } }

/* 浮动卡片 */
.hero__right { position: relative; height: 380px; }
.float-card {
  position: absolute; border-radius: 18px; overflow: hidden; cursor: pointer;
  background: #fff; box-shadow: 0 14px 36px rgba(74, 69, 72, 0.14);
  border: 4px solid #fff; transition: transform .25s ease;
}
.float-card__inner {
  width: 100%; height: 100%; position: relative;
  animation: floatBob 6s ease-in-out infinite;
}
@keyframes floatBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.float-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.float-card__fallback {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--lp-apricot), #ead9a0); color: var(--lp-accent); font-size: 28px;
}
.float-card__price {
  position: absolute; left: 8px; bottom: 8px; background: rgba(255, 255, 255, 0.92);
  border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 700; color: var(--lp-accent);
}
.float-card--0 { width: 160px; height: 160px; top: 10px; right: 50px; z-index: 3; }
.float-card--1 { width: 118px; height: 118px; top: 160px; right: 200px; z-index: 2; }
.float-card--2 { width: 128px; height: 128px; top: 210px; right: 40px; z-index: 4; }
.float-card--3 { width: 100px; height: 100px; top: 40px; right: 220px; z-index: 2; }
.float-card--4 { width: 106px; height: 106px; top: 250px; right: 210px; z-index: 3; }
.float-card--placeholder { background: linear-gradient(135deg, #f0e6df, #f7eee7); }
.hero__float-skeleton .float-card { animation: floatBob 4s ease-in-out infinite; }

/* ============ 平台数据条 ============ */
.stats { background: #fff; border-block: 1px solid var(--lp-border); }
.stats__inner {
  max-width: 1200px; margin: 0 auto; padding: 34px 28px;
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;
}
.stat { text-align: center; }
.stat__num { font-size: 34px; font-weight: 800; color: var(--lp-primary-hover); line-height: 1; }
.stat__num small { font-size: 15px; font-weight: 700; margin-left: 2px; }
.stat__label { margin-top: 8px; font-size: 13px; color: var(--lp-text-soft); }

/* ============ 通用 section 头 ============ */
.section__head { text-align: center; margin-bottom: 34px; }
.section__head h2 { font-size: 30px; font-weight: 800; margin: 0; }
.section__head p { margin: 10px 0 0; font-size: 14px; color: var(--lp-text-soft); }

/* ============ 商品精选 ============ */
.showcase { max-width: 1200px; margin: 0 auto; padding: 72px 28px; }
.showcase__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.skel {
  height: 260px; border-radius: 18px;
  background: linear-gradient(90deg, #f0e6df 25%, #f7eee7 37%, #f0e6df 63%);
  background-size: 400% 100%; animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
.goods {
  background: #fff; border-radius: 18px; overflow: hidden; cursor: pointer;
  box-shadow: 0 6px 20px rgba(74, 69, 72, 0.06);
  transition: transform .25s ease, box-shadow .25s ease;
}
.goods:hover { transform: translateY(-5px); box-shadow: 0 16px 38px rgba(74, 69, 72, 0.13); }
.goods__cover { position: relative; height: 170px; background: linear-gradient(135deg, var(--lp-pink-soft), var(--lp-primary-soft)); }
.goods__cover img { width: 100%; height: 100%; object-fit: cover; }
.goods__fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--lp-primary); font-size: 34px; }
.goods__campus {
  position: absolute; top: 10px; left: 10px;
  display: inline-flex; align-items: center; gap: 3px;
  background: rgba(255, 255, 255, 0.92); border-radius: 999px; padding: 3px 10px;
  font-size: 11px; font-weight: 600; color: var(--lp-aux);
}
.goods__body { padding: 12px 14px 14px; }
.goods__name {
  font-size: 14px; font-weight: 600; color: var(--lp-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.goods__meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
.goods__price { font-size: 17px; font-weight: 800; color: var(--lp-accent); }
.goods__stat { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; color: var(--lp-text-soft); }
.showcase__empty {
  text-align: center; padding: 50px 20px; border-radius: 20px;
  background: linear-gradient(135deg, var(--lp-bg-cream), var(--lp-pink-soft));
  border: 1px dashed var(--lp-primary-soft);
}
.showcase__empty p { margin: 0 0 16px; color: var(--lp-text-soft); }

/* ============ 平台价值 ============ */
.values { background: linear-gradient(180deg, var(--lp-pink-soft), var(--lp-bg-cream)); padding: 72px 28px; }
.values__grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.value {
  background: rgba(255, 255, 255, 0.85); border-radius: 20px; padding: 26px 20px;
  text-align: center; transition: transform .25s ease, box-shadow .25s ease;
}
.value:hover { transform: translateY(-5px); box-shadow: 0 16px 36px rgba(74, 69, 72, 0.1); }
.value__icon {
  width: 58px; height: 58px; margin: 0 auto; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; font-size: 27px; color: var(--lp-text);
}
.value__title { margin-top: 14px; font-size: 16px; font-weight: 700; }
.value__desc { margin-top: 8px; font-size: 13px; color: var(--lp-text-soft); line-height: 1.7; }

/* ============ 校园场景 ============ */
.scenes { max-width: 1200px; margin: 0 auto; padding: 72px 28px; }
.scenes__grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
.scene {
  border: none; cursor: pointer; background: #fff; border-radius: 18px; padding: 20px 12px;
  box-shadow: 0 4px 16px rgba(74, 69, 72, 0.05); transition: transform .25s ease, box-shadow .25s ease;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.scene:hover { transform: translateY(-5px); box-shadow: 0 14px 32px rgba(74, 69, 72, 0.12); }
.scene__icon {
  width: 54px; height: 54px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center; font-size: 25px; color: var(--lp-text);
  transition: transform .4s ease;
}
.scene:hover .scene__icon { transform: rotate(-8deg) scale(1.06); }
.scene__name { font-size: 14px; font-weight: 700; }
.scene__desc { font-size: 11.5px; color: var(--lp-text-soft); }

/* ============ AI 入口 ============ */
.ai { max-width: 1200px; margin: 0 auto; padding: 20px 28px 72px; }
.ai__inner {
  border-radius: 26px; padding: 44px 48px;
  background: linear-gradient(135deg, var(--lp-pink-soft), var(--lp-apricot));
  display: grid; grid-template-columns: 1.6fr 1fr; gap: 24px; align-items: center;
  box-shadow: 0 12px 34px rgba(74, 69, 72, 0.08);
}
.ai__badge {
  display: inline-block; background: rgba(255, 255, 255, 0.75); color: var(--lp-primary-hover);
  border-radius: 999px; padding: 4px 14px; font-size: 12px; font-weight: 600;
  border: 1px solid rgba(232, 180, 184, 0.4);
}
.ai__left h2 { font-size: 30px; font-weight: 800; margin: 14px 0 12px; }
.ai__left p { font-size: 14.5px; color: var(--lp-text-soft); line-height: 1.9; margin: 0 0 18px; max-width: 560px; }
.ai__examples { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.ai__chip {
  background: rgba(255, 255, 255, 0.75); border-radius: 999px; padding: 6px 14px;
  font-size: 12.5px; color: var(--lp-text); border: 1px solid var(--lp-border);
}
.ai__right { display: flex; justify-content: center; }
.ai__icon { font-size: 130px; color: var(--lp-primary); opacity: 0.55; }

/* ============ 底部 CTA ============ */
.final { text-align: center; padding: 30px 28px 80px; }
.final h2 { font-size: 32px; font-weight: 800; margin: 0; }
.final p { margin: 14px 0 26px; font-size: 15px; color: var(--lp-text-soft); }
.final__cta { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }

/* ============ Footer ============ */
.footer { border-top: 1px solid var(--lp-border); background: linear-gradient(180deg, #fbf6f0, #f5ede3); }
.footer__inner { max-width: 1200px; margin: 0 auto; padding: 30px 28px; text-align: center; }
.footer__brand { font-size: 15px; font-weight: 800; }
.footer__desc { margin-top: 4px; font-size: 12.5px; color: var(--lp-text-soft); }
.footer__copy { margin-top: 14px; font-size: 11.5px; color: var(--lp-text-soft); }

/* ============ 响应式 ============ */
@media (max-width: 1100px) {
  .hero__inner { grid-template-columns: 1fr; padding: 60px 24px 80px; }
  .hero__right { display: none; }
  .hero__title { font-size: 40px; }
  .stats__inner { grid-template-columns: repeat(3, 1fr); row-gap: 24px; }
  .showcase__grid, .values__grid { grid-template-columns: repeat(2, 1fr); }
  .scenes__grid { grid-template-columns: repeat(3, 1fr); }
  .ai__inner { grid-template-columns: 1fr; padding: 34px 28px; }
  .ai__right { display: none; }
}
@media (max-width: 640px) {
  .hero__title { font-size: 32px; }
  .stats__inner { grid-template-columns: repeat(2, 1fr); }
  .showcase__grid, .scenes__grid { grid-template-columns: repeat(2, 1fr); }
  .values__grid { grid-template-columns: 1fr; }
}
</style>
