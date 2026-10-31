/**
 * 当前用户头像的全局共享状态
 *
 * 解决的问题：侧边栏（Layout）与个人中心（Profile）各自维护头像，
 * 在侧边栏更换头像后个人中心仍显示旧头像。
 *
 * 这里使用模块级 reactive（单例）：Layout / Profile 读写同一份状态，
 * 上传成功后即时同步；刷新或重新登录时再从 /user/avatar 读取服务端真值。
 */
import { reactive } from 'vue'
import request from './request'
import { uploadImage } from './upload'

export const avatarState = reactive({
  url: '',
  uploading: false
})

// 直接设置头像地址（例如 /user/profile 返回了 avatar，或上传成功后写入）
export const setAvatarUrl = (url) => {
  avatarState.url = url || ''
}

// 退出登录时清空，避免下一位登录者看到上一个账号的头像
export const clearAvatar = () => {
  avatarState.url = ''
  avatarState.uploading = false
}

/**
 * 读取当前登录用户的头像
 *
 * @param {boolean} force 为 true 时忽略内存中的值强制请求服务端
 */
export const loadCurrentAvatar = async (force = false) => {
  if (!localStorage.getItem('token')) {
    avatarState.url = ''
    return ''
  }

  if (!force && avatarState.url) {
    return avatarState.url
  }

  try {
    const res = await request.get('/user/avatar', { silent: true })
    avatarState.url = res?.avatar || ''
  } catch (e) {
    // 头像字段尚未初始化时（SQL 未执行）静默降级为首字母头像
  }

  return avatarState.url
}

// 上传并保存头像：先上传文件拿到相对 URL，再写入用户资料，最后同步全局状态
export const uploadAndSaveAvatar = async (file) => {
  avatarState.uploading = true

  try {
    const url = await uploadImage(file)
    await request.put('/user/avatar', { avatar: url })
    avatarState.url = url
    return url
  } finally {
    avatarState.uploading = false
  }
}
