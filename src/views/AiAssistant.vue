<template>
  <!--
    校园 AI 助手 · 完整可演示成品（当前后端为 Mock 规则问答，可整体替换为真实 LLM）
    调用链：本页 → POST /api/ai/chat → AiController → AiService → { reply, suggestions }
    会话仅保存在当前浏览器内存，刷新即清空；不做数据库持久化
  -->
  <div class="ai-page">

    <!-- ============ Hero ============ -->
    <section class="ai-hero">
      <div class="ai-hero__glow ai-hero__glow--pink"></div>
      <div class="ai-hero__glow ai-hero__glow--butter"></div>
      <div class="ai-hero__glow ai-hero__glow--mist"></div>

      <div class="ai-hero__main">
        <div class="ai-hero__avatar">
          <el-icon><MagicStick /></el-icon>
        </div>
        <div class="ai-hero__text">
          <h1 class="ai-hero__title">你的校园交易智能伙伴</h1>
          <p class="ai-hero__subtitle">
            帮你寻找好物、解答交易问题，让校园闲置流转更简单。
          </p>
        </div>
      </div>

      <!-- UI 状态：仅表示前端助手在线，不代表已接入任何真实大模型 -->
      <div class="ai-hero__status">
        <span class="ai-hero__dot"></span>
        AI Assistant Online
      </div>
    </section>

    <!-- ============ 主体：左能力 / 右对话 ============ -->
    <div class="ai-grid">

      <!-- 左侧 -->
      <aside class="ai-side">

        <!-- 快捷问题 -->
        <div class="side-card">
          <div class="side-card__title">
            <el-icon><ChatLineSquare /></el-icon>
            快捷问题
          </div>
          <button
            v-for="q in quickQuestions"
            :key="q"
            class="quick-q"
            :disabled="sending"
            @click="sendMessage(q)"
          >
            <span>{{ q }}</span>
            <el-icon class="quick-q__arrow"><ArrowRight /></el-icon>
          </button>
        </div>

        <!-- 能力卡片 -->
        <div class="side-card">
          <div class="side-card__title">
            <el-icon><Menu /></el-icon>
            AI 能力
            <span class="side-card__tag">能力预览</span>
          </div>
          <div
            v-for="cap in capabilities"
            :key="cap.no"
            class="cap-item"
          >
            <div class="cap-item__icon" :style="{ background: cap.bg }">
              <el-icon><component :is="cap.icon" /></el-icon>
            </div>
            <div class="cap-item__body">
              <div class="cap-item__name">
                <span class="cap-item__no">{{ cap.no }}</span>{{ cap.name }}
              </div>
              <div class="cap-item__desc">{{ cap.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 游客提示：非阻断，基础问答仍可使用 -->
        <div v-if="!isLoggedIn" class="side-card guest-card">
          <el-icon class="guest-card__icon"><UserFilled /></el-icon>
          <div class="guest-card__text">
            <div class="guest-card__title">游客体验中</div>
            <div class="guest-card__desc">登录后可以保存你的 AI 对话记录</div>
          </div>
          <router-link
            class="guest-card__btn"
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
          >去登录</router-link>
        </div>
      </aside>

      <!-- 右侧：对话区 -->
      <section class="chat-panel">

        <header class="chat-panel__header">
          <div class="chat-panel__avatar">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="chat-panel__meta">
            <div class="chat-panel__name">校园交易助手</div>
            <div class="chat-panel__state">
              <span class="chat-panel__state-dot"></span>
              {{ sending ? '正在输入…' : '在线，随时可以提问' }}
            </div>
          </div>
          <button
            class="chat-panel__clear"
            title="清空当前会话"
            :disabled="sending || messages.length <= 1"
            @click="clearConversation"
          >
            <el-icon><RefreshLeft /></el-icon>
            清空
          </button>
        </header>

        <!-- 消息流 -->
        <div ref="scrollRef" class="chat-messages">

          <div
            v-for="msg in messages"
            :key="msg.id"
            class="msg-row"
            :class="msg.role === 'user' ? 'msg-row--user' : 'msg-row--ai'"
          >
            <!-- AI 头像 -->
            <div v-if="msg.role === 'ai'" class="msg-avatar msg-avatar--ai">
              <el-icon><MagicStick /></el-icon>
            </div>

            <div class="msg-bubble-col">
              <div class="msg-meta">{{ formatTime(msg.time) }}</div>

              <!-- 正常文本气泡 -->
              <div
                v-if="msg.status !== 'error'"
                class="msg-bubble"
                :class="msg.role === 'user' ? 'msg-bubble--user' : 'msg-bubble--ai'"
              >
                <span class="msg-text">{{ msg.text }}</span>
              </div>

              <!-- 失败气泡：可重新发送 -->
              <div v-else class="msg-bubble msg-bubble--error">
                <el-icon class="msg-bubble__warn"><WarningFilled /></el-icon>
                <div class="msg-error__body">
                  <span>AI 暂时没有回应，请稍后再试。</span>
                  <button class="msg-retry" @click="retry(msg.retryText)">
                    <el-icon><RefreshRight /></el-icon>重新发送
                  </button>
                </div>
              </div>

              <!-- AI 追问建议 -->
              <div
                v-if="msg.role === 'ai' && msg.status !== 'error' && msg.suggestions && msg.suggestions.length"
                class="msg-suggest"
              >
                <button
                  v-for="s in msg.suggestions"
                  :key="s"
                  class="msg-suggest__chip"
                  :disabled="sending"
                  @click="sendMessage(s)"
                >{{ s }}</button>
              </div>
            </div>

            <!-- 用户头像 -->
            <div v-if="msg.role === 'user'" class="msg-avatar msg-avatar--user">
              {{ userInitial }}
            </div>
          </div>

          <!-- AI 思考状态 -->
          <div v-if="sending" class="msg-row msg-row--ai think-row">
            <div class="msg-avatar msg-avatar--ai">
              <el-icon><MagicStick /></el-icon>
            </div>
            <div class="msg-bubble-col">
              <div class="msg-meta">AI 正在整理答案…</div>
              <div class="msg-bubble msg-bubble--ai think-bubble">
                <span class="think-dot"></span>
                <span class="think-dot"></span>
                <span class="think-dot"></span>
              </div>
            </div>
          </div>

        </div>

        <!-- 输入区 -->
        <footer class="chat-input">
          <el-input
            ref="inputRef"
            v-model="draft"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            maxlength="500"
            resize="none"
            placeholder="问问商品、发布、购买或交易流程…（Enter 发送，Shift + Enter 换行）"
            class="chat-input__field"
            @keydown="onKeydown"
          />
          <el-button
            type="primary"
            class="chat-input__send"
            :loading="sending"
            :disabled="!canSend"
            @click="onSendClick"
          >
            <el-icon v-if="!sending"><Promotion /></el-icon>
            {{ sending ? '思考中…' : '发送' }}
          </el-button>
        </footer>

      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  MagicStick, ChatLineSquare, ChatDotRound, ArrowRight, Promotion,
  Menu, Star, Search, Tickets, UserFilled, WarningFilled,
  RefreshRight, RefreshLeft
} from '@element-plus/icons-vue'
import request from '../utils/request'

const route = useRoute()

// =========================
// 会话状态：仅内存，刷新清空
// =========================

const isLoggedIn = computed(() => !!localStorage.getItem('token'))
const userInitial = computed(() => {
  const name = localStorage.getItem('username') || ''
  return name ? name.charAt(0).toUpperCase() : '我'
})

// 为未来多轮对话预留：前端生成会话标识，当前后端不持久化
const conversationId = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

let seq = 0
const nextId = () => ++seq

const welcomeMessage = {
  id: nextId(),
  role: 'ai',
  text: '你好，我是校园交易助手。\n你可以问我商品、交易、发布等问题，也可以点击左侧的快捷问题直接开始。',
  time: new Date(),
  status: 'ok',
  suggestions: ['推荐适合我的商品', '怎么发布商品？', '交易流程是什么？']
}

const messages = ref([welcomeMessage])
const draft = ref('')
const sending = ref(false)
const scrollRef = ref(null)
const inputRef = ref(null)

const canSend = computed(() => draft.value.trim().length > 0 && !sending.value)

// =========================
// 静态内容
// =========================

const quickQuestions = [
  '推荐适合我的商品',
  '附近有什么好物？',
  '怎么发布商品？',
  '交易流程是什么？'
]

// 三个能力均为“能力预览”，诚实标注当前是基础版助手
const capabilities = [
  {
    no: '01',
    name: '智能推荐',
    desc: '根据你的需求寻找校园好物',
    icon: Star,
    bg: 'linear-gradient(135deg,#f6e7b4,#f1dd9e)'
  },
  {
    no: '02',
    name: '商品问答',
    desc: '快速了解商品和交易信息',
    icon: Search,
    bg: 'linear-gradient(135deg,#f7e1e3,#f4d5d8)'
  },
  {
    no: '03',
    name: '交易助手',
    desc: '帮你理解发布、购买和交易流程',
    icon: Tickets,
    bg: 'linear-gradient(135deg,#dbe3e8,#c9d5dc)'
  }
]

// =========================
// 对话逻辑
// =========================

const scrollToBottom = () => {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

const focusInput = () => {
  nextTick(() => {
    // el-input 暴露 focus 方法
    inputRef.value?.focus?.()
  })
}

watch(messages, scrollToBottom, { deep: true })
watch(sending, scrollToBottom)

/**
 * 发送一条消息
 * @param {string} rawText 消息内容（快捷问题/追问/输入框/重发共用同一入口）
 */
const sendMessage = async (rawText) => {
  const text = (rawText ?? draft.value).trim()

  // 空消息禁止发送
  if (!text || sending.value) return

  // 来自输入框时清空草稿；来自快捷问题/重发不影响草稿
  if (draft.value.trim() === text) {
    draft.value = ''
  }

  messages.value.push({
    id: nextId(),
    role: 'user',
    text,
    time: new Date(),
    status: 'ok'
  })

  sending.value = true

  // 思考动画的最短展示时间：避免本地 Mock 瞬间返回，让交互过程可感知
  const minThinking = new Promise(resolve => setTimeout(resolve, 650))

  try {
    const apiCall = request.post('/ai/chat', {
      message: text,
      conversationId
    })

    const [result] = await Promise.all([apiCall, minThinking])

    // 契约防御：即使后端结构异常也按失败处理，不渲染空白气泡
    if (!result || typeof result.reply !== 'string' || !result.reply.trim()) {
      pushError(text)
    } else {
      messages.value.push({
        id: nextId(),
        role: 'ai',
        text: result.reply,
        time: new Date(),
        status: 'ok',
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
      })
    }
  } catch (error) {
    // request.js 已统一 toast；消息流内再给出可“重新发送”的错误气泡
    await minThinking
    pushError(text)
  } finally {
    sending.value = false
    focusInput()
  }
}

const pushError = (retryText) => {
  messages.value.push({
    id: nextId(),
    role: 'ai',
    text: '',
    time: new Date(),
    status: 'error',
    retryText
  })
}

// 失败重发：移除错误气泡后用原问题重新请求
const retry = (retryText) => {
  if (!retryText || sending.value) return
  const last = messages.value[messages.value.length - 1]
  if (last && last.status === 'error') {
    messages.value.pop()
  }
  sendMessage(retryText)
}

const onSendClick = () => sendMessage()

// Enter 发送 / Shift+Enter 换行；中文输入法组词期间不拦截
const onKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    sendMessage()
  }
}

const clearConversation = () => {
  if (sending.value || messages.value.length <= 1) return
  messages.value = [{
    ...welcomeMessage,
    id: nextId(),
    time: new Date()
  }]
  focusInput()
}

const formatTime = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

onMounted(() => {
  focusInput()
})
</script>

<style scoped>
/* ============================================================
   校园 AI 助手：奶油白 + 淡粉 + 淡黄 + 少量灰蓝，无紫色/高饱和霓虹
   ============================================================ */

.ai-page {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ========== Hero ========== */

.ai-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--brand-radius-xl);
  padding: 30px 32px;
  background:
    linear-gradient(120deg, #fdf7f2 0%, #fbeef0 52%, #fbf5e4 100%);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.ai-hero__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(34px);
  opacity: 0.55;
  pointer-events: none;
  animation: glowFloat 9s ease-in-out infinite;
}

.ai-hero__glow--pink {
  width: 220px;
  height: 220px;
  right: 22%;
  top: -120px;
  background: rgba(232, 180, 184, 0.5);
}

.ai-hero__glow--butter {
  width: 180px;
  height: 180px;
  right: -40px;
  bottom: -110px;
  background: rgba(232, 214, 150, 0.5);
  animation-delay: -3s;
}

.ai-hero__glow--mist {
  width: 150px;
  height: 150px;
  left: -50px;
  bottom: -90px;
  background: rgba(180, 198, 208, 0.45);
  animation-delay: -6s;
}

@keyframes glowFloat {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(10px, 12px); }
}

.ai-hero__main {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  z-index: 1;
}

.ai-hero__avatar {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #e8b4b8, #d8a8ad);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 30px;
  box-shadow: 0 12px 26px rgba(216, 168, 173, 0.4);
}

.ai-hero__title {
  margin: 0;
  font-size: 25px;
  font-weight: 800;
  color: var(--brand-text);
  letter-spacing: 0.5px;
}

.ai-hero__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--brand-text-regular);
}

.ai-hero__status {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: #6b7f72;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(143, 174, 108, 0.35);
  backdrop-filter: blur(4px);
}

.ai-hero__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9db98c;
  box-shadow: 0 0 0 4px rgba(157, 185, 140, 0.2);
  animation: pulseDot 2.2s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { box-shadow: 0 0 0 3px rgba(157, 185, 140, 0.18); }
  50% { box-shadow: 0 0 0 6px rgba(157, 185, 140, 0.06); }
}

/* ========== 左右布局 ========== */

.ai-grid {
  display: grid;
  grid-template-columns: 316px 1fr;
  gap: 20px;
  align-items: start;
}

.ai-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  padding: 18px;
}

.side-card__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
  margin-bottom: 14px;
}

.side-card__title .el-icon {
  color: var(--brand-primary);
  font-size: 17px;
}

.side-card__tag {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #b08a52;
  background: var(--brand-accent-soft);
  border-radius: 999px;
  padding: 2px 10px;
}

/* 快捷问题 */
.quick-q {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
  border-radius: 12px;
  border: 1px solid var(--brand-border);
  background: #fdfaf7;
  font-size: 13px;
  color: var(--brand-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.22s ease;
}

.quick-q:last-child {
  margin-bottom: 0;
}

.quick-q:hover:not(:disabled) {
  border-color: var(--brand-primary);
  background: #fff;
  color: var(--brand-primary-active);
  transform: translateX(3px);
}

.quick-q:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.quick-q__arrow {
  font-size: 13px;
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

.quick-q:hover:not(:disabled) .quick-q__arrow {
  color: var(--brand-primary);
}

/* 能力卡片 */
.cap-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 4px;
}

.cap-item + .cap-item {
  border-top: 1px dashed var(--brand-border);
}

.cap-item__icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  color: var(--brand-text);
}

.cap-item__name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--brand-text);
}

.cap-item__no {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-primary);
  margin-right: 7px;
  letter-spacing: 0.5px;
}

.cap-item__desc {
  margin-top: 3px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--brand-text-secondary);
}

/* 游客提示卡 */
.guest-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #fbf6f0, #f6ece0);
}

.guest-card__icon {
  font-size: 22px;
  color: var(--brand-accent);
  flex-shrink: 0;
}

.guest-card__text {
  flex: 1;
  min-width: 0;
}

.guest-card__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--brand-text);
}

.guest-card__desc {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.guest-card__btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #e8b4b8, #d8a8ad);
  transition: filter 0.2s ease;
}

.guest-card__btn:hover {
  filter: brightness(1.06);
}

/* ========== 对话面板 ========== */

.chat-panel {
  display: flex;
  flex-direction: column;
  height: 640px;
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
}

.chat-panel__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--brand-border);
  background: linear-gradient(120deg, #fdfaf7, #fbf1f2);
}

.chat-panel__avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e8b4b8, #d8a8ad);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.chat-panel__meta {
  flex: 1;
}

.chat-panel__name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--brand-text);
}

.chat-panel__state {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.chat-panel__state-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9db98c;
}

.chat-panel__clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--brand-border);
  background: #fff;
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chat-panel__clear:hover:not(:disabled) {
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

.chat-panel__clear:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 消息流 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 22px 20px;
  background:
    radial-gradient(circle at 90% 0%, rgba(232, 180, 184, 0.06), transparent 40%),
    radial-gradient(circle at 0% 100%, rgba(201, 168, 92, 0.05), transparent 36%),
    #fdfaf7;
}

.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  animation: msgIn 0.3s ease both;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.msg-row--user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
}

.msg-avatar--ai {
  background: linear-gradient(135deg, #e8b4b8, #d8a8ad);
  color: #fff;
  box-shadow: 0 4px 12px rgba(216, 168, 173, 0.3);
}

.msg-avatar--user {
  background: var(--brand-aux-soft);
  color: #5f6b76;
}

.msg-bubble-col {
  max-width: 76%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.msg-row--user .msg-bubble-col {
  align-items: flex-end;
}

.msg-meta {
  font-size: 11px;
  color: var(--brand-text-secondary);
  margin: 0 4px 5px;
}

.msg-bubble {
  padding: 11px 15px;
  border-radius: 15px;
  font-size: 13.5px;
  line-height: 1.75;
  word-break: break-word;
}

.msg-bubble--ai {
  background: #fff;
  color: var(--brand-text);
  border: 1px solid var(--brand-border);
  border-top-left-radius: 5px;
  box-shadow: 0 2px 8px rgba(74, 69, 72, 0.04);
}

.msg-bubble--user {
  background: linear-gradient(135deg, #e8b4b8, #ddabb0);
  color: #fff;
  border-top-right-radius: 5px;
  box-shadow: 0 4px 14px rgba(216, 168, 173, 0.28);
}

.msg-text {
  white-space: pre-wrap;
}

/* AI 追问 chips */
.msg-suggest {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}

.msg-suggest__chip {
  border: 1px dashed var(--brand-primary);
  background: rgba(255, 255, 255, 0.8);
  color: var(--brand-primary-active);
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.msg-suggest__chip:hover:not(:disabled) {
  background: var(--brand-primary-soft);
}

.msg-suggest__chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 失败气泡 */
.msg-bubble--error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: #fdf6e7;
  border: 1px solid #eadcb8;
  color: #8a6d3b;
  border-top-left-radius: 5px;
}

.msg-bubble__warn {
  font-size: 17px;
  color: var(--brand-accent);
  flex-shrink: 0;
  margin-top: 1px;
}

.msg-error__body {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.msg-retry {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-primary-active);
  cursor: pointer;
}

.msg-retry:hover {
  text-decoration: underline;
}

/* 思考动画 */
.think-row {
  margin-bottom: 20px;
}

.think-bubble {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 18px;
}

.think-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-primary);
  animation: thinkBounce 1.2s ease-in-out infinite;
}

.think-dot:nth-child(2) {
  background: var(--brand-accent);
  animation-delay: 0.18s;
}

.think-dot:nth-child(3) {
  background: #93a8b4;
  animation-delay: 0.36s;
}

@keyframes thinkBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.55; }
  30% { transform: translateY(-5px); opacity: 1; }
}

/* 输入区 */
.chat-input {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid var(--brand-border);
  background: #fff;
}

.chat-input__field {
  flex: 1;
}

.chat-input__field :deep(.el-textarea__inner) {
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.6;
  box-shadow: none;
  border-color: var(--brand-border);
  resize: none;
}

.chat-input__field :deep(.el-textarea__inner:focus) {
  border-color: var(--brand-primary);
}

.chat-input__send {
  flex-shrink: 0;
  height: 40px;
  padding: 0 22px;
  border-radius: 13px;
  font-weight: 600;
}

.chat-input__send .el-icon {
  margin-right: 3px;
}

/* ========== 响应式：窄屏上下布局 ========== */
@media (max-width: 900px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }

  .ai-side {
    order: 2;
  }

  .chat-panel {
    order: 1;
    height: 560px;
  }

  .ai-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .ai-hero__title {
    font-size: 21px;
  }

  .msg-bubble-col {
    max-width: 84%;
  }
}

@media (max-width: 560px) {
  .ai-hero {
    padding: 22px 20px;
  }

  .chat-panel {
    height: 520px;
  }

  .chat-messages {
    padding: 16px 14px;
  }

  .chat-input {
    padding: 12px;
  }

  .chat-input__send {
    padding: 0 16px;
  }
}
</style>
