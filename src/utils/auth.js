/**
 * 统一登录门禁
 *
 * 游客点击受限操作时弹出友好提示，不直接跳转 /login，
 * 让用户选择"去登录"或"继续浏览"。
 * 登录时携带 redirect 参数，登录成功后回到原页面。
 *
 * 注意：useRouter() 只能在 setup() 上下文内调用，
 * 这里直接 import router 实例，避免在普通工具函数中误用 composable。
 */
import { ElMessageBox } from 'element-plus'
import router from '../router'

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return !!localStorage.getItem('token')
}

/**
 * 需要登录时弹出提示框
 * @param {string} message 提示文案，如"登录后即可收藏商品"
 * @param {string} currentPath 当前页面路径，用于登录后回跳
 * @returns {Promise<boolean>} 用户是否选择去登录
 */
export async function requireLogin(message, currentPath) {
  try {
    await ElMessageBox.confirm(message, '需要登录', {
      confirmButtonText: '去登录',
      cancelButtonText: '继续浏览',
      type: 'info',
      roundButton: true,
      customClass: 'guest-gate-dialog'
    })
    // 用户点击"去登录"：携带 redirect 参数，登录成功后回到原页面
    const redirect = currentPath || (window.location.pathname + window.location.search)
    router.push({ path: '/login', query: { redirect } })
    return true
  } catch {
    // 用户点击"继续浏览"
    return false
  }
}
