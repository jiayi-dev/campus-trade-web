/**
 * 通用图片上传（复用后端 POST /api/upload/image）
 *
 * 后端约定（UploadController）：
 *   · multipart 字段名固定为 file
 *   · 需要登录（Authorization: Bearer <token>）
 *   · 仅允许 jpg / jpeg / png / gif / webp，且服务端会校验文件头
 *   · 单文件不超过 5MB
 *   · 返回 { url: "/api/files/goods/<uuid>.<ext>" }，可直接用于商品图 / 社区配图 / 头像
 *
 * 这里不手动设置 Content-Type，交给浏览器生成 multipart boundary。
 */

const MAX_SIZE = 5 * 1024 * 1024

export const uploadImage = async (file) => {
  if (!file) {
    throw new Error('请选择图片文件')
  }

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('仅支持 JPG / PNG / GIF / WEBP 图片')
  }

  if (file.size > MAX_SIZE) {
    throw new Error('图片大小不能超过 5MB')
  }

  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('登录状态已失效，请重新登录')
  }

  const form = new FormData()
  form.append('file', file)

  const resp = await fetch('/api/upload/image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  })

  let data = null
  try {
    data = await resp.json()
  } catch (e) {
    // 响应不是 JSON（如网关错误页）时走统一失败提示
  }

  if (!resp.ok || !data || !data.url) {
    throw new Error(data?.error || '图片上传失败，请稍后重试')
  }

  // 相对路径（/api/files/goods/xxx.jpg），由前端直接拼接访问，不保存本地绝对路径
  return data.url
}
