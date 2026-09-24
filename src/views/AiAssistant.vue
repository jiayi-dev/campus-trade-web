<template>
  <!--
    AI 校园闲置助手 · 正式业务页面架构
    本批交付：独立页面骨架 + 能力规划 + 诚实"即将上线"状态。
    Agent 引擎（LLM → Tool Calling → 业务工具 → 数据库 → SSE 流式回答）
    将在独立批次中接入，本页不伪造任何对话功能。
  -->
  <div class="ai-page">
    <div class="ai-layout">

      <!-- 左侧会话栏 -->
      <aside class="ai-sidebar">
        <button class="ai-new-chat" disabled title="AI 助手上线后开放">
          <el-icon><Plus /></el-icon>新建会话
        </button>

        <div class="ai-sidebar__section">
          <div class="ai-sidebar__label">历史会话</div>
          <div class="ai-sidebar__empty">
            <el-icon class="ai-sidebar__empty-icon"><ChatDotSquare /></el-icon>
            <p>暂无历史会话</p>
            <span>AI 助手上线后，你的每一次咨询都会保留在这里</span>
          </div>
        </div>

        <div class="ai-sidebar__footer">Agent 引擎接入中</div>
      </aside>

      <!-- 主区域 -->
      <main class="ai-main">
        <!-- 助手身份区 -->
        <div class="ai-hero">
          <div class="ai-hero__avatar">
            <el-icon><MagicStick /></el-icon>
          </div>
          <div class="ai-hero__meta">
            <div class="ai-hero__name">
              AI 校园闲置助手
              <span class="ai-hero__badge">即将上线</span>
            </div>
            <div class="ai-hero__slogan">
              用自然语言，找到校园里最适合你的闲置好物
            </div>
          </div>
        </div>

        <!-- 状态说明 -->
        <div class="ai-notice">
          <el-icon><InfoFilled /></el-icon>
          <div>
            <div class="ai-notice__title">Agent 引擎接入中，对话功能暂未开放</div>
            <div class="ai-notice__desc">
              技术路线：自然语言理解 → LLM → Tool Calling → 商品 / 订单 / 收藏等业务工具
              → 数据库 → SSE 流式回答。以下为正式上线后的能力预览。
            </div>
          </div>
        </div>

        <!-- 能力规划卡片 -->
        <div class="ai-caps">
          <div v-for="cap in capabilities" :key="cap.title" class="ai-cap">
            <div class="ai-cap__icon" :style="{ background: cap.bg }">
              <el-icon><component :is="cap.icon" /></el-icon>
            </div>
            <div class="ai-cap__title">{{ cap.title }}</div>
            <div class="ai-cap__desc">{{ cap.desc }}</div>
            <span class="ai-cap__tag">规划中</span>
          </div>
        </div>

        <!-- 推荐问题预览 -->
        <div class="ai-suggest">
          <div class="ai-suggest__title">上线后你可以这样问</div>
          <div class="ai-suggest__chips">
            <button
              v-for="q in examples"
              :key="q"
              class="ai-suggest__chip"
              @click="handleExample"
            >{{ q }}</button>
          </div>
        </div>

        <!-- 输入区（未开放，禁用态） -->
        <div class="ai-input is-disabled">
          <el-icon class="ai-input__icon"><ChatLineSquare /></el-icon>
          <input
            disabled
            placeholder="AI Agent 引擎接入中，即将开放对话…"
          />
          <button class="ai-input__send" disabled>
            <el-icon><Promotion /></el-icon>
          </button>
        </div>
      </main>

    </div>
  </div>
</template>

<script setup>
import {
  Plus, ChatDotSquare, ChatLineSquare, MagicStick, InfoFilled,
  Promotion, Search, Star, Tickets, EditPen
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 能力规划：正式上线后的四大 Agent 场景（本批仅展示架构，不伪造功能）
const capabilities = [
  {
    title: '自然语言搜商品',
    desc: '“帮我找 300 元以内的显示器”，Agent 自动调用商品搜索工具并整理结果',
    icon: Search,
    bg: 'linear-gradient(135deg,#f7e1e3,#f4d5d8)'
  },
  {
    title: '智能好物推荐',
    desc: '结合你的浏览与收藏，调用商品数据生成个性化推荐与理由',
    icon: Star,
    bg: 'linear-gradient(135deg,#f3e6d4,#ead9a0)'
  },
  {
    title: '我的订单问答',
    desc: '“我最近有哪些待完成订单？”直接查询你的真实订单数据并回答',
    icon: Tickets,
    bg: 'linear-gradient(135deg,#f5e7a8,#ead9a0)'
  },
  {
    title: '卖家文案助手',
    desc: '一句话描述闲置，Agent 帮你生成商品标题、描述、成色与分类建议',
    icon: EditPen,
    bg: 'linear-gradient(135deg,#dde3e8,#ece3dc)'
  }
]

// 推荐问题预览（点击仅提示即将上线，不伪造对话）
const examples = [
  '帮我找 300 元以内的显示器',
  '有没有适合宿舍用的小桌子？',
  '帮我看看最近有什么数码好物',
  '我想找九成新的教材'
]

const handleExample = () => {
  ElMessage.info('AI 助手即将上线，敬请期待')
}
</script>

<style scoped>
/* 页面私有奶油色系，与首页保持一致 */
.ai-page {
  --ai-primary: #e8b4b8;
  --ai-primary-hover: #dca0a4;
  --ai-primary-soft: #f4d5d8;
  --ai-accent: #d8b658;
  --ai-text: #4a4548;
  --ai-text-soft: #8a7f80;
  --ai-border: #ece3dc;

  height: calc(100vh - 62px - 48px);
  min-height: 520px;
}

.ai-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  height: 100%;
  max-width: 1240px;
  margin: 0 auto;
}

/* ========== 左侧会话栏 ========== */
.ai-sidebar {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(74, 69, 72, 0.05);
  padding: 16px;
  overflow: hidden;
}

.ai-new-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 11px 0;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--ai-primary), var(--ai-primary-hover));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: not-allowed;
  opacity: 0.65;
}

.ai-sidebar__section {
  flex: 1;
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ai-sidebar__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-soft);
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.ai-sidebar__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 20px 10px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fbf6f0, #f7e1e3);
  border: 1px dashed var(--ai-primary-soft);
}

.ai-sidebar__empty-icon {
  font-size: 30px;
  color: var(--ai-primary);
  opacity: 0.7;
}

.ai-sidebar__empty p {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ai-text);
}

.ai-sidebar__empty span {
  font-size: 11.5px;
  color: var(--ai-text-soft);
  line-height: 1.6;
}

.ai-sidebar__footer {
  margin-top: 14px;
  text-align: center;
  font-size: 11px;
  color: var(--ai-text-soft);
  letter-spacing: 0.5px;
}

/* ========== 主区域 ========== */
.ai-main {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(74, 69, 72, 0.05);
  padding: 28px 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

/* 助手身份区 */
.ai-hero {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ai-hero__avatar {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--ai-primary), var(--ai-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  color: #fff;
  box-shadow: 0 10px 24px rgba(220, 160, 164, 0.35);
}

.ai-hero__name {
  font-size: 22px;
  font-weight: 800;
  color: var(--ai-text);
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-hero__badge {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ai-primary-hover);
  background: var(--ai-primary-soft);
  border-radius: 999px;
  padding: 3px 12px;
}

.ai-hero__slogan {
  margin-top: 6px;
  font-size: 13.5px;
  color: var(--ai-text-soft);
}

/* 状态说明 */
.ai-notice {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 18px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fbf6f0, #f3e6d4);
  border: 1px solid var(--ai-border);
}

.ai-notice .el-icon {
  font-size: 20px;
  color: var(--ai-accent);
  margin-top: 2px;
}

.ai-notice__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ai-text);
}

.ai-notice__desc {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--ai-text-soft);
  line-height: 1.7;
}

/* 能力卡片 */
.ai-caps {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.ai-cap {
  position: relative;
  padding: 18px;
  border-radius: 16px;
  background: #fbfaf8;
  border: 1px solid var(--ai-border);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.ai-cap:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 26px rgba(74, 69, 72, 0.08);
}

.ai-cap__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--ai-text);
}

.ai-cap__title {
  margin-top: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ai-text);
}

.ai-cap__desc {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--ai-text-soft);
  line-height: 1.7;
}

.ai-cap__tag {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ai-primary-hover);
  background: var(--ai-primary-soft);
  border-radius: 999px;
  padding: 2px 10px;
}

/* 推荐问题 */
.ai-suggest__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ai-text);
  margin-bottom: 10px;
}

.ai-suggest__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-suggest__chip {
  border: 1px solid var(--ai-border);
  background: #fbfaf8;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 12.5px;
  color: var(--ai-text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-suggest__chip:hover {
  border-color: var(--ai-primary);
  color: var(--ai-primary-hover);
  background: #fff;
}

/* 输入区（禁用态） */
.ai-input {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 16px;
  border-radius: 18px;
  background: #fbfaf8;
  border: 1.5px solid var(--ai-border);
}

.ai-input.is-disabled {
  opacity: 0.7;
}

.ai-input__icon {
  font-size: 18px;
  color: var(--ai-text-soft);
}

.ai-input input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13.5px;
  color: var(--ai-text);
}

.ai-input__send {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--ai-primary), var(--ai-primary-hover));
  color: #fff;
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 860px) {
  .ai-page { height: auto; }
  .ai-layout { grid-template-columns: 1fr; }
  .ai-sidebar { flex-direction: row; align-items: center; gap: 12px; }
  .ai-new-chat { width: auto; padding: 10px 18px; }
  .ai-sidebar__section { margin-top: 0; flex: 1; }
  .ai-sidebar__label, .ai-sidebar__footer { display: none; }
  .ai-sidebar__empty { padding: 12px; flex-direction: row; gap: 10px; }
  .ai-sidebar__empty span { display: none; }
  .ai-caps { grid-template-columns: 1fr; }
}
</style>
