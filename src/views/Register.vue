<template>
  <div class="auth-page">

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
            注册后默认获得学生身份，可浏览商品、发布闲置、留言咨询与下单交易。
          </div>

          <div class="auth-brand__features">
            <div class="auth-brand__feature">
              <el-icon><CircleCheck /></el-icon>
              手机号注册，一个账号即可使用
            </div>
            <div class="auth-brand__feature">
              <el-icon><ShoppingBag /></el-icon>
              买到实惠好物，也能卖掉闲置
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
        <h2 class="auth-form__title">学生注册</h2>
        <p class="auth-form__subtitle">填写以下信息，完成后即可登录</p>

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
              :loading="loading"
              @click="handleRegister"
          >
            注 册
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
import { ref, reactive } from 'vue'
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
