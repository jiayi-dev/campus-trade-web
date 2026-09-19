
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),

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
      path: '/',
      component: () => import('../views/Layout.vue'),
      redirect: '/home',

      children: [
        {
          path: 'home',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '数据概览' }
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

  // 没登录 → 登录页
  if (!token) {
    return '/login'
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
