<template>
  <!--
    校园社区动态详情（/community/:postId）
    真实接口：
      GET    /community/{id}           详情（不存在返回 null，浏览量 +1）
      POST   /community/{id}/like      点赞 / 取消（返回 {liked, likeCount}）
      GET    /community/{id}/comments  评论列表（时间正序）
      POST   /community/{id}/comments  发表评论
      PUT    /community                编辑（仅本人）
      DELETE /community/{id}           删除（仅本人，二次确认）
  -->
  <div class="detail-page">

    <div class="detail-bar">
      <button type="button" class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>返回校园社区
      </button>
    </div>

    <!-- 未登录 -->
    <div v-if="needLogin" class="notice notice--auth">
      <el-icon class="notice__icon"><Lock /></el-icon>
      <div class="notice__body">
        <div class="notice__title">登录后才能查看动态详情</div>
        <div class="notice__desc">评论与点赞都需要登录身份，请先登录。</div>
      </div>
      <el-button type="primary" round @click="goLogin">去登录</el-button>
    </div>

    <!-- 数据表未初始化 -->
    <div v-if="setupPending" class="notice notice--setup">
      <el-icon class="notice__icon"><WarningFilled /></el-icon>
      <div class="notice__body">
        <div class="notice__title">社区数据表尚未初始化</div>
        <div class="notice__desc">请先在数据库执行 sql/v1.2-community.sql 后再使用。</div>
      </div>
    </div>

    <!-- 加载骨架 -->
    <div v-if="loading" class="article sk">
      <div class="sk-line sk-line--lg"></div>
      <div class="sk-line sk-line--sm"></div>
      <div class="sk-cover"></div>
      <div class="sk-line"></div>
      <div class="sk-line"></div>
      <div class="sk-line sk-line--sm"></div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="loadError" class="state-block">
      <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
      <p class="state-block__title">动态加载失败</p>
      <p class="state-block__desc">
        {{ setupPending ? '社区数据表尚未初始化，请先在数据库执行 sql/v1.2-community.sql。' : '可能是网络波动，稍后再试一次。' }}
      </p>
      <div class="state-block__ops">
        <el-button type="primary" round @click="loadDetail">重新加载</el-button>
        <el-button round @click="goBack">返回社区</el-button>
      </div>
    </div>

    <!-- 不存在 -->
    <div v-else-if="!post" class="state-block">
      <el-icon class="state-block__icon state-block__icon--soft"><Box /></el-icon>
      <p class="state-block__title">这条动态不存在</p>
      <p class="state-block__desc">可能已被作者删除，或链接不正确。</p>
      <el-button type="primary" round @click="goBack">返回校园社区</el-button>
    </div>

    <!-- 正文 -->
    <article v-else class="article">

      <header class="article__head">
        <span class="ribbon" :class="`ribbon--${topicKey(post.topic)}`">{{ post.topic }}</span>
        <h1 class="article__title">{{ post.title }}</h1>
        <div class="article__meta">
          <span class="article__avatar">{{ initial(post.authorName) }}</span>
          <span class="article__author">{{ post.authorName || '匿名同学' }}</span>
          <span class="article__dot">·</span>
          <span class="article__time">{{ formatDateTime(post.createTime) }}</span>
          <span class="article__views"><el-icon><View /></el-icon><span class="is-num">{{ post.viewCount ?? 0 }}</span></span>
        </div>
      </header>

      <figure v-if="post.imageUrl" class="article__figure">
        <img :src="post.imageUrl" :alt="post.title" />
      </figure>

      <div class="article__content">{{ post.content }}</div>

      <!-- 关联商品入口 -->
      <div v-if="post.goodsId" class="goods-link" @click="goGoods(post.goodsId)">
        <el-icon class="goods-link__icon"><Link /></el-icon>
        <div class="goods-link__body">
          <div class="goods-link__label">关联商品</div>
          <div class="goods-link__name">{{ post.goodsName || `#${post.goodsId}` }}</div>
        </div>
        <span class="goods-link__go">去看看 →</span>
      </div>

      <!-- 作者操作 -->
      <div v-if="isOwn" class="own-panel">
        <el-icon class="own-panel__icon"><Edit /></el-icon>
        <span class="own-panel__text">这是你发布的动态</span>
        <div class="own-panel__ops">
          <el-button size="small" round @click="openEdit">
            <el-icon><Edit /></el-icon>编辑
          </el-button>
          <el-button
              size="small"
              type="danger"
              plain
              round
              :loading="deleting"
              @click="handleDelete"
          >
            <el-icon v-if="!deleting"><Delete /></el-icon>删除
          </el-button>
        </div>
      </div>

      <!-- 点赞 / 统计 -->
      <div class="action-bar">
        <button
            type="button"
            class="like-btn"
            :class="{ 'like-btn--on': post.liked }"
            :disabled="liking"
            @click="handleLike"
        >
          <el-icon><StarFilled v-if="post.liked" /><Star v-else /></el-icon>
          <span>{{ post.liked ? '已赞' : '点赞' }}</span>
          <span class="is-num">{{ post.likeCount ?? 0 }}</span>
        </button>
        <span class="action-stat">
          <el-icon><ChatDotRound /></el-icon>
          <span class="is-num">{{ comments.length }}</span> 条评论
        </span>
      </div>
    </article>

    <!-- 评论区 -->
    <section v-if="post && !loading" class="comments">
      <h2 class="comments__title">评论 <span class="is-num">{{ comments.length }}</span></h2>

      <!-- 发表评论 -->
      <div class="composer">
        <el-input
            v-model="commentText"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="友善发言，说说你的想法…"
        />
        <div class="composer__foot">
          <el-button
              type="primary"
              round
              :loading="commentSubmitting"
              @click="submitComment"
          >发表评论</el-button>
        </div>
      </div>

      <div v-if="commentsLoading" class="comments__loading">
        <div v-for="n in 3" :key="n" class="sk-line"></div>
      </div>

      <div v-else-if="commentsError" class="comments__error">
        <span>评论加载失败</span>
        <el-button size="small" round @click="loadComments">重试</el-button>
      </div>

      <div v-else-if="comments.length === 0" class="comments__empty">
        还没有评论，来说点什么吧
      </div>

      <ul v-else class="comment-list">
        <li v-for="c in comments" :key="c.commentId" class="comment">
          <span class="comment__avatar">{{ initial(c.authorName) }}</span>
          <div class="comment__body">
            <div class="comment__meta">
              <span class="comment__name">{{ c.authorName || '匿名同学' }}</span>
              <span class="comment__time">{{ formatRelativeTime(c.createTime) }}</span>
            </div>
            <p class="comment__text">{{ c.content }}</p>
          </div>
        </li>
      </ul>
    </section>

    <!-- 编辑抽屉 -->
    <el-drawer v-model="formVisible" title="编辑动态" direction="rtl" size="540px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" maxlength="60" show-word-limit placeholder="动态标题" />
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
              placeholder="正文内容"
          />
        </el-form-item>

        <el-form-item label="配图链接（可选）" prop="imageUrl">
          <el-input v-model="form.imageUrl" placeholder="图片 URL，留空表示无配图" clearable />
        </el-form-item>

        <el-form-item label="关联商品ID（可选）" prop="goodsId">
          <el-input-number
              v-model="form.goodsId"
              :min="1"
              :controls="false"
              placeholder="关联商品的ID"
              style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitEdit">保存修改</el-button>
      </template>
    </el-drawer>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft, Link, Star, StarFilled, ChatDotRound, View, Edit, Delete,
  Box, Lock, WarningFilled, CircleCloseFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatDateTime, formatRelativeTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const TOPICS = ['闲置分享', '使用体验', '交易经验', '环保循环']
const currentUserId = Number(localStorage.getItem('userId'))

const post = ref(null)
const loading = ref(false)
const loadError = ref(false)

const comments = ref([])
const commentsLoading = ref(false)
const commentsError = ref(false)

const commentText = ref('')
const commentSubmitting = ref(false)

const liking = ref(false)
const deleting = ref(false)

const setupPending = ref(false)
const needLogin = ref(false)

const isOwn = computed(() => !!post.value && Number(post.value.userId) === currentUserId)

const topicKey = (t) => {
  const map = { '闲置分享': 'idle', '使用体验': 'experience', '交易经验': 'trade', '环保循环': 'eco' }
  return map[t] || 'idle'
}

const initial = (name) => (name || '同').charAt(0).toUpperCase()

const classifyError = (error) => {
  const status = error?.response?.status
  if (status === 401) needLogin.value = true
  else if (status && status >= 500) setupPending.value = true
}

// =========================
// 加载
// =========================
const loadDetail = async () => {
  loading.value = true
  loadError.value = false

  try {
    const res = await request.get(`/community/${route.params.postId}`)

    if (!res) {
      post.value = null
      return
    }

    post.value = res
    await loadComments()
  } catch (error) {
    classifyError(error)
    loadError.value = true
    post.value = null
  } finally {
    loading.value = false
  }
}

const loadComments = async () => {
  commentsLoading.value = true
  commentsError.value = false

  try {
    const res = await request.get(`/community/${route.params.postId}/comments`)
    comments.value = Array.isArray(res) ? res : []
  } catch (error) {
    classifyError(error)
    commentsError.value = true
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

// =========================
// 点赞 / 评论
// =========================
const handleLike = async () => {
  liking.value = true

  try {
    const res = await request.post(`/community/${route.params.postId}/like`)

    if (res && typeof res === 'object') {
      post.value.liked = !!res.liked
      post.value.likeCount = Number(res.likeCount) || 0
    }
  } catch (error) {
    classifyError(error)
  } finally {
    liking.value = false
  }
}

const submitComment = async () => {
  const content = commentText.value.trim()

  if (!content) {
    ElMessage.warning('请先写下评论内容')
    return
  }

  commentSubmitting.value = true

  try {
    const result = await request.post(`/community/${route.params.postId}/comments`, { content })

    if (result === '评论已发布') {
      ElMessage.success(result)
      commentText.value = ''
      await loadComments()
      // 评论数按真实列表长度更新（避免额外触发详情刷新带来的浏览量自增）
      post.value.commentCount = comments.value.length
    } else {
      ElMessage.error(result || '评论发布失败')
    }
  } catch (error) {
    classifyError(error)
  } finally {
    commentSubmitting.value = false
  }
}

// =========================
// 本人操作：编辑 / 删除
// =========================
const formVisible = ref(false)
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

const openEdit = () => {
  form.postId = post.value.postId
  form.title = post.value.title || ''
  form.topic = post.value.topic || ''
  form.content = post.value.content || ''
  form.imageUrl = post.value.imageUrl || ''
  form.goodsId = post.value.goodsId ?? null
  formVisible.value = true
}

const submitEdit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  formSubmitting.value = true

  const payload = {
    postId: form.postId,
    title: form.title.trim(),
    topic: form.topic,
    content: form.content.trim(),
    imageUrl: form.imageUrl ? form.imageUrl.trim() : null,
    goodsId: form.goodsId ?? null
  }

  try {
    const result = await request.put('/community', payload)

    if (result === '动态更新成功') {
      ElMessage.success(result)
      formVisible.value = false
      await loadDetail()
    } else {
      ElMessage.error(result || '动态更新失败')
    }
  } catch (error) {
    classifyError(error)
  } finally {
    formSubmitting.value = false
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
        '删除后该动态及其评论、点赞都会被清除，且不可恢复。确定删除吗？',
        '删除动态',
        { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (error) {
    return
  }

  deleting.value = true

  try {
    const result = await request.delete(`/community/${route.params.postId}`)

    if (result === '动态已删除') {
      ElMessage.success(result)
      router.push('/community')
    } else {
      ElMessage.error(result || '删除失败')
    }
  } catch (error) {
    classifyError(error)
  } finally {
    deleting.value = false
  }
}

// =========================
// 跳转
// =========================
const goBack = () => router.push('/community')
const goGoods = (goodsId) => router.push(`/goods/${goodsId}`)
const goLogin = () => router.push({ path: '/login', query: { redirect: route.fullPath } })

onMounted(() => {
  loadDetail()
})
</script>

<style scoped>

.detail-page {
  /* 低饱和暖绿：仅用于「环保循环」主题标签 */
  --eco-ink: #6f8f78;
  --eco-bg: #e8f0e6;
  width: 100%;
}

.detail-bar {
  margin-bottom: 16px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  color: var(--brand-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

/* 提示横幅 */
.notice {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-lg);
}

.notice__icon { font-size: 20px; flex-shrink: 0; }
.notice__body { flex: 1; min-width: 0; }
.notice__title { font-size: 14px; font-weight: 700; color: var(--brand-text); }
.notice__desc { margin-top: 3px; font-size: 12.5px; line-height: 1.6; color: var(--brand-text-regular); }

.notice--setup { background: var(--brand-accent-soft); border: 1px solid rgba(184, 152, 90, 0.42); }
.notice--setup .notice__icon { color: var(--brand-accent-hover); }
.notice--auth { background: var(--brand-primary-soft); border: 1px solid rgba(216, 168, 173, 0.6); }
.notice--auth .notice__icon { color: var(--brand-primary-active); }

/* ============================================================
 * 正文卡片
 * ============================================================ */

.article {
  max-width: 860px;
  margin: 0 auto 18px;
  padding: 30px 34px 22px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
}

.article__head { margin-bottom: 18px; }

.ribbon {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 999px;
}

.ribbon--idle { color: var(--brand-primary-active); background: var(--brand-primary-soft); }
.ribbon--experience { color: var(--brand-accent-hover); background: var(--brand-accent-soft); }
.ribbon--trade { color: var(--brand-aux); background: var(--brand-aux-soft); }
.ribbon--eco { color: var(--eco-ink); background: var(--eco-bg); }

.article__title {
  margin: 12px 0 14px;
  font-size: 28px;
  line-height: 1.35;
  letter-spacing: 0.5px;
  color: var(--brand-text);
}

.article__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.article__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: var(--brand-sidebar-gradient);
}

.article__author { font-weight: 600; color: var(--brand-text-regular); }
.article__dot { color: var(--brand-text-secondary); }

.article__views {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.article__figure {
  margin: 0 0 20px;
  border-radius: var(--brand-radius-lg);
  overflow: hidden;
  background: var(--brand-bg-soft);
}

.article__figure img {
  width: 100%;
  max-height: 460px;
  object-fit: cover;
  display: block;
}

.article__content {
  font-size: 15px;
  line-height: 2;
  color: var(--brand-text-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 关联商品入口 */
.goods-link {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-accent-soft);
  border: 1px solid rgba(184, 152, 90, 0.35);
  cursor: pointer;
  transition: all 0.2s ease;
}

.goods-link:hover {
  box-shadow: var(--brand-shadow-sm);
  transform: translateY(-2px);
}

.goods-link__icon { font-size: 20px; color: var(--brand-accent-hover); flex-shrink: 0; }
.goods-link__body { flex: 1; min-width: 0; }
.goods-link__label { font-size: 11.5px; letter-spacing: 1px; color: var(--brand-text-secondary); }
.goods-link__name {
  margin-top: 3px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-link__go { font-size: 13px; font-weight: 600; color: var(--brand-accent-hover); flex-shrink: 0; }

/* 作者面板 */
.own-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 22px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg-soft);
  border: 1px dashed var(--brand-border);
}

.own-panel__icon { font-size: 20px; color: var(--brand-primary); }
.own-panel__text { font-size: 14px; font-weight: 600; color: var(--brand-text); }
.own-panel__ops { margin-left: auto; display: flex; gap: 10px; }

/* 点赞 / 统计 */
.action-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed var(--brand-border);
}

.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.like-btn:hover { border-color: var(--brand-accent); color: var(--brand-accent-hover); }

.like-btn--on {
  background: var(--brand-accent-soft);
  border-color: var(--brand-accent);
  color: var(--brand-accent-hover);
}

.like-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.action-stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

/* ============================================================
 * 评论区
 * ============================================================ */

.comments {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 34px 30px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
}

.comments__title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: var(--brand-text);
  padding-left: 10px;
  border-left: 3px solid var(--brand-primary);
}

.composer { margin-bottom: 22px; }
.composer__foot { display: flex; justify-content: flex-end; margin-top: 12px; }

.comments__loading { padding: 6px 0; }
.comments__empty,
.comments__error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg-soft);
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comment {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--brand-radius-lg) 4px var(--brand-radius-lg) var(--brand-radius-lg);
  background: var(--brand-bg);
  border: 1px dashed var(--brand-border);
}

.comment__avatar {
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

.comment__body { flex: 1; min-width: 0; }
.comment__meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.comment__name { font-size: 13.5px; font-weight: 700; color: var(--brand-text); }
.comment__time { font-size: 12px; color: var(--brand-text-secondary); }

.comment__text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--brand-text-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ============================================================
 * 骨架 / 状态块
 * ============================================================ */

.sk { max-width: 860px; margin: 0 auto; }

.sk-line {
  height: 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1ebe3 25%, #f8f4ee 37%, #f1ebe3 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line--lg { height: 20px; width: 68%; }
.sk-line--sm { width: 40%; }

.sk-cover {
  height: 180px;
  margin: 16px 0;
  border-radius: var(--brand-radius-lg);
  background: linear-gradient(90deg, #f2ece2 25%, #faf5ee 37%, #f2ece2 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

@keyframes sk-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 20px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  text-align: center;
}

.state-block__icon { font-size: 44px; color: var(--brand-primary); }
.state-block__icon--soft { opacity: 0.75; }
.state-block__title { margin: 0; font-size: 16px; font-weight: 700; color: var(--brand-text); }
.state-block__desc {
  margin: 0 0 6px;
  max-width: 460px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--brand-text-secondary);
}
.state-block__ops { display: flex; gap: 10px; }

/* ============================================================
 * 响应式 / 减少动效
 * ============================================================ */

@media (max-width: 768px) {
  .article,
  .comments {
    padding-left: 20px;
    padding-right: 20px;
  }

  .article__title { font-size: 22px; }
  .own-panel__ops { margin-left: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .goods-link,
  .goods-link:hover,
  .like-btn,
  .back-btn {
    transition: none;
    transform: none;
  }

  .sk-line,
  .sk-cover {
    animation: none;
  }
}

</style>
