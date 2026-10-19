/**
 * 浏览足迹本地记录（纯前端工具，无第三方依赖）
 *
 * 重要说明：
 * - 浏览足迹【仅保存在当前浏览器的 localStorage】，未保存到服务器；
 * - 后端没有浏览记录接口，换设备 / 清理浏览器数据后会丢失；
 * - 登录用户的多设备之间也不会同步，仅代表「这台设备上的浏览历史」；
 * - 所有读写都做了 try/catch，localStorage 不可用（隐私模式 / 被禁用 / 配额满）时
 *   返回安全默认值，绝不抛异常导致调用方页面崩溃。
 */

// 存储键（固定，勿随意改动，改动会导致老数据读取不到）
const STORAGE_KEY = 'campus_trade_footprints'

// 最多保留的足迹条数（超出后丢弃最旧的）
const MAX_FOOTPRINTS = 60

/**
 * 判断 localStorage 是否可用
 * 隐私模式 / 浏览器禁用存储 / 配额异常时返回 false，页面据此降级并给出提示
 */
export function isFootprintStoreAvailable() {
  try {
    const probe = '__campus_trade_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch (e) {
    return false
  }
}

/**
 * 从 localStorage 读取足迹数组（内部使用，失败返回空数组）
 */
const readRaw = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (e) {
    // JSON 损坏 / 存储不可用：降级为空数组，不抛出
    return []
  }
}

/**
 * 写入足迹数组（内部使用，失败静默忽略）
 */
const writeRaw = (list) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch (e) {
    // 配额已满 / 存储不可用：静默失败，内存中仍可继续使用本页数据
    return false
  }
}

/**
 * 记录 / 更新一条浏览足迹
 * - 按 goodsId 去重：已存在则删除旧记录并把新记录移到最前
 * - 只保存展示所需字段，避免把整个商品对象（含大字段）写进 localStorage
 * - 保留最近 MAX_FOOTPRINTS 条
 * @param {object} goods 商品对象（详情页 goods.value）
 */
export function recordFootprint(goods) {
  try {
    if (!goods || goods.goodsId === null || goods.goodsId === undefined) return

    const goodsId = goods.goodsId

    const item = {
      goodsId,
      goodsName: goods.goodsName || '',
      price: goods.price,
      imageUrl: goods.imageUrl || '',
      campus: goods.campus || '',
      categoryId: goods.categoryId ?? null,
      status: goods.status ?? null,
      viewTime: Date.now()
    }

    // 去重：移除已存在的同商品旧记录
    const list = readRaw().filter(it => it && it.goodsId !== goodsId)

    // 新记录置于最前（最近浏览优先）
    list.unshift(item)

    writeRaw(list.slice(0, MAX_FOOTPRINTS))
  } catch (e) {
    // 任何异常都不能影响详情页正常浏览
  }
}

/**
 * 读取全部足迹（已按记录顺序：最近浏览在前）
 * @returns {Array} 足迹数组，失败返回空数组
 */
export function readFootprints() {
  try {
    return readRaw().filter(it => it && it.goodsId !== null && it.goodsId !== undefined)
  } catch (e) {
    return []
  }
}

/**
 * 移除单条足迹
 * @param {number} goodsId 商品ID
 */
export function removeFootprint(goodsId) {
  try {
    const list = readRaw().filter(it => it && it.goodsId !== goodsId)
    writeRaw(list)
  } catch (e) {
    // 静默失败
  }
}

/**
 * 清空全部足迹
 */
export function clearFootprints() {
  try {
    writeRaw([])
  } catch (e) {
    // 静默失败
  }
}
