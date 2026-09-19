/**
 * 通用格式化工具（纯前端，无第三方依赖）
 * 后端 LocalDateTime 序列化为 ISO 字符串，如 2026-09-18T21:13:02
 */

const pad = n => String(n).padStart(2, '0')

/**
 * 友好相对时间：刚刚 / x 分钟前 / x 小时前 / x 天前 / 今年内显示月-日 / 更早显示年-月-日
 * @param {string} time ISO 时间字符串
 */
export function formatRelativeTime(time) {
  if (!time) return ''

  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`

  const now = new Date()
  const md = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  return date.getFullYear() === now.getFullYear()
      ? md
      : `${date.getFullYear()}-${md}`
}

/**
 * 完整时间：yyyy-mm-dd hh:mm
 * @param {string} time ISO 时间字符串
 */
export function formatDateTime(time) {
  if (!time) return ''

  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 价格格式化：¥1,234.5（整数不带小数）
 * @param {string|number} price
 */
export function formatPrice(price) {
  if (price === null || price === undefined || price === '') return '¥0'

  const num = Number(price)
  if (Number.isNaN(num)) return `¥${price}`

  return '¥' + num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}
