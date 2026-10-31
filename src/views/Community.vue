<template>
  <!--
    校园社区动态（列表页 /community）
    视觉定位：紫罗兰 + 天空蓝的单栏阅读型内容流（居中 680px），刻意区别于商品网格与求购便签墙。

    真实接口（无假数据，全部走后端）：
      GET    /community/page            分页（keyword/topic/sortBy/pageNum/pageSize）
      GET    /community/mine            我的动态
      POST   /community                 发布
      PUT    /community                 编辑（仅本人）
      DELETE /community/{id}            删除（仅本人）
      POST   /community/{id}/like       点赞 / 取消点赞（切换）

    注意：后端依赖 community_* 表，需先手动执行 campus-trade/sql/v1.2-community.sql；
          接口 500 时页面显示「数据表尚未初始化」横幅；401 时提示登录。
  -->
  <div class="community-page">

    <!-- 1. 社区头部横幅：紫罗兰渐变 + 光斑气泡 -->
    <section class="community-hero">
      <div class="community-hero__bubble community-hero__bubble--a"></div>
      <div class="community-hero__bubble community-hero__bubble--b"></div>
      <div class="community-hero__bubble community-hero__bubble--c"></div>
      <div class="community-hero__copy">
        <span class="community-hero__eyebrow">CAMPUS COMMUNITY · 校园社区</span>
        <h1 class="community-hero__title">校园里正在发生</h1>
        <p class="community-hero__sub">分享闲置、聊聊体验、记录每一次循环新生</p>
        <button type="button" class="community-hero__publish" @click="openCreate">
          <el-icon><Plus /></el-icon>发布动态
        </button>
      </div>
      <div v-if="heroStats.length" class="community-hero__stats">
        <div v-for="s in heroStats" :key="s.label" class="hero-stat">
          <span class="hero-stat__num is-num">{{ s.value }}</span>
          <span class="hero-stat__label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- 2. 未登录提示（Token 过期 / 无登录态时优雅降级） -->
    <div v-if="needLogin" class="notice notice--auth">
      <el-icon class="notice__icon"><Lock /></el-icon>
      <div class="notice__body">
        <div class="notice__title">登录后才能使用校园社区</div>
        <div class="notice__desc">社区动态、评论与点赞都需要登录身份，请先登录再回来逛逛。</div>
      </div>
      <el-button type="primary" round @click="goLogin">去登录</el-button>
    </div>

    <!-- 3. 数据表未初始化提示（接口 500 时出现，不做假数据兜底） -->
    <div v-if="setupPending" class="notice notice--setup">
      <el-icon class="notice__icon"><WarningFilled /></el-icon>
      <div class="notice__body">
        <div class="notice__title">社区数据表尚未初始化</div>
        <div class="notice__desc">请先在数据库执行 sql/v1.2-community.sql 后再使用。</div>
      </div>
    </div>

    <!-- 4. 视图切换：全部动态 / 我的动态 -->
    <div class="tabs">
      <button
          type="button"
          class="tab"
          :class="{ 'tab--on': activeTab === 'feed' }"
          @click="switchTab('feed')"
      >
        <el-icon><Compass /></el-icon>全部动态
      </button>
      <button
          type="button"
          class="tab"
          :class="{ 'tab--on': activeTab === 'mine' }"
          @click="switchTab('mine')"
      >
        <el-icon><User /></el-icon>我的动态
      </button>
    </div>

    <!-- 5. 筛选区（仅「全部动态」） -->
    <section v-if="activeTab === 'feed'" class="filters">
      <div class="filters__row">
        <el-input
            v-model="keyword"
            class="filters__search"
            placeholder="搜索动态标题，如「宿舍好物」「二手书」"
            clearable
            :prefix-icon="Search"
            @input="onKeywordInput"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
        />

        <el-select v-model="sortBy" class="filters__select" @change="handleSearch">
          <el-option label="最新发布" value="latest" />
          <el-option label="最热动态" value="hot" />
        </el-select>
      </div>
    </section>

    <!-- 5.1 话题 chips：从已加载动态聚合 distinct topic（空 topic 排除） -->
    <div v-if="activeTab === 'feed' && topicChips.length" class="topic-row">
      <span class="topic-row__label"><el-icon><PriceTag /></el-icon>话题</span>
      <div class="chips">
        <button
            type="button"
            class="chip"
            :class="{ 'chip--on': !topic }"
            @click="selectTopic('')"
        >全部</button>
        <button
            v-for="t in topicChips"
            :key="t"
            type="button"
            class="chip"
            :class="{ 'chip--on': topic === t }"
            @click="selectTopic(t)"
        >{{ t }}</button>
      </div>
    </div>

    <!-- 「我的动态」工具条 -->
    <section v-if="activeTab === 'mine'" class="mine-bar">
      <span class="mine-bar__text">
        这里是你发布的全部动态，可编辑或删除
      </span>
      <el-button type="primary" round @click="openCreate">
        <el-icon><Plus /></el-icon>发布动态
      </el-button>
    </section>

    <!-- 6. 结果信息条 -->
    <div v-if="activeTab === 'feed'" class="result-bar">
      <span class="result-bar__count">
        当前展示 <strong class="is-num">{{ total }}</strong> 条动态
      </span>
      <span v-if="hasFilters" class="result-bar__hint">已按筛选条件展示</span>
    </div>

    <!-- 7. 骨架屏（文本流样式） -->
    <div v-if="loading && currentList.length === 0" class="feed">
      <div v-for="n in 4" :key="n" class="sk-card">
        <div class="sk-head">
          <div class="sk-avatar"></div>
          <div class="sk-head__lines">
            <div class="sk-line sk-line--md"></div>
            <div class="sk-line sk-line--sm"></div>
          </div>
        </div>
        <div class="sk-line sk-line--lg"></div>
        <div class="sk-line"></div>
        <div class="sk-line"></div>
        <div class="sk-line sk-line--sm"></div>
      </div>
    </div>

    <!-- 8. 加载失败 -->
    <div v-else-if="loadError" class="state-block">
      <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
      <p class="state-block__title">{{ needLogin ? '登录状态已失效' : '加载失败，请重试' }}</p>
      <p class="state-block__desc">{{ loadErrorDesc }}</p>
      <div class="state-block__actions">
        <el-button type="primary" round @click="reload">
          <el-icon><Refresh /></el-icon>重新加载
        </el-button>
        <el-button v-if="needLogin" round @click="goLogin">去登录</el-button>
      </div>
    </div>

    <!-- 9. 空状态 -->
    <div v-else-if="currentList.length === 0" class="state-block">
      <el-icon class="state-block__icon state-block__icon--soft"><Notebook /></el-icon>
      <p class="state-block__title">{{ emptyTitle }}</p>
      <p class="state-block__desc">{{ emptyDesc }}</p>
      <el-button type="primary" round @click="hasFilters ? resetFilters() : openCreate()">
        {{ hasFilters ? '清空筛选条件' : '发布第一条动态' }}
      </el-button>
    </div>

    <!-- 10. 内容流：单栏阅读型卡片（居中 680px，刻意区别于商品网格） -->
    <div v-else class="feed">
      <article
          v-for="(post, index) in currentList"
          :key="post.postId"
          :ref="setCardEl(post.postId)"
          class="post-card pre-in"
          :style="{ '--d': `${(index % pageSize) * 60}ms` }"
          @click="goDetail(post.postId)"
      >
        <!-- 头部：头像（用户名 hash 配色）+ 昵称 + 相对时间 + 话题 pill -->
        <header class="post-card__head">
          <span
              class="post-card__avatar"
              :class="`post-card__avatar--${avatarTone(post)}`"
          >{{ initial(displayName(post)) }}</span>
          <div class="post-card__who">
            <span class="post-card__author">{{ displayName(post) }}</span>
            <span class="post-card__time">{{ formatRelativeTime(post.createTime) }}</span>
          </div>
          <span
              v-if="post.topic"
              class="ribbon"
              :class="`ribbon--${topicKey(post.topic)}`"
          >{{ post.topic }}</span>
        </header>

        <h3 class="post-card__title">{{ post.title }}</h3>
        <p class="post-card__excerpt" :ref="setExcerptEl(post.postId)">{{ post.content }}</p>
        <button
            v-if="expandable.has(post.postId)"
            type="button"
            class="post-card__more"
            @click.stop="goDetail(post.postId)"
        >展开</button>

        <!-- 配图：URL 先经 resolveGoodsImage 过滤；点击可放大预览，不触发卡片跳转 -->
        <div v-if="postImage(post)" class="post-card__cover" @click.stop>
          <el-image
              :src="postImage(post)"
              :alt="post.title"
              fit="cover"
              loading="lazy"
              :preview-src-list="[postImage(post)]"
              preview-teleported
              hide-on-click-modal
              :initial-index="0"
              @error="onImgError(post)"
          />
        </div>

        <!-- 关联商品入口 -->
        <button
            v-if="post.goodsId"
            type="button"
            class="post-card__goods"
            @click.stop="goGoods(post.goodsId)"
        >
          <el-icon><Goods /></el-icon>
          <span>查看提到的商品</span>
          <el-icon class="post-card__goods-arrow"><ArrowRight /></el-icon>
        </button>

        <!-- 底部互动条 -->
        <footer class="post-card__foot">
          <button
              type="button"
              class="stat stat--like"
              :class="{ 'stat--on': post.liked, 'is-beating': beatingId === post.postId }"
              @click.stop="toggleLike(post)"
          >
            <svg class="heart-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                  d="M12 20.4c-.38 0-.74-.12-1.04-.35C7.14 16.7 3.6 13.5 3.6 9.98c0-2.6 2.06-4.68 4.62-4.68 1.44 0 2.8.68 3.78 1.84a4.96 4.96 0 0 1 3.78-1.84c2.56 0 4.62 2.08 4.62 4.68 0 3.52-3.54 6.72-7.36 10.07-.3.23-.66.35-1.04.35z"
                  :fill="post.liked ? 'currentColor' : 'none'"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linejoin="round"
              />
            </svg>
            <span class="is-num">{{ post.likeCount ?? 0 }}</span>
          </button>
          <span class="stat">
            <el-icon><ChatDotRound /></el-icon>
            <span class="is-num">{{ post.commentCount ?? 0 }}</span>
          </span>
          <span class="stat stat--muted">
            <el-icon><View /></el-icon>
            <span class="is-num">{{ post.viewCount ?? 0 }}</span>
          </span>

          <!-- 我的动态：编辑 / 删除 -->
          <span v-if="activeTab === 'mine'" class="post-card__own-ops">
            <button type="button" class="own-btn" @click.stop="openEdit(post)">
              <el-icon><Edit /></el-icon>编辑
            </button>
            <button
                type="button"
                class="own-btn own-btn--danger"
                :disabled="deletingId === post.postId"
                @click.stop="deletePost(post)"
            >
              <el-icon><Delete /></el-icon>删除
            </button>
          </span>
        </footer>
      </article>
    </div>

    <!-- 11. 分页（仅「全部动态」） -->
    <div v-if="activeTab === 'feed' && total > 0 && !loadError" class="pager">
      <el-pagination
          layout="total, prev, pager, next, jumper"
          background
          :total="total"
          :page-size="pageSize"
          :current-page="pageNum"
          @current-change="onPageChange"
      />
    </div>

    <!-- ============ 发布 / 编辑抽屉 ============ -->
    <el-drawer
        v-model="formVisible"
        :title="isEdit ? '编辑动态' : '发布动态'"
        direction="rtl"
        size="540px"
    >
      <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-position="top"
      >
        <el-form-item label="标题" prop="title">
          <el-input
              v-model="form.title"
              maxlength="60"
              show-word-limit
              placeholder="一句话概括这条动态，如「宿舍翻新好物分享」"
          />
        </el-form-item>

        <el-form-item label="主题" prop="topic">
          <el-select v-model="form.topic" placeholder="选择主题标签" style="width: 100%">
            <el-option v-for="t in TOPICS" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>

        <el-form-item label="正文" prop="content">
          <el-input
              v-model="form.content"
              type="textarea"
              :rows="6"
              maxlength="2000"
              show-word-limit
              placeholder="展开说说你的分享、体验或经验…"
          />
        </el-form-item>

        <el-form-item label="配图（可选）" prop="imageUrl">
          <!-- 普通用户只需选择本地图片，不需要理解图片路径 -->
          <div class="cover-uploader">
            <input
                ref="coverInputRef"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                class="cover-uploader__input"
                @change="handleCoverChange"
            >

            <div v-if="form.imageUrl" class="cover-preview">
              <img :src="form.imageUrl" alt="配图预览">
              <div class="cover-preview__mask">
                <el-icon v-if="coverUploading" class="is-loading"><Loading /></el-icon>
                <span v-else>已上传</span>
              </div>
            </div>

            <button
                v-else
                type="button"
                class="cover-picker"
                :disabled="coverUploading"
                @click="chooseCover"
            >
              <el-icon v-if="coverUploading" class="is-loading"><Loading /></el-icon>
              <el-icon v-else><Plus /></el-icon>
              <span>{{ coverUploading ? '图片上传中…' : '添加图片' }}</span>
              <small>JPG / PNG / GIF / WEBP，不超过 5MB</small>
            </button>

            <div class="cover-uploader__ops">
              <el-button
                  v-if="form.imageUrl"
                  size="small"
                  round
                  :disabled="coverUploading"
                  @click="chooseCover"
              >
                重新选择
              </el-button>
              <el-button
                  v-if="form.imageUrl"
                  size="small"
                  round
                  plain
                  type="danger"
                  :disabled="coverUploading"
                  @click="removeCover"
              >
                删除图片
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="关联商品ID（可选）" prop="goodsId">
          <el-input-number
              v-model="form.goodsId"
              :min="1"
              :controls="false"
              placeholder="填写已发布商品的ID即可关联"
              style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button round @click="formVisible = false">取消</el-button>
        <el-button type="primary" round :loading="formSubmitting" @click="submitForm">
          {{ isEdit ? '保存修改' : '立即发布' }}
        </el-button>
      </template>
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Compass, User, PriceTag, Notebook,
  ChatDotRound, View, Edit, Delete, Refresh, Lock, WarningFilled,
  CircleCloseFilled, Goods, ArrowRight, Loading
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatRelativeTime } from '../utils/format'
import { resolveGoodsImage } from '../utils/image'
import { uploadImage } from '../utils/upload'

const router = useRouter()

const TOPICS = ['闲置分享', '使用体验', '交易经验', '环保循环']

// =========================
// 列表状态
// =========================
const pageSize = 8
const activeTab = ref('feed')
const keyword = ref('')
const topic = ref('')
const sortBy = ref('latest')
const pageNum = ref(1)
const total = ref(0)

const feedList = ref([])
const mineList = ref([])
const loading = ref(false)
const loadError = ref(false)

// 降级标记
const setupPending = ref(false)   // 疑似 community_* 表尚未初始化（接口 500）
const needLogin = ref(false)      // 未登录 / Token 失效（接口 401）

const deletingId = ref(null)
const beatingId = ref(null)

const currentList = computed(() => activeTab.value === 'mine' ? mineList.value : feedList.value)

const hasFilters = computed(() => !!keyword.value || !!topic.value)

// =========================
// 话题聚合 / 横幅统计（全部来自已加载真实数据，客户端计算）
// =========================
const knownTopics = ref([])

const mergeTopics = (list) => {
  const set = new Set(knownTopics.value)
  let changed = false
  for (const p of list) {
    const t = (p.topic || '').trim()
    if (t && !set.has(t)) {
      set.add(t)
      changed = true
    }
  }
  if (changed) knownTopics.value = [...set]
}

const topicChips = computed(() => knownTopics.value)

const heroStats = computed(() => {
  if (loadError.value) return []
  const stats = []
  if (activeTab.value === 'feed') {
    if (total.value > 0) stats.push({ label: '社区动态', value: total.value })
    if (topicChips.value.length > 0) stats.push({ label: '话题', value: topicChips.value.length })
  } else if (mineList.value.length > 0) {
    stats.push({ label: '我的动态', value: mineList.value.length })
  }
  return stats
})

const emptyTitle = computed(() => {
  if (activeTab.value === 'mine') return '你还没有发布过动态'
  return hasFilters.value ? '没有找到符合条件的动态' : '还没有动态，来发第一条'
})

const emptyDesc = computed(() => {
  if (activeTab.value === 'mine') return '发布一条动态，让同学们看到你的分享'
  return hasFilters.value
      ? '换个关键词或清空主题筛选再试试'
      : '成为第一个分享的人，聊聊你的闲置与体验'
})

const loadErrorDesc = computed(() =>
    setupPending.value
        ? '社区数据表尚未初始化，请先在数据库执行 sql/v1.2-community.sql。'
        : '社区动态暂时无法连接，可能是网络波动，稍后再试一次。'
)

// =========================
// 工具方法
// =========================
const topicKey = (t) => {
  const map = {
    '闲置分享': 'idle',
    '使用体验': 'experience',
    '交易经验': 'trade',
    '环保循环': 'eco'
  }
  return map[t] || 'idle'
}

const initial = (name) => (name || '同').charAt(0).toUpperCase()

const displayName = (post) => post.authorName || post.username || '匿名同学'

// 头像配色：按用户名 charCode 累加 hash，从 5 个主题色中取一个
const AVATAR_TONES = ['violet', 'teal', 'coral', 'amber', 'sky']

const avatarTone = (post) => {
  const name = displayName(post)
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

// 配图：先经 resolveGoodsImage 过滤不可达地址；加载失败记入 brokenImages 后隐藏图区
const brokenImages = reactive(new Set())

const postImage = (post) => {
  if (brokenImages.has(post.postId)) return ''
  return resolveGoodsImage(post.imageUrl)
}

const onImgError = (post) => {
  brokenImages.add(post.postId)
}

// =========================
// 入场动画 / 「展开」测量
// =========================
const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

const expandable = reactive(new Set())
const excerptEls = new Map()
const cardEls = new Map()

const setExcerptEl = (id) => (el) => {
  if (el) excerptEls.set(id, el)
  else excerptEls.delete(id)
}

const setCardEl = (id) => (el) => {
  if (el) cardEls.set(id, el)
  else cardEls.delete(id)
}

// 正文 4 行截断后仍溢出，才显示「展开」
const measureExpandable = () => {
  expandable.clear()
  excerptEls.forEach((el, id) => {
    if (el.scrollHeight > el.clientHeight + 2) expandable.add(id)
  })
}

let cardObserver = null

const observeCards = () => {
  if (reduceMotion || typeof IntersectionObserver !== 'function') {
    cardEls.forEach((el) => el.classList.add('is-in'))
    return
  }
  cardObserver?.disconnect()
  cardObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in')
        cardObserver.unobserve(entry.target)
      }
    }
  }, { threshold: 0.08 })
  cardEls.forEach((el) => cardObserver.observe(el))
}

const afterListRender = () => {
  nextTick(() => {
    observeCards()
    measureExpandable()
  })
}

const onResize = () => measureExpandable()

// 依据错误响应判定降级类型
const classifyError = (error) => {
  const status = error?.response?.status
  if (status === 401) {
    needLogin.value = true
  } else if (status && status >= 500) {
    setupPending.value = true
  }
}

// =========================
// 数据加载
// =========================
const loadFeed = async () => {
  loading.value = true
  loadError.value = false

  try {
    const result = await request.get('/community/page', {
      params: {
        keyword: keyword.value || undefined,
        topic: topic.value || undefined,
        sortBy: sortBy.value,
        pageNum: pageNum.value,
        pageSize
      }
    })

    feedList.value = Array.isArray(result?.list) ? result.list : []
    total.value = Number(result?.total) || 0
    mergeTopics(feedList.value)
    afterListRender()
  } catch (error) {
    classifyError(error)
    loadError.value = true
    feedList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadMine = async () => {
  loading.value = true
  loadError.value = false

  try {
    const result = await request.get('/community/mine')
    mineList.value = Array.isArray(result) ? result : []
    total.value = mineList.value.length
    afterListRender()
  } catch (error) {
    classifyError(error)
    loadError.value = true
    mineList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadCurrent = () => (activeTab.value === 'mine' ? loadMine() : loadFeed())

const reload = () => loadCurrent()

const switchTab = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  pageNum.value = 1
  loadCurrent()
}

// =========================
// 筛选交互
// =========================
let searchTimer = null

const onKeywordInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNum.value = 1
    loadFeed()
  }, 420)
}

const handleSearch = () => {
  clearTimeout(searchTimer)
  pageNum.value = 1
  loadFeed()
}

const selectTopic = (t) => {
  topic.value = topic.value === t ? '' : t
  handleSearch()
}

const resetFilters = () => {
  keyword.value = ''
  topic.value = ''
  sortBy.value = 'latest'
  pageNum.value = 1
  loadFeed()
}

const onPageChange = (page) => {
  pageNum.value = page
  loadFeed()
  const el = document.querySelector('.content')
  if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
}

const goDetail = (postId) => {
  router.push(`/community/${postId}`)
}

const goGoods = (goodsId) => {
  router.push(`/goods/${goodsId}`)
}

const goLogin = () => {
  router.push({ path: '/login', query: { redirect: '/community' } })
}

// =========================
// 点赞切换（真实接口）
// =========================
const toggleLike = async (post) => {
  // 心跳缩放动画（300ms），与接口请求并行
  beatingId.value = post.postId
  setTimeout(() => {
    if (beatingId.value === post.postId) beatingId.value = null
  }, 300)

  try {
    const res = await request.post(`/community/${post.postId}/like`)

    if (res && typeof res === 'object') {
      post.liked = !!res.liked
      post.likeCount = Number(res.likeCount) || 0
    }
  } catch (error) {
    classifyError(error)
  }
}

// =========================
// 发布 / 编辑表单
// =========================
const formVisible = ref(false)
const isEdit = ref(false)
const formSubmitting = ref(false)
const formRef = ref()

const form = reactive({
  postId: null,
  title: '',
  topic: '',
  content: '',
  imageUrl: '',
  goodsId: null
})

// 配图上传：走系统文件选择器 → /api/upload/image → 相对 URL 存到 imageUrl
const coverInputRef = ref(null)
const coverUploading = ref(false)

const chooseCover = () => {
  if (coverUploading.value) return
  coverInputRef.value?.click()
}

const handleCoverChange = async (event) => {
  const file = event.target.files && event.target.files[0]

  // 允许连续选择同一张图片时再次触发 change
  event.target.value = ''

  if (!file) return

  coverUploading.value = true

  try {
    // uploadImage 内部已校验类型 / 大小 / 登录态，并返回后端相对 URL
    const url = await uploadImage(file)
    form.imageUrl = url
    ElMessage.success('图片已上传')
  } catch (error) {
    ElMessage.error(error?.message || '图片上传失败，请稍后重试')
  } finally {
    coverUploading.value = false
  }
}

// 删除配图：只解除与这条动态的关联，不删除服务器文件（可能被其它内容引用）
const removeCover = () => {
  form.imageUrl = ''
}

const formRules = {
  title: [
    { required: true, message: '请填写动态标题', trigger: 'blur' },
    { max: 60, message: '标题不超过 60 个字', trigger: 'blur' }
  ],
  topic: [{ required: true, message: '请选择主题标签', trigger: 'change' }],
  content: [
    { required: true, message: '请填写动态正文', trigger: 'blur' },
    { max: 2000, message: '正文不超过 2000 个字', trigger: 'blur' }
  ]
}

const resetForm = () => {
  form.postId = null
  form.title = ''
  form.topic = ''
  form.content = ''
  form.imageUrl = ''
  form.goodsId = null
  formRef.value?.clearValidate?.()
}

const openCreate = () => {
  isEdit.value = false
  resetForm()
  formVisible.value = true
}

const openEdit = (post) => {
  isEdit.value = true
  form.postId = post.postId
  form.title = post.title || ''
  form.topic = post.topic || ''
  form.content = post.content || ''
  form.imageUrl = post.imageUrl || ''
  form.goodsId = post.goodsId ?? null
  formVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return

  // 图片还在上传时不允许提交，避免把未完成的配图当成正式地址
  if (coverUploading.value) {
    ElMessage.warning('配图正在上传，请稍候再发布')
    return
  }

  if (formSubmitting.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  formSubmitting.value = true

  const payload = {
    title: form.title.trim(),
    topic: form.topic,
    content: form.content.trim(),
    imageUrl: form.imageUrl ? form.imageUrl.trim() : null,
    goodsId: form.goodsId ?? null
  }

  try {
    if (isEdit.value) {
      const result = await request.put('/community', { postId: form.postId, ...payload })

      if (result === '动态更新成功') {
        ElMessage.success(result)
        formVisible.value = false
        await loadCurrent()
      } else {
        ElMessage.error(result || '动态更新失败')
      }
    } else {
      const result = await request.post('/community', payload)

      if (String(result).startsWith('动态发布成功')) {
        ElMessage.success(result)
        formVisible.value = false
        activeTab.value = 'feed'
        pageNum.value = 1
        await loadFeed()
      } else {
        ElMessage.error(result || '动态发布失败')
      }
    }
  } catch (error) {
    classifyError(error)
  } finally {
    formSubmitting.value = false
  }
}

// =========================
// 删除（二次确认）
// =========================
const deletePost = async (post) => {
  try {
    await ElMessageBox.confirm(
        `删除后该动态及其评论、点赞都会被清除，确定删除「${post.title}」吗？`,
        '删除动态',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (error) {
    return
  }

  deletingId.value = post.postId

  try {
    const result = await request.delete(`/community/${post.postId}`)

    if (result === '动态已删除') {
      ElMessage.success(result)
      await loadCurrent()
    } else {
      ElMessage.error(result || '删除失败')
    }
  } catch (error) {
    classifyError(error)
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  loadFeed()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  cardObserver?.disconnect()
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>

.community-page {
  /* 低饱和暖绿：仅用于「环保循环」主题标签，与奶油/杏色系协调，非高饱和、非紫色 */
  --eco-ink: #6f8f78;
  --eco-bg: #e8f0e6;
  width: 100%;
}

/* ============================================================
 * 社区头部横幅（紫罗兰渐变 + 光斑气泡）
 * ============================================================ */

.community-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 34px 36px;
  margin-bottom: 18px;
  border-radius: var(--brand-radius-xl);
  border: 1px solid rgba(139, 127, 192, 0.35);
  overflow: hidden;
  background:
    radial-gradient(circle at 86% 12%, rgba(255, 255, 255, 0.28), transparent 42%),
    radial-gradient(circle at 10% 92%, rgba(174, 200, 226, 0.35), transparent 48%),
    var(--grad-violet-pink);
  box-shadow: 0 14px 34px rgba(107, 95, 160, 0.22);
}

.community-hero__bubble {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  filter: blur(2px);
  pointer-events: none;
}

.community-hero__bubble--a {
  width: 200px;
  height: 200px;
  top: -70px;
  right: -50px;
}

.community-hero__bubble--b {
  width: 110px;
  height: 110px;
  bottom: -40px;
  left: 12%;
  background: rgba(255, 255, 255, 0.10);
}

.community-hero__bubble--c {
  width: 54px;
  height: 54px;
  top: 26px;
  left: 42%;
  background: rgba(255, 255, 255, 0.14);
}

.community-hero__copy {
  position: relative;
  min-width: 0;
}

.community-hero__eyebrow {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 2.4px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
}

.community-hero__title {
  margin: 8px 0 6px;
  font-size: 31px;
  line-height: 1.2;
  letter-spacing: 1.5px;
  color: #fff;
}

.community-hero__sub {
  margin: 0 0 16px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.82);
}

.community-hero__publish {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  border: none;
  border-radius: 999px;
  background: #fff;
  color: var(--campus-violet-deep);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(74, 58, 122, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.community-hero__publish:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(74, 58, 122, 0.32);
}

.community-hero__stats {
  position: relative;
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 104px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-lg);
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(4px);
}

.hero-stat__num {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  color: #fff;
}

.hero-stat__label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

/* ============================================================
 * 提示横幅
 * ============================================================ */

.notice {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-lg);
}

.notice__icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notice__body {
  flex: 1;
  min-width: 0;
}

.notice__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
}

.notice__desc {
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--brand-text-regular);
}

.notice--setup {
  background: var(--campus-sky-soft);
  border: 1px solid rgba(93, 131, 168, 0.4);
}

.notice--setup .notice__icon {
  color: var(--campus-sky-deep);
}

.notice--auth {
  background: var(--campus-violet-soft);
  border: 1px solid rgba(139, 127, 192, 0.5);
}

.notice--auth .notice__icon {
  color: var(--campus-violet-deep);
}

/* ============================================================
 * 视图切换 tab
 * ============================================================ */

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  border-radius: 999px;
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  color: var(--brand-text-regular);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  border-color: var(--campus-violet);
  color: var(--campus-violet-deep);
}

.tab--on {
  background: var(--campus-violet-soft);
  border-color: var(--campus-violet);
  color: var(--campus-violet-deep);
  box-shadow: var(--brand-shadow-sm);
}

/* ============================================================
 * 筛选区 / 我的动态工具条
 * ============================================================ */

.filters {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
}

.filters__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filters__search {
  width: 320px;
}

.filters__select {
  width: 150px;
}

.topic-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
  padding: 0 4px;
}

.topic-row__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-text-secondary);
  min-width: 52px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  color: var(--brand-text-regular);
  font-size: 12.5px;
  padding: 5px 15px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  border-color: var(--campus-violet);
  color: var(--campus-violet-deep);
}

.chip--on {
  font-weight: 600;
  background: var(--campus-violet-soft);
  border-color: var(--campus-violet);
  color: var(--campus-violet-deep);
  box-shadow: 0 3px 10px rgba(139, 127, 192, 0.22);
}

.mine-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 16px 18px;
  margin-bottom: 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--campus-violet-soft);
  border: 1px solid rgba(139, 127, 192, 0.35);
}

.mine-bar__text {
  font-size: 13px;
  color: var(--brand-text-regular);
}

/* ============================================================
 * 结果条
 * ============================================================ */

.result-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.result-bar__count strong {
  margin: 0 3px;
  font-size: 15px;
  color: var(--brand-text);
}

.result-bar__hint {
  padding: 2px 10px;
  font-size: 11.5px;
  border-radius: 10px;
  background: var(--campus-sky-soft);
  color: var(--campus-sky-deep);
}

/* ============================================================
 * 内容流：单栏阅读型卡片（居中 680px，区别于商品网格）
 * ============================================================ */

.feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 680px;
  margin: 0 auto;
}

.post-card {
  padding: 18px 22px 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  cursor: pointer;
  transition: box-shadow 0.28s ease, border-color 0.28s ease;
}

.post-card:hover {
  border-color: var(--campus-violet);
  box-shadow: 0 14px 34px rgba(107, 95, 160, 0.16);
}

/* 进入视口 fade-up（stagger 由 --d 控制，60ms 一档） */
.post-card.pre-in {
  opacity: 0;
  transform: translateY(16px);
}

.post-card.is-in {
  animation: fade-up 0.5s ease both;
  animation-delay: var(--d, 0ms);
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 头部：头像 + 昵称 + 相对时间 + 话题 pill */
.post-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.post-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.post-card__avatar--violet {
  background: linear-gradient(135deg, var(--campus-violet), var(--campus-violet-deep));
}

.post-card__avatar--teal {
  background: linear-gradient(135deg, var(--campus-teal), var(--campus-teal-deep));
}

.post-card__avatar--coral {
  background: linear-gradient(135deg, var(--campus-coral), var(--campus-coral-deep));
}

.post-card__avatar--amber {
  background: linear-gradient(135deg, var(--campus-amber), var(--campus-amber-deep));
}

.post-card__avatar--sky {
  background: var(--grad-sky-calm);
}

.post-card__who {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.35;
}

.post-card__author {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-card__time {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

/* 话题 pill */
.ribbon {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 999px;
  color: var(--campus-violet-deep);
  background: var(--campus-violet-soft);
}

.ribbon--experience {
  color: var(--campus-sky-deep);
  background: var(--campus-sky-soft);
}

.ribbon--trade {
  color: var(--campus-amber-deep);
  background: var(--campus-amber-soft);
}

.ribbon--eco {
  color: var(--eco-ink);
  background: var(--eco-bg);
}

.post-card__title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--brand-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card:hover .post-card__title {
  color: var(--campus-violet-deep);
}

.post-card__excerpt {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--brand-text-regular);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-card__more {
  margin: 4px 0 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--campus-violet-deep);
  cursor: pointer;
}

.post-card__more:hover {
  text-decoration: underline;
}

/* 配图 */
.post-card__cover {
  margin-top: 12px;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: var(--campus-violet-soft);
  cursor: zoom-in;
}

.post-card__cover img,
.post-card__cover .el-image {
  width: 100%;
  max-height: 320px;
  display: block;
}

.post-card__cover img {
  object-fit: cover;
}

/* 关联商品入口 */
.post-card__goods {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid rgba(127, 163, 199, 0.45);
  background: var(--campus-sky-soft);
  color: var(--campus-sky-deep);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.post-card__goods:hover {
  border-color: var(--campus-sky-deep);
  background: #d8e6f5;
}

.post-card__goods-arrow {
  font-size: 12px;
}

/* 底部互动条 */
.post-card__foot {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--brand-border);
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.stat--muted {
  color: var(--brand-text-secondary);
  opacity: 0.85;
}

.stat--like {
  border: none;
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
  transition: background 0.2s ease, color 0.2s ease;
}

.stat--like .heart-icon {
  display: block;
}

.stat--like:hover {
  background: var(--campus-violet-soft);
  color: var(--campus-violet-deep);
}

.stat--on {
  color: var(--campus-violet-deep);
  background: var(--campus-violet-soft);
  font-weight: 700;
}

/* 点赞心跳缩放（300ms） */
.stat--like.is-beating {
  animation: like-beat 0.3s ease;
}

@keyframes like-beat {
  0% { transform: scale(1); }
  45% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.post-card__own-ops {
  margin-left: auto;
  display: inline-flex;
  gap: 8px;
}

.own-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  color: var(--brand-text-regular);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.own-btn:hover {
  border-color: var(--campus-violet);
  color: var(--campus-violet-deep);
}

.own-btn--danger:hover {
  border-color: #d99a9a;
  color: #b96a6a;
  background: #fbeceb;
}

.own-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============================================================
 * 骨架屏
 * ============================================================ */

.sk-card {
  padding: 18px 22px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
}

.sk-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.sk-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(90deg, #eee9f7 25%, #f6f2fb 37%, #eee9f7 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-head__lines {
  flex: 1;
  min-width: 0;
}

.sk-head__lines .sk-line {
  margin-bottom: 8px;
}

.sk-head__lines .sk-line:last-child {
  margin-bottom: 0;
}

.sk-line {
  height: 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0ecf7 25%, #f8f5fc 37%, #f0ecf7 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line:last-child {
  margin-bottom: 0;
}

.sk-line--lg { height: 18px; width: 72%; }
.sk-line--md { width: 34%; }
.sk-line--sm { width: 42%; }

@keyframes sk-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* ============================================================
 * 状态块（失败 / 空）
 * ============================================================ */

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 62px 20px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  text-align: center;
}

.state-block__icon {
  font-size: 44px;
  color: var(--campus-violet);
}

.state-block__icon--soft {
  opacity: 0.75;
}

.state-block__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.state-block__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--brand-text);
}

.state-block__desc {
  margin: 0 0 6px;
  max-width: 460px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--brand-text-secondary);
}

/* ============================================================
 * 分页 / 配图预览
 * ============================================================ */

.pager {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

/* 配图上传 */
.cover-uploader {
  width: 100%;
}

.cover-uploader__input {
  display: none;
}

.cover-picker {
  width: 100%;
  min-height: 132px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px;
  border-radius: var(--brand-radius);
  border: 1.5px dashed var(--brand-border);
  background: linear-gradient(160deg, var(--cream-50, #fdfbf7), var(--cream-100, #f8f3ec));
  color: var(--brand-text-soft, #8a7d74);
  font-size: 13px;
  cursor: pointer;
  transition: border-color .2s ease, background .2s ease, transform .2s ease;
}

.cover-picker:hover:not(:disabled) {
  border-color: var(--theme-accent, #7fa89b);
  transform: translateY(-1px);
}

.cover-picker:disabled {
  cursor: progress;
  opacity: .75;
}

.cover-picker .el-icon {
  font-size: 22px;
  color: var(--theme-accent, #7fa89b);
}

.cover-picker small {
  font-size: 11.5px;
  color: var(--brand-text-soft, #a2968c);
}

.cover-preview {
  position: relative;
  margin-top: 0;
  width: 100%;
  border-radius: var(--brand-radius);
  overflow: hidden;
  border: 1px solid var(--brand-border);
}

.cover-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

.cover-preview__mask {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(45, 40, 36, .55);
  color: #fff;
  font-size: 11.5px;
  backdrop-filter: blur(4px);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cover-uploader__ops {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

/* ============================================================
 * 响应式
 * ============================================================ */

@media (max-width: 768px) {
  .community-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px 20px;
  }

  .community-hero__title {
    font-size: 23px;
  }

  .community-hero__stats {
    width: 100%;
    flex-wrap: wrap;
  }

  .hero-stat {
    flex: 1;
    min-width: 96px;
  }

  .filters__search,
  .filters__select {
    width: 100%;
  }

  .post-card__own-ops {
    margin-left: 0;
    width: 100%;
  }
}

/* ============================================================
 * 减少动效偏好
 * ============================================================ */

@media (prefers-reduced-motion: reduce) {
  .post-card,
  .post-card:hover,
  .tab,
  .chip,
  .stat--like,
  .own-btn,
  .community-hero__publish,
  .post-card__goods {
    transition: none;
    transform: none;
  }

  .post-card.pre-in {
    opacity: 1;
    transform: none;
  }

  .post-card.is-in,
  .stat--like.is-beating,
  .sk-line,
  .sk-avatar {
    animation: none;
  }
}

</style>
