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
          <el-tab-pane name="student">
            <template #label>
              <span class="tab-label"><el-icon><User /></el-icon>学生登录</span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="seller">
            <template #label>
              <span class="tab-label"><el-icon><Shop /></el-icon>卖家登录</span>
            </template>
          </el-tab-pane>
          <el-tab-pane name="admin">
            <template #label>
              <span class="tab-label"><el-icon><Lock /></el-icon>管理员</span>
            </template>
          </el-tab-pane>
        </el-tabs>

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
              @click="handleLogin"
              :loading="loading"
          >
            登 录
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
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Lock, Shop, Location, ChatDotRound, Promotion, RefreshRight } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'

const router = useRouter()

// 当前登录身份
const loginType = ref('student')

// 用户输入
const username = ref('')
const password = ref('')

// 登录按钮加载状态
const loading = ref(false)

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
    const result = await request.post(
        `/auth/${loginType.value}/login`,
        {
          username: username.value,
          password: password.value
        }
    )

    // 3. 保存后端返回的登录信息
    localStorage.setItem('token', result.token)
    localStorage.setItem('userId', result.userId)
    localStorage.setItem('username', result.username)
    localStorage.setItem('role', result.role)

    // 4. 提示登录成功
    ElMessage.success('登录成功')

    // 5. 跳转到首页
    await router.push('/home')

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
  width: 33.33%;
  padding: 0;
  justify-content: center;
}

</style>
