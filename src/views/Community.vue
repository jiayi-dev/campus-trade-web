<template>
  <!--
    校园社区动态（列表页 /community）
    视觉定位：杂志式图文内容流（瀑布感），刻意区别于商品网格与求购便签墙。

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

    <!-- 1. 社区头部 -->
    <section class="community-hero">
      <div class="community-hero__glow"></div>
      <div class="community-hero__copy">
        <span class="community-hero__eyebrow">CAMPUS COMMUNITY · 校园社区</span>
        <h1 class="community-hero__title">同学们的生活切片</h1>
        <p class="community-hero__sub">分享闲置、聊聊体验、记录每一次循环新生</p>
      </div>
      <div class="community-hero__stat">
        <span class="community-hero__num is-num">{{ total === null ? '—' : total }}</span>
        <span class="community-hero__label">社区动态</span>
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

        <el-button type="primary" class="filters__publish" @click="openCreate">
          <el-icon><Plus /></el-icon>发布动态
        </el-button>
      </div>

      <div class="topic-row">
        <span class="topic-row__label"><el-icon><PriceTag /></el-icon>主题</span>
        <div class="chips">
          <button
              type="button"
              class="chip"
              :class="{ 'chip--on': !topic }"
              @click="selectTopic('')"
          >全部</button>
          <button
              v-for="t in TOPICS"
              :key="t"
              type="button"
              class="chip"
              :class="[`chip--${topicKey(t)}`, { 'chip--on': topic === t }]"
              @click="selectTopic(t)"
          >{{ t }}</button>
        </div>
      </div>
    </section>

    <!-- 「我的动态」工具条 -->
    <section v-else class="mine-bar">
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

    <!-- 7. 骨架屏 -->
    <div v-if="loading && currentList.length === 0" class="feed">
      <div v-for="n in 4" :key="n" class="sk-card">
        <div class="sk-cover"></div>
        <div class="sk-line sk-line--lg"></div>
        <div class="sk-line"></div>
        <div class="sk-line sk-line--sm"></div>
      </div>
    </div>

    <!-- 8. 加载失败 -->
    <div v-else-if="loadError" class="state-block">
      <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
      <p class="state-block__title">加载失败，请重试</p>
      <p class="state-block__desc">{{ loadErrorDesc }}</p>
      <el-button type="primary" round @click="reload">
        <el-icon><Refresh /></el-icon>重新加载
      </el-button>
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

    <!-- 10. 内容流：杂志式瀑布卡片 -->
    <div v-else class="feed">
      <article
          v-for="post in currentList"
          :key="post.postId"
          class="post-card"
          @click="goDetail(post.postId)"
      >
        <!-- 有配图：封面 + 主题丝带浮层 -->
        <div v-if="post.imageUrl" class="post-card__cover">
          <img :src="post.imageUrl" :alt="post.title" loading="lazy" />
          <span class="ribbon" :class="`ribbon--${topicKey(post.topic)}`">{{ post.topic }}</span>
        </div>

        <div class="post-card__body">
          <!-- 无配图：行内主题标签 -->
          <span
              v-if="!post.imageUrl"
              class="ribbon ribbon--inline"
              :class="`ribbon--${topicKey(post.topic)}`"
          >{{ post.topic }}</span>

          <h3 class="post-card__title">{{ post.title }}</h3>
          <p class="post-card__excerpt">{{ post.content }}</p>

          <div class="post-card__byline">
            <span class="post-card__avatar">{{ initial(post.authorName) }}</span>
            <span class="post-card__author">{{ post.authorName || '匿名同学' }}</span>
            <span class="post-card__time">· {{ formatRelativeTime(post.createTime) }}</span>
          </div>

          <div class="post-card__foot">
            <button
                type="button"
                class="stat stat--like"
                :class="{ 'stat--on': post.liked }"
                @click.stop="toggleLike(post)"
            >
              <el-icon><StarFilled v-if="post.liked" /><Star v-else /></el-icon>
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
          </div>
        </div>
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

        <el-form-item label="配图链接（可选）" prop="imageUrl">
          <el-input
              v-model="form.imageUrl"
              placeholder="粘贴一张图片的 URL，如 /api/files/goods/xxx.jpg"
              clearable
          />
          <div v-if="imagePreview" class="cover-preview">
            <img :src="imagePreview" alt="配图预览" />
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
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitForm">
          {{ isEdit ? '保存修改' : '立即发布' }}
        </el-button>
      </template>
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, Compass, User, PriceTag, Notebook, Star, StarFilled,
  ChatDotRound, View, Edit, Delete, Refresh, Lock, WarningFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatRelativeTime } from '../utils/format'

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

const currentList = computed(() => activeTab.value === 'mine' ? mineList.value : feedList.value)

const hasFilters = computed(() => !!keyword.value || !!topic.value)

const emptyTitle = computed(() => {
  if (activeTab.value === 'mine') return '你还没有发布过动态'
  return hasFilters.value ? '没有找到符合条件的动态' : '社区还静悄悄的'
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

const goLogin = () => {
  router.push({ path: '/login', query: { redirect: '/community' } })
}

// =========================
// 点赞切换（真实接口）
// =========================
const toggleLike = async (post) => {
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

const imagePreview = computed(() => (form.imageUrl || '').trim())

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
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
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
 * 社区头部
 * ============================================================ */

.community-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px 34px;
  margin-bottom: 18px;
  border-radius: var(--brand-radius-xl);
  border: 1px solid var(--brand-border);
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 6%, rgba(216, 168, 173, 0.42), transparent 46%),
    radial-gradient(circle at 8% 96%, rgba(201, 168, 92, 0.30), transparent 50%),
    linear-gradient(115deg, var(--brand-primary-soft) 0%, var(--brand-white) 55%, var(--brand-accent-soft) 100%);
  box-shadow: var(--brand-shadow-sm);
}

.community-hero__glow {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.42);
  filter: blur(6px);
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
  color: var(--brand-primary-active);
}

.community-hero__title {
  margin: 8px 0 6px;
  font-size: 31px;
  line-height: 1.2;
  letter-spacing: 1.5px;
  color: var(--brand-text);
}

.community-hero__sub {
  margin: 0;
  font-size: 13.5px;
  color: var(--brand-text-regular);
}

.community-hero__stat {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 124px;
  padding: 16px 20px;
  border-radius: var(--brand-radius-lg);
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
}

.community-hero__num {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--brand-primary-active);
}

.community-hero__label {
  font-size: 12px;
  color: var(--brand-text-secondary);
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
  background: var(--brand-accent-soft);
  border: 1px solid rgba(184, 152, 90, 0.42);
}

.notice--setup .notice__icon {
  color: var(--brand-accent-hover);
}

.notice--auth {
  background: var(--brand-primary-soft);
  border: 1px solid rgba(216, 168, 173, 0.6);
}

.notice--auth .notice__icon {
  color: var(--brand-primary-active);
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
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

.tab--on {
  background: var(--brand-primary-soft);
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
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

.filters__publish {
  margin-left: auto;
}

.topic-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
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
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

.chip--on {
  font-weight: 600;
  background: var(--brand-primary-soft);
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

.chip--experience.chip--on {
  background: var(--brand-accent-soft);
  border-color: var(--brand-accent);
  color: var(--brand-accent-hover);
}

.chip--trade.chip--on {
  background: var(--brand-aux-soft);
  border-color: var(--brand-aux);
  color: var(--brand-aux);
}

.chip--eco.chip--on {
  background: var(--eco-bg);
  border-color: var(--eco-ink);
  color: var(--eco-ink);
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
  background: var(--brand-bg-soft);
  border: 1px solid var(--brand-border);
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
  background: var(--brand-bg-soft);
  color: var(--brand-accent-hover);
}

/* ============================================================
 * 内容流：杂志式瀑布卡片
 * ============================================================ */

.feed {
  column-count: 2;
  column-gap: 18px;
}

.post-card {
  break-inside: avoid;
  margin: 0 0 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.post-card:hover {
  transform: translateY(-5px);
  border-color: var(--brand-primary);
  box-shadow: var(--brand-shadow-lg);
}

/* 配图封面 */
.post-card__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--brand-bg-soft);
}

.post-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

.post-card:hover .post-card__cover img {
  transform: scale(1.04);
}

.post-card__body {
  padding: 16px 18px 14px;
}

/* 主题丝带 */
.ribbon {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 999px;
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

.ribbon--inline {
  margin-bottom: 10px;
}

.post-card__cover .ribbon {
  position: absolute;
  left: 12px;
  top: 12px;
  box-shadow: var(--brand-shadow-sm);
  background: rgba(255, 255, 255, 0.92);
}

.ribbon--idle {
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

.ribbon--experience {
  color: var(--brand-accent-hover);
  background: var(--brand-accent-soft);
}

.ribbon--trade {
  color: var(--brand-aux);
  background: var(--brand-aux-soft);
}

.ribbon--eco {
  color: var(--eco-ink);
  background: var(--eco-bg);
}

.post-card__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--brand-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-card:hover .post-card__title {
  color: var(--brand-primary-active);
}

.post-card__excerpt {
  margin: 0 0 12px;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--brand-text-regular);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-card__byline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.post-card__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--brand-sidebar-gradient);
}

.post-card__author {
  font-weight: 600;
  color: var(--brand-text-regular);
}

.post-card__foot {
  display: flex;
  align-items: center;
  gap: 14px;
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
  padding: 3px 8px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
  transition: all 0.2s ease;
}

.stat--like:hover {
  background: var(--brand-primary-soft);
  color: var(--brand-primary-active);
}

.stat--on {
  color: var(--brand-accent-hover);
  background: var(--brand-accent-soft);
  font-weight: 700;
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
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
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
  break-inside: avoid;
  margin-bottom: 18px;
  padding: 16px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
}

.sk-cover {
  height: 150px;
  margin-bottom: 14px;
  border-radius: var(--brand-radius);
  background: linear-gradient(90deg, #f2ece2 25%, #faf5ee 37%, #f2ece2 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line {
  height: 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1ebe3 25%, #f8f4ee 37%, #f1ebe3 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line--lg { height: 18px; width: 72%; }
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
  color: var(--brand-primary);
}

.state-block__icon--soft {
  opacity: 0.75;
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

.cover-preview {
  margin-top: 10px;
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

/* ============================================================
 * 响应式
 * ============================================================ */

@media (max-width: 980px) {
  .feed {
    column-count: 1;
  }
}

@media (max-width: 768px) {
  .community-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 22px;
  }

  .community-hero__title {
    font-size: 24px;
  }

  .filters__search,
  .filters__select {
    width: 100%;
  }

  .filters__publish {
    margin-left: 0;
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
  .post-card__cover img,
  .tab,
  .chip,
  .stat--like,
  .own-btn {
    transition: none;
    transform: none;
  }

  .sk-line,
  .sk-cover {
    animation: none;
  }
}

</style>
