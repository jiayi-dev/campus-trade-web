<template>
  <div class="auth-page">

    <!-- 背景层（由底到顶）：渐变光晕(全局::before+orbs) → 点阵纹理 → canvas 粒子 → 太阳嫩芽装饰 -->
    <div class="auth-bg" aria-hidden="true">
      <span class="auth-bg__orb auth-bg__orb--1"></span>
      <span class="auth-bg__orb auth-bg__orb--2"></span>
      <span class="auth-bg__orb auth-bg__orb--3"></span>
    </div>
    <div class="auth-texture" aria-hidden="true"></div>
    <canvas ref="particleCanvas" class="auth-particles" aria-hidden="true"></canvas>
    <div class="auth-decor" aria-hidden="true">
      <span class="auth-decor__sun"></span>
      <span class="auth-decor__sprout">
        <span class="auth-decor__leaf auth-decor__leaf--l"></span>
        <span class="auth-decor__leaf auth-decor__leaf--r"></span>
      </span>
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

        <div>
          <div class="auth-brand__title">
            注册账号<br />开启校园闲置之旅
          </div>
          <div class="auth-brand__subtitle">
            注册后默认获得学生身份，可浏览商品、收藏好物、留言咨询与下单交易。
          </div>

          <div class="auth-brand__features">
            <div class="auth-brand__feature">
              <el-icon><CircleCheck /></el-icon>
              手机号注册，一个账号即可使用
            </div>
            <div class="auth-brand__feature">
              <el-icon><ShoppingBag /></el-icon>
              买到实惠好物，晒出你的闲置生活
            </div>
            <div class="auth-brand__feature">
              <el-icon><Lock /></el-icon>
              密码 BCrypt 加密存储，安全可靠
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧注册表单 -->
      <div class="auth-form">
        <h2 class="auth-form__title">注册账号</h2>
        <p class="auth-form__subtitle">填写以下信息，完成后即可登录</p>

        <!-- 身份说明：默认学生身份，卖家走申请审核，管理员不开放注册 -->
        <el-alert
            class="auth-form__role-tip"
            type="info"
            :closable="false"
            show-icon
            title="注册后默认为学生身份；如需发布商品，登录后可申请成为卖家（管理员账号不开放注册）"
        />

        <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            @submit.prevent
        >
          <el-form-item label="用户名" prop="username">
            <el-input
                v-model="form.username"
                size="large"
                placeholder="2-16 位用户名"
                :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
                v-model="form.password"
                size="large"
                type="password"
                show-password
                placeholder="至少 6 位密码"
                :prefix-icon="Lock"
            />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input
                v-model="form.confirmPassword"
                size="large"
                type="password"
                show-password
                placeholder="请再次输入密码"
                :prefix-icon="Lock"
            />
          </el-form-item>

          <el-form-item label="手机号" prop="phone">
            <el-input
                v-model="form.phone"
                size="large"
                placeholder="请输入手机号"
                :prefix-icon="Phone"
                maxlength="11"
            />
          </el-form-item>

          <el-form-item label="邮箱（选填）" prop="email">
            <el-input
                v-model="form.email"
                size="large"
                placeholder="请输入邮箱"
                :prefix-icon="Message"
            />
          </el-form-item>

          <el-button
              type="primary"
              :class="{ 'is-success': registerSuccess }"
              :loading="loading"
              @click="handleRegister"
          >
            {{ registerSuccess ? '✓ 注册成功' : '注 册' }}
          </el-button>
        </el-form>

        <div class="auth-form__footer">
          已有账号？<router-link to="/login">返回登录</router-link>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  User,
  Lock,
  Phone,
  Message,
  CircleCheck,
  ShoppingBag,
  RefreshRight
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'

const router = useRouter()

const formRef = ref(null)
const loading = ref(false)

// 注册成功后的按钮绿勾反馈（跳转前的短暂提示）
const registerSuccess = ref(false)

// ---------- canvas 粒子背景（淡金黄 / 浅玫瑰粉 / 蜜桃色，偏奶黄侧重） ----------
const particleCanvas = ref(null)
let rafId = 0
let resizeHandler = null

onMounted(() => {
  const canvas = particleCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const colors = ['#e3c078', '#e8b4b8', '#f3c8d5', '#e8c8a0']
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

// 注册表单数据（角色由后端固定为 student，前端不传）
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  email: ''
})

// 确认密码校验
const validateConfirm = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 16, message: '用户名长度为 2-16 位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur'
    }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }
  ]
}

// 注册
const handleRegister = async () => {
  if (!formRef.value) return

  try {
    // 1. 先走前端表单校验
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true

  try {
    // 2. 调用注册接口（后端无论成功失败都返回字符串，HTTP 状态码为 200）
    const result = await request.post('/user/register', {
      username: form.username,
      password: form.password,
      phone: form.phone,
      email: form.email || null
    })

    // 3. 依据后端返回文本判断结果
    if (result === '注册成功') {
      registerSuccess.value = true
      ElMessage.success('注册成功，请使用新账号登录')
      router.push('/login')
    } else {
      ElMessage.error(result || '注册失败，请重试')
    }
  } catch (error) {
    // request.js 已经统一处理网络/服务器错误
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ========== 浅粉奶黄主题（奶黄侧重）：与登录页同一色彩体系，用暖黄区分 ========== */

/* 页面底色：奶油白偏粉，比登录页更暖 */
.auth-page {
  background: linear-gradient(140deg, #FFF9F4 0%, #FBF4E4 50%, #F9F0DC 100%);
}

/* 覆盖全局光晕：奶油黄 + 浅粉 */
.auth-page::before {
  background:
    radial-gradient(circle at 12% 16%, rgba(255, 240, 201, 0.60), transparent 46%),
    radial-gradient(circle at 88% 10%, rgba(248, 220, 229, 0.50), transparent 42%),
    radial-gradient(circle at 78% 92%, rgba(255, 240, 201, 0.50), transparent 46%);
}

/* 光斑：奶油黄 / 浅樱花粉 / 蜜桃粉 */
.auth-bg__orb--1 { background: rgba(255, 240, 201, 0.65); }
.auth-bg__orb--2 { background: rgba(248, 220, 229, 0.55); }
.auth-bg__orb--3 { background: rgba(243, 200, 213, 0.50); }

/* 细点阵纹理：极低透明度暖金 */
.auth-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(201, 168, 92, 0.10) 1px, transparent 1.4px);
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

/* 卡片悬浮感：柔和的暖调阴影 */
.auth-card {
  z-index: 2;
  box-shadow: 0 30px 80px rgba(180, 145, 100, 0.16);
}

/* 右上角小太阳 + 左下角嫩芽装饰（纯 CSS） */
.auth-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.auth-decor__sun {
  position: absolute;
  top: 56px;
  right: 76px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff5d6 0%, #f8dda8 70%, #eec890 100%);
  box-shadow: 0 0 28px rgba(240, 200, 140, 0.60);
  animation: auth-sun-pulse 6s ease-in-out infinite;
}

/* 旋转光芒：锥形重复渐变 + 径向遮罩只留外环 */
.auth-decor__sun::before {
  content: '';
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: repeating-conic-gradient(
    rgba(240, 205, 125, 0.40) 0deg 5deg,
    transparent 5deg 30deg
  );
  -webkit-mask: radial-gradient(circle, transparent 58%, #000 59%);
  mask: radial-gradient(circle, transparent 58%, #000 59%);
  animation: auth-sun-rays 24s linear infinite;
}

@keyframes auth-sun-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}

@keyframes auth-sun-rays {
  to { transform: rotate(360deg); }
}

/* 左下角嫩芽：柔和粉绿（与浅粉奶黄体系协调） */
.auth-decor__sprout {
  position: absolute;
  left: 64px;
  bottom: 48px;
  width: 4px;
  height: 30px;
  border-radius: 3px;
  background: linear-gradient(180deg, #c8a8b0, #b08a95);
  transform-origin: bottom center;
  animation: auth-sprout-sway 5s ease-in-out infinite;
}

.auth-decor__leaf {
  position: absolute;
  bottom: 15px;
  width: 18px;
  height: 11px;
  background: linear-gradient(120deg, #e5c8cf, #d8a8b0);
}

.auth-decor__leaf--l {
  left: -16px;
  border-radius: 80% 12% 80% 12%;
  transform: rotate(-32deg);
}

.auth-decor__leaf--r {
  right: -16px;
  border-radius: 12% 80% 12% 80%;
  transform: rotate(32deg);
}

@keyframes auth-sprout-sway {
  0%, 100% { transform: rotate(-3deg); }
  50%      { transform: rotate(3deg); }
}

/* 品牌区：浅蜜桃粉 → 奶油黄柔和渐变（与登录页同族，偏黄） */
.auth-brand {
  background: linear-gradient(155deg, #d4a094 0%, #e3b8a4 46%, #eccf9c 100%);
}

.auth-brand__title {
  letter-spacing: 1.5px;
  text-shadow: 0 3px 16px rgba(140, 90, 70, 0.30);
}

/* 输入框聚焦发光（暖杏） */
.auth-form :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1.5px #cfa280 inset, 0 6px 20px rgba(207, 162, 130, 0.22);
}

/* 主按钮：暖杏→蜜桃粉渐变 + 悬停上移加深阴影 */
.auth-form .el-button--primary {
  background: linear-gradient(120deg, #cfa280 0%, #e0b49c 100%);
  box-shadow: 0 10px 26px rgba(207, 162, 130, 0.32);
}

.auth-form .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(207, 162, 130, 0.42);
  filter: brightness(1.04);
}

/* 注册成功：按钮短暂变柔和绿勾 */
.auth-form .el-button--primary.is-success,
.auth-form .el-button--primary.is-success:hover {
  background: linear-gradient(120deg, #7cc9a2 0%, #a5d8c0 100%);
  box-shadow: 0 12px 28px rgba(124, 201, 162, 0.42);
  transform: none;
  filter: none;
}

.auth-form__footer a {
  color: #b0838c;
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
  .auth-decor__sun,
  .auth-decor__sun::before,
  .auth-decor__sprout {
    animation: none !important;
  }
}
</style>
