<template>
  <div class="auth-page">

    <!-- 背景层（由底到顶）：渐变光晕(全局::before+orbs) → 点阵纹理 → canvas 粒子 → 月亮星星装饰 -->
    <div class="auth-bg" aria-hidden="true">
      <span class="auth-bg__orb auth-bg__orb--1"></span>
      <span class="auth-bg__orb auth-bg__orb--2"></span>
      <span class="auth-bg__orb auth-bg__orb--3"></span>
    </div>
    <div class="auth-texture" aria-hidden="true"></div>
    <canvas ref="particleCanvas" class="auth-particles" aria-hidden="true"></canvas>
    <div class="auth-decor" aria-hidden="true">
      <span class="auth-decor__moon"></span>
      <span class="auth-decor__star auth-decor__star--1"></span>
      <span class="auth-decor__star auth-decor__star--2"></span>
      <span class="auth-decor__star auth-decor__star--3"></span>
      <span class="auth-decor__star auth-decor__star--4"></span>
    </div>

    <div class="auth-card">

      <!-- 左侧品牌区 -->
      <div class="auth-brand">
        <div class="auth-brand__logo">
          <div class="auth-brand__logo-badge">
            <el-icon><RefreshRight /></el-icon>
          </div>
          校园二手交易平台
        </div>

        <router-link to="/landing" class="auth-brand__back">
          <el-icon><ArrowLeft /></el-icon>
          返回校园二手交易首页
        </router-link>

        <div>
          <div class="auth-brand__title">
            让闲置物品<br />在校园里继续流转
          </div>
          <div class="auth-brand__subtitle">
            面向同校学生的二手交易平台，发布、发现、沟通、交易，一站完成。
          </div>

          <div class="auth-brand__features">
            <div class="auth-brand__feature">
              <el-icon><Location /></el-icon>
              同校交易，线下自提更安心
            </div>
            <div class="auth-brand__feature">
              <el-icon><ChatDotRound /></el-icon>
              商品留言，买卖双方直接沟通
            </div>
            <div class="auth-brand__feature">
              <el-icon><Promotion /></el-icon>
              一键发布，闲置快速变现
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="auth-form">
        <h2 class="auth-form__title">欢迎回来 👋</h2>
        <p class="auth-form__subtitle">请选择身份并登录你的账号</p>

        <!-- 登录身份切换 -->
        <el-tabs v-model="loginType" class="login-tabs">
          <el-tab-pane name="user">
            <template #label>
              <span class="tab-label"><el-icon><User /></el-icon>用户登录</span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="admin">
            <template #label>
              <span class="tab-label"><el-icon><Lock /></el-icon>管理员</span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <div class="login-hint">
          {{ loginType === 'admin'
              ? '管理员账号请从此入口登录'
              : '学生与卖家共用入口，系统会按账号真实身份自动识别' }}
        </div>

        <el-form @submit.prevent>
          <el-form-item>
            <el-input
                v-model="username"
                size="large"
                placeholder="请输入用户名"
                :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item>
            <el-input
                v-model="password"
                size="large"
                type="password"
                show-password
                placeholder="请输入密码"
                :prefix-icon="Lock"
                @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-button
              type="primary"
              :class="{ 'is-success': loginSuccess }"
              @click="handleLogin"
              :loading="loading"
          >
            {{ loginSuccess ? '✓ 登录成功' : '登 录' }}
          </el-button>
        </el-form>

        <div class="auth-form__footer">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Location, ChatDotRound, Promotion, RefreshRight, ArrowLeft } from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import request from '../utils/request'

const router = useRouter()
const route = useRoute()

// 当前登录身份
// user：学生 / 卖家共用入口；admin：管理员专用入口
const loginType = ref('user')

// 用户输入
const username = ref('')
const password = ref('')

// 登录按钮加载状态
const loading = ref(false)

// 登录成功后的按钮绿勾反馈（跳转前的短暂提示）
const loginSuccess = ref(false)

// ---------- canvas 粒子背景（浅玫瑰粉 / 淡金黄 / 蜜桃色） ----------
const particleCanvas = ref(null)
let rafId = 0
let resizeHandler = null

onMounted(() => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const colors = ['#e8b4b8', '#d9b380', '#f3c8d5', '#e8c8a0']
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let width = 0
  let height = 0
  let particles = []

  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect()
    width = rect.width
    height = rect.height
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const initParticles = () => {
    // 约 65-85 个，随面积自适应
    const count = Math.min(85, Math.max(65, Math.floor((width * height) / 18000)))
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.6 + Math.random() * 2.2,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      color: colors[Math.floor(Math.random() * colors.length)],
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.008 + Math.random() * 0.012
    }))
  }

  const draw = () => {
    ctx.clearRect(0, 0, width, height)
    // 距离 < 130px 的粒子间画细连线，透明度随距离衰减
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.hypot(dx, dy)
        if (dist < 130) {
          ctx.globalAlpha = (1 - dist / 130) * 0.22
          ctx.strokeStyle = a.color
          ctx.lineWidth = 0.6
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }
    for (const p of particles) {
      const alpha = 0.55 + 0.35 * Math.sin(p.twinkle)
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  const step = () => {
    // 页面隐藏时暂停推进，仅维持循环待恢复
    if (!document.hidden) {
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.twinkle += p.twinkleSpeed
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10
      }
      draw()
    }
    rafId = requestAnimationFrame(step)
  }

  resize()
  initParticles()

  if (reduceMotion) {
    // 减动效偏好：只绘制一帧静态画面
    draw()
  } else {
    rafId = requestAnimationFrame(step)
  }

  resizeHandler = () => {
    resize()
    initParticles()
    if (reduceMotion) draw()
  }
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})

// 登录
const handleLogin = async () => {

  // 1. 检查用户名和密码是否填写
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true

  try {

    // 2. 根据当前选择的身份调用对应的后端登录接口
    //    user → /auth/student/login（后端 studentLogin 已改为通用用户登录，拒绝 admin，不强制 student/seller）
    //    admin → /auth/admin/login（严格匹配 admin 角色）
    const endpoint =
        loginType.value === 'admin' ? '/auth/admin/login' : '/auth/student/login'

    const result = await request.post(endpoint, {
      username: username.value,
      password: password.value
    })

    // 3. 保存后端返回的登录信息
    //    role 是数据库真实角色，不依赖登录入口猜测
    localStorage.setItem('token', result.token)
    localStorage.setItem('userId', result.userId)
    localStorage.setItem('username', result.username)
    localStorage.setItem('role', result.role)

    // 4. 提示登录成功 + 按钮短暂绿勾反馈
    loginSuccess.value = true
    ElMessage.success('登录成功')

    // 5. 跳转目标：优先 redirect 参数（游客从某商品页过来登录后回原页），
    //    没有 redirect 则回 /home
    //    Layout 在 mount 时会再次调用 /auth/me 校准角色，保证真实 role 立即生效
    const redirect = route.query.redirect
    await router.push(redirect || '/home')

  } catch (error) {

    // request.js 已经统一处理错误提示

  } finally {

    // 无论登录成功还是失败，都结束加载状态
    loading.value = false

  }
}
</script>

<style scoped>

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.login-tabs {
  margin-bottom: 6px;
}

.login-tabs :deep(.el-tabs__item) {
  width: 50%;
  padding: 0;
  justify-content: center;
}

.login-hint {
  margin: -2px 0 14px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
  text-align: center;
  line-height: 1.5;
}

.auth-brand__back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  transition: color 0.2s ease;
}

.auth-brand__back:hover {
  color: rgba(255, 255, 255, 0.85);
}

/* ========== 浅粉奶黄主题：奶油粉底 + 低饱和粉黄点缀（V1.3.1） ========== */

/* 页面底色：奶油白偏粉，右下角带一丝奶黄 */
.auth-page {
  background: linear-gradient(140deg, #FFF9F4 0%, #FDF4EC 50%, #FBF3E4 100%);
}

/* 覆盖全局光晕：浅粉 + 奶油黄，柔和不刺眼 */
.auth-page::before {
  background:
    radial-gradient(circle at 12% 16%, rgba(248, 220, 229, 0.55), transparent 46%),
    radial-gradient(circle at 88% 10%, rgba(255, 240, 201, 0.55), transparent 42%),
    radial-gradient(circle at 78% 92%, rgba(243, 200, 213, 0.45), transparent 46%);
}

/* 光斑：浅樱花粉 / 奶油黄 / 蜜桃粉 */
.auth-bg__orb--1 { background: rgba(248, 220, 229, 0.65); }
.auth-bg__orb--2 { background: rgba(255, 240, 201, 0.60); }
.auth-bg__orb--3 { background: rgba(243, 200, 213, 0.55); }

/* 细点阵纹理：极低透明度暖粉 */
.auth-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(216, 168, 173, 0.10) 1px, transparent 1.4px);
  background-size: 26px 26px;
  opacity: 0.55;
}

/* canvas 粒子层：背景之上、卡片之下 */
.auth-particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* 卡片悬浮感：柔和的粉调阴影 */
.auth-card {
  z-index: 2;
  box-shadow: 0 30px 80px rgba(180, 130, 130, 0.16);
}

/* 右上角暖阳 + 光尘装饰（纯 CSS） */
.auth-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.auth-decor__moon {
  position: absolute;
  top: 54px;
  right: 72px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff5d6 0%, #f8d9a8 70%, #eec890 100%);
  box-shadow: 0 0 36px rgba(240, 200, 140, 0.55);
  animation: auth-sun-float 10s ease-in-out infinite;
}

@keyframes auth-sun-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
}

.auth-decor__star {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f6d8c4;
  box-shadow: 0 0 12px rgba(240, 190, 160, 0.75);
  animation: auth-star-twinkle 3.6s ease-in-out infinite;
}

.auth-decor__star--1 { top: 44px;  right: 168px; }
.auth-decor__star--2 { top: 118px; right: 52px;  width: 5px; height: 5px; animation-delay: 1.1s; }
.auth-decor__star--3 { top: 152px; right: 140px; width: 4px; height: 4px; animation-delay: 2s; }
.auth-decor__star--4 { top: 86px;  right: 216px; width: 5px; height: 5px; animation-delay: 2.7s; }

@keyframes auth-star-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.75); }
  50%      { opacity: 1;   transform: scale(1.15); }
}

/* 品牌区：浅粉 → 蜜桃粉 → 奶油黄柔和渐变（暖色系、不刺眼） */
.auth-brand {
  background: linear-gradient(155deg, #d8a0a8 0%, #e5b5b3 46%, #ecc99c 100%);
}

.auth-brand__title {
  letter-spacing: 1.5px;
  text-shadow: 0 3px 16px rgba(140, 80, 90, 0.30);
}

/* 输入框聚焦发光（浅粉） */
.auth-form :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1.5px #d8a8ad inset, 0 6px 20px rgba(216, 168, 173, 0.22);
}

/* 主按钮：浅粉→蜜桃粉渐变 + 悬停上移加深阴影 */
.auth-form .el-button--primary {
  background: linear-gradient(120deg, #d8a0a8 0%, #e8b4b8 100%);
  box-shadow: 0 10px 26px rgba(216, 160, 168, 0.35);
}

.auth-form .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(216, 160, 168, 0.45);
  filter: brightness(1.04);
}

/* 登录成功：按钮短暂变柔和绿勾 */
.auth-form .el-button--primary.is-success,
.auth-form .el-button--primary.is-success:hover {
  background: linear-gradient(120deg, #7cc9a2 0%, #a5d8c0 100%);
  box-shadow: 0 12px 28px rgba(124, 201, 162, 0.42);
  transform: none;
  filter: none;
}

.auth-form__footer a {
  color: #c0838c;
}

/* 窄屏隐藏装饰，品牌区隐藏沿用全局 768px 媒体查询 */
@media (max-width: 720px) {
  .auth-decor {
    display: none;
  }

  /* 防溢出：全局规则中卡片固定 420px，390px 级屏幕需收回流式宽度 */
  .auth-page {
    padding: 14px;
  }

  .auth-card {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .auth-form {
    min-width: 0;
    padding: 28px 20px;
  }
}

/* 减动效：关闭装饰动画 */
@media (prefers-reduced-motion: reduce) {
  .auth-decor__moon,
  .auth-decor__star {
    animation: none !important;
  }
}

</style>
