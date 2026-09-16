<template>
  <div class="layout">

    <!-- 顶部 -->
    <header class="header">
      <div class="title">
        校园二手交易平台
      </div>

      <div class="user-info">
        <span>{{ username }}</span>

        <el-button
            link
            @click="handleLogout"
        >
          退出登录
        </el-button>
      </div>
    </header>

    <!-- 主体 -->
    <div class="main">

      <!-- 左侧菜单 -->
      <aside class="sidebar">

        <el-menu router :default-active="$route.path">
          <el-menu-item
              v-for="menu in visibleMenus"
              :key="menu.path"
              :index="menu.path"
          >
            {{ menu.name }}
          </el-menu-item>
        </el-menu>

      </aside>

      <!-- 右侧内容 -->
      <main class="content">
        <router-view />
      </main>

    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref(localStorage.getItem('username') || '')
const role = ref(localStorage.getItem('role') || '')

const menus = [
  {
    name: '首页',
    path: '/home',
    roles: ['student', 'seller', 'admin']
  },
  {
    name: '商品中心',
    path: '/goods',
    roles: ['student', 'seller', 'admin']
  },
  {
    name: '交易中心',
    path: '/orders',
    roles: ['student', 'seller', 'admin']
  }
]

const visibleMenus = computed(() => {
  return menus.filter(menu => menu.roles.includes(role.value))
})

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('role')

  router.push('/login')
}
</script>

<style scoped>

.layout {
  min-height: 100vh;
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #eee;
}

.title {
  font-size: 20px;
  font-weight: bold;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main {
  display: flex;
  min-height: calc(100vh - 60px);
}

.sidebar {
  width: 200px;
  border-right: 1px solid #eee;
}

.content {
  flex: 1;
  padding: 24px;
}

</style>