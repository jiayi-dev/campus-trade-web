<template>
  <div class="apply-page">

    <!-- 标题 -->
    <div class="page-header">
      <h2>申请成为卖家</h2>
      <p>提交申请后由管理员审核，通过后即可发布闲置商品、打理自己的小铺</p>
    </div>

    <div v-loading="loading" class="apply-body">

      <!-- 已成为卖家 -->
      <el-card
          v-if="role === 'seller'"
          shadow="never"
          class="status-card status-card--success"
      >
        <div class="status-card__icon">
          <el-icon><CircleCheckFilled /></el-icon>
        </div>
        <h3 class="status-card__title">你现在已经是卖家</h3>
        <p class="status-card__desc">
          申请已通过，你已获得卖家身份，可以发布商品并管理自己的店铺了
        </p>
        <div v-if="application && statusNum === 1" class="status-detail">
          <div class="status-detail__row">
            <span class="status-detail__label">审核时间</span>
            <span>{{ formatDateTime(application.reviewTime) }}</span>
          </div>
          <div v-if="application.reviewComment" class="status-detail__row">
            <span class="status-detail__label">审核意见</span>
            <span>{{ application.reviewComment }}</span>
          </div>
        </div>
        <el-button type="primary" class="status-card__btn" @click="enterSellerMode">
          <el-icon><Shop /></el-icon>进入我的店铺
        </el-button>
      </el-card>

      <!-- 管理员（理论上菜单不可见，接口侧也会拒绝，双保险提示） -->
      <el-card
          v-else-if="role === 'admin'"
          shadow="never"
          class="status-card status-card--info"
      >
        <div class="status-card__icon status-card__icon--info">
          <el-icon><InfoFilled /></el-icon>
        </div>
        <h3 class="status-card__title">管理员账号无需申请卖家身份</h3>
        <p class="status-card__desc">管理员已拥有平台最高管理权限，可直接在管理后台审核卖家申请</p>
        <el-button class="status-card__btn" @click="$router.push('/admin')">
          前往管理后台
        </el-button>
      </el-card>

      <!-- 学生：根据申请状态展示 -->
      <template v-else>

        <!-- 待审核 -->
        <el-card
            v-if="application && statusNum === 0"
            shadow="never"
            class="status-card status-card--pending"
        >
          <div class="status-card__icon status-card__icon--pending">
            <el-icon class="is-spinning"><Loading /></el-icon>
          </div>
          <h3 class="status-card__title">申请审核中</h3>
          <p class="status-card__desc">
            你的申请已提交，管理员审核期间无法重复提交，请耐心等待
          </p>
          <div class="status-detail">
            <div class="status-detail__row">
              <span class="status-detail__label">提交时间</span>
              <span>{{ formatDateTime(application.createTime) }}</span>
            </div>
            <div class="status-detail__row status-detail__row--column">
              <span class="status-detail__label">申请原因</span>
              <span class="status-detail__text">{{ application.reason }}</span>
            </div>
          </div>
        </el-card>

        <!-- 已通过但本地角色未刷新（极端情况兜底） -->
        <el-card
            v-else-if="application && statusNum === 1"
            shadow="never"
            class="status-card status-card--success"
        >
          <div class="status-card__icon">
            <el-icon><CircleCheckFilled /></el-icon>
          </div>
          <h3 class="status-card__title">申请已通过</h3>
          <p class="status-card__desc">刷新页面后即可使用卖家全部功能</p>
          <el-button type="primary" class="status-card__btn" @click="enterSellerMode">
            刷新进入卖家模式
          </el-button>
        </el-card>

        <!-- 无申请 / 上次被拒绝：申请表单 -->
        <el-card shadow="never" class="form-card">

          <div class="form-card__head">
            <div class="form-card__identity">
              当前身份
              <el-tag size="small" type="success" effect="light" round>学生</el-tag>
            </div>
            <div class="form-card__tip">
              <el-icon><Promotion /></el-icon>
              通过审核后自动升级为卖家，无需重新注册账号
            </div>
          </div>

          <!-- 上次被拒绝：展示拒绝原因，允许重新申请 -->
          <el-alert
              v-if="application && statusNum === 2"
              class="reject-alert"
              type="warning"
              :closable="false"
              show-icon
              title="上次申请未通过，可修改原因后重新提交"
          >
            <template #default>
              <div class="reject-alert__body">
                <div>审核意见：{{ application.reviewComment || '管理员未填写意见' }}</div>
                <div class="reject-alert__time">
                  审核时间：{{ formatDateTime(application.reviewTime) }}
                </div>
              </div>
            </template>
          </el-alert>

          <el-form label-position="top" class="apply-form">

            <el-form-item required>
              <template #label>
                <span class="apply-form__label">申请原因</span>
              </template>
              <el-input
                  v-model="reason"
                  type="textarea"
                  :rows="6"
                  maxlength="500"
                  show-word-limit
                  resize="none"
                  placeholder="请简单介绍你自己，例如：想出售的闲置类型（教材、数码、生活用品等）、物品来源、大概的上新频率……至少 10 个字"
              />
              <div class="apply-form__hint">
                请填写 {{ REASON_MIN }}-{{ REASON_MAX }} 个字，真实清晰的说明更容易通过审核
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                  type="primary"
                  size="large"
                  class="apply-form__submit"
                  :loading="submitting"
                  :disabled="reason.trim().length < REASON_MIN"
                  @click="submitApplication"
              >
                <el-icon v-if="!submitting"><Promotion /></el-icon>
                {{ application && statusNum === 2 ? '重新提交申请' : '提交申请' }}
              </el-button>
            </el-form-item>

          </el-form>

        </el-card>

      </template>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  CircleCheckFilled,
  InfoFilled,
  Loading,
  Promotion,
  Shop
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatDateTime } from '../utils/format'

const router = useRouter()

const REASON_MIN = 10
const REASON_MAX = 500

const loading = ref(false)
const submitting = ref(false)
const role = ref(localStorage.getItem('role') || '')
const application = ref(null)
const reason = ref('')

// 状态数值归一化：避免后端返回字符串/null 时条件判断失效
const statusNum = computed(() => {
  const s = application.value?.status
  return s === null || s === undefined ? null : Number(s)
})

// 加载当前用户真实角色 + 最新申请
const loadPage = async () => {
  loading.value = true
  try {
    const [meRes, appRes] = await Promise.allSettled([
      request.get('/auth/me'),
      request.get('/seller/application/my')
    ])

    if (meRes.status === 'fulfilled' && meRes.value?.role) {
      const serverRole = meRes.value.role
      // 真实角色与本地缓存不一致：同步 localStorage 并派发 role-changed 事件，
      // Layout 监听到后会立即刷新菜单（无需刷新整页）
      if (serverRole !== role.value) {
        role.value = serverRole
        localStorage.setItem('role', serverRole)
        window.dispatchEvent(new CustomEvent('role-changed', { detail: serverRole }))
      }
    }

    if (appRes.status === 'fulfilled') {
      application.value = appRes.value?.application || null
    }
  } finally {
    loading.value = false
  }
}

const submitApplication = async () => {
  const trimmed = reason.value.trim()

  if (trimmed.length < REASON_MIN) {
    ElMessage.warning(`申请原因至少填写 ${REASON_MIN} 个字`)
    return
  }

  submitting.value = true

  try {
    const result = await request.post('/seller/apply', { reason: trimmed })

    if (result === '申请提交成功，请等待管理员审核') {
      ElMessage.success('申请提交成功')
      reason.value = ''
      await loadPage()
    } else {
      ElMessage.error(result || '提交失败')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    submitting.value = false
  }
}

// 进入卖家模式：同步本地角色缓存并跳转店铺页
const enterSellerMode = () => {
  localStorage.setItem('role', 'seller')
  router.push('/seller')
}

onMounted(loadPage)
</script>

<style scoped>

.apply-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 18px;
}

.page-header h2 {
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: var(--brand-text-secondary);
  font-size: 13.5px;
}

.apply-body {
  min-height: 300px;
}

/* ---------- 状态卡片 ---------- */

.status-card {
  text-align: center;
  padding: 8px 0;
}

.status-card :deep(.el-card__body) {
  padding: 36px 32px 32px;
}

.status-card__icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  color: #fff;
  background: var(--brand-primary);
  box-shadow: 0 8px 20px rgba(216, 168, 173, 0.35);
}

.status-card__icon--pending {
  background: var(--brand-accent);
  box-shadow: 0 8px 20px rgba(201, 168, 92, 0.32);
}

.status-card__icon--info {
  background: var(--brand-aux);
  box-shadow: 0 8px 20px rgba(122, 133, 144, 0.3);
}

.is-spinning {
  animation: apply-rotate 1.6s linear infinite;
}

@keyframes apply-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-card__title {
  margin: 0 0 10px;
  font-size: 19px;
  color: var(--brand-text);
}

.status-card__desc {
  margin: 0 auto 22px;
  max-width: 420px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.status-card__btn {
  min-width: 180px;
}

/* 状态详情 */
.status-detail {
  margin: 0 auto 24px;
  max-width: 460px;
  text-align: left;
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  padding: 14px 18px;
}

.status-detail__row {
  display: flex;
  gap: 16px;
  padding: 7px 0;
  font-size: 13px;
  color: var(--brand-text-regular);
}

.status-detail__row + .status-detail__row {
  border-top: 1px dashed var(--brand-border);
}

.status-detail__row--column {
  flex-direction: column;
  gap: 6px;
}

.status-detail__label {
  flex-shrink: 0;
  width: 64px;
  color: var(--brand-text-secondary);
}

.status-detail__text {
  line-height: 1.7;
}

/* ---------- 申请表单 ---------- */

.form-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.form-card__identity {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
}

.form-card__tip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.form-card__tip .el-icon {
  color: var(--brand-accent);
}

.reject-alert {
  margin-bottom: 18px;
  border-radius: var(--brand-radius);
}

.reject-alert__body {
  line-height: 1.8;
}

.reject-alert__time {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.85;
}

.apply-form__label {
  font-weight: 600;
  color: var(--brand-text);
}

.apply-form__hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.apply-form__submit {
  width: 100%;
}

</style>
