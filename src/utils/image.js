// 商品图片 URL 统一解析
//
// 背景：数据库历史数据里存在 Trae IDE 内部图床地址
// （https://trae-api-cn.mchost.guru/...），浏览器无法访问。
// 直接渲染会长期停留在裂图状态，因此这里统一视为“无图”，
// 交给各页面的奶油色兜底占位，避免露出裂图。
//
// 新数据统一使用上传接口返回的相对地址：/api/files/goods/xxx.jpg
const UNREACHABLE_HOSTS = ['trae-api-cn.mchost.guru']

export const resolveGoodsImage = (url) => {
  if (!url) return ''

  const value = String(url).trim()
  if (!value) return ''

  // 相对地址（/api/files/...）直接可用，与当前服务同源
  if (value.startsWith('/')) return value

  try {
    const host = new URL(value).hostname
    if (UNREACHABLE_HOSTS.includes(host)) return ''
  } catch (e) {
    // 非合法 URL：按无图处理，避免 <img> 反复报错
    return ''
  }

  return value
}
