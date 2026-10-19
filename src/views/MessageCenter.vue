<template>
  <!--
    消息中心（用户 ↔ 用户 交易私聊）
    真实接口（全部走后端 /chat，与商品留言 /messages 无关）：
      GET  /chat/sessions                              会话列表
      GET  /chat/history?otherUserId=&goodsId=         某会话消息历史（打开即已读）
      POST /chat/send { toUserId, goodsId, content }   发送消息
      GET  /chat/unread                                未读总数
      GET  /chat/contacts                              联系人候选（由真实订单聚合）
    说明：不使用任何假数据；后端 chat_message 表未创建时（/chat/sessions 返回 500），
         页面顶部给出"需先执行 sql/v1.2-chat.sql"的明确提示，绝不伪造会话或发送成功。
  -->
  <div class="mc-page">

    <!-- 数据库未准备提示（chat_message 表缺失时） -->
    <div v-if="dbNotReady" class="mc-warning">
      <el-icon class="mc-warning__icon"><WarningFilled /></el-icon>
      <div class="mc-warning__text">
        消息模块需要数据库准备：请先手动执行 campus-trade/sql/v1.2-chat.sql 建表后再使用。
      </div>
      <el-button size="small" plain @click="reloadAll">我已执行，重试</el-button>
    </div>

    <div class="mc-body">

      <!-- ============ 左栏：会话列表 ============ -->
      <aside class="mc-side">
        <div class="mc-side__head">
          <div class="mc-side__title-row">
            <span class="mc-side__title">消息</span>
            <span v-if="unreadTotal > 0" class="mc-side__unread">{{ unreadTotal }} 条未读</span>
          </div>
          <el-input
              v-model="keyword"
              placeholder="搜索对方 / 商品 / 消息"
              clearable
              :prefix-icon="Search"
              class="mc-side__search"
          />
          <el-button
              type="primary"
              class="mc-side__new"
              :icon="CirclePlus"
              @click="openContacts"
          >发起会话</el-button>
        </div>

        <div class="mc-side__list">
          <!-- 加载骨架 -->
          <div v-if="sessionsLoading" class="mc-skeleton">
            <div v-for="n in 5" :key="n" class="mc-skeleton__item">
              <div class="mc-skeleton__avatar"></div>
              <div class="mc-skeleton__lines">
                <div class="mc-skeleton__line mc-skeleton__line--lg"></div>
                <div class="mc-skeleton__line"></div>
              </div>
            </div>
          </div>

          <!-- 列表 -->
          <template v-else>
            <button
                v-for="s in filteredSessions"
                :key="s.sessionKey"
                class="mc-session"
                :class="{ 'mc-session--active': isActive(s) }"
                @click="openSession(s)"
            >
              <div class="mc-session__thumb">
                <img
                    v-if="s.imageUrl"
                    :src="resolveImageUrl(s.imageUrl)"
                    alt="商品图"
                    @error="onThumbError(s)"
                >
                <el-icon v-else><Picture /></el-icon>
              </div>

              <div class="mc-session__body">
                <div class="mc-session__top">
                  <span class="mc-session__name">{{ s.otherUserName || '用户' }}</span>
                  <span class="mc-session__time">{{ formatRelativeTime(s.lastTime) }}</span>
                </div>
                <div class="mc-session__bottom">
                  <span class="mc-session__msg">{{ s.lastContent || '' }}</span>
                  <span v-if="Number(s.unread) > 0" class="mc-session__badge">
                    {{ Number(s.unread) > 99 ? '99+' : s.unread }}
                  </span>
                </div>
                <div v-if="s.goodsName" class="mc-session__goods">{{ s.goodsName }}</div>
              </div>
            </button>

            <!-- 空状态 -->
            <div v-if="filteredSessions.length === 0" class="mc-empty">
              <el-icon class="mc-empty__icon"><ChatLineRound /></el-icon>
              <p class="mc-empty__title">
                {{ keyword ? '没有匹配的会话' : (dbNotReady ? '消息模块尚未启用' : '还没有会话') }}
              </p>
              <p class="mc-empty__desc">
                {{ keyword
                  ? '换个关键词试试'
                  : (dbNotReady
                    ? '请先执行 sql/v1.2-chat.sql 建表'
                    : '点击上方「发起会话」，从你的交易联系人开始沟通') }}
              </p>
              <el-button
                  v-if="!keyword && !dbNotReady"
                  type="primary"
                  plain
                  round
                  :icon="CirclePlus"
                  @click="openContacts"
              >发起会话</el-button>
            </div>
          </template>
        </div>
      </aside>

      <!-- ============ 右栏：聊天区 ============ -->
      <section class="mc-main">

        <!-- 未选中会话：引导空态 -->
        <div v-if="!active" class="mc-guide">
          <el-icon class="mc-guide__icon"><ChatDotRound /></el-icon>
          <p class="mc-guide__title">选择一个会话开始沟通</p>
          <p class="mc-guide__desc">从左侧选择一个会话，或点击「发起会话」联系交易过的同学。</p>
        </div>

        <!-- 已选中会话 -->
        <template v-else>
          <!-- 会话头部 -->
          <header class="mc-chat-head">
            <div class="mc-chat-head__peer">
              <div class="mc-chat-head__avatar">
                {{ (active.otherUserName || 'U').charAt(0).toUpperCase() }}
              </div>
              <div class="mc-chat-head__meta">
                <div class="mc-chat-head__name">{{ active.otherUserName || '用户' }}</div>
                <el-button
                    link
                    type="primary"
                    class="mc-chat-head__home"
                    @click="goSeller"
                >查看主页</el-button>
              </div>
            </div>

            <!-- 关联商品摘要卡 -->
            <div v-if="active.goodsId != null" class="mc-goods-card">
              <div class="mc-goods-card__thumb">
                <img
                    v-if="active.imageUrl"
                    :src="resolveImageUrl(active.imageUrl)"
                    alt="商品图"
                    @error="active.imageUrl = ''"
                >
                <el-icon v-else><Picture /></el-icon>
              </div>
              <div class="mc-goods-card__info">
                <div class="mc-goods-card__name">{{ active.goodsName || '商品已删除' }}</div>
                <div class="mc-goods-card__price">{{ formatPrice(active.goodsPrice) }}</div>
              </div>
              <el-button size="small" plain type="primary" class="mc-goods-card__btn" @click="goGoods">
                查看商品
              </el-button>
            </div>
          </header>

          <!-- 消息区：按日期分组 -->
          <div ref="msgScrollRef" class="mc-messages">
            <div v-if="historyLoading" class="mc-messages__loading">
              <el-icon class="mc-messages__loading-icon"><Loading /></el-icon>
              正在加载消息…
            </div>

            <template v-else>
              <template v-for="group in messageGroups" :key="group.label">
                <div class="mc-day"><span>{{ group.label }}</span></div>
                <div
                    v-for="msg in group.messages"
                    :key="msg.chatId"
                    class="mc-msg"
                    :class="{ 'mc-msg--mine': msg.mine }"
                >
                  <div class="mc-msg__bubble">{{ msg.content }}</div>
                  <div class="mc-msg__time">{{ hhmm(msg.createTime) }}</div>
                </div>
              </template>

              <!-- 该会话暂无消息：允许直接发第一条 -->
              <div v-if="messageGroups.length === 0" class="mc-messages__empty">
                <el-icon><ChatLineRound /></el-icon>
                <p>这里还没有消息，发送第一条消息开始沟通吧。</p>
              </div>
            </template>
          </div>

          <!-- 输入区 -->
          <footer class="mc-input">
            <textarea
                v-model="draft"
                class="mc-input__field"
                rows="2"
                maxlength="500"
                placeholder="输入消息，Enter 发送，Shift + Enter 换行"
                @keydown="onKeydown"
            ></textarea>
            <el-button
                type="primary"
                class="mc-input__send"
                :icon="Promotion"
                :loading="sending"
                :disabled="sending"
                @click="send"
            >发送</el-button>
          </footer>
        </template>
      </section>
    </div>

    <!-- ============ 发起会话：联系人候选 ============ -->
    <el-dialog
        v-model="contactVisible"
        title="发起会话"
        width="480px"
        class="mc-contact-dialog"
    >
      <p class="mc-contact-tip">
        联系人来自你的真实交易订单（我买到的 / 我卖出的），同一商品同一位同学只显示一次。
      </p>

      <div v-if="contactsLoading" class="mc-contact-loading">
        <el-icon class="mc-messages__loading-icon"><Loading /></el-icon>
        正在加载联系人…
      </div>

      <div v-else-if="contacts.length === 0" class="mc-contact-empty">
        <el-icon class="mc-empty__icon"><ChatLineRound /></el-icon>
        <p class="mc-empty__title">暂无可联系的人</p>
        <p class="mc-empty__desc">在交易中心产生订单后，买卖双方会出现在这里。</p>
      </div>

      <div v-else class="mc-contact-list">
        <button
            v-for="(c, idx) in contacts"
            :key="idx"
            class="mc-contact"
            @click="openContact(c)"
        >
          <div class="mc-contact__thumb">
            <img
                v-if="c.imageUrl"
                :src="resolveImageUrl(c.imageUrl)"
                alt="商品图"
                @error="c.imageUrl = ''"
            >
            <el-icon v-else><Picture /></el-icon>
          </div>
          <div class="mc-contact__info">
            <div class="mc-contact__name">
              {{ c.otherUserName || '用户' }}
              <el-tag size="small" effect="plain" round class="mc-contact__role">{{ c.role }}</el-tag>
            </div>
            <div class="mc-contact__goods">
              {{ c.goodsName || '商品已删除' }} · {{ formatPrice(c.price) }}
            </div>
          </div>
          <el-icon class="mc-contact__arrow"><Promotion /></el-icon>
        </button>
      </div>
    </el-dialog>

  </div>
</template>


<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search, CirclePlus, ChatDotRound, ChatLineRound,
  Picture, Promotion, Loading, WarningFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatRelativeTime, formatPrice } from '../utils/format'

const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

// =========================
// 状态
// =========================
const sessions = ref([])
const sessionsLoading = ref(false)
const dbNotReady = ref(false)      // chat_message 表未创建（/chat/sessions 返回 500）
const unreadTotal = ref(0)
const keyword = ref('')

// 当前打开的会话：{ otherUserId, otherUserName, goodsId, goodsName, goodsPrice, imageUrl }
const active = ref(null)

const messages = ref([])
const historyLoading = ref(false)
const msgScrollRef = ref()

const draft = ref('')
const sending = ref(false)

const contactVisible = ref(false)
const contacts = ref([])
const contactsLoading = ref(false)

// =========================
// 工具
// =========================
const pad = n => String(n).padStart(2, '0')

const resolveImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // 后端返回的 URL 已含 /api 前缀（如 /api/files/goods/xxx.png），不再二次拼接
  return url
}

const onThumbError = (s) => {
  s.imageUrl = ''
}

const hhmm = (time) => {
  if (!time) return ''
  const d = new Date(time)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 日期分组标签：今天 / 昨天 / yyyy-mm-dd
const dayLabel = (time) => {
  if (!time) return ''
  const d = new Date(time)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startToday - startDay) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// =========================
// 计算属性
// =========================
const filteredSessions = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return sessions.value
  return sessions.value.filter(s =>
      String(s.otherUserName || '').toLowerCase().includes(kw) ||
      String(s.goodsName || '').toLowerCase().includes(kw) ||
      String(s.lastContent || '').toLowerCase().includes(kw)
  )
})

const messageGroups = computed(() => {
  const groups = []
  let current = null
  for (const msg of messages.value) {
    const label = dayLabel(msg.createTime)
    if (!current || current.label !== label) {
      current = { label, messages: [] }
      groups.push(current)
    }
    current.messages.push(msg)
  }
  return groups
})

const isActive = (s) => !!active.value &&
    Number(active.value.otherUserId) === Number(s.otherUserId) &&
    (active.value.goodsId == null ? null : Number(active.value.goodsId)) ===
    (s.goodsId == null ? null : Number(s.goodsId))

// =========================
// 数据加载
// =========================
const loadSessions = async () => {
  sessionsLoading.value = true
  try {
    const result = await request.get('/chat/sessions')
    sessions.value = Array.isArray(result) ? result : []
    dbNotReady.value = false
  } catch (error) {
    sessions.value = []
    // 500：通常是 chat_message 表尚未创建（需手动执行 sql/v1.2-chat.sql）
    if (error && error.response && error.response.status === 500) {
      dbNotReady.value = true
    }
  } finally {
    sessionsLoading.value = false
  }
}

const refreshUnread = async () => {
  try {
    const result = await request.get('/chat/unread')
    unreadTotal.value = result && typeof result.total === 'number' ? result.total : 0
  } catch (error) {
    // 未读统计失败不阻断页面（request.js 已提示），保持原值
  }
}

const loadContacts = async () => {
  contactsLoading.value = true
  try {
    const result = await request.get('/chat/contacts')
    contacts.value = Array.isArray(result) ? result : []
  } catch (error) {
    contacts.value = []
  } finally {
    contactsLoading.value = false
  }
}

const loadHistory = async () => {
  if (!active.value) return
  historyLoading.value = true
  try {
    const params = { otherUserId: active.value.otherUserId }
    if (active.value.goodsId != null) params.goodsId = active.value.goodsId
    const result = await request.get('/chat/history', { params })
    messages.value = Array.isArray(result) ? result : []
    await nextTick()
    scrollToBottom()
  } catch (error) {
    messages.value = []
  } finally {
    historyLoading.value = false
  }
}

const scrollToBottom = () => {
  const el = msgScrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

const reloadAll = async () => {
  await loadSessions()
  await refreshUnread()
}

// =========================
// 打开会话
// =========================
const openSession = async (s) => {
  active.value = {
    otherUserId: Number(s.otherUserId),
    otherUserName: s.otherUserName || '用户',
    goodsId: s.goodsId == null ? null : Number(s.goodsId),
    goodsName: s.goodsName,
    goodsPrice: s.goodsPrice,
    imageUrl: s.imageUrl
  }
  // 打开即视为已读：本地清零，服务端由 /chat/history 的 markRead 完成
  s.unread = 0
  await loadHistory()
  refreshUnread()
}

const openContacts = () => {
  contactVisible.value = true
  loadContacts()
}

// 从联系人候选打开一个尚无历史的会话，允许直接发送第一条消息
const openContact = async (c) => {
  contactVisible.value = false
  active.value = {
    otherUserId: Number(c.otherUserId),
    otherUserName: c.otherUserName || '用户',
    goodsId: c.goodsId == null ? null : Number(c.goodsId),
    goodsName: c.goodsName,
    goodsPrice: c.price,
    imageUrl: c.imageUrl
  }
  await loadHistory()
}

// =========================
// 发送
// =========================
const send = async () => {
  if (!active.value) return

  const text = draft.value.trim()

  if (!text) {
    ElMessage.warning('请输入消息内容')
    return
  }

  sending.value = true

  try {
    const result = await request.post('/chat/send', {
      toUserId: active.value.otherUserId,
      goodsId: active.value.goodsId == null ? null : active.value.goodsId,
      content: text
    })

    if (result === '发送成功') {
      draft.value = ''
      // 刷新该会话消息 + 会话列表（新会话会出现在列表，且该会话被置顶）
      await loadHistory()
      await loadSessions()
      refreshUnread()
    } else {
      // 业务失败：保留输入内容，给出明确反馈
      ElMessage.error(result || '发送失败')
    }
  } catch (error) {
    // request.js 已统一提示；保留输入内容便于重试
  } finally {
    sending.value = false
  }
}

const onKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// =========================
// 跳转
// =========================
const goGoods = () => {
  if (active.value && active.value.goodsId != null) {
    router.push(`/goods/${active.value.goodsId}`)
  }
}

const goSeller = () => {
  if (active.value && active.value.otherUserId != null) {
    router.push(`/seller/${active.value.otherUserId}`)
  }
}

onMounted(() => {
  reloadAll()
})
</script>


<style scoped>

/* ========== 页面骨架：铺满 Layout content，内部各自滚动 ========== */

.mc-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mc-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
}

/* ========== 数据库未准备警告横幅 ========== */

.mc-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: var(--brand-radius);
  background: var(--brand-accent-soft);
  border: 1px solid #ecdcae;
  flex-shrink: 0;
}

.mc-warning__icon {
  color: var(--brand-accent);
  font-size: 18px;
  flex-shrink: 0;
}

.mc-warning__text {
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  color: var(--brand-text-regular);
}

/* ========== 左栏 ========== */

.mc-side {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
}

.mc-side__head {
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--brand-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.mc-side__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mc-side__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
  letter-spacing: 0.5px;
}

.mc-side__unread {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
  padding: 2px 10px;
  border-radius: 999px;
}

.mc-side__search :deep(.el-input__wrapper) {
  border-radius: 999px;
  background: var(--brand-bg-soft);
  box-shadow: none;
}

.mc-side__new {
  width: 100%;
}

.mc-side__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px;
}

/* --- 会话条目 --- */

.mc-session {
  width: 100%;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: var(--brand-radius);
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease, transform 0.2s ease;
  font-family: inherit;
}

.mc-session:hover {
  background: var(--brand-bg-soft);
  transform: translateX(2px);
}

.mc-session--active {
  background: var(--brand-primary-soft);
}

.mc-session--active:hover {
  background: var(--brand-primary-soft);
}

.mc-session__thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--brand-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-accent);
  font-size: 20px;
}

.mc-session__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mc-session__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mc-session__top,
.mc-session__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mc-session__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-session__time {
  font-size: 11px;
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

.mc-session__msg {
  font-size: 12px;
  color: var(--brand-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-session__badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mc-session__goods {
  font-size: 11px;
  color: var(--brand-accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- 骨架 --- */

.mc-skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}

.mc-skeleton__item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
}

.mc-skeleton__avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f6ecdf 25%, #fbf6f0 50%, #f6ecdf 75%);
  background-size: 200% 100%;
  animation: mc-shimmer 1.4s infinite;
  flex-shrink: 0;
}

.mc-skeleton__lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mc-skeleton__line {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f6ecdf 25%, #fbf6f0 50%, #f6ecdf 75%);
  background-size: 200% 100%;
  animation: mc-shimmer 1.4s infinite;
}

.mc-skeleton__line--lg {
  width: 60%;
}

@keyframes mc-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* --- 空状态（通用） --- */

.mc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 44px 18px;
}

.mc-empty__icon {
  font-size: 42px;
  color: var(--brand-primary-soft);
  margin-bottom: 10px;
}

.mc-empty__title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
}

.mc-empty__desc {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
  line-height: 1.7;
  max-width: 220px;
}

/* ========== 右栏 ========== */

.mc-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
}

/* --- 未选中会话引导 --- */

.mc-guide {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
  background:
    radial-gradient(circle at 82% 18%, rgba(216, 168, 173, 0.14), transparent 45%),
    radial-gradient(circle at 18% 82%, rgba(201, 168, 92, 0.12), transparent 45%);
}

.mc-guide__icon {
  font-size: 56px;
  color: var(--brand-primary);
  opacity: 0.75;
  margin-bottom: 14px;
}

.mc-guide__title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 700;
  color: var(--brand-text);
}

.mc-guide__desc {
  margin: 0;
  font-size: 13px;
  color: var(--brand-text-secondary);
  max-width: 340px;
  line-height: 1.7;
}

/* --- 会话头部 --- */

.mc-chat-head {
  flex-shrink: 0;
  padding: 14px 18px;
  border-bottom: 1px solid var(--brand-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #fff 0%, #fdfaf6 100%);
}

.mc-chat-head__peer {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mc-chat-head__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--brand-sidebar-gradient);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mc-chat-head__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mc-chat-head__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
}

.mc-chat-head__home {
  padding: 0;
  font-size: 12px;
  height: auto;
}

/* --- 关联商品摘要卡 --- */

.mc-goods-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 6px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
  border: 1px solid var(--brand-border);
}

.mc-goods-card__thumb {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--brand-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-accent);
  font-size: 18px;
}

.mc-goods-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mc-goods-card__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  max-width: 200px;
}

.mc-goods-card__name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-goods-card__price {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand-accent);
}

.mc-goods-card__btn {
  flex-shrink: 0;
}

/* --- 消息区 --- */

.mc-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--brand-bg);
}

.mc-messages__loading,
.mc-messages__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: var(--brand-text-secondary);
  font-size: 13px;
  padding: 40px 16px;
  margin: auto;
}

.mc-messages__loading-icon {
  font-size: 22px;
  animation: mc-spin 1s linear infinite;
  color: var(--brand-primary);
}

.mc-messages__empty .el-icon {
  font-size: 34px;
  color: var(--brand-primary-soft);
}

@keyframes mc-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 日期分隔 */

.mc-day {
  display: flex;
  justify-content: center;
  margin: 14px 0 10px;
}

.mc-day span {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
  background: rgba(74, 69, 72, 0.06);
  padding: 2px 12px;
  border-radius: 999px;
}

/* 消息气泡 */

.mc-msg {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  max-width: 76%;
  animation: mc-fade-in 0.26s ease both;
}

.mc-msg--mine {
  align-self: flex-end;
  align-items: flex-end;
}

.mc-msg__bubble {
  padding: 9px 14px;
  border-radius: 14px;
  border-top-left-radius: 4px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  color: var(--brand-text);
  font-size: 13.5px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: var(--brand-shadow-sm);
}

.mc-msg--mine .mc-msg__bubble {
  border-radius: 14px;
  border-top-right-radius: 4px;
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: #fff;
}

.mc-msg__time {
  font-size: 10.5px;
  color: var(--brand-text-secondary);
  padding: 0 2px;
}

@keyframes mc-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- 输入区 --- */

.mc-input {
  flex-shrink: 0;
  border-top: 1px solid var(--brand-border);
  padding: 12px 14px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: var(--brand-white);
}

.mc-input__field {
  flex: 1;
  resize: none;
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  padding: 9px 12px;
  font-family: var(--brand-font);
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--brand-text);
  background: var(--brand-bg-soft);
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.mc-input__field:focus {
  border-color: var(--brand-primary);
  background: #fff;
}

.mc-input__send {
  flex-shrink: 0;
  height: 38px;
}

/* ========== 联系人候选弹窗 ========== */

.mc-contact-tip {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--brand-text-secondary);
  padding: 8px 12px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg-soft);
  border-left: 3px solid var(--brand-accent);
}

.mc-contact-loading,
.mc-contact-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 30px 16px;
  text-align: center;
  color: var(--brand-text-secondary);
  font-size: 13px;
}

.mc-contact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 52vh;
  overflow-y: auto;
}

.mc-contact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  font-family: inherit;
}

.mc-contact:hover {
  border-color: var(--brand-primary);
  background: var(--brand-primary-soft);
  transform: translateX(2px);
}

.mc-contact__thumb {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--brand-bg-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-accent);
  font-size: 20px;
}

.mc-contact__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mc-contact__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mc-contact__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.mc-contact__role {
  transform: scale(0.9);
  transform-origin: left center;
}

.mc-contact__goods {
  font-size: 12px;
  color: var(--brand-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mc-contact__arrow {
  font-size: 18px;
  color: var(--brand-primary);
  flex-shrink: 0;
}

/* ========== 响应式 ========== */

@media (max-width: 768px) {

  .mc-body {
    flex-direction: column;
  }

  .mc-side {
    width: 100%;
    flex: 0 0 40%;
  }

  .mc-main {
    flex: 1;
  }

  .mc-msg {
    max-width: 88%;
  }

  .mc-goods-card__info {
    max-width: 140px;
  }
}

</style>
