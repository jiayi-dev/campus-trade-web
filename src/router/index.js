
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),

  routes: [
    {
      path: '/login',
      component: () => import('../views/Login.vue')
    },

    {
      path: '/',
      component: () => import('../views/Layout.vue'),

      children: [
        {
          path: 'home',
          component: () => import('../views/Dashboard.vue')
        },

        {
          path: 'goods',
          component: () => import('../views/GoodsList.vue'),
          meta: {
            roles: ['student', 'seller', 'admin']
          }
        },

        {
          path: 'orders',
          component: () => import('../views/OrderList.vue'),
          meta: {
            roles: ['student', 'seller', 'admin']
          }

        },
        {
          path: 'seller',
          component: () => import('../views/SellerDashboard.vue'),
          meta: {
            roles: ['seller']
          }
        },
        {
          path: 'admin',
          component: () => import('../views/AdminDashboard.vue'),
          meta: { roles: ['admin'] }
        }
      ]
    }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  // 登录页不需要 Token
  if (to.path === '/login') {
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

export default router

