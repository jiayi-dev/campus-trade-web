<template>
  <div class="detail-page">

    <!-- 返回 -->
    <div class="detail-back">
      <el-button :icon="ArrowLeft" plain @click="goBack">返回商品列表</el-button>
    </div>

    <!-- 商品不存在 -->
    <el-result
        v-if="notFound"
        icon="warning"
        title="商品不存在"
        sub-title="该商品可能已被卖家删除，返回商品中心看看其他闲置吧"
    >
      <template #extra>
        <el-button type="primary" @click="$router.push('/goods')">
          回到商品中心
        </el-button>
      </template>
    </el-result>

    <template v-else>

      <div v-loading="loading" class="detail-layout">

        <!-- 左侧：商品主体 + 留言 -->
        <div class="detail-main">

          <el-card shadow="never" class="goods-card-panel">

            <div class="goods-hero">

              <!-- 封面：多图轮播 / 单图 / 无图莫兰迪色块兜底（图片加载失败也回退色块） -->
              <div class="goods-hero__cover">
                <el-carousel
                    v-if="displayUrls.length > 1"
                    class="goods-hero__carousel"
                    height="240px"
                    :autoplay="false"
                    arrow="hover"
                    indicator-position="none"
                >
                  <el-carousel-item
                      v-for="(url, index) in displayUrls"
                      :key="url"
                  >
                    <img
                        :src="url"
                        :alt="`${goods.goodsName} 图片${index + 1}`"
                        class="goods-hero__img"
                        @error="handleImgError(index)"
                    />
                  </el-carousel-item>
                </el-carousel>

                <img
                    v-else-if="displayUrls.length === 1"
                    :src="displayUrls[0]"
                    :alt="goods.goodsName"
                    class="goods-hero__img"
                    @error="handleImgError(0)"
                />

                <div
                    v-else
                    class="goods-hero__fallback"
                    :class="`cover--${coverTheme}`"
                >
                  <el-icon><ShoppingBag /></el-icon>
                  <span>{{ categoryName || '未分类' }}</span>
                </div>
              </div>

              <div class="goods-hero__info">
                <div class="goods-hero__tags">
                  <el-tag size="small" type="info" effect="plain">
                    {{ categoryName || '未分类' }}
                  </el-tag>
                  <el-tag size="small" :type="goods.status === 1 ? 'success' : 'info'">
                    {{ goods.status === 1 ? '在售中' : '已下架' }}
                  </el-tag>
                </div>

                <h1 class="goods-hero__name">{{ goods.goodsName }}</h1>

                <div class="goods-hero__price price-text">
                  {{ formatPrice(goods.price) }}
                </div>

                <div class="goods-hero__time">
                  <el-icon><Clock /></el-icon>
                  发布于 {{ formatDateTime(goods.createTime) }}
                  <el-divider direction="vertical" />
                  <el-icon><View /></el-icon>
                  {{ goods.viewCount ?? 0 }} 次浏览
                  <el-divider direction="vertical" />
                  <el-icon><Star /></el-icon>
                  {{ goods.favoriteCount ?? 0 }} 人收藏
                </div>
              </div>

            </div>

            <!-- 下架提示 -->
            <el-alert
                v-if="goods.status !== 1"
                title="该商品已下架，可能已经被卖出或由卖家撤下"
                type="warning"
                :closable="false"
                show-icon
                class="goods-offline-alert"
            />

            <!-- 商品描述 -->
            <div class="goods-section">
              <h3 class="goods-section__title">
                <el-icon><Document /></el-icon>商品描述
              </h3>
              <div class="goods-section__desc">
                {{ goods.description || '卖家暂时没有填写商品描述' }}
              </div>
            </div>

          </el-card>

          <!-- 留言区 -->
          <el-card shadow="never" class="message-panel">

            <h3 class="goods-section__title">
              <el-icon><ChatDotRound /></el-icon>
              商品留言
              <span class="message-count">{{ messages.length }}</span>
            </h3>

            <!-- 发布留言 -->
            <div class="message-editor">
              <el-input
                  v-model="messageContent"
                  type="textarea"
                  :rows="3"
                  maxlength="200"
                  show-word-limit
                  :placeholder="goods.status === 1 ? '向卖家询问成色、交易地点等信息…' : '商品已下架，仍可给卖家留言'"
              />
              <div class="message-editor__footer">
                <el-button
                    type="primary"
                    :loading="messageSubmitting"
                    :disabled="!messageContent.trim()"
                    @click="submitMessage"
                >
                  发布留言
                </el-button>
              </div>
            </div>

            <!-- 留言列表 -->
            <div v-loading="messageLoading" class="message-list">

              <el-empty
                  v-if="!messageLoading && messages.length === 0"
                  description="还没有留言，来抢沙发吧"
                  :image-size="90"
              />

              <div
                  v-for="msg in messages"
                  :key="msg.messageId"
                  class="message-item"
              >
                <div class="message-item__avatar" :class="`avatar--${avatarTheme(msg.userId)}`">
                  {{ (msg.username || '已').charAt(0) }}
                </div>

                <div class="message-item__body">
                  <div class="message-item__head">
                    <span class="message-item__name">
                      {{ msg.username || '已注销用户' }}
                    </span>
                    <span class="message-item__time">
                      {{ formatRelativeTime(msg.createTime) }}
                    </span>
                  </div>
                  <div class="message-item__content">{{ msg.content }}</div>
                </div>
              </div>

            </div>

          </el-card>

        </div>

        <!-- 右侧：操作 + 卖家信息 -->
        <div class="detail-side">

          <el-card shadow="never" class="action-panel">

            <!-- 自己的商品 -->
            <el-alert
                v-if="isOwnGoods"
                title="这是你自己发布的商品"
                type="info"
                :closable="false"
                center
            />

            <template v-else>
              <!-- 立即购买：交易主入口 -->
              <el-button
                  type="primary"
                  size="large"
                  class="buy-btn"
                  :loading="buying"
                  :disabled="goods.status !== 1"
                  @click="handleBuy"
              >
                <el-icon v-if="!buying"><ShoppingCart /></el-icon>
                {{ goods.status === 1 ? '立即购买' : '商品已下架' }}
              </el-button>

              <!-- 收藏按钮 -->
              <el-button
                  :class="{ 'fav-active': isFavorite }"
                  :type="isFavorite ? 'default' : 'primary'"
                  class="fav-btn"
                  :loading="favLoading"
                  :disabled="goods.status !== 1"
                  @click="toggleFavorite"
              >
                <el-icon class="fav-btn__icon">
                  <StarFilled v-if="isFavorite" />
                  <Star v-else />
                </el-icon>
                {{ isFavorite ? '已收藏' : '收藏商品' }}
              </el-button>

              <div v-if="goods.status !== 1" class="action-tip">
                商品已下架，可能已经被卖出
              </div>
            </template>

          </el-card>

          <el-card shadow="never" class="seller-panel">

            <h3 class="goods-section__title">
              <el-icon><User /></el-icon>卖家信息
            </h3>

            <div v-loading="sellerLoading" class="seller-box">

              <template v-if="seller">
                <div class="seller-box__head">
                  <div class="seller-box__avatar">
                    {{ (seller.username || '?').charAt(0) }}
                  </div>
                  <div>
                    <div class="seller-box__name">{{ seller.username }}</div>
                    <el-tag
                        size="small"
                        :type="(roleTagMap[seller.role] || 'info')"
                        effect="plain"
                    >
                      {{ roleTextMap[seller.role] || '用户' }}
                    </el-tag>
                  </div>
                </div>

                <div class="seller-box__row">
                  <el-icon><Phone /></el-icon>
                  <span>{{ seller.phone || '未填写手机号' }}</span>
                </div>

                <div class="seller-box__row">
                  <el-icon><Message /></el-icon>
                  <span>{{ seller.email || '未填写邮箱' }}</span>
                </div>
              </template>

              <div v-else-if="!sellerLoading" class="seller-box__error">
                卖家信息暂时无法获取
              </div>

            </div>

          </el-card>

        </div>

      </div>

    </template>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Star,
  StarFilled,
  Phone,
  Message,
  Clock,
  Document,
  ChatDotRound,
  User,
  ShoppingBag,
  ShoppingCart,
  View
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime, formatRelativeTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

// 路由参数：/goods/:id 中的 id 就是商品ID
const goodsId = Number(route.params.id)

// =========================
// 页面状态
// =========================

const loading = ref(true)
const notFound = ref(false)

const goods = ref({})
const categories = ref([])
const seller = ref(null)
const sellerLoading = ref(false)

const isFavorite = ref(false)
const favLoading = ref(false)

const buying = ref(false)

const messages = ref([])
const messageLoading = ref(false)
const messageContent = ref('')
const messageSubmitting = ref(false)

const currentUserId = Number(localStorage.getItem('userId'))

const isOwnGoods = computed(() => goods.value.userId === currentUserId)

const categoryName = computed(() => {
  const cat = categories.value.find(c => c.categoryId === goods.value.categoryId)
  return cat ? cat.categoryName : ''
})

// 角色展示映射
const roleTextMap = {
  admin: '管理员',
  seller: '卖家',
  student: '学生'
}

const roleTagMap = {
  admin: 'danger',
  seller: 'warning',
  student: 'success'
}

// 封面 / 头像配色按 ID 轮转（浅粉→浅黄主题，与全局设计令牌一致）
const coverTheme = computed(() => {
  const themes = ['cream', 'rose', 'yellow', 'sage']
  const seed = goods.value.categoryId ?? goodsId ?? 0
  return themes[Math.abs(seed) % themes.length]
})

const avatarTheme = (userId) => {
  const themes = ['cream', 'rose', 'yellow', 'sage']
  return themes[Math.abs(Number(userId) || 0) % themes.length]
}

// =========================
// 商品图片：详情页展示（多图轮播 / 单图 / 无图色块兜底）
// =========================

const imageUrls = ref([])

// 加载失败的图片下标集合：失败图片自动从展示列表剔除，全部失败回退色块
const failedUrls = ref(new Set())

const displayUrls = computed(() => {
  return imageUrls.value.filter((_, index) => !failedUrls.value.has(index))
})

const handleImgError = (index) => {
  const next = new Set(failedUrls.value)
  next.add(index)
  failedUrls.value = next
}


// =========================
// 数据加载：一个页面并行组合多个接口
// 商品详情是主链路；收藏状态与留言是附加能力，失败不阻断主渲染
// =========================

const loadPage = async () => {

  if (!Number.isInteger(goodsId) || goodsId <= 0) {
    notFound.value = true
    loading.value = false
    return
  }

  loading.value = true

  const [detailRes, favRes, msgRes, catRes, imgRes] = await Promise.allSettled([
    request.get(`/goods/${goodsId}`),
    request.get(`/favorite/check/${goodsId}`),
    request.get(`/messages/goods/${goodsId}`),
    request.get('/categories'),
    request.get(`/goods/${goodsId}/images`)
  ])

  // 商品详情：主链路，拿不到数据直接走“商品不存在”
  if (detailRes.status === 'rejected' || !detailRes.value) {
    notFound.value = true
    loading.value = false
    return
  }

  goods.value = detailRes.value

  // 记录最近浏览到 localStorage，首页“最近浏览”区块读取展示（仅本地体验）
  recordRecentView(goods.value)

  // 收藏状态（附加能力，失败默认未收藏）
  if (favRes.status === 'fulfilled') {
    isFavorite.value = !!favRes.value.favorite
  }

  // 留言列表（附加能力，失败默认空列表）
  if (msgRes.status === 'fulfilled') {
    messages.value = Array.isArray(msgRes.value) ? msgRes.value : []
  }

  // 分类（用于显示分类名）
  if (catRes.status === 'fulfilled') {
    categories.value = Array.isArray(catRes.value) ? catRes.value : []
  }

  // 商品图片列表（主图在前，加载失败默认无图走色块兜底）
  if (imgRes.status === 'fulfilled' && Array.isArray(imgRes.value)) {
    imageUrls.value = imgRes.value
  }

  loading.value = false

  // 浏览量上报：商品加载成功后调用，后端原子 +1 并返回最新值
  reportView()

  // 卖家信息依赖商品详情中的 userId，在商品加载成功后单独请求
  loadSeller()
}

// =========================
// 浏览量上报：POST /goods/{id}/view
// 后端判断：商品不存在不加、本人浏览不加；返回自增后的最新浏览量
// 前端不自行修改数值，以数据库真实值回显
// =========================

const reportView = async () => {
  try {
    const result = await request.post(`/goods/${goodsId}/view`)

    if (result && typeof result.viewCount === 'number' && result.viewCount >= 0) {
      goods.value.viewCount = result.viewCount
    }
  } catch (error) {
    // 浏览上报失败不影响页面浏览
  }
}

// 最近浏览记录：写入 localStorage，首页“最近浏览”区块读取展示
// 仅本地体验，不进数据库、不做 UV 去重；最多保留 20 条，最新在前，按 goodsId 去重
const RECENT_KEY = 'campus_recent_views'
const recordRecentView = (g) => {
  if (!g || !g.goodsId) return
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const list = Array.isArray(arr) ? arr : []
    const filtered = list.filter(x => x.goodsId !== g.goodsId)
    filtered.unshift({
      goodsId: g.goodsId,
      goodsName: g.goodsName,
      price: g.price,
      imageUrl: g.imageUrl,
      campus: g.campus,
      conditionLevel: g.conditionLevel,
      time: new Date().toISOString()
    })
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 20)))
  } catch (e) {
    // localStorage 不可用或已满，忽略不影响浏览
  }
}

const loadSeller = async () => {
  if (!goods.value.userId) return

  sellerLoading.value = true

  try {
    seller.value = await request.get(`/user/${goods.value.userId}`)
  } catch (error) {
    seller.value = null
  } finally {
    sellerLoading.value = false
  }
}

const loadMessages = async () => {
  messageLoading.value = true

  try {
    const result = await request.get(`/messages/goods/${goodsId}`)
    messages.value = Array.isArray(result) ? result : []
  } catch (error) {
    // 不打断页面，保留现有留言
  } finally {
    messageLoading.value = false
  }
}


// =========================
// 收藏 / 取消收藏
// =========================

const toggleFavorite = async () => {
  favLoading.value = true

  try {
    // 后端用 200 + 文本表达业务结果（项目既有风格，最终批统一响应包装时再升级）
    const result = isFavorite.value
        ? await request.delete(`/favorite/${goodsId}`)
        : await request.post(`/favorite/${goodsId}`)

    if (result === '收藏成功' || result === '已取消收藏') {
      isFavorite.value = !isFavorite.value
      ElMessage.success(result)
    } else {
      // 例如“不能收藏自己发布的商品”“商品不存在或已被删除”
      ElMessage.error(result || '操作失败，请稍后再试')
    }
  } catch (error) {
    // request.js 已统一弹出网络错误
  } finally {
    favLoading.value = false
  }
}


// =========================
// 立即购买
// =========================

const handleBuy = async () => {

  // 二次确认，防止误操作
  try {
    await ElMessageBox.confirm(
        `确认以 ${formatPrice(goods.value.price)} 购买「${goods.value.goodsName}」吗？`,
        '确认购买',
        {
          confirmButtonText: '确认购买',
          cancelButtonText: '再想想',
          type: 'warning'
        }
    )
  } catch (action) {
    // 用户点击取消
    return
  }

  buying.value = true

  try {
    // 请求体只传 goodsId；买家身份由后端从登录 Token 解析
    const result = await request.post('/orders', { goodsId })

    if (typeof result === 'string' && result.startsWith('下单成功')) {
      ElMessage.success(result)
      // 商品已随订单下架，同步本地状态让按钮立即禁用
      goods.value.status = 0
      // 跳到交易中心的“我的购买”
      router.push({ path: '/orders', query: { tab: 'buyer' } })
    } else {
      // 业务失败：已下架 / 自己的商品 / 被别人抢买
      ElMessage.error(result || '下单失败，请稍后再试')
      // 被别人抢买时，刷新页面上的商品状态
      if (result && result.includes('买走')) {
        goods.value.status = 0
      }
    }
  } catch (error) {
    // request.js 已统一弹出网络错误
  } finally {
    buying.value = false
  }
}


// =========================
// 发布留言
// =========================

const submitMessage = async () => {
  const content = messageContent.value.trim()

  if (!content) {
    ElMessage.warning('留言内容不能为空')
    return
  }

  messageSubmitting.value = true

  try {
    const result = await request.post('/messages', { goodsId, content })

    if (result === '留言成功') {
      ElMessage.success('留言成功')
      messageContent.value = ''
      loadMessages()
    } else {
      ElMessage.error(result || '留言失败，请稍后再试')
    }
  } catch (error) {
    // request.js 已统一弹出网络错误
  } finally {
    messageSubmitting.value = false
  }
}


// =========================
// 返回：来源是商品列表时，回到"原筛选 / 分页 / 视图 / 滚动位置"；
// 其它来源（首页最近浏览、推荐位等）维持浏览器后退
// =========================

const goBack = () => {
  if (route.query.from === 'list') {
    router.push({ path: '/goods', query: { restore: '1' } })
    return
  }

  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/goods')
  }
}


onMounted(loadPage)
</script>


<style scoped>

.detail-page {
  width: 100%;
}

.detail-back {
  margin-bottom: 14px;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}

.detail-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.detail-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 0;
}

/* 商品主体 */
.goods-card-panel,
.message-panel,
.action-panel,
.seller-panel {
  border-radius: var(--brand-radius-lg);
}

.goods-hero {
  display: flex;
  gap: 26px;
}

.goods-hero__cover {
  width: 240px;
  height: 240px;
  flex-shrink: 0;
  border-radius: var(--brand-radius-lg);
  overflow: hidden;
}

.goods-hero__carousel :deep(.el-carousel__container) {
  height: 240px;
}

.goods-hero__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 无图兜底：莫兰迪色块（与商品卡片同一套配色） */
.goods-hero__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 17px;
  font-weight: 600;
}

.goods-hero__fallback .el-icon {
  font-size: 56px;
  opacity: 0.5;
}

.cover--cream {
  background: linear-gradient(135deg, #fdf6e3 0%, #fbf0d8 100%);
  color: #b8985a;
}

.cover--rose {
  background: linear-gradient(135deg, #f5d9dc 0%, #fce6e8 100%);
  color: #c0848a;
}

.cover--yellow {
  background: linear-gradient(135deg, #f5e4b8 0%, #fbeec8 100%);
  color: #b8985a;
}

.cover--sage {
  background: linear-gradient(135deg, #d2d8de 0%, #e2e8ec 100%);
  color: #70808c;
}

.goods-hero__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.goods-hero__tags {
  display: flex;
  gap: 8px;
}

.goods-hero__name {
  margin: 14px 0 16px;
  font-size: 24px;
  line-height: 1.35;
  color: var(--brand-text);
}

.goods-hero__price {
  font-size: 34px;
  line-height: 1.1;
}

.goods-hero__time {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.goods-offline-alert {
  margin-top: 18px;
}

.goods-section {
  margin-top: 22px;
}

.goods-section__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--brand-text);
}

.goods-section__desc {
  color: var(--brand-text-regular, #444);
  line-height: 1.8;
  font-size: 14.5px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 留言 */
.message-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--brand-primary-soft, #e7f6f6);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
}

.message-editor {
  margin-bottom: 20px;
}

.message-editor__footer {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.message-list {
  min-height: 120px;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--brand-border);
}

.message-item:last-child {
  border-bottom: none;
}

.message-item__avatar,
.seller-box__avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

/* 浅粉→浅黄头像色（无紫色） */
.avatar--cream {
  background: #b8985a;
}

.avatar--rose {
  background: #c0848a;
}

.avatar--yellow {
  background: #d4b366;
}

.avatar--sage {
  background: #70808c;
}

.message-item__body {
  flex: 1;
  min-width: 0;
}

.message-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.message-item__name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.message-item__time {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.message-item__content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--brand-text-regular, #444);
  word-break: break-word;
}

/* 操作区 */
.buy-btn {
  width: 100%;
  margin-bottom: 10px;
}

.fav-btn {
  width: 100%;
}

.fav-btn.fav-active {
  background: var(--brand-accent);
  border-color: var(--brand-accent);
  color: #fff;
}

.fav-btn.fav-active:hover {
  background: var(--brand-accent-hover);
  border-color: var(--brand-accent-hover);
  color: #fff;
}

.fav-btn__icon {
  margin-right: 4px;
}

.action-tip {
  margin-top: 10px;
  text-align: center;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

/* 卖家信息 */
.seller-box {
  min-height: 120px;
}

.seller-box__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.seller-box__avatar {
  width: 46px;
  height: 46px;
  background: var(--brand-primary);
  font-size: 19px;
}

.seller-box__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--brand-text);
  margin-bottom: 4px;
}

.seller-box__row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--brand-text-regular, #444);
  padding: 6px 0;
}

.seller-box__error {
  color: var(--brand-text-secondary);
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}

/* 窄屏：两栏堆叠 */
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-side {
    position: static;
  }

  .goods-hero {
    flex-direction: column;
  }

  .goods-hero__cover {
    width: 100%;
    height: 180px;
  }

  .goods-hero__carousel :deep(.el-carousel__container) {
    height: 180px;
  }
}

</style>
