
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
      // 根路径直达品牌落地页（不经过 /home 间接重定向，登录状态不影响该默认入口）。
      // Layout 仍以 / 为基路径，保证 /home、/goods 等业务 URL 不变；
      // 命中 '' 索引子路由时立即重定向到 /landing，Layout 不会渲染。
      path: '/',
      component: () => import('../views/Layout.vue'),

      children: [
        {
          // GET / → /landing（公开页，未登录/已登录均先看到品牌入口）
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

        {
          path: 'goods',
          component: () => import('../views/GoodsList.vue'),
          meta: {
            title: '商品中心',
            roles: ['student', 'seller', 'admin']
          }
        },

        {
          // :id 是路由参数，商品卡片点击后携带 goodsId 进入详情页
          path: 'goods/:id',
          component: () => import('../views/GoodsDetail.vue'),
          meta: {
            title: '商品详情',
            roles: ['student', 'seller', 'admin']
          }
        },

        {
          path: 'orders',
          component: () => import('../views/OrderList.vue'),
          meta: {
            title: '交易中心',
            roles: ['student', 'seller', 'admin']
          }

        },
        {
          // AI 校园闲置助手：独立业务页面（Agent 能力规划中，页面架构先行）
          path: 'ai-assistant',
          component: () => import('../views/AiAssistant.vue'),
          meta: {
            title: 'AI 校园闲置助手',
            roles: ['student', 'seller', 'admin']
          }
        },
        {
          // 我的商品发布工作台：seller 使用完整发布表单，
          // student 进入看到「成为卖家」引导页（页面内分流）；admin 无发布入口
          path: 'publish',
          component: () => import('../views/Publish.vue'),
          meta: {
            title: '发布商品',
            roles: ['student', 'seller']
          }
        },
        {
          path: 'seller-apply',
          component: () => import('../views/SellerApply.vue'),
          meta: {
            title: '申请成为卖家',
            roles: ['student']
          }
        },
        {
          path: 'seller',
          component: () => import('../views/SellerDashboard.vue'),
          meta: {
            title: '我的店铺',
            roles: ['seller']
          }
        },
        {
          path: 'admin',
          component: () => import('../views/AdminDashboard.vue'),
          meta: {
            title: '管理后台',
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

  // 登录 / 注册等公开页面直接放行
  if (to.meta.public) {
    return true
  }

  // 没登录 → 登录前产品首页（/landing），而不是直接弹到登录页
  if (!token) {
    return '/landing'
  }

  // 有角色限制，但当前角色不在允许范围
  const roles = to.meta.roles

  if (roles && !roles.includes(role)) {
    return '/home'
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
