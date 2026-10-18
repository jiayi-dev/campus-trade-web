<template>
  <!--
    「淘小易」校园二手交易平台专属 AI 助手
    调用链：本页 → POST /api/ai/chat/stream（SSE）→ AiController → AiService
    有 LLM Key 时为真实大模型流式回答；未配置时降级为平台规则问答
    支持能力：B9 Tool Calling（searchGoods/getSellerCredit/getOrderStatus）
              searchGoods 命中时下方展示真实商品卡片（白名单字段）
              B12 RAG 检索命中时下方展示「知识来源」（标题/相似度/摘要）
    会话仅保存在当前浏览器内存，刷新即清空；不做数据库持久化
  -->
  <div class="ai-page">

    <!-- ============ Hero：品牌欢迎区 ============ -->
    <section class="ai-hero">
      <div class="ai-hero__glow ai-hero__glow--pink"></div>
      <div class="ai-hero__glow ai-hero__glow--butter"></div>
      <div class="ai-hero__glow ai-hero__glow--mist"></div>

      <div class="ai-hero__main">
        <div class="ai-hero__avatar">
          <el-icon><MagicStick /></el-icon>
          <span class="ai-hero__avatar-badge">淘</span>
        </div>
        <div class="ai-hero__text">
          <div class="ai-hero__brand-row">
            <span class="ai-hero__platform">校园二手交易平台</span>
            <span class="ai-hero__divider">·</span>
            <span class="ai-hero__ai-tag">AI 助手</span>
          </div>
          <h1 class="ai-hero__title">你好，我是<span class="ai-hero__name">淘小易</span></h1>
          <p class="ai-hero__subtitle">
            发布商品、面交流程、卖家申请、信用分规则——校园闲置交易的问题，都可以问我。
          </p>
          <!-- 快捷提问入口（新会话时展示，开始对话后自动收起） -->
          <div v-if="messages.length <= 1" class="ai-hero__starters">
            <button
              v-for="q in quickQuestions"
              :key="q"
              class="starter-chip"
              :disabled="sending"
              @click="sendMessage(q)"
            >
              <el-icon class="starter-chip__icon"><ChatLineSquare /></el-icon>
              {{ q }}
            </button>
          </div>
        </div>
      </div>

      <!-- 在线状态：仅表示助手服务可用 -->
      <div class="ai-hero__status">
        <span class="ai-hero__dot"></span>
        淘小易在线
      </div>
    </section>

    <!-- ============ 主体：左能力 / 右对话 ============ -->
    <div class="ai-grid">

      <!-- 左侧 -->
      <aside class="ai-side">

        <!-- 会话列表（登录用户显示） -->
        <div v-if="isLoggedIn" class="side-card conv-side-card">
          <div class="side-card__title">
            <el-icon><ChatDotRound /></el-icon>
            最近对话
          </div>
          <ConversationSidebar
            :conversations="conversations"
            :activeId="activeConversationId"
            :loading="convLoading"
            @new="onNewConversation"
            @select="onSelectConversation"
            @delete="onDeleteConversation"
          />
        </div>

        <!-- 游客对话提示 -->
        <div v-else class="side-card conv-guest-card">
          <el-icon class="conv-guest-card__icon"><UserFilled /></el-icon>
          <div class="conv-guest-card__text">
            登录后可保存对话历史，切换不同会话
          </div>
          <router-link
            class="conv-guest-card__btn"
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
          >去登录</router-link>
        </div>

        <!-- 快捷提问 -->
        <div class="side-card">
          <div class="side-card__title">
            <el-icon><ChatLineSquare /></el-icon>
            快捷提问
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

        <!-- 当前能力 -->
        <div class="side-card">
          <div class="side-card__title">
            <el-icon><Menu /></el-icon>
            我能帮你做什么
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

        <!-- B9 Tool Calling：三个真实只读查询能力（订单查询需登录） -->
        <div class="side-card">
          <div class="side-card__title">
            <el-icon><Tools /></el-icon>
            淘小易能帮你查
            <span class="side-card__tag">已上线</span>
          </div>
          <div class="future-tool">
            <span class="future-tool__dot future-tool__dot--on"></span>查询在售商品与价格
          </div>
          <div class="future-tool">
            <span class="future-tool__dot future-tool__dot--on"></span>查看卖家信用与评价
          </div>
          <div class="future-tool">
            <span class="future-tool__dot future-tool__dot--on"></span>追踪我的订单状态<span class="future-tool__hint">（登录）</span>
          </div>
        </div>

        <!-- 游客提示：非阻断，基础问答与公开数据查询仍可使用 -->
        <div v-if="!isLoggedIn" class="side-card guest-card">
          <el-icon class="guest-card__icon"><UserFilled /></el-icon>
          <div class="guest-card__text">
            <div class="guest-card__title">游客体验中</div>
            <div class="guest-card__desc">登录后可以让淘小易帮你查询自己的订单</div>
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
            <div class="chat-panel__name">
              淘小易
              <span class="chat-panel__name-sub">校园交易 AI 助手</span>
            </div>
            <div class="chat-panel__state" :class="{ 'chat-panel__state--active': sending }">
              <span class="chat-panel__state-dot" :class="{ 'is-pulsing': sending }"></span>
              {{ headerState }}
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
              <div class="msg-meta">
                {{ msg.role === 'ai' ? '淘小易' : '我' }} · {{ formatTime(msg.time) }}
              </div>

              <!-- Agent 工作状态面板：真实 SSE stage/tool 事件驱动，位于回答气泡之上 -->
              <!-- 工作中展示完整步骤；完成后有工具调用的轮次折叠为轻量摘要；纯直答轮次完成后不再展示 -->
              <div
                v-if="msg.role === 'ai' && msg.toolEvents && msg.toolEvents.length && (msg.streaming || hasToolStep(msg))"
                class="work-steps"
              >
                <!-- 完成后的折叠摘要：点击可展开回看步骤 -->
                <button
                  v-if="msg.stepsCollapsed"
                  class="work-steps__summary"
                  @click="msg.stepsCollapsed = false"
                >
                  <el-icon class="work-steps__summary-icon"><CircleCheckFilled /></el-icon>
                  已完成 {{ msg.toolEvents.length }} 个步骤
                  <el-icon class="work-steps__chevron"><ArrowRight /></el-icon>
                </button>

                <!-- 完整步骤面板 -->
                <div v-else class="work-steps__panel">
                  <div class="work-steps__title">
                    <span>{{ msg.streaming ? '淘小易正在工作' : '淘小易的工作步骤' }}</span>
                    <button
                      v-if="!msg.streaming && hasToolStep(msg)"
                      class="work-steps__collapse"
                      @click="msg.stepsCollapsed = true"
                    >收起</button>
                  </div>
                  <div
                    v-for="step in msg.toolEvents"
                    :key="step.key"
                    class="work-step"
                    :class="`work-step--${step.state}`"
                  >
                    <el-icon
                      class="work-step__status"
                      :class="{ 'is-spinning': step.state === 'running' }"
                    >
                      <Loading v-if="step.state === 'running'" />
                      <CircleCheckFilled v-else-if="step.state === 'done'" />
                      <WarningFilled v-else />
                    </el-icon>
                    <el-icon v-if="step.kind === 'tool'" class="work-step__tool-icon">
                      <component :is="toolIcon(step.toolName)" />
                    </el-icon>
                    <span class="work-step__label">{{ step.name }}</span>
                  </div>
                </div>
              </div>

              <!-- 正常文本气泡：富文本（加粗+换行），流式输出时末尾带闪烁光标 -->
              <!-- 工具先于正文执行时 AI 文本可能为空，空气泡不渲染，仅展示上方工作状态面板 -->
              <div
                v-if="msg.status !== 'error' && (msg.role === 'user' || msg.text)"
                class="msg-bubble"
                :class="[
                  msg.role === 'user' ? 'msg-bubble--user' : 'msg-bubble--ai',
                  { 'msg-bubble--streaming': msg.streaming }
                ]"
              >
                <!-- 用户消息纯文本；AI 消息经转义后渲染轻量 Markdown（**加粗**），换行由 white-space:pre-wrap 保留 -->
                <span
                  v-if="msg.role === 'user'"
                  class="msg-text"
                >{{ msg.text }}</span>
                <span
                  v-else
                  class="msg-text msg-text--rich"
                  v-html="renderRichText(msg.text)"
                ></span>
                <!-- 流式输出光标：真实 SSE 输出期间展示，结束后消失，不做假打字机 -->
                <span
                  v-if="msg.role === 'ai' && msg.streaming"
                  class="msg-cursor"
                  aria-hidden="true"
                ></span>
              </div>

              <!-- 失败气泡：可重新发送（独立 v-if，与上方工作状态面板不形成链式依赖） -->
              <div v-if="msg.status === 'error'" class="msg-bubble msg-bubble--error">
                <el-icon class="msg-bubble__warn"><WarningFilled /></el-icon>
                <div class="msg-error__body">
                  <span>淘小易暂时没有回应，请稍后再试。</span>
                  <button class="msg-retry" @click="retry(msg.retryText)">
                    <el-icon><RefreshRight /></el-icon>重新发送
                  </button>
                </div>
              </div>

              <!-- AI 导购商品卡片：searchGoods 工具真实命中时由后端 tool end 事件下发，绑定本条消息 -->
              <div
                v-if="msg.role === 'ai' && msg.goods && msg.goods.length"
                class="msg-goods"
              >
                <div class="msg-goods__title">
                  <el-icon><ShoppingBag /></el-icon>
                  <span v-if="msg.goodsTotal > msg.goods.length">
                    共找到 {{ msg.goodsTotal }} 件在售商品，精选 {{ msg.goods.length }} 件
                  </span>
                  <span v-else>为你找到 {{ msg.goods.length }} 件在售商品</span>
                </div>
                <div class="msg-goods__rail">
                  <div
                    v-for="g in msg.goods"
                    :key="g.goodsId"
                    class="ai-goods-card"
                    @click="goGoodsDetail(g.goodsId)"
                  >
                    <div class="ai-goods-card__cover">
                      <img
                        v-if="g.imageUrl"
                        :src="g.imageUrl"
                        :alt="g.name"
                        class="ai-goods-card__img"
                        @error="g.imageUrl = ''"
                      />
                      <div v-else class="ai-goods-card__placeholder">
                        <el-icon><ShoppingBag /></el-icon>
                      </div>
                      <span
                        v-if="g.conditionText"
                        class="ai-goods-card__condition"
                        :class="`condition--${g.conditionLevel}`"
                      >{{ g.conditionText }}</span>
                    </div>
                    <div class="ai-goods-card__body">
                      <div class="ai-goods-card__name" :title="g.name">{{ g.name }}</div>
                      <div class="ai-goods-card__meta">
                        <span class="ai-goods-card__price">¥{{ g.price }}</span>
                        <span v-if="g.campus" class="ai-goods-card__campus">{{ g.campus }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RAG 知识来源：后端检索真实命中时随 sources 事件下发，绑定本条消息 -->
              <div
                v-if="msg.role === 'ai' && msg.sources && msg.sources.length"
                class="msg-sources"
              >
                <div class="msg-sources__title">
                  <el-icon><Collection /></el-icon>
                  知识来源
                  <span class="msg-sources__tip">相似度为检索匹配度，仅供参考</span>
                </div>
                <div
                  v-for="(s, i) in msg.sources"
                  :key="i"
                  class="source-card source-card--clickable"
                  @click="openSourceDetail(s)"
                >
                  <div class="source-card__head">
                    <span class="source-card__name">{{ s.title }}</span>
                    <span class="source-card__score">{{ Math.round(s.similarity * 100) }}%</span>
                  </div>
                  <div v-if="s.snippet" class="source-card__snippet">{{ s.snippet }}</div>
                  <div class="source-card__more">
                    查看详情
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </div>
              </div>

              <!-- AI 追问建议 -->
              <div
                v-if="msg.role === 'ai' && msg.status !== 'error' && msg.suggestions && msg.suggestions.length && !msg.streaming"
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

          <!-- AI 思考状态（仅在首 chunk 到达前展示） -->
          <div v-if="sending && !streamingStarted" class="msg-row msg-row--ai think-row">
            <div class="msg-avatar msg-avatar--ai">
              <el-icon><MagicStick /></el-icon>
            </div>
            <div class="msg-bubble-col">
              <div class="msg-meta">淘小易正在思考…</div>
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
            placeholder="向淘小易提问：发布商品、交易流程、卖家申请、信用分…（Enter 发送，Shift+Enter 换行）"
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
            {{ sending ? (agentStage === 'streaming' ? '输出中' : '思考中') : '发送' }}
          </el-button>
        </footer>

      </section>
    </div>

    <!-- 知识来源详情抽屉（P1）：展示命中片段的完整正文，数据来自后端本次真实检索结果 -->
    <el-drawer
      v-model="sourceDrawerVisible"
      :title="activeSource ? activeSource.title : '知识来源'"
      direction="rtl"
      size="420px"
      class="source-drawer"
    >
      <div v-if="activeSource" class="source-detail">
        <div class="source-detail__meta">
          <span class="source-detail__score">
            相似度 {{ Math.round((activeSource.similarity || 0) * 100) }}%
          </span>
          <span class="source-detail__tip">检索匹配度，仅供参考</span>
        </div>
        <div class="source-detail__label">命中片段</div>
        <div class="source-detail__content">{{ activeSource.content || activeSource.snippet || '（无内容）' }}</div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  MagicStick, ChatLineSquare, ChatDotRound, ArrowRight, Promotion,
  Menu, Star, Search, Tickets, UserFilled, WarningFilled,
  RefreshRight, RefreshLeft, Tools, Loading, CircleCheckFilled, Box,
  ShoppingBag, Collection, Plus, Delete
} from '@element-plus/icons-vue'
import request from '../utils/request'
import ConversationSidebar from '../components/ConversationSidebar.vue'

const route = useRoute()
const router = useRouter()

// =========================
// 会话状态：登录用户落库，游客 localStorage 兜底
// =========================

const isLoggedIn = computed(() => !!localStorage.getItem('token'))
const userInitial = computed(() => {
  const name = localStorage.getItem('username') || ''
  return name ? name.charAt(0).toUpperCase() : '我'
})

// 会话标识：登录用户使用后端 conversation ID（数字），游客使用随机串
let conversationId = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

// 对话历史状态（登录用户）
const conversations = ref([])
const activeConversationId = ref(null)
const convLoading = ref(false)

// 游客 localStorage 常量
const GUEST_STORAGE_KEY = 'ai_chat_guest'
const GUEST_MAX_MESSAGES = 50
const GUEST_EXPIRE_DAYS = 7

let seq = 0
const nextId = () => ++seq

const welcomeMessage = {
  id: nextId(),
  role: 'ai',
  text: '你好呀，我是**淘小易**，校园二手交易平台的 AI 助手。\n不管是发布商品、面交流程、卖家申请还是信用分规则，都可以直接问我，也可以点下面的问题快速开始。',
  time: new Date(),
  status: 'ok',
  streaming: false,
  // B9 预留：工具执行状态列表，当前恒为空数组，界面不渲染
  toolEvents: [],
  suggestions: ['怎么发布商品？', '校园交易流程是什么？', '卖家如何申请？', '信用分怎么算？']
}

const messages = ref([welcomeMessage])
const draft = ref('')
const sending = ref(false)
// 流式输出已开始（首个 chunk 到达后置 true），用于隐藏「思考中」动画、显示「正在输出」
const streamingStarted = ref(false)

// B9+：Agent 公开工作阶段（由后端 SSE stage/tool 事件驱动，绝不前端伪造）
// '' | thinking（等待模型决策）| tool（工具执行中）| generating（整理最终回答）| streaming（回答输出中）
const agentStage = ref('')
// 当前正在执行的工具的人类可读标签（来自后端 tool 事件 runningLabel）
const currentToolLabel = ref('')

// 聊天面板头部的实时状态文案：让用户随时知道 Agent 卡在哪一步
const headerState = computed(() => {
  if (!sending.value) return '在线，随时可以提问'
  if (agentStage.value === 'tool' && currentToolLabel.value) return currentToolLabel.value
  if (agentStage.value === 'generating') return '正在整理查询结果…'
  if (agentStage.value === 'streaming') return '正在输出回答…'
  return '正在理解你的问题…'
})

// 工具名 → 图标（仅前端展示映射，名称来自后端 tool 事件）
const TOOL_ICONS = { searchGoods: Search, getOrderStatus: Box, getSellerCredit: Star }
const toolIcon = (name) => TOOL_ICONS[name] || Tools
// 是否包含真实工具步骤（有工具调用的轮次完成后才折叠为「已完成 N 个步骤」）
const hasToolStep = (msg) => (msg.toolEvents || []).some((s) => s.kind === 'tool')
const scrollRef = ref(null)
const inputRef = ref(null)

// 用于在组件卸载或用户取消时中断流式 fetch，避免后台请求继续占用连接
let activeAbort = null

const canSend = computed(() => draft.value.trim().length > 0 && !sending.value)

// =========================
// 静态内容
// =========================

// 四个高频平台问题，与欢迎语下的追问建议保持一致
const quickQuestions = [
  '怎么发布商品？',
  '校园交易流程是什么？',
  '卖家如何申请？',
  '信用分怎么算？'
]

// 当前已具备的能力（诚实标注，不承诺实时数据查询——那是 B9 的规划）
const capabilities = [
  {
    no: '01',
    name: '发布指南',
    desc: '商品发布、图片上传、上下架规则',
    icon: Tickets,
    bg: 'linear-gradient(135deg,#f6e7b4,#f1dd9e)'
  },
  {
    no: '02',
    name: '交易答疑',
    desc: '下单、面交、确认收货全流程',
    icon: Search,
    bg: 'linear-gradient(135deg,#f7e1e3,#f4d5d8)'
  },
  {
    no: '03',
    name: '规则解读',
    desc: '卖家申请、信用分与信誉等级',
    icon: Star,
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
 * SSE 流式请求：用 fetch + ReadableStream 逐段读取后端 SSE
 * 事件格式：event: delta|stage|tool|sources|done|error + data: <内容>
 *
 * @param {string} message 用户输入
 * @param {(chunk:string)=>void} onChunk 每个文本增量
 * @param {()=>void} onDone  正常结束
 * @param {(msg:string)=>void} onError  后端 error 事件
 * @param {(payload:object)=>void} [onTool] 后端 tool 事件（真实工具执行状态；end 事件可附 goods 商品卡片白名单）
 * @param {(payload:object)=>void} [onStage] 后端 stage 事件（Agent 公开工作阶段）
 * @param {(payload:object)=>void} [onSources] 后端 sources 事件（RAG 知识来源，仅检索真实命中时下发）
 */
const streamChat = async (message, onChunk, onDone, onError, onTool, onStage, onSources) => {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  activeAbort = new AbortController()

  const response = await fetch('/api/ai/chat/stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, conversationId }),
    signal: activeAbort.signal
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE 事件以空行 \n\n 分隔，逐事件处理（兼容分包与粘包）
    let boundary
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      let event = 'message'
      let data = ''
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          data = line.slice(5).trim()
        }
      }

      if (event === 'delta') {
        onChunk(data)
      } else if (event === 'stage') {
        // B9+：Agent 公开工作阶段 {stage,label}（thinking/generating）
        try {
          onStage?.(JSON.parse(data))
        } catch {
          // 单个阶段事件解析失败不影响后续流
        }
      } else if (event === 'tool') {
        // B9：工具真实执行状态，payload 为紧凑 JSON {key,tool,phase,label,ok[,goods,total]}
        try {
          onTool?.(JSON.parse(data))
        } catch {
          // 单个工具事件解析失败不影响后续文本流
        }
      } else if (event === 'sources') {
        // B12：RAG 知识来源 {sources:[{title,similarity,snippet}]}，仅检索真实命中时由后端下发
        try {
          onSources?.(JSON.parse(data))
        } catch {
          // 单个来源事件解析失败不影响后续流
        }
      } else if (event === 'done') {
        onDone()
        return
      } else if (event === 'error') {
        onError(data)
        return
      }
    }
  }
  // 流读完但未收到 done 事件，按正常结束处理
  onDone()
}

/**
 * 发送一条消息（流式）
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

  // 登录用户首次发消息：自动创建后端对话
  if (isLoggedIn.value && !activeConversationId.value) {
    try {
      const data = await request.post('/ai/conversations', {})
      conversations.value.unshift({
        id: data.id,
        title: data.title,
        createTime: data.createTime,
        updateTime: data.updateTime
      })
      activeConversationId.value = data.id
      conversationId = String(data.id)
    } catch (e) {
      // 创建失败不阻断对话，降级为随机 ID（后端不存消息）
    }
  }

  messages.value.push({
    id: nextId(),
    role: 'user',
    text,
    time: new Date(),
    status: 'ok'
  })

  sending.value = true
  streamingStarted.value = false
  agentStage.value = ''
  currentToolLabel.value = ''

  // 指向当前正在流式输出的 AI 消息，用于追加 chunk
  let aiMsg = null
  let failed = false

  // 首个事件（阶段/文本/工具状态）到达时创建 AI 消息：
  // stage:thinking 通常最先到达，用户立刻看到「淘小易正在工作」而不是空白等待
  const ensureAiMsg = () => {
    if (!aiMsg) {
      aiMsg = {
        id: nextId(),
        role: 'ai',
        text: '',
        time: new Date(),
        status: 'ok',
        streaming: true,
        // 工作步骤时间线：阶段步骤(kind=stage) + 工具步骤(kind=tool)，全部由真实 SSE 事件驱动
        toolEvents: [],
        // 完成后是否折叠为「已完成 N 个步骤」摘要（仅有工具调用的轮次才折叠）
        stepsCollapsed: false,
        // B9+：searchGoods 工具真实命中时随 tool end 事件下发的商品卡片白名单
        // （goodsId/name/price/conditionText/imageUrl/campus），空数组=不渲染卡片区
        goods: [],
        // 命中总数（可能多于卡片数），用于如实提示「共 N 件」
        goodsTotal: 0,
        // B12：RAG 检索真实命中时随 sources 事件下发的知识来源，空数组=不渲染来源区
        sources: []
      }
      messages.value.push(aiMsg)
      streamingStarted.value = true
    }
  }

  // 将所有仍在 running 的阶段步骤标记为 done（新阶段开始/正文开始输出时调用）
  const finishRunningStageSteps = () => {
    if (!aiMsg) return
    aiMsg.toolEvents.forEach((s) => {
      if (s.kind === 'stage' && s.state === 'running') s.state = 'done'
    })
  }

  // 将所有仍在 running 的步骤统一置为目标状态（done/error 收尾时调用）
  const settleRunningSteps = (state) => {
    if (!aiMsg) return
    aiMsg.toolEvents.forEach((s) => {
      if (s.state === 'running') s.state = state
    })
  }

  try {
    await streamChat(
      text,
      (chunk) => {
        // 后端将换行转义为字面量 \n，此处还原为真实换行
        const piece = chunk.replace(/\\n/g, '\n')
        ensureAiMsg()
        // 正文开始输出：thinking/generating 阶段随之完成
        finishRunningStageSteps()
        agentStage.value = 'streaming'
        // 后续 chunk 追加到同一条消息
        aiMsg.text += piece
      },
      () => {
        // 正常结束：所有步骤置完成；有工具调用的轮次折叠为轻量摘要
        settleRunningSteps('done')
        if (aiMsg && hasToolStep(aiMsg)) {
          aiMsg.stepsCollapsed = true
        }
      },
      (errMsg) => {
        // 后端主动下发 error 事件
        failed = true
        settleRunningSteps('failed')
        throw new Error(errMsg || 'AI 服务异常')
      },
      (p) => {
        // 工具真实执行状态——start 新增一条，end 按 key 更新同一条，无任何伪造动画
        ensureAiMsg()
        if (p.phase === 'start') {
          // 模型已决定调工具：thinking 阶段完成
          finishRunningStageSteps()
          agentStage.value = 'tool'
          currentToolLabel.value = p.label
          aiMsg.toolEvents.push({ key: p.key, kind: 'tool', toolName: p.tool, name: p.label, state: 'running' })
        } else {
          const ev = aiMsg.toolEvents.find((e) => e.key === p.key)
          const state = p.ok ? 'done' : 'failed'
          if (ev) {
            ev.state = state
            ev.name = p.label
          } else {
            aiMsg.toolEvents.push({ key: p.key, kind: 'tool', toolName: p.tool, name: p.label, state })
          }
          // 工具白名单展示数据：searchGoods 真实命中时 end 事件附 goods[]，
          // 直接绑定到本条消息（一轮多次调用时追加合并），数据不经过模型转述
          if (p.goods && p.goods.length) {
            aiMsg.goods = [...aiMsg.goods, ...p.goods]
            aiMsg.goodsTotal = p.total ?? aiMsg.goods.length
          }
          currentToolLabel.value = ''
        }
      },
      (p) => {
        // Agent 阶段事件：push 新的阶段步骤，并结束上一个阶段步骤
        ensureAiMsg()
        finishRunningStageSteps()
        agentStage.value = p.stage
        aiMsg.toolEvents.push({ key: 'stage-' + p.stage, kind: 'stage', name: p.label, state: 'running' })
      },
      (p) => {
        // RAG 知识来源：仅后端检索真实命中时到达，绑定到本条消息
        ensureAiMsg()
        if (p.sources && p.sources.length) {
          aiMsg.sources = p.sources
        }
      }
    )

    // 若整段流无任何 delta（空回复），按失败处理
    if (!failed && !aiMsg) {
      pushError(text)
    }
  } catch (error) {
    // 任何失败路径：仍在 running 的步骤统一标记为 failed，如实反映中断点
    settleRunningSteps('failed')
    // AbortError 是用户主动取消，不弹错误气泡
    if (error && error.name === 'AbortError') {
      if (aiMsg) {
        aiMsg.status = 'error'
        aiMsg.text = ''
        aiMsg.retryText = text
      } else {
        pushError(text)
      }
    } else if (!failed) {
      // 网络异常等
      if (aiMsg) {
        aiMsg.status = 'error'
        aiMsg.text = ''
        aiMsg.retryText = text
      } else {
        pushError(text)
      }
    } else {
      // 后端 error 事件
      if (aiMsg) {
        aiMsg.status = 'error'
        aiMsg.text = ''
        aiMsg.retryText = text
      } else {
        pushError(text)
      }
    }
  } finally {
    // 无论成功/失败/取消，都关闭该消息的流式光标
    if (aiMsg) {
      aiMsg.streaming = false
    }
    sending.value = false
    streamingStarted.value = false
    agentStage.value = ''
    currentToolLabel.value = ''
    activeAbort = null
    focusInput()
    // 持久化：登录用户刷新对话列表（标题/时间已更新），游客保存到 localStorage
    if (isLoggedIn.value && activeConversationId.value && !failed) {
      refreshConversations()
    } else if (!isLoggedIn.value) {
      saveGuestMessages()
    }
  }
}

const pushError = (retryText) => {
  messages.value.push({
    id: nextId(),
    role: 'ai',
    text: '',
    time: new Date(),
    status: 'error',
    streaming: false,
    toolEvents: [],
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

// AI 导购商品卡片点击：跳转到真实商品详情路由（与商品中心同一详情页）
const goGoodsDetail = (goodsId) => {
  if (!goodsId) return
  router.push(`/goods/${goodsId}`)
}

// 知识来源卡片点击（P1）：打开抽屉展示命中片段完整正文。
// 数据来自后端本次真实检索结果（SSE sources 事件 / extra_json 持久化恢复），不做额外请求。
const sourceDrawerVisible = ref(false)
const activeSource = ref(null)
const openSourceDetail = (source) => {
  if (!source) return
  activeSource.value = source
  sourceDrawerVisible.value = true
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
  // 登录用户：开始新对话（不删旧对话）；游客：清 localStorage
  activeConversationId.value = null
  conversationId = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
  if (!isLoggedIn.value) {
    clearGuestMessages()
  }
  messages.value = [{
    ...welcomeMessage,
    id: nextId(),
    time: new Date()
  }]
  focusInput()
}

/**
 * 轻量富文本渲染（供 AI 消息 v-html 使用）
 *
 * 安全策略：先对原文做 HTML 转义，防止模型/规则返回的内容被当作 HTML 注入；
 * 转义后仅支持一种轻量标记——**加粗**，转换为 <strong>。
 * 换行不转 <br>，交给 CSS white-space: pre-wrap 保留（与流式追加天然兼容）。
 * 不引入 markdown 依赖，避免为少量格式需求增加包体积。
 */
const renderRichText = (raw) => {
  if (!raw) return ''
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="rich-bold">$1</strong>')
}

const formatTime = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

onMounted(async () => {
  focusInput()
  // 恢复对话历史
  if (isLoggedIn.value) {
    await loadConversations()
  } else {
    loadGuestMessages()
  }
})

// =========================
// 对话历史管理（登录用户走后端，游客走 localStorage）
// =========================

// 加载对话列表（登录用户）
const loadConversations = async () => {
  convLoading.value = true
  try {
    const data = await request.get('/ai/conversations')
    conversations.value = data.conversations || []
    // 自动加载最近的对话
    if (conversations.value.length > 0) {
      await loadConversationMessages(conversations.value[0].id)
    }
  } catch (e) {
    // 静默失败，不影响页面使用
  } finally {
    convLoading.value = false
  }
}

// 刷新对话列表（发消息后调用，更新标题和时间）
const refreshConversations = async () => {
  if (!isLoggedIn.value) return
  try {
    const data = await request.get('/ai/conversations')
    conversations.value = data.conversations || []
  } catch (e) {}
}

// 加载某对话的消息
const loadConversationMessages = async (convId) => {
  if (sending.value) return
  try {
    const data = await request.get(`/ai/conversations/${convId}/messages`)
    activeConversationId.value = convId
    conversationId = String(convId)
    const msgs = data.messages || []
    if (msgs.length === 0) {
      messages.value = [{ ...welcomeMessage, id: nextId(), time: new Date() }]
    } else {
      messages.value = msgs.map(m => {
        // 解析 extraJson 还原商品卡片和知识来源
        let goods = []
        let goodsTotal = 0
        let sources = []
        if (m.extraJson) {
          try {
            const extra = JSON.parse(m.extraJson)
            if (extra.goods && Array.isArray(extra.goods)) goods = extra.goods
            if (extra.goodsTotal) goodsTotal = extra.goodsTotal
            if (extra.sources && Array.isArray(extra.sources)) sources = extra.sources
          } catch (e) {}
        }
        return {
          id: nextId(),
          // 数据库持久化的角色是 user/assistant，前端消息模型统一用 user/ai，
          // 此处做一次映射，否则 role=assistant 的消息不会渲染商品卡片/知识来源（模板判断 role==='ai'）
          role: m.role === 'assistant' ? 'ai' : m.role,
          text: m.content || '',
          time: new Date(m.createTime),
          status: 'ok',
          streaming: false,
          toolEvents: [],
          stepsCollapsed: false,
          goods,
          goodsTotal,
          sources
        }
      })
    }
    scrollToBottom()
    focusInput()
  } catch (e) {}
}

// 新建对话
const onNewConversation = async () => {
  if (sending.value) return
  if (!isLoggedIn.value) {
    messages.value = [{ ...welcomeMessage, id: nextId(), time: new Date() }]
    conversationId = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
    activeConversationId.value = null
    focusInput()
    return
  }
  try {
    const data = await request.post('/ai/conversations', {})
    conversations.value.unshift({
      id: data.id,
      title: data.title,
      createTime: data.createTime,
      updateTime: data.updateTime
    })
    activeConversationId.value = data.id
    conversationId = String(data.id)
    messages.value = [{ ...welcomeMessage, id: nextId(), time: new Date() }]
    focusInput()
  } catch (e) {}
}

// 切换对话
const onSelectConversation = async (convId) => {
  await loadConversationMessages(convId)
}

// 删除对话
const onDeleteConversation = async (convId) => {
  if (sending.value) return
  try {
    await request.delete(`/ai/conversations/${convId}`)
    conversations.value = conversations.value.filter(c => c.id !== convId)
    if (activeConversationId.value === convId) {
      activeConversationId.value = null
      if (conversations.value.length > 0) {
        await loadConversationMessages(conversations.value[0].id)
      } else {
        conversationId = 'ai-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
        messages.value = [{ ...welcomeMessage, id: nextId(), time: new Date() }]
      }
    }
  } catch (e) {}
}

// 游客 localStorage 存取
const saveGuestMessages = () => {
  if (isLoggedIn.value) return
  try {
    const msgs = messages.value.slice(-GUEST_MAX_MESSAGES).map(m => ({
      role: m.role,
      text: m.text,
      time: m.time instanceof Date ? m.time.toISOString() : m.time
    }))
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({
      messages: msgs,
      timestamp: Date.now()
    }))
  } catch (e) {}
}

const loadGuestMessages = () => {
  if (isLoggedIn.value) return
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    const age = Date.now() - (data.timestamp || 0)
    if (age > GUEST_EXPIRE_DAYS * 86400000) {
      localStorage.removeItem(GUEST_STORAGE_KEY)
      return
    }
    const msgs = data.messages || []
    if (msgs.length === 0) return
    messages.value = msgs.map(m => ({
      id: nextId(),
      role: m.role,
      text: m.text || '',
      time: new Date(m.time),
      status: 'ok',
      streaming: false,
      toolEvents: [],
      stepsCollapsed: false,
      goods: [],
      goodsTotal: 0,
      sources: []
    }))
    scrollToBottom()
  } catch (e) {}
}

const clearGuestMessages = () => {
  localStorage.removeItem(GUEST_STORAGE_KEY)
}

// 组件卸载时中断进行中的流式请求
onUnmounted(() => {
  if (activeAbort) {
    activeAbort.abort()
    activeAbort = null
  }
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
  position: relative;
  border-radius: 18px;
  background: linear-gradient(135deg, #e8b4b8, #d8a8ad);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 30px;
  box-shadow: 0 12px 26px rgba(216, 168, 173, 0.4);
}

/* 头像右下角「淘」字小角标，强化品牌记忆点 */
.ai-hero__avatar-badge {
  position: absolute;
  right: -7px;
  bottom: -7px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8d696, #d9c17c);
  color: #6b5a2e;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fdf7f2;
  box-shadow: 0 2px 6px rgba(180, 150, 80, 0.35);
}

.ai-hero__brand-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

.ai-hero__platform {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #a98c91;
}

.ai-hero__divider {
  color: #d4c5c7;
  font-size: 12px;
}

.ai-hero__ai-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #8a7449;
  background: rgba(232, 214, 150, 0.35);
  border: 1px solid rgba(201, 174, 105, 0.35);
  border-radius: 999px;
  padding: 1px 9px;
}

.ai-hero__title {
  margin: 0;
  font-size: 25px;
  font-weight: 800;
  color: var(--brand-text);
  letter-spacing: 0.5px;
}

.ai-hero__name {
  background: linear-gradient(120deg, #cf8f96, #b98363);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  padding: 0 2px;
}

.ai-hero__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--brand-text-regular);
}

/* 欢迎区快捷入口 chips：新会话展示，开始对话后随 v-if 收起 */
.ai-hero__starters {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 15px;
}

.starter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 15px;
  border-radius: 999px;
  border: 1px solid var(--brand-border);
  background: rgba(255, 255, 255, 0.82);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.22s ease;
}

.starter-chip__icon {
  font-size: 14px;
  color: var(--brand-primary);
}

.starter-chip:hover:not(:disabled) {
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(216, 168, 173, 0.22);
}

.starter-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
}

/* 会话列表卡片 */
.conv-side-card {
  max-height: 320px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.conv-side-card .side-card__title {
  flex-shrink: 0;
}

/* 游客对话提示 */
.conv-guest-card {
  text-align: center;
  padding: 24px 14px;
}

.conv-guest-card__icon {
  font-size: 32px;
  color: var(--brand-text-secondary);
  margin-bottom: 10px;
}

.conv-guest-card__text {
  font-size: 13px;
  color: var(--brand-text-secondary);
  margin-bottom: 12px;
  line-height: 1.6;
}

.conv-guest-card__btn {
  display: inline-block;
  padding: 6px 18px;
  background: var(--brand-primary);
  color: #fff !important;
  border-radius: var(--brand-radius);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.conv-guest-card__btn:hover {
  opacity: 0.85;
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

/* B9 能力列表（已上线的真实只读工具） */
.future-tool {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 2px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.future-tool__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #bcc9c2;
  flex-shrink: 0;
}

.future-tool__dot--on {
  background: #8faa83;
  box-shadow: 0 0 0 3px rgba(143, 170, 131, 0.15);
}

.future-tool__hint {
  color: #a89884;
  font-size: 11px;
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
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--brand-text);
}

.chat-panel__name-sub {
  font-size: 11px;
  font-weight: 500;
  color: var(--brand-text-secondary);
  letter-spacing: 0.3px;
}

.chat-panel__state {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--brand-text-secondary);
  transition: color 0.25s ease;
}

/* 思考/输出中：状态文字切换为更明确的暖粉色 */
.chat-panel__state--active {
  color: #b97981;
}

/* 忙碌中的状态点：加快呼吸频率，与空闲态形成区分 */
.chat-panel__state-dot.is-pulsing {
  background: #d89099;
  animation: stateBusy 1s ease-in-out infinite;
}

@keyframes stateBusy {
  0%, 100% { box-shadow: 0 0 0 3px rgba(216, 144, 153, 0.16); }
  50% { box-shadow: 0 0 0 6px rgba(216, 144, 153, 0.05); }
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

/* 轻量富文本：仅加粗一种标记，颜色沿用气泡文字色，不破坏 Morandi 视觉 */
.msg-text--rich .rich-bold {
  font-weight: 800;
  color: #a8696f;
}

.msg-bubble--user .msg-text--rich .rich-bold {
  color: #fff;
}

/* 流式输出光标：跟随在真实 SSE 文本末尾的细竖条，仅在接收 chunk 期间出现 */
.msg-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  vertical-align: -0.15em;
  background: #c98a92;
  border-radius: 1px;
  animation: cursorBlink 0.9s ease-in-out infinite;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}

/* Agent 工作状态面板（真实 SSE stage/tool 事件驱动，位于回答气泡之上） */
.work-steps {
  margin-bottom: 6px;
}

/* 工作中的完整步骤面板：浅色底、小字、偏灰，视觉层级低于最终回答 */
.work-steps__panel {
  background: #f6f7f4;
  border: 1px solid #e6eae3;
  border-radius: 12px;
  padding: 9px 12px 10px;
}

.work-steps__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #a3afa5;
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}

.work-steps__collapse {
  border: none;
  background: none;
  padding: 0;
  font-size: 11px;
  color: #a3afa5;
  cursor: pointer;
}

.work-steps__collapse:hover {
  color: #6f8f6a;
}

.work-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2.5px 0;
  font-size: 12px;
  line-height: 1.5;
  color: #8a978c;
  transition: color 0.25s ease;
}

.work-step--running {
  color: #6a7b86;
}

.work-step--failed {
  color: #b97981;
}

.work-step__status {
  font-size: 13px;
  flex-shrink: 0;
}

.work-step--running .work-step__status {
  color: #8ba3b4;
}

.work-step--done .work-step__status {
  color: #8faa83;
}

.work-step--failed .work-step__status {
  color: #c58b93;
}

.work-step__tool-icon {
  font-size: 13px;
  color: #a3b0a5;
  flex-shrink: 0;
}

/* 完成后的折叠摘要：轻量 chip，点击展开回看 */
.work-steps__summary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 11px;
  border-radius: 999px;
  background: #f0f5ee;
  border: 1px solid #dde8da;
  color: #6f8f6a;
  font-size: 11.5px;
  cursor: pointer;
  transition: background 0.25s ease;
}

.work-steps__summary:hover {
  background: #e8f0e4;
}

.work-steps__summary-icon {
  font-size: 13px;
}

.work-steps__chevron {
  font-size: 11px;
  transform: rotate(90deg);
}

/* 执行中图标旋转：仅在 running 状态存在，步骤结束动画即消失（非无限循环装饰） */
.is-spinning {
  animation: toolSpin 0.9s linear infinite;
}

@keyframes toolSpin {
  to { transform: rotate(360deg); }
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

/* AI 导购商品卡片（绑定于单条 AI 消息下方，紧接文字气泡） */
.msg-goods {
  margin-top: 10px;
}

.msg-goods__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand-text-regular);
  margin-bottom: 8px;
}

.msg-goods__rail {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
}

.msg-goods__rail::-webkit-scrollbar {
  height: 5px;
}

.msg-goods__rail::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 999px;
}

/* 单个商品小卡片 */
.ai-goods-card {
  flex: 0 0 auto;
  width: 150px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  user-select: none;
}

.ai-goods-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--brand-shadow-sm);
}

.ai-goods-card:active {
  transform: translateY(0);
}

.ai-goods-card__cover {
  position: relative;
  height: 110px;
  overflow: hidden;
  background: linear-gradient(135deg, #fdf6e3 0%, #fbf0d8 100%);
}

.ai-goods-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ai-goods-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b8985a;
  font-size: 28px;
}

.ai-goods-card__condition {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

/* 与 GoodsCard 成色色系一致（莫兰迪） */
.condition--1 { background: #7d9d7a; }
.condition--2 { background: #b8a55a; }
.condition--3 { background: #c79564; }
.condition--4 { background: #a58880; }
.condition--5 { background: #9a9590; }

.ai-goods-card__body {
  padding: 9px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ai-goods-card__name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-text);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ai-goods-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.ai-goods-card__price {
  font-size: 13px;
  font-weight: 800;
  color: var(--brand-primary-active);
}

.ai-goods-card__campus {
  font-size: 11px;
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

/* RAG 知识来源 */
.msg-sources {
  margin-top: 10px;
  padding: 10px 12px;
  background: #f8f6f2;
  border: 1px dashed #e2dcd2;
  border-radius: var(--brand-radius);
}

.msg-sources__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand-text-regular);
  margin-bottom: 7px;
}

.msg-sources__tip {
  margin-left: auto;
  font-size: 11px;
  font-weight: 400;
  color: var(--brand-text-secondary);
}

.source-card {
  padding: 7px 10px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  margin-bottom: 6px;
}

.source-card:last-child {
  margin-bottom: 0;
}

.source-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.source-card__name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.source-card__score {
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
  padding: 1px 7px;
  border-radius: 999px;
}

.source-card__snippet {
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-text-regular);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 可点击来源卡片：轻微上浮 + 描边高亮，提示「可查看详情」 */
.source-card--clickable {
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.source-card--clickable:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.source-card__more {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-primary-active);
}

/* 知识来源详情抽屉（P1） */
.source-detail__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.source-detail__score {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
  padding: 2px 9px;
  border-radius: 999px;
}

.source-detail__tip {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.source-detail__label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--brand-text-regular);
  margin-bottom: 8px;
}

.source-detail__content {
  padding: 12px 14px;
  background: #f8f6f2;
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--brand-text);
  white-space: pre-wrap;
  word-break: break-word;
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

  .ai-goods-card {
    width: 136px;
  }

  .ai-goods-card__cover {
    height: 96px;
  }

  .msg-sources {
    padding: 9px 10px;
  }
}

@media (max-width: 560px) {
  .ai-hero {
    padding: 22px 20px;
  }

  .ai-hero__title {
    font-size: 20px;
  }

  .ai-hero__starters {
    gap: 7px;
  }

  .starter-chip {
    padding: 7px 12px;
    font-size: 12px;
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
