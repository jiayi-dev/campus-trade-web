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

        <!-- 左侧：图片 Gallery + 商品信息 + 留言 -->
        <div class="detail-main">

          <el-card shadow="never" class="goods-card-panel">

            <!-- =========================
                 图片 Gallery：大图 + 缩略图 + 序号 + 左右切换
                 列表页只显示主图（快速浏览），详情页展示全部图片（完整查看）
                 ========================= -->
            <div v-if="displayUrls.length > 0" class="gallery">

              <!-- 大图区：el-image 自带点击放大预览，复用 Element Plus 能力不引新依赖 -->
              <div class="gallery__stage">
                <el-image
                    :key="currentUrl"
                    :src="currentUrl"
                    :alt="`${goods.goodsName} 图片${activeIndex + 1}`"
                    fit="contain"
                    class="gallery__image"
                    :preview-src-list="displayUrls"
                    :initial-index="activeIndex"
                    preview-teleported
                    @error="handleImgError(activeIndex)"
                />

                <!-- 左右切换（多图才显示），stop 防止触发图片预览 -->
                <template v-if="displayUrls.length > 1">
                  <button type="button" class="gallery__arrow gallery__arrow--prev" @click.stop="prevImage">
                    <el-icon><ArrowLeft /></el-icon>
                  </button>
                  <button type="button" class="gallery__arrow gallery__arrow--next" @click.stop="nextImage">
                    <el-icon><ArrowRight /></el-icon>
                  </button>
                </template>

                <!-- 序号徽标 -->
                <span class="gallery__counter">{{ activeIndex + 1 }} / {{ displayUrls.length }}</span>

                <!-- 封面（主图）徽标：第一张即主图，与 goods_image.is_primary 对应 -->
                <span v-if="activeIndex === 0" class="gallery__primary-badge">封面</span>
              </div>

              <!-- 缩略图条（多图才显示） -->
              <div v-if="displayUrls.length > 1" class="gallery__thumbs">
                <button
                    v-for="(url, index) in displayUrls"
                    :key="url"
                    type="button"
                    class="gallery__thumb"
                    :class="{ 'gallery__thumb--active': index === activeIndex }"
                    @click="activeIndex = index"
                >
                  <img :src="url" :alt="`缩略图${index + 1}`" @error="handleImgError(index)" />
                </button>
              </div>

            </div>

            <!-- 无图 / 全部加载失败：莫兰迪色块兜底 -->
            <div v-else class="gallery__fallback" :class="`cover--${coverTheme}`">
              <el-icon><ShoppingBag /></el-icon>
              <span>{{ categoryName || '未分类' }}</span>
              <em>卖家还没有上传图片</em>
            </div>

            <!-- 商品核心信息 -->
            <div class="goods-info">

              <div class="goods-info__tags">
                <el-tag size="small" type="info" effect="plain">
                  {{ categoryName || '未分类' }}
                </el-tag>
                <el-tag v-if="conditionText" size="small" effect="plain" class="condition-tag">
                  {{ conditionText }}
                </el-tag>
                <el-tag size="small" :type="statusTag.type">
                  {{ statusTag.text }}
                </el-tag>
              </div>

              <h1 class="goods-info__name">{{ goods.goodsName }}</h1>

              <div class="goods-info__price price-text">
                {{ formatPrice(goods.price) }}
              </div>

              <!-- 交易信息网格：校区 / 面交地点 / 发布时间 / 浏览收藏 -->
              <div class="goods-info__meta">
                <div class="meta-item">
                  <el-icon><School /></el-icon>
                  <span class="meta-item__label">交易校区</span>
                  <span class="meta-item__value">{{ goods.campus || '卖家未填写' }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Location /></el-icon>
                  <span class="meta-item__label">面交地点</span>
                  <span class="meta-item__value">{{ goods.location || '卖家未填写' }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Clock /></el-icon>
                  <span class="meta-item__label">发布时间</span>
                  <span class="meta-item__value">{{ formatDateTime(goods.createTime) }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><View /></el-icon>
                  <span class="meta-item__label">浏览 / 收藏</span>
                  <span class="meta-item__value">
                    {{ goods.viewCount ?? 0 }} 次浏览 · {{ goods.favoriteCount ?? 0 }} 人收藏
                  </span>
                </div>
              </div>

            </div>

            <!-- 下架 / 已售提示 -->
            <el-alert
                v-if="goods.status !== 1"
                :title="goods.sold ? '该商品已售出，看看其他类似闲置吧' : '该商品已下架，可能已经被卖家撤下'"
                :type="goods.sold ? 'success' : 'warning'"
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
          <el-card shadow="never" class="message-panel" id="message-panel">

            <h3 class="goods-section__title">
              <el-icon><ChatDotRound /></el-icon>
              商品留言
              <span class="message-count">{{ messages.length }}</span>
            </h3>

            <!-- 发布留言 -->
            <!-- 游客：留言区显示登录提示，不渲染输入框 -->
            <div v-if="isGuest" class="message-editor__guest">
              <el-icon><ChatDotRound /></el-icon>
              <p>登录后才能给卖家留言</p>
              <el-button size="small" type="primary" plain @click="onGuestSellerLogin">去登录</el-button>
            </div>

            <!-- 已登录用户：正常留言编辑器 -->
            <div v-else class="message-editor">
              <el-input
                  ref="messageInputRef"
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

            <!-- 商品主人：编辑 / 上下架 / 删除（真正的权限校验在后端 checkOwnership） -->
            <template v-if="isOwnGoods">

              <el-button
                  type="primary"
                  size="large"
                  class="owner-btn"
                  @click="goEdit"
              >
                <el-icon><EditPen /></el-icon>编辑商品
              </el-button>

              <!-- 已售出（有订单）的商品不能重新上架，后端会拒绝，前端直接隐藏 -->
              <el-button
                  v-if="!goods.sold"
                  class="owner-btn"
                  :loading="statusChanging"
                  @click="toggleStatus"
              >
                <el-icon><Sell /></el-icon>
                {{ goods.status === 1 ? '下架商品' : '重新上架' }}
              </el-button>

              <el-button
                  type="danger"
                  plain
                  class="owner-btn"
                  :loading="deleting"
                  @click="handleDelete"
              >
                <el-icon><Delete /></el-icon>删除商品
              </el-button>

              <div class="action-tip">
                这是你自己发布的商品
              </div>

            </template>

            <!-- 普通买家：购买 / 收藏 / 联系卖家 -->
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
                {{ goods.status === 1 ? '立即购买' : (goods.sold ? '商品已售出' : '商品已下架') }}
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

              <!-- 联系卖家：锚点滚动到留言区并聚焦输入框 -->
              <el-button class="contact-btn" @click="scrollToMessage">
                <el-icon><ChatDotRound /></el-icon>联系卖家
              </el-button>

              <div v-if="goods.status !== 1" class="action-tip">
                {{ goods.sold ? '商品已售出，看看其他类似闲置吧' : '商品已下架，可能已经被卖家撤下' }}
              </div>
            </template>

          </el-card>

          <el-card shadow="never" class="seller-panel">

            <h3 class="goods-section__title">
              <el-icon><User /></el-icon>卖家信息
            </h3>

            <div v-loading="sellerLoading" class="seller-box">

              <template v-if="seller">
                <div class="seller-box__head" @click="goSellerProfile" role="button" tabindex="0">
                  <div class="seller-box__avatar">
                    {{ (seller.username || '?').charAt(0) }}
                  </div>
                  <div>
                    <div class="seller-box__name">
                      {{ seller.username }}
                      <el-icon class="seller-box__link-icon"><ArrowRight /></el-icon>
                    </div>
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

              <!-- 游客：登录后查看卖家联系方式 -->
              <div v-else-if="isGuest" class="seller-box__guest">
                <el-icon><Lock /></el-icon>
                <p>登录后查看卖家联系方式</p>
                <el-button size="small" type="primary" plain @click="onGuestSellerLogin">去登录</el-button>
              </div>

              <div v-else-if="!sellerLoading" class="seller-box__error">
                卖家信息暂时无法获取
              </div>

            </div>

            <!-- 卖家信誉区块：游客也能看（公开数据，类似淘宝卖家评价页） -->
            <div v-if="seller" v-loading="creditLoading" class="seller-credit">

              <div class="seller-credit__head">
                <span class="seller-credit__title">
                  <el-icon><Medal /></el-icon>卖家信誉
                </span>
                <el-tag
                    v-if="credit"
                    size="small"
                    type="warning"
                    effect="plain"
                    round
                    class="seller-credit__level"
                >
                  {{ credit.creditLevel }}
                </el-tag>
              </div>

              <div v-if="credit" class="seller-credit__score-row">
                <div class="seller-credit__score-block">
                  <el-rate
                      :model-value="Number(credit.avgScore)"
                      disabled
                      :max="5"
                      show-score
                      score-template="{value}"
                      class="seller-credit__rate"
                  />
                </div>
                <div class="seller-credit__count">
                  <span class="seller-credit__count-num">{{ credit.totalCount }}</span>
                  <span class="seller-credit__count-label">条评价</span>
                </div>
              </div>

              <div v-if="credit" class="seller-credit__stats">
                <div class="credit-stat">
                  <div class="credit-stat__num">{{ credit.completedCount }}</div>
                  <div class="credit-stat__label">完成交易</div>
                </div>
                <div class="credit-stat">
                  <div class="credit-stat__num">{{ credit.creditScore }}</div>
                  <div class="credit-stat__label">信用积分</div>
                </div>
              </div>

              <!-- 卖家无评价：引导完成交易逐步积累 -->
              <div v-if="credit && Number(credit.totalCount) === 0" class="seller-credit__empty">
                暂无评价，完成交易后将逐步积累校园信誉。
              </div>

              <!-- 查看评价按钮：有评价才出现 -->
              <el-button
                  v-if="credit && Number(credit.totalCount) > 0"
                  class="seller-credit__view-btn"
                  plain
                  @click="openGoodsEvaluations"
              >
                查看本商品评价
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>

          </el-card>

        </div>

      </div>

    </template>

    <!-- 商品评价列表弹窗：游客也能看 -->
    <el-dialog
        v-model="evalListVisible"
        title="商品评价"
        width="560px"
        class="goods-eval-dialog"
    >
      <div v-loading="evalLoading" class="goods-eval-list">
        <el-empty
            v-if="!evalLoading && goodsEvaluations.length === 0"
            description="该商品还没有评价"
            :image-size="80"
        />

        <div
            v-for="ev in goodsEvaluations"
            :key="ev.evaluationId"
            class="goods-eval-item"
        >
          <div class="goods-eval-item__head">
            <div class="goods-eval-item__avatar">
              {{ (ev.buyerName || '?').charAt(0) }}
            </div>
            <div class="goods-eval-item__meta">
              <div class="goods-eval-item__name">{{ ev.buyerName || '已注销用户' }}</div>
              <el-rate
                  :model-value="Number(ev.score)"
                  disabled
                  :max="5"
                  size="small"
                  class="goods-eval-item__rate"
              />
            </div>
            <div class="goods-eval-item__time">
              {{ formatRelativeTime(ev.createTime) }}
            </div>
          </div>
          <div class="goods-eval-item__content">{{ ev.content }}</div>
        </div>
      </div>
    </el-dialog>

  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
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
  View,
  School,
  Location,
  EditPen,
  Delete,
  Sell,
  Lock,
  Medal
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime, formatRelativeTime } from '../utils/format'
import { isLoggedIn, requireLogin } from '../utils/auth'
import { recordFootprint } from '../utils/footprint'

const route = useRoute()
const router = useRouter()

// 游客标识（模板用）：localStorage 非响应式，computed 在挂载时求值一次即可
// 登录态变化（requireLogin→/login→回到本页）会触发组件重新挂载，isGuest 会重新求值
const isGuest = computed(() => !localStorage.getItem('token'))

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

// 卖家信誉：公开 GET，游客也能看
const credit = ref(null)
const creditLoading = ref(false)

// 商品评价列表弹窗
const evalListVisible = ref(false)
const evalLoading = ref(false)
const goodsEvaluations = ref([])

const isFavorite = ref(false)
const favLoading = ref(false)

const buying = ref(false)
const statusChanging = ref(false)
const deleting = ref(false)

const messages = ref([])
const messageLoading = ref(false)
const messageContent = ref('')
const messageSubmitting = ref(false)
const messageInputRef = ref(null)

const currentUserId = Number(localStorage.getItem('userId'))

// 商品主人判断：游客 currentUserId 为 NaN，永远不是自己的商品
// 这样游客会走"普通买家"分支，但所有买家操作都会触发 requireLogin
const isOwnGoods = computed(() => isLoggedIn() && goods.value.userId === currentUserId)

const categoryName = computed(() => {
  const cat = categories.value.find(c => c.categoryId === goods.value.categoryId)
  return cat ? cat.categoryName : ''
})

// 成色映射：与 goods.condition_level 及商品卡片 CONDITION_MAP 保持一致
const CONDITION_MAP = {
  1: '全新',
  2: '99新',
  3: '95新',
  4: '9成新',
  5: '8成新及以下'
}

const conditionText = computed(() => CONDITION_MAP[goods.value.conditionLevel] || '')

// 商品状态：在售 / 已售出（下架+有订单，后端 sold 字段）/ 已下架
const statusTag = computed(() => {
  if (goods.value.status === 1) return { text: '在售中', type: 'success' }
  if (goods.value.sold) return { text: '已售出', type: 'warning' }
  return { text: '已下架', type: 'info' }
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
// 图片 Gallery：主图在前的完整图片列表
// 单图、多图、无图、加载失败四种情况都能正常展示
// =========================

const imageUrls = ref([])

// 当前展示的大图下标
const activeIndex = ref(0)

// 加载失败的图片下标集合：失败图片自动从展示列表剔除，全部失败回退色块
const failedUrls = ref(new Set())

const displayUrls = computed(() => {
  return imageUrls.value.filter((_, index) => !failedUrls.value.has(index))
})

const currentUrl = computed(() => displayUrls.value[activeIndex.value] || '')

const handleImgError = (index) => {
  const next = new Set(failedUrls.value)
  next.add(index)
  failedUrls.value = next
  // 当前大图被剔除时，下标收敛回有效范围
  if (activeIndex.value >= displayUrls.value.length) {
    activeIndex.value = Math.max(0, displayUrls.value.length - 1)
  }
}

const prevImage = () => {
  const len = displayUrls.value.length
  if (len < 2) return
  activeIndex.value = (activeIndex.value - 1 + len) % len
}

const nextImage = () => {
  const len = displayUrls.value.length
  if (len < 2) return
  activeIndex.value = (activeIndex.value + 1) % len
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

  // 游客不请求 /favorite/check 和 /messages/goods：这俩接口需 Token，
  // 游客请求会 401，污染浏览器控制台。游客默认未收藏、留言列表为空
  const loggedIn = isLoggedIn()

  const requests = [
    request.get(`/goods/${goodsId}`),
    null,
    null,
    request.get('/categories'),
    request.get(`/goods/${goodsId}/images`)
  ]
  if (loggedIn) {
    requests[1] = request.get(`/favorite/check/${goodsId}`)
    requests[2] = request.get(`/messages/goods/${goodsId}`)
  }

  const [detailRes, favRes, msgRes, catRes, imgRes] = await Promise.allSettled(requests)

  // 商品详情：主链路，拿不到数据直接走“商品不存在”
  if (detailRes.status === 'rejected' || !detailRes.value) {
    notFound.value = true
    loading.value = false
    return
  }

  goods.value = detailRes.value

  // 记录最近浏览到 localStorage，首页“最近浏览”区块读取展示（仅本地体验）
  recordRecentView(goods.value)

  // 收藏状态（附加能力，失败或游客默认未收藏）
  if (favRes.status === 'fulfilled' && favRes.value) {
    isFavorite.value = !!favRes.value.favorite
  }

  // 留言列表（附加能力，失败或游客默认空列表）
  if (msgRes.status === 'fulfilled' && msgRes.value) {
    messages.value = Array.isArray(msgRes.value) ? msgRes.value : []
  }

  // 分类（用于显示分类名）
  if (catRes.status === 'fulfilled') {
    categories.value = Array.isArray(catRes.value) ? catRes.value : []
  }

  // 商品图片列表（主图在前，加载失败默认无图走色块兜底）
  if (imgRes.status === 'fulfilled' && Array.isArray(imgRes.value)) {
    imageUrls.value = imgRes.value
    activeIndex.value = 0
  }

  loading.value = false

  // 浏览量上报：商品加载成功后调用，后端原子 +1 并返回最新值
  // 游客浏览量不上报：/goods/{id}/view 需 Token，游客请求会 401
  if (isLoggedIn()) {
    reportView()
  }

  // 浏览足迹：仅记录在当前浏览器本地（后端无浏览记录接口），页面 /me/collections 展示
  recordFootprint(goods.value)
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

  // 游客不请求 /user/{id}：接口需 Token，游客请求会 401
  // 卖家联系方式（手机/邮箱）属于敏感信息，登录后可见
  if (!isLoggedIn()) {
    sellerLoading.value = false
    seller.value = null
  } else {
    sellerLoading.value = true
    try {
      seller.value = await request.get(`/user/${goods.value.userId}`)
    } catch (error) {
      seller.value = null
    } finally {
      sellerLoading.value = false
    }
  }

  // 卖家信誉：公开接口，游客也能查看（类似淘宝卖家评价页）
  loadSellerCredit()
}

// 加载卖家信誉画像：GET /evaluations/seller/{sellerId}
// 公开数据：评价总数 / 平均分 / 1-5星分布 / 完成交易数 / 信用分 / 信用等级
const loadSellerCredit = async () => {
  if (!goods.value.userId) return
  creditLoading.value = true
  try {
    credit.value = await request.get(`/evaluations/seller/${goods.value.userId}`)
  } catch (error) {
    credit.value = null
  } finally {
    creditLoading.value = false
  }
}

// 打开商品评价列表弹窗：GET /evaluations/goods/{goodsId}
const openGoodsEvaluations = async () => {
  evalListVisible.value = true
  evalLoading.value = true
  try {
    const result = await request.get(`/evaluations/goods/${goodsId}`)
    goodsEvaluations.value = Array.isArray(result) ? result : []
  } catch (error) {
    goodsEvaluations.value = []
  } finally {
    evalLoading.value = false
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
  // 游客门禁：不直接请求后端，弹出登录提示
  if (!isLoggedIn()) {
    await requireLogin('登录后即可收藏商品', route.fullPath)
    return
  }

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
  // 游客门禁：购买是强交易行为，必须登录
  if (!isLoggedIn()) {
    await requireLogin('登录后才能进行交易', route.fullPath)
    return
  }

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
      goods.value.sold = true
      // 跳到交易中心的“我的购买”
      router.push({ path: '/orders', query: { tab: 'buyer' } })
    } else {
      // 业务失败：已下架 / 自己的商品 / 被别人抢买
      ElMessage.error(result || '下单失败，请稍后再试')
      // 被别人抢买时，刷新页面上的商品状态
      if (result && result.includes('买走')) {
        goods.value.status = 0
        goods.value.sold = true
      }
    }
  } catch (error) {
    // request.js 已统一弹出网络错误
  } finally {
    buying.value = false
  }
}


// =========================
// 商品主人操作：编辑 / 上下架 / 删除
// 前端只控制按钮展示，真正的越权拦截在后端 checkOwnership
// =========================

// 编辑：复用发布工作台的编辑模式（同一套表单 / 上传 / 校验，不复制第二套代码）
const goEdit = () => {
  router.push({ path: '/publish', query: { id: goodsId } })
}

// 上架 / 下架：独立接口承载业务规则（已产生交易记录的商品不能重新上架）
const toggleStatus = async () => {
  const targetStatus = goods.value.status === 1 ? 0 : 1

  statusChanging.value = true

  try {
    const result = await request.put(`/goods/${goodsId}/status`, { status: targetStatus })

    if (result === '商品已上架' || result === '商品已下架') {
      goods.value.status = targetStatus
      ElMessage.success(result)
    } else {
      ElMessage.error(result || '操作失败，请稍后再试')
    }
  } catch (error) {
    // request.js 已统一弹出网络错误
  } finally {
    statusChanging.value = false
  }
}

// 删除：二次确认；已产生交易记录的商品后端会拒绝删除
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
        `确认删除「${goods.value.goodsName}」吗？删除后商品与图片将一并移除，无法恢复。`,
        '删除商品',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '再想想',
          type: 'warning'
        }
    )
  } catch (action) {
    return
  }

  deleting.value = true

  try {
    const result = await request.delete(`/goods/${goodsId}`)

    if (result === '商品删除成功') {
      ElMessage.success(result)
      router.push('/seller')
    } else {
      ElMessage.error(result || '删除失败，请稍后再试')
    }
  } catch (error) {
    // request.js 已统一弹出网络错误
  } finally {
    deleting.value = false
  }
}


// =========================
// 游客：卖家信息区的"去登录"按钮
// =========================
const onGuestSellerLogin = () => {
  requireLogin('登录后即可查看卖家联系方式', route.fullPath)
}


// =========================
// 跳转卖家公开主页
// =========================
const goSellerProfile = () => {
  if (goods.value && goods.value.userId) {
    router.push(`/seller/${goods.value.userId}`)
  }
}


// =========================
// 联系卖家：滚动到留言区并聚焦输入框
// =========================
const scrollToMessage = () => {
  // 游客门禁：联系卖家本质是发留言，必须登录
  if (!isLoggedIn()) {
    requireLogin('登录后才能联系卖家', route.fullPath)
    return
  }
  document.getElementById('message-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  messageInputRef.value?.focus()
}


// =========================
// 发布留言
// =========================

const submitMessage = async () => {
  // 游客门禁：留言需要绑定用户身份，必须登录
  if (!isLoggedIn()) {
    await requireLogin('登录后才能联系卖家', route.fullPath)
    return
  }

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

/* =========================
   图片 Gallery
   ========================= */

.gallery__stage {
  position: relative;
  width: 100%;
  height: 460px;
  border-radius: var(--brand-radius-lg);
  overflow: hidden;
  background: #f7f1e8;
}

.gallery__image {
  width: 100%;
  height: 100%;
  transition: transform 0.45s ease;
}

/* 主图 hover 轻微 zoom，交互服务于查看细节 */
.gallery__stage:hover .gallery__image {
  transform: scale(1.03);
}

.gallery__image :deep(.el-image__inner) {
  cursor: zoom-in;
}

/* 左右切换箭头：hover 大图时浮现 */
.gallery__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--brand-text);
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.25s ease, background 0.25s ease;
  box-shadow: 0 2px 10px rgba(90, 70, 50, 0.14);
  z-index: 2;
}

.gallery__stage:hover .gallery__arrow {
  opacity: 1;
}

.gallery__arrow:hover {
  background: #fff;
}

.gallery__arrow--prev {
  left: 14px;
}

.gallery__arrow--next {
  right: 14px;
}

/* 序号徽标 */
.gallery__counter {
  position: absolute;
  right: 14px;
  bottom: 12px;
  padding: 3px 11px;
  border-radius: 999px;
  background: rgba(60, 50, 40, 0.55);
  color: #fff;
  font-size: 12.5px;
  letter-spacing: 0.5px;
  z-index: 2;
}

/* 封面徽标 */
.gallery__primary-badge {
  position: absolute;
  left: 14px;
  top: 12px;
  padding: 3px 11px;
  border-radius: 999px;
  background: var(--brand-accent);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  z-index: 2;
}

/* 缩略图条 */
.gallery__thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gallery__thumb {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--brand-radius, 10px);
  overflow: hidden;
  background: #f7f1e8;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.gallery__thumb:hover {
  opacity: 1;
  transform: translateY(-2px);
}

.gallery__thumb--active {
  border-color: var(--brand-primary);
  opacity: 1;
}

.gallery__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 无图兜底：莫兰迪色块（与商品卡片同一套配色） */
.gallery__fallback {
  width: 100%;
  height: 320px;
  border-radius: var(--brand-radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
}

.gallery__fallback .el-icon {
  font-size: 56px;
  opacity: 0.5;
}

.gallery__fallback em {
  font-style: normal;
  font-size: 13px;
  font-weight: 400;
  opacity: 0.75;
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

/* =========================
   商品核心信息
   ========================= */

.goods-info {
  margin-top: 20px;
}

.goods-info__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.condition-tag {
  color: var(--brand-accent);
  border-color: var(--brand-accent);
}

.goods-info__name {
  margin: 12px 0 14px;
  font-size: 24px;
  line-height: 1.35;
  color: var(--brand-text);
}

.goods-info__price {
  font-size: 34px;
  line-height: 1.1;
}

.goods-info__meta {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  padding: 16px 18px;
  border-radius: var(--brand-radius, 10px);
  background: rgba(216, 168, 173, 0.07);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  min-width: 0;
}

.meta-item .el-icon {
  color: var(--brand-primary);
  font-size: 15px;
  flex-shrink: 0;
}

.meta-item__label {
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

.meta-item__value {
  color: var(--brand-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 游客：留言区登录提示 */
.message-editor__guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 0;
  margin-bottom: 20px;
  text-align: center;
}

.message-editor__guest .el-icon {
  font-size: 22px;
  color: var(--brand-text-secondary);
}

.message-editor__guest p {
  font-size: 13px;
  color: var(--brand-text-secondary);
  margin: 0;
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
  margin-bottom: 10px;
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

.contact-btn {
  width: 100%;
}

.owner-btn {
  width: 100%;
  margin: 0 0 10px;
}

.action-tip {
  margin-top: 2px;
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
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 10px;
  padding: 4px;
  margin-inline: -4px;
}

.seller-box__head:hover {
  background: var(--brand-bg-soft);
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.seller-box__link-icon {
  font-size: 12px;
  color: var(--brand-text-secondary);
  transition: transform 0.2s;
}

.seller-box__head:hover .seller-box__link-icon {
  transform: translateX(2px);
  color: var(--brand-primary);
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

/* 游客：卖家信息登录提示 */
.seller-box__guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 0;
  text-align: center;
}

.seller-box__guest .el-icon {
  font-size: 22px;
  color: var(--brand-text-secondary);
}

.seller-box__guest p {
  font-size: 13px;
  color: var(--brand-text-secondary);
  margin: 0;
}

/* 卖家信誉区块 */
.seller-credit {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed var(--brand-border);
}

.seller-credit__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.seller-credit__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
}

.seller-credit__title .el-icon {
  color: var(--brand-accent);
  font-size: 16px;
}

.seller-credit__level {
  font-size: 11.5px;
  font-weight: 600;
}

.seller-credit__score-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(216, 168, 173, 0.07) 0%, rgba(201, 168, 92, 0.05) 100%);
  margin-bottom: 12px;
}

.seller-credit__score-block {
  flex: 1;
  min-width: 0;
}

.seller-credit__rate :deep(.el-rate__icon) {
  font-size: 20px;
}

.seller-credit__count {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-left: 14px;
  border-left: 1px dashed var(--brand-border);
}

.seller-credit__count-num {
  font-size: 19px;
  font-weight: 800;
  color: var(--brand-text);
  line-height: 1.1;
}

.seller-credit__count-label {
  font-size: 11px;
  color: var(--brand-text-secondary);
  margin-top: 2px;
}

.seller-credit__stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.credit-stat {
  text-align: center;
  padding: 8px 6px;
  border-radius: 10px;
  background: var(--brand-bg-soft);
}

.credit-stat__num {
  font-size: 17px;
  font-weight: 800;
  color: var(--brand-accent);
  line-height: 1.2;
}

.credit-stat__label {
  font-size: 11px;
  color: var(--brand-text-secondary);
  margin-top: 2px;
}

.seller-credit__empty {
  text-align: center;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
  padding: 10px 6px 4px;
  line-height: 1.6;
}

.seller-credit__view-btn {
  width: 100%;
  border-style: dashed;
}

/* 商品评价列表弹窗 */

.goods-eval-dialog :deep(.el-dialog__body) {
  padding: 0 24px 16px;
}

.goods-eval-list {
  min-height: 160px;
  max-height: 520px;
  overflow-y: auto;
}

.goods-eval-item {
  padding: 14px 0;
  border-bottom: 1px solid var(--brand-border);
}

.goods-eval-item:last-child {
  border-bottom: none;
}

.goods-eval-item__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.goods-eval-item__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.goods-eval-item__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.goods-eval-item__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text);
}

.goods-eval-item__rate :deep(.el-rate__icon) {
  font-size: 14px;
}

.goods-eval-item__time {
  font-size: 12px;
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

.goods-eval-item__content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--brand-text-regular, #444);
  padding-left: 44px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 窄屏：两栏堆叠 */
@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-side {
    position: static;
  }

  .gallery__stage {
    height: 300px;
  }

  .gallery__fallback {
    height: 220px;
  }

  .goods-info__meta {
    grid-template-columns: 1fr;
  }
}

</style>
