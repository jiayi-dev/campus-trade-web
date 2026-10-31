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
      <div class="brand__tagline">
        <span class="brand__tagline-dot"></span>
        同校好物 · 当面交易
      </div>

      <!-- 角色菜单：按业务分组，仍由 roles 过滤 -->
      <el-menu
        class="nav-menu"
        router
        :default-active="$route.path"
      >
        <template v-for="group in visibleMenuGroups" :key="group.name">
          <li v-if="group.name" class="nav-group__title">{{ group.name }}</li>
          <el-menu-item
              v-for="menu in group.menus"
              :key="menu.path"
              :index="menu.path"
          >
            <el-icon><component :is="menu.icon" /></el-icon>
            <span>{{ menu.name }}</span>
            <!-- 未读红点：消息中心=未读会话数；管理后台=待审核卖家申请数 -->
            <span v-if="menuBadge(menu.path) > 0" class="nav-badge">
              {{ menuBadge(menu.path) > 99 ? '99+' : menuBadge(menu.path) }}
            </span>
          </el-menu-item>
        </template>
      </el-menu>

      <!-- 游客模式：登录 / 注册入口 -->
      <div v-if="!isLoggedIn" class="guest-nav">
        <router-link to="/login" class="guest-nav__link">登录</router-link>
        <router-link to="/register" class="guest-nav__link guest-nav__link--register">注册</router-link>
      </div>

      <!-- 侧边栏底部版本信息 -->
      <div class="sidebar__footer">V1.3 全站体验版</div>

    </aside>

    <!-- 右侧主区域 -->
    <div class="main">

      <!-- 顶部栏 -->
      <header class="header">
        <div class="header__title">
          {{ currentTitle }}
        </div>

        <!-- 头像上传的隐藏文件选择器：复用 /api/upload/image 上传能力 -->
        <input
            ref="avatarInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="avatar-input"
            @change="handleAvatarChange"
        />

        <el-dropdown v-if="isLoggedIn" trigger="click" popper-class="user-menu-popper" @command="handleCommand">
          <div class="user">
            <div class="user__avatar-wrap">
              <span class="user__avatar-ring"></span>
              <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  class="user__avatar-img"
                  alt="我的头像"
                  @error="avatarUrl = ''"
              />
              <div v-else class="user__avatar">{{ avatarLetter }}</div>
              <span class="user__avatar-dot"></span>
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
            <div class="user-menu">
              <div class="user-menu__head">
                <div class="user-menu__avatar">
                  <img v-if="avatarUrl" :src="avatarUrl" alt="头像" />
                  <span v-else>{{ avatarLetter }}</span>
                </div>
                <div class="user-menu__identity">
                  <div class="user-menu__name">{{ username }}</div>
                  <div class="user-menu__sub">{{ roleLabel }} · ID {{ userIdLabel }}</div>
                </div>
              </div>

              <el-dropdown-menu class="user-menu__list">
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人中心与账号设置
                </el-dropdown-item>
                <el-dropdown-item v-if="isSeller" command="seller">
                  <el-icon><Shop /></el-icon>
                  我的店铺 / 商品管理
                </el-dropdown-item>
                <el-dropdown-item v-else command="publish">
                  <el-icon><CirclePlus /></el-icon>
                  我的发布
                </el-dropdown-item>
                <el-dropdown-item command="collections">
                  <el-icon><Star /></el-icon>
                  我的收藏
                </el-dropdown-item>
                <el-dropdown-item command="orders">
                  <el-icon><Tickets /></el-icon>
                  我的订单
                </el-dropdown-item>
                <el-dropdown-item command="messages">
                  <el-icon><ChatDotRound /></el-icon>
                  消息中心
                </el-dropdown-item>
                <el-dropdown-item command="avatar" divided :disabled="avatarUploading">
                  <el-icon><Camera /></el-icon>
                  {{ avatarUploading ? '头像上传中…' : '更换头像' }}
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </div>
          </template>
        </el-dropdown>

        <!-- 游客模式顶部栏：登录 / 注册按钮 -->
        <div v-else class="header__guest">
          <router-link to="/login" class="header__guest-login">登录</router-link>
          <router-link to="/register" class="header__guest-register">注册</router-link>
        </div>

      </header>

      <!-- 页面内容 -->
      <main class="content">
        <router-view />
      </main>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  HomeFilled,
  ShoppingBag,
  Tickets,
  Shop,
  Setting,
  SwitchButton,
  ArrowDown,
  RefreshRight,
  User,
  Promotion,
  CirclePlus,
  MagicStick,
  Collection,
  Search,
  TrendCharts,
  ChatDotRound,
  ChatLineSquare,
  Star,
  Lock,
  DataAnalysis,
  Camera
} from '@element-plus/icons-vue'
import request from '../utils/request'
import {
  avatarState,
  loadCurrentAvatar,
  uploadAndSaveAvatar,
  clearAvatar
} from '../utils/avatar'

const router = useRouter()
const route = useRoute()

// 路由切换时重置主区域滚动位置：
// .content 是全局唯一的真实滚动容器且跨路由复用（Layout 不卸载），router 的
// scrollBehavior 只作用于 window，对它无效。不重置的话，从列表页底部点进详情页，
// 详情页会"继承"列表页的滚动位置，看起来像自动滚到了留言区。
// 例外：返回商品列表 /goods 时跳过——GoodsList 有自己的滚动位置恢复逻辑
//（返回按钮 /goods?restore=1 或浏览器后退 + history.state 标记），
// 它会读取快照自行还原，这里若先重置会造成闪烁，交由它自己处理。
watch(() => route.path, (toPath) => {
  if (toPath === '/goods') return
  nextTick(() => {
    const scroller = document.querySelector('.content')
    if (scroller) scroller.scrollTop = 0
  })
})

const username = ref(localStorage.getItem('username') || '')
const role = ref(localStorage.getItem('role') || '')

// 头像：全局共享状态（与个人中心共用），服务端持久化，刷新 / 重新登录后仍然存在
const avatarUrl = computed({
  get: () => avatarState.url,
  set: (value) => { avatarState.url = value || '' }
})
const avatarInputRef = ref(null)
const avatarUploading = computed(() => avatarState.uploading)

const avatarLetter = computed(() => (username.value || '同').charAt(0).toUpperCase())
const userIdLabel = computed(() => localStorage.getItem('userId') || '--')
const isSeller = computed(() => role.value === 'seller' || role.value === 'admin')

// 游客模式：未登录时侧边栏显示登录/注册入口，顶部栏显示登录/注册按钮
// 已登录则走原有的用户头像+下拉退出流程
const isLoggedIn = computed(() => !!localStorage.getItem('token'))

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
  // 游客不调用 /auth/me：没有 Token 会返回 401，浏览器控制台报错
  // 游客只能访问 /goods 和 /goods/:id，菜单为空，无需校准角色
  if (isLoggedIn.value) {
    refreshRoleFromServer()
    loadAvatar()
    refreshBadges()
    // 30s 轮询未读数：消息/申请没有推送通道，轻量轮询即可满足提示需求
    badgeTimer = setInterval(refreshBadges, 30000)
  }
  window.addEventListener('role-changed', handleRoleChanged)
  // 消息中心内读完会话时派发的事件：左侧红点即时消除，不用等 30s 轮询或离开页面
  window.addEventListener('chat-unread-changed', refreshBadges)
  // 管理后台内审完卖家申请时派发的事件：同理即时消除
  window.addEventListener('seller-application-changed', refreshBadges)
})

onBeforeUnmount(() => {
  window.removeEventListener('role-changed', handleRoleChanged)
  window.removeEventListener('chat-unread-changed', refreshBadges)
  window.removeEventListener('seller-application-changed', refreshBadges)
  if (badgeTimer) {
    clearInterval(badgeTimer)
    badgeTimer = null
  }
})

// =========================
// 侧边栏红点提示
// - 消息中心：GET /chat/unread 未读会话总数（所有登录用户）
// - 管理后台：GET /admin/seller-applications?status=0 待审核申请数（仅 admin）
// 进入对应页面后重新拉取，读完消息/审完申请红点即消
// =========================
const unreadMsgCount = ref(0)
const pendingApplyCount = ref(0)
let badgeTimer = null

const menuBadge = (path) => {
  if (path === '/messages') return unreadMsgCount.value
  if (path === '/admin') return pendingApplyCount.value
  return 0
}

const refreshBadges = async () => {
  if (!isLoggedIn.value) return
  try {
    const unread = await request.get('/chat/unread')
    unreadMsgCount.value = Number(unread?.total ?? unread) || 0
  } catch (e) {
    // 消息模块未启用（chat 表缺失）时静默，不打扰其他页面
  }
  if (role.value === 'admin') {
    try {
      const res = await request.get('/admin/seller-applications', {
        params: { status: 0, pageNum: 1, pageSize: 1 }
      })
      pendingApplyCount.value = Number(res?.total) || 0
    } catch (e) {
      // 非管理员或接口异常时静默
    }
  }
}

// 路由切换后刷新红点：读完消息 / 审完申请回到其他页面时红点立即消除
watch(() => route.path, (toPath, fromPath) => {
  if (isLoggedIn.value && (fromPath === '/messages' || fromPath === '/admin')) {
    refreshBadges()
  }
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
    // 求购市场：需求广场（公告墙式需求流）
    name: '求购市场',
    path: '/wanted',
    roles: ['student', 'seller', 'admin'],
    icon: Search
  },
  {
    // 专题集市：编辑式专题探索页
    name: '专题集市',
    path: '/discover',
    roles: ['student', 'seller', 'admin'],
    icon: Collection
  },
  {
    // 校园社区：图文动态内容流（登录后可用）
    name: '校园社区',
    path: '/community',
    roles: ['student', 'seller', 'admin'],
    icon: ChatLineSquare
  },
  {
    // 安全中心：交易安全指引（公开页面，游客菜单也会展示）
    name: '安全中心',
    path: '/safety',
    roles: ['student', 'seller', 'admin'],
    icon: Lock
  },
  {
    // AI 助手：页面与基础问答对游客同样开放，游客菜单也会展示
    name: 'AI 助手',
    path: '/ai-assistant',
    roles: ['student', 'seller', 'admin'],
    icon: MagicStick
  },
  {
    name: '交易中心',
    path: '/orders',
    roles: ['student', 'seller', 'admin'],
    icon: Tickets
  },
  {
    // 订单中心：状态分组 + 时间线视图（与 /orders 交易中心并存）
    name: '订单中心',
    path: '/orders/center',
    roles: ['student', 'seller', 'admin'],
    icon: Tickets
  },
  {
    // 消息中心：用户与用户之间的交易私聊
    name: '消息中心',
    path: '/messages',
    roles: ['student', 'seller', 'admin'],
    icon: ChatDotRound
  },
  {
    // 发布商品：唯一新建入口（四步创作向导）
    // /publish 已转为「编辑商品」专用，不再作为新建菜单入口，避免功能重复
    name: '发布商品',
    path: '/goods/publish',
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
    // 经营工作台：卖家经营数据驾驶舱（与 /seller 我的店铺区分）
    name: '经营工作台',
    path: '/seller/dashboard',
    roles: ['seller', 'admin'],
    icon: TrendCharts
  },
  {
    // 收藏与足迹：收藏=服务端真实数据；浏览足迹=当前浏览器本地记录
    name: '收藏与足迹',
    path: '/me/collections',
    roles: ['student', 'seller', 'admin'],
    icon: Star
  },
  {
    name: '管理后台',
    path: '/admin',
    roles: ['admin'],
    icon: Setting
  },
  {
    // 平台运营数据中心：平台级数据洞察（与「管理后台」操作型页面区分）
    name: '运营数据中心',
    path: '/admin/analytics',
    roles: ['admin'],
    icon: DataAnalysis
  }
]

// 按角色过滤菜单
const visibleMenus = computed(() => {
  // 游客显示公开页面（市场/专题集市/AI 助手）与「校园社区」入口，
  // 校园社区需登录，未登录点击会被路由守卫引导到登录页；其他业务菜单需登录后才能使用
  if (!isLoggedIn.value) {
    return [
      { name: '市场', path: '/goods', icon: ShoppingBag },
      { name: '专题集市', path: '/discover', icon: Collection },
      { name: '校园社区', path: '/community', icon: ChatLineSquare },
      { name: '安全中心', path: '/safety', icon: Lock },
      { name: 'AI 助手', path: '/ai-assistant', icon: MagicStick }
    ]
  }
  return menus.filter(menu => menu.roles.includes(role.value))
})

// 菜单分组：只改变展示层次，不改变权限过滤规则
const MENU_GROUPS = [
  { name: '逛与发现', paths: ['/home', '/goods', '/wanted', '/discover'] },
  { name: '社区与工具', paths: ['/community', '/messages', '/safety', '/ai-assistant'] },
  { name: '交易与经营', paths: ['/orders', '/orders/center', '/goods/publish', '/seller-apply', '/seller', '/seller/dashboard'] },
  { name: '我的', paths: ['/me/collections'] },
  { name: '平台管理', paths: ['/admin', '/admin/analytics'] }
]

const visibleMenuGroups = computed(() => {
  const visible = visibleMenus.value

  // 游客菜单不分组，保持简洁
  if (!isLoggedIn.value) {
    return [{ name: '', menus: visible }]
  }

  const groups = MENU_GROUPS
      .map(group => ({
        name: group.name,
        menus: visible.filter(menu => group.paths.includes(menu.path))
      }))
      .filter(group => group.menus.length)

  // 兜底：未归入任何分组的菜单仍要显示，避免新增菜单被隐藏
  const grouped = new Set(groups.flatMap(group => group.menus.map(menu => menu.path)))
  const rest = visible.filter(menu => !grouped.has(menu.path))
  if (rest.length) {
    groups.push({ name: '其他', menus: rest })
  }

  return groups
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

  if (command === 'profile') {
    router.push('/profile')
    return
  }

  if (command === 'seller') {
    router.push('/seller')
    return
  }

  if (command === 'publish') {
    router.push('/goods/publish')
    return
  }

  if (command === 'collections') {
    router.push('/me/collections')
    return
  }

  if (command === 'orders') {
    router.push('/orders/center')
    return
  }

  if (command === 'messages') {
    router.push('/messages')
    return
  }

  if (command === 'avatar') {
    avatarInputRef.value?.click()
    return
  }

  if (command === 'logout') {
    handleLogout()
  }
}

// =========================
// 头像：读取 / 上传 / 保存
// =========================

const loadAvatar = async () => {
  // 共享状态已有值时直接复用，避免每个用到头像的页面重复请求
  await loadCurrentAvatar()
}

const handleAvatarChange = async (event) => {

  const file = event.target.files && event.target.files[0]

  // 允许连续选择同一个文件时也能触发 change
  event.target.value = ''

  if (!file) return

  try {
    // 上传 + 保存 + 同步全局头像状态由 avatar.js 统一处理
    await uploadAndSaveAvatar(file)
    ElMessage.success('头像已更新')
  } catch (error) {
    ElMessage.error(error?.message || '头像上传失败，请稍后再试')
  }
}

// 退出登录：清空本地登录信息并返回登录页
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  clearAvatar()

  router.push('/login')
}
</script>

<style scoped>

.layout {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* ========== 侧边栏（V1.3.1 浅粉奶黄轻盈风） ========== */

.sidebar {
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  /* V1.3.2：浅粉奶黄单源令牌——顶部浅樱粉光晕 + 底部奶油黄光晕，
     与登录注册页同一品牌色系，选中/悬浮态同样走令牌 */
  background: var(--brand-sidebar-surface);
  border-right: 1px solid var(--brand-sidebar-border);
  box-shadow: 4px 0 18px rgba(180, 140, 130, 0.06);
  position: relative;
  z-index: 10;
}

/* Logo 区 */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 0;
}

.brand__badge {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  /* 浅粉→奶油黄柔和渐变徽章 */
  background: linear-gradient(145deg, #f8d8dd 0%, #f3e0b8 100%);
  border: 1px solid rgba(216, 168, 173, 0.35);
  box-shadow: 0 4px 12px rgba(216, 168, 173, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #b5838a;
  flex-shrink: 0;
}

.brand__name {
  color: var(--brand-text);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.2;
}

.brand__sub {
  margin-top: 3px;
  color: var(--brand-text-secondary);
  font-size: 10px;
  letter-spacing: 1.6px;
}

/* 品牌区标语：一行轻量说明，浅粉胶囊 */
.brand__tagline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 20px 4px;
  padding: 5px 12px;
  border-radius: 999px;
  background: #f8e6e8;
  color: #a07578;
  font-size: 11.5px;
  letter-spacing: 0.4px;
  align-self: flex-start;
}

.brand__tagline-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--brand-primary);
}

/* 菜单 */
.nav-menu {
  flex: 1;
  border-right: none;
  background: transparent;
  padding: 10px 12px 8px;
  overflow-y: auto;
}

/* 分组标题：暖灰小字，层次清晰不刺眼 */
.nav-group__title {
  list-style: none;
  margin: 12px 0 4px;
  padding-left: 12px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: #b8a8a4;
}

.nav-group__title:first-child {
  margin-top: 2px;
}

.nav-menu :deep(.el-menu-item) {
  height: 42px;
  line-height: 42px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: #5c4f52;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.nav-menu :deep(.el-menu-item .el-icon) {
  font-size: 17px;
  color: #a89598;
  transition: transform 0.2s ease, color 0.2s ease;
}

.nav-menu :deep(.el-menu-item:hover) {
  background: var(--brand-sidebar-hover);
  color: var(--brand-text);
}

.nav-menu :deep(.el-menu-item:hover .el-icon) {
  transform: translateX(2px);
  color: var(--brand-primary);
}

/* 选中态：浅粉底 + 左侧粉色强调线（令牌统一） */
.nav-menu :deep(.el-menu-item.is-active) {
  background: var(--brand-sidebar-active-bg);
  color: var(--brand-sidebar-active-text);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--brand-primary);
}

.nav-menu :deep(.el-menu-item.is-active .el-icon) {
  color: var(--brand-sidebar-active-text);
  transform: none;
}

/* 未读红点：菜单项右侧的计数胶囊，与全站浅粉主色一致 */
.nav-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--brand-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(216, 168, 173, 0.45);
}

.sidebar__footer {
  padding: 16px 20px 20px;
  text-align: center;
  color: #b8a8a4;
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
  background: rgba(255, 254, 252, 0.94);
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

.user__avatar-wrap {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 头像外圈：缓慢旋转的虚线光环 */
.user__avatar-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px dashed var(--brand-primary);
  opacity: 0.55;
  animation: avatar-ring-spin 18s linear infinite;
  pointer-events: none;
}

@keyframes avatar-ring-spin {
  to { transform: rotate(360deg); }
}

/* 首字母头像底色：与徽章一致的粉黄渐变 */
.user__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(145deg, #e8b4b8 0%, #ecc99c 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user__avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(180, 140, 130, 0.20);
}

/* 右下角呼吸小圆点：表示账号在线 */
.user__avatar-dot {
  position: absolute;
  right: 0;
  bottom: 1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #7bbf8e;
  border: 2px solid #fff;
  animation: avatar-dot-pulse 2.6s ease-in-out infinite;
}

@keyframes avatar-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.75; }
}

.avatar-input {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .user__avatar-ring,
  .user__avatar-dot { animation: none; }
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

/* ========== 游客模式：侧边栏登录/注册入口 ========== */

.guest-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 16px 8px;
  margin-top: auto;
}

.guest-nav__link {
  display: block;
  text-align: center;
  padding: 10px 0;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-decoration: none;
  background: #f8ecec;
  color: var(--brand-text);
  border: 1px solid #f0dfe0;
  transition: all 0.2s ease;
}

.guest-nav__link:hover {
  background: #f4e0e2;
  color: #b55a66;
}

.guest-nav__link--register {
  background: linear-gradient(120deg, #d8a0a8 0%, #ecc99c 100%);
  color: #fff;
  border-color: transparent;
}

.guest-nav__link--register:hover {
  filter: brightness(1.05);
  color: #fff;
}

/* ========== 游客模式：顶部栏登录/注册按钮 ========== */

.header__guest {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header__guest-login,
.header__guest-register {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.header__guest-login {
  background: var(--brand-bg-soft, #f5ede2);
  color: var(--brand-text, #2b4a4a);
  border: 1px solid var(--brand-border, #ece2d3);
}

.header__guest-login:hover {
  background: var(--brand-bg-hover, #efe3d1);
}

.header__guest-register {
  background: linear-gradient(120deg, #d8a0a8 0%, #ecc99c 100%);
  color: #fff;
}

.header__guest-register:hover {
  filter: brightness(1.05);
}

/* 窄屏：游客入口同样保留，仅收窄内边距 */
@media (max-width: 860px) {
  .guest-nav {
    padding: 12px 8px 6px;
  }

  .guest-nav__link {
    font-size: 12px;
    padding: 8px 0;
  }

  .header__guest-login,
  .header__guest-register {
    padding: 0 12px;
    font-size: 12px;
  }
}

/* 窄屏收窄侧边栏，只留图标 */
@media (max-width: 860px) {
  .sidebar {
    width: 72px;
  }

  .brand__text,
  .brand__tagline,
  .nav-group__title,
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
