
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),

  // 路由切换后窗口回到顶部：Landing/登录页以 window 为滚动容器，
  // 从长页面底部点登录时不重置会停在原滚动位置（看起来像空白）。
  // 业务页滚动发生在 Layout 的 .content 内部容器，不受此影响，其位置恢复逻辑独立。
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },

  routes: [
    {
      path: '/login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登录', public: true }
    },

    {
      path: '/register',
      component: () => import('../views/Register.vue'),
      meta: { title: '注册', public: true }
    },

    {
      // 登录前产品首页：未登录用户进入平台的第一站
      path: '/landing',
      component: () => import('../views/Landing.vue'),
      meta: { title: '校园二手交易平台', public: true }
    },

    {
      // 根路径：Layout 作为壳，游客和已登录用户均可进入
      // 命中 '' 索引子路由时重定向到 /landing
      path: '/',
      component: () => import('../views/Layout.vue'),

      children: [
        {
          path: '',
          redirect: '/landing'
        },
        {
          path: 'home',
          component: () => import('../views/Home.vue'),
          meta: {
            title: '校园闲置市场',
            roles: ['student', 'seller', 'admin']
          }
        },

        // ====== 游客可访问的公开页面 ======
        {
          // 商品市场：游客可浏览，无需登录
          path: 'goods',
          component: () => import('../views/GoodsList.vue'),
          meta: {
            title: '商品中心',
            public: true
          }
        },
        {
          // 校园专题集市：编辑式专题探索页（游客可浏览）
          path: 'discover',
          component: () => import('../views/Discover.vue'),
          meta: { title: '专题集市', public: true }
        },
        {
          // 商品发布向导：分步创作流（与 /publish 单页工作台并存）
          // 静态段 goods/publish 的匹配优先级高于动态段 goods/:id，不会被详情页抢占
          path: 'goods/publish',
          component: () => import('../views/GoodsPublishWizard.vue'),
          meta: {
            title: '发布向导',
            requireAuth: true,
            roles: ['student', 'seller']
          }
        },
        {
          // 商品详情：游客可查看全部商品信息与图片
          path: 'goods/:id',
          component: () => import('../views/GoodsDetail.vue'),
          meta: {
            title: '商品详情',
            public: true
          }
        },
        {
          // 校园求购市场：需求广场（登录后可用）
          path: 'wanted',
          component: () => import('../views/Wanted.vue'),
          meta: { title: '求购市场', requireAuth: true, roles: ['student', 'seller', 'admin'] }
        },
        {
          // 求购详情：同一组件，靠参数切详情视图
          path: 'wanted/:wantedId',
          component: () => import('../views/Wanted.vue'),
          meta: { title: '求购详情', requireAuth: true, roles: ['student', 'seller', 'admin'] }
        },

        // ====== 以下页面需要登录 ======
        {
          path: 'orders',
          component: () => import('../views/OrderList.vue'),
          meta: {
            title: '交易中心',
            requireAuth: true,
            roles: ['student', 'seller', 'admin']
          }
        },
        {
          // 订单中心：独立订单页（可选 orderId 参数进入详情视图）
          path: 'orders/center/:orderId?',
          component: () => import('../views/OrderCenter.vue'),
          meta: { title: '订单中心', requireAuth: true, roles: ['student', 'seller', 'admin'] }
        },
        {
          // AI 助手：游客可进入页面并使用基础问答，登录态用于未来保存个人会话
          path: 'ai-assistant',
          component: () => import('../views/AiAssistant.vue'),
          meta: {
            title: '校园 AI 助手',
            public: true
          }
        },
        {
          path: 'publish',
          component: () => import('../views/Publish.vue'),
          meta: {
            title: '发布商品',
            requireAuth: true,
            roles: ['student', 'seller']
          }
        },
        {
          // 个人中心：资料 / 数据概览 / 账户安全 / 卖家身份
          path: 'profile',
          component: () => import('../views/Profile.vue'),
          meta: {
            title: '个人中心',
            requireAuth: true,
            roles: ['student', 'seller', 'admin']
          }
        },
        {
          path: 'seller-apply',
          component: () => import('../views/SellerApply.vue'),
          meta: {
            title: '申请成为卖家',
            requireAuth: true,
            roles: ['student']
          }
        },
        {
          path: 'seller',
          component: () => import('../views/SellerDashboard.vue'),
          meta: {
            title: '我的店铺',
            requireAuth: true,
            roles: ['seller']
          }
        },
        {
          // 卖家公开主页（游客可看商品+信誉，联系方式登录后可见）
          path: 'seller/:id',
          component: () => import('../views/SellerProfile.vue'),
          meta: {
            title: '卖家主页',
            public: true
          }
        },
        {
          path: 'admin',
          component: () => import('../views/AdminDashboard.vue'),
          meta: {
            title: '管理后台',
            requireAuth: true,
            roles: ['admin']
          }
        }
      ]
    }
  ]
})

// 全局前置守卫：登录校验 + 角色权限校验
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 公开页面直接放行（landing/login/register/goods/goods/:id）
  if (to.meta.public) {
    return true
  }

  // 需要登录的页面：未登录 → 登录页，携带 redirect
  if (to.meta.requireAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 已登录但角色不匹配 → 首页
  const roles = to.meta.roles
  if (roles && token && !roles.includes(role)) {
    return '/home'
  }

  // 未登录访问 /home：Home 是登录后的个人工作台，游客应回 Landing 公开首页
  // （Landing 有"先逛逛市场"入口引导游客进入商品市场）
  if (!token && to.path === '/home') {
    return '/landing'
  }

  // 未登录访问其他需要登录但未标记 requireAuth 的页面
  if (!token && roles && !to.meta.public) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  return true
})

// 全局后置钩子：根据路由设置浏览器标签页标题
router.afterEach((to) => {
  document.title = to.meta.title
      ? `${to.meta.title} · 校园二手交易平台`
      : '校园二手交易平台'
})

export default router
