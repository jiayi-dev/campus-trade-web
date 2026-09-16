<template>
  <div class="login-container">

    <div class="login-box">

      <h1>校园二手交易平台</h1>

      <!-- 登录身份切换 -->
      <el-tabs v-model="loginType">

        <el-tab-pane label="学生登录" name="student" />

        <el-tab-pane label="卖家登录" name="seller" />

        <el-tab-pane label="管理员登录" name="admin" />

      </el-tabs>

      <!-- 登录表单 -->
      <el-form @submit.prevent>

        <el-form-item label="用户名">
          <el-input
              v-model="username"
              placeholder="请输入用户名"
          />
        </el-form-item>

        <el-form-item label="密码">
          <el-input
              v-model="password"
              type="password"
              show-password
              placeholder="请输入密码"
          />
        </el-form-item>

        <el-button
            type="primary"
            style="width: 100%"
            @click="handleLogin"
            :loading="loading"
        >
          登录
        </el-button>

      </el-form>

    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
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
.login-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-box {
  width: 400px;
}
</style>

