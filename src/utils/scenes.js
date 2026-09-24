/**
 * 校园场景导航共享配置
 *
 * Home.vue 首页场景卡片与 GoodsList.vue 场景筛选状态共用同一份定义：
 * - 首页点击场景 → /goods?scene=<key>
 * - 商品中心根据 key 还原场景名称、描述与对应筛选条件（按商品名关键词）
 *
 * 场景不是独立页面，只是商品中心的一种"带语义的关键词筛选状态"，
 * 因此只维护 key → keyword 的映射，不为每个场景单独建路由/页面。
 */

export const SCENES = [
  { key: 'dorm', name: '宿舍好物', desc: '床桌椅灯收纳，宿舍生活一站配齐', keyword: '宿舍' },
  { key: 'study', name: '学习装备', desc: '教材文具与考研资料', keyword: '教材' },
  { key: 'digital', name: '数码电子', desc: '键鼠耳机显示器等装备', keyword: '数码' },
  { key: 'life', name: '生活用品', desc: '小家电与日用百货', keyword: '生活' },
  { key: 'bike', name: '出行代步', desc: '自行车滑板车代步工具', keyword: '自行车' },
  { key: 'sport', name: '运动休闲', desc: '球拍健身器材运动周边', keyword: '运动' }
]

// 根据场景 key 取场景定义；key 非法时返回 null（调用方按无场景处理）
export function findScene(key) {
  if (!key) return null
  return SCENES.find(s => s.key === key) || null
}
