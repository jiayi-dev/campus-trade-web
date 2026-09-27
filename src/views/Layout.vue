<template>
  <div class="layout">

    <!-- 左侧品牌侧边栏 -->
    <aside class="sidebar">

      <!-- Logo 品牌区 -->
      <div class="brand">
        <div class="brand__badge">
          <el-icon><RefreshRight /></el-icon>
        </div>
        <div class="brand__text">
          <div class="brand__name">校园二手</div>
          <div class="brand__sub">CAMPUS TRADE</div>
        </div>
      </div>

      <!-- 角色菜单 -->
      <el-menu
        class="nav-menu"
        router
        :default-active="$route.path"
      >
        <el-menu-item
            v-for="menu in visibleMenus"
            :key="menu.path"
            :index="menu.path"
        >
          <el-icon><component :is="menu.icon" /></el-icon>
          <span>{{ menu.name }}</span>
        </el-menu-item>
      </el-menu>

      <!-- 侧边栏底部版本信息 -->
      <div class="sidebar__footer">V1.1 产品增强版</div>

    </aside>

    <!-- 右侧主区域 -->
    <div class="main">

      <!-- 顶部栏 -->
      <header class="header">
        <div class="header__title">
          {{ currentTitle }}
        </div>

        <el-dropdown trigger="click" @command="handleCommand">
          <div class="user">
            <div class="user__avatar">
              {{ username.charAt(0).toUpperCase() }}
            </div>
            <div class="user__meta">
              <div class="user__name">{{ username }}</div>
              <el-tag
                  size="small"
                  :type="roleTagType"
                  effect="light"
                  round
                  class="user__role"
              >
                {{ roleLabel }}
              </el-tag>
            </div>
            <el-icon class="user__arrow"><ArrowDown /></el-icon>
          </div>

          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <el-icon><UserFilled /></el-icon>
                {{ roleLabel }} · {{ username }}
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

      </header>

      <!-- 页面内容 -->
      <main class="content">
        <router-view />
      </main>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  HomeFilled,
  ShoppingBag,
  Tickets,
  Shop,
  Setting,
  UserFilled,
  SwitchButton,
  ArrowDown,
  RefreshRight,
  Promotion,
  CirclePlus
} from '@element-plus/icons-vue'
import request from '../utils/request'

const router = useRouter()
const route = useRoute()

const username = ref(localStorage.getItem('username') || '')
const role = ref(localStorage.getItem('role') || '')

// 从后端 /auth/me 拉取数据库真实角色并同步到本地缓存与响应式 role
// 作用：学生卖家申请被通过后，无需重新登录，下次进入 Layout（包括刷新页面 / 重新登录）
//      即可拿到 seller 身份；同时也兼容本地缓存被人为篡改的情况
const refreshRoleFromServer = async () => {
  try {
    const me = await request.get('/auth/me')
    if (me && me.role && me.role !== role.value) {
      role.value = me.role
      localStorage.setItem('role', me.role)
      // 触发本地事件，便于其它依赖角色的组件（如 SellerApply）即时响应
      window.dispatchEvent(new CustomEvent('role-changed', { detail: me.role }))
    } else if (me && me.role) {
      // 即使没变化，也保证 localStorage 与最新值一致
      localStorage.setItem('role', me.role)
    }
  } catch (e) {
    // /auth/me 失败时保留原 role，不阻断页面渲染
  }
}

// 监听来自其它页面（如 SellerApply.vue 在 loadPage 中检测到角色升级时）派发的 role-changed 事件
const handleRoleChanged = (e) => {
  const nextRole = e?.detail || localStorage.getItem('role')
  if (nextRole && nextRole !== role.value) {
    role.value = nextRole
  }
}

onMounted(() => {
  refreshRoleFromServer()
  window.addEventListener('role-changed', handleRoleChanged)
})

onBeforeUnmount(() => {
  window.removeEventListener('role-changed', handleRoleChanged)
})

// 菜单配置：名称 / 路径 / 允许角色 / 图标
const menus = [
  {
    name: '首页',
    path: '/home',
    roles: ['student', 'seller', 'admin'],
    icon: HomeFilled
  },
  {
    name: '商品中心',
    path: '/goods',
    roles: ['student', 'seller', 'admin'],
    icon: ShoppingBag
  },
  {
    name: '交易中心',
    path: '/orders',
    roles: ['student', 'seller', 'admin'],
    icon: Tickets
  },
  {
    // 发布工作台：seller 直接发布；student 进入引导页（成为卖家漏斗入口）
    name: '发布商品',
    path: '/publish',
    roles: ['student', 'seller'],
    icon: CirclePlus
  },
  {
    name: '成为卖家',
    path: '/seller-apply',
    roles: ['student'],
    icon: Promotion
  },
  {
    name: '我的店铺',
    path: '/seller',
    roles: ['seller'],
    icon: Shop
  },
  {
    name: '管理后台',
    path: '/admin',
    roles: ['admin'],
    icon: Setting
  }
]

// 按角色过滤菜单
const visibleMenus = computed(() => {
  return menus.filter(menu => menu.roles.includes(role.value))
})

// 顶部栏显示当前页面标题（来自路由 meta.title）
const currentTitle = computed(() => route.meta.title || '校园二手交易平台')

const roleLabelMap = {
  admin: '管理员',
  seller: '卖家',
  student: '学生'
}

const roleTagTypeMap = {
  admin: 'danger',
  seller: 'warning',
  student: 'success'
}

const roleLabel = computed(() => roleLabelMap[role.value] || '用户')
const roleTagType = computed(() => roleTagTypeMap[role.value] || 'info')

const handleCommand = (command) => {
  if (command === 'logout') {
    handleLogout()
  }
}

// 退出登录：清空本地登录信息并返回登录页
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
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* ========== 侧边栏 ========== */

.sidebar {
  width: 224px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--brand-sidebar-gradient);
  box-shadow: 4px 0 24px rgba(11, 59, 57, 0.18);
  position: relative;
  z-index: 10;
}

/* Logo 区 */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 20px;
}

.brand__badge {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
  flex-shrink: 0;
}

.brand__name {
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.2;
}

.brand__sub {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  letter-spacing: 1.6px;
}

/* 菜单 */
.nav-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 8px 12px;
}

.nav-menu :deep(.el-menu-item) {
  height: 46px;
  line-height: 46px;
  margin-bottom: 6px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.72);
  transition: all 0.2s ease;
}

.nav-menu :deep(.el-menu-item .el-icon) {
  font-size: 17px;
  color: inherit;
}

.nav-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-menu :deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--brand-accent);
}

.sidebar__footer {
  padding: 16px 20px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  letter-spacing: 0.5px;
}

/* ========== 右侧主区域 ========== */

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部栏 */
.header {
  height: 62px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--brand-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 26px;
}

.header__title {
  font-size: 17px;
  font-weight: 600;
  color: var(--brand-text);
}

/* 用户区 */
.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease;
  outline: none;
}

.user:hover {
  background: var(--brand-bg-soft);
}

.user__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-sidebar-gradient);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.user__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
  line-height: 1.2;
}

.user__role {
  transform: scale(0.9);
  transform-origin: left center;
}

.user__arrow {
  color: var(--brand-text-secondary);
  font-size: 13px;
}

/* 内容区 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 26px;
}

/* 窄屏收窄侧边栏，只留图标 */
@media (max-width: 860px) {
  .sidebar {
    width: 72px;
  }

  .brand__text,
  .sidebar__footer,
  .nav-menu :deep(.el-menu-item span) {
    display: none;
  }

  .brand {
    justify-content: center;
    padding: 20px 0;
  }

  .nav-menu :deep(.el-menu-item) {
    justify-content: center;
  }
}

</style>
