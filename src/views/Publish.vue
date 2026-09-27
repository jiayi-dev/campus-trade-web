<template>
  <!--
    /publish 我的商品发布工作台（一页一成品，create / edit 双模式复用）
    角色分流：
    - seller：完整发布工作台（Hero + 表单 + 实时预览 + 操作条 + 成功反馈）
    - student：引导面板（成为卖家后即可发布，跳 /seller-apply）
    双模式：
    - 新建 /publish        ：POST /goods 创建 → POST /goods/{id}/images 关联图片
    - 编辑 /publish?id=26  ：GET /goods/{id} + GET /goods/{id}/images 回填
                            → PUT /goods 更新 → POST /goods/{id}/images 全量替换图片
                            （后端 checkOwnership 真实拦截越权，前端仅做体验层校验）
    真实业务链路：
      图片：选择 → POST /upload/image（multipart）→ 返回 URL（暂存于 file-list）
      商品：POST /goods（JSON，seller 身份由后端 AuthContext 认定）→ 文本返回商品ID
      关联：POST /goods/{id}/images（imageUrls 全量写入 goods_image，第一张为主图）
  -->
  <div class="publish-page">

    <!-- ==================== 学生引导态 ==================== -->
    <div v-if="!isSeller" class="gate">
      <div class="gate__card">
        <div class="gate__badge"><el-icon><Shop /></el-icon></div>
        <h2 class="gate__title">成为卖家后即可发布商品</h2>
        <p class="gate__desc">
          为了保障校园交易真实可靠，发布商品需要卖家身份。
          提交申请并通过管理员审核后，就能把自己的闲置好物上架给全校同学。
        </p>
        <div class="gate__steps">
          <div class="gate__step">
            <span class="gate__no">1</span>
            <span>提交卖家申请</span>
          </div>
          <el-icon class="gate__arrow"><ArrowRight /></el-icon>
          <div class="gate__step">
            <span class="gate__no">2</span>
            <span>管理员审核</span>
          </div>
          <el-icon class="gate__arrow"><ArrowRight /></el-icon>
          <div class="gate__step">
            <span class="gate__no">3</span>
            <span>开始发布闲置</span>
          </div>
        </div>
        <div class="gate__actions">
          <el-button type="primary" size="large" @click="goSellerApply">
            <el-icon><Promotion /></el-icon>申请成为卖家
          </el-button>
          <el-button size="large" @click="goMarket">先去逛逛市场</el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 发布成功态 ==================== -->
    <div v-else-if="view === 'success'" class="success">
      <!-- 纯 CSS 庆祝粒子（品牌暖色系，不引入任何动画库） -->
      <div class="confetti" aria-hidden="true">
        <span v-for="n in 28" :key="n" class="confetti__dot" :style="confettiStyle(n)"></span>
      </div>

      <div class="success__card">
        <div class="success__check">
          <el-icon><CircleCheckFilled /></el-icon>
        </div>
        <h2 class="success__title">商品发布成功</h2>
        <p class="success__sub">你的闲置已经上架，等待校园里的下一位主人</p>

        <div class="success__goods">
          <div class="success__cover">
            <img v-if="publishedGoods.imageUrl" :src="publishedGoods.imageUrl" alt="商品主图" />
            <el-icon v-else><Picture /></el-icon>
          </div>
          <div class="success__info">
            <div class="success__name">{{ publishedGoods.name }}</div>
            <div class="success__meta">
              <span class="price-text">{{ formatPrice(publishedGoods.price) }}</span>
              <span class="success__id">商品编号 #{{ publishedGoods.id }}</span>
            </div>
          </div>
        </div>

        <div class="success__actions">
          <el-button type="primary" size="large" @click="goPublishedDetail">
            查看商品<el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button size="large" @click="resetForNext">继续发布</el-button>
          <el-button size="large" text @click="goMarket">返回市场</el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 卖家工作台态 ==================== -->
    <template v-else>
      <!-- 1. Hero -->
      <section class="hero">
        <div class="hero__blob hero__blob--pink"></div>
        <div class="hero__blob hero__blob--butter"></div>
        <div class="hero__inner">
          <div class="hero__copy">
            <span class="hero__eyebrow">SELL YOUR ITEM · 卖家工作台</span>
            <h1 class="hero__title">{{ isEditMode ? '编辑商品' : '发布一件商品' }}</h1>
            <p class="hero__sub">
              {{ isEditMode ? '修改商品信息与图片，保存后即刻生效' : '让闲置物品找到校园里的下一位主人' }}
            </p>
            <div class="hero__tips">
              <span class="hero__tip"><el-icon><Camera /></el-icon>清晰实拍图更容易卖出</span>
              <span class="hero__tip"><el-icon><PriceTag /></el-icon>参考原价合理定价</span>
              <span class="hero__tip"><el-icon><Location /></el-icon>写清面交地点更省心</span>
            </div>
          </div>
          <div class="hero__user">
            <div class="hero__avatar">{{ username.charAt(0).toUpperCase() }}</div>
            <div class="hero__user-meta">
              <span class="hero__user-name">{{ username }}</span>
              <span class="hero__user-role">认证卖家</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. 主区：左表单右预览 -->
      <div v-loading="editLoading" class="workspace">
        <div class="workspace__form">

          <!-- 商品图片 -->
          <section class="panel">
            <header class="panel__head">
              <span class="panel__step">01</span>
              <div>
                <h3 class="panel__title">商品图片</h3>
                <p class="panel__desc">选择后立即上传，第一张将作为列表封面主图</p>
              </div>
              <span class="panel__count">{{ uploadedUrls.length }}/{{ MAX_IMAGES }}</span>
            </header>

            <el-upload
                v-model:file-list="uploadFileList"
                action="/api/upload/image"
                name="file"
                list-type="picture-card"
                :headers="uploadHeaders"
                :limit="MAX_IMAGES"
                accept="image/jpeg,image/png,image/gif,image/webp"
                :before-upload="beforeImageUpload"
                :on-success="handleUploadSuccess"
                :on-error="handleUploadError"
                :class="{ 'hide-add': uploadFileList.length >= MAX_IMAGES }"
            >
              <el-icon><Plus /></el-icon>

              <template #file="{ file }">
                <div class="upl">
                  <img class="upl__img" :src="file.url" alt="商品图片" />

                  <!-- 上传中遮罩 -->
                  <div v-if="file.status === 'uploading'" class="upl__mask">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>上传中</span>
                  </div>

                  <template v-else>
                    <span v-if="isPrimary(file)" class="upl__primary">主图</span>
                    <div class="upl__ops">
                      <el-icon title="前移" @click.stop="moveImage(file, -1)"><ArrowLeft /></el-icon>
                      <el-icon title="后移" @click.stop="moveImage(file, 1)"><ArrowRight /></el-icon>
                      <el-icon title="删除" @click.stop="removeImage(file)"><Delete /></el-icon>
                    </div>
                  </template>
                </div>
              </template>
            </el-upload>

            <p class="panel__hint">
              支持 jpg / png / gif / webp，单张不超过 5MB，最多 {{ MAX_IMAGES }} 张；
              拖动悬停图片可调整顺序
            </p>
          </section>

          <!-- 基础信息 -->
          <section class="panel">
            <header class="panel__head">
              <span class="panel__step">02</span>
              <div>
                <h3 class="panel__title">基础信息</h3>
                <p class="panel__desc">买家筛选商品时最先看到的内容</p>
              </div>
            </header>

            <div class="field">
              <label class="field__label">商品标题<i>*</i></label>
              <el-input
                  v-model="form.goodsName"
                  maxlength="30"
                  show-word-limit
                  placeholder="一句话说清是什么，如：九成新《数据结构》考研教材"
              />
            </div>

            <div class="field-row">
              <div class="field">
                <label class="field__label">商品分类<i>*</i></label>
                <el-select
                    v-model="form.categoryId"
                    placeholder="请选择分类"
                    style="width: 100%"
                    :loading="categoriesLoading"
                >
                  <el-option
                      v-for="cat in categories"
                      :key="cat.categoryId"
                      :label="cat.categoryName"
                      :value="cat.categoryId"
                  />
                </el-select>
                <p v-if="categoriesError" class="field__error">
                  分类加载失败，请刷新重试
                </p>
              </div>

              <div class="field">
                <label class="field__label">商品价格<i>*</i></label>
                <el-input-number
                    v-model="form.price"
                    :min="0"
                    :max="999999.99"
                    :precision="2"
                    controls-position="right"
                    placeholder="0.00"
                    style="width: 100%"
                />
              </div>
            </div>

            <div class="field">
              <label class="field__label">新旧程度<i>*</i></label>
              <div class="pills">
                <button
                    v-for="c in CONDITION_OPTIONS"
                    :key="c.value"
                    type="button"
                    class="pill"
                    :class="{ 'pill--active': form.conditionLevel === c.value }"
                    @click="form.conditionLevel = c.value"
                >
                  <span class="pill__name">{{ c.name }}</span>
                  <span class="pill__note">{{ c.note }}</span>
                </button>
              </div>
            </div>

            <div class="field">
              <label class="field__label">交易校区</label>
              <!-- 校区来自平台真实在售数据（/home/overview），不硬编码任何校区名 -->
              <div v-if="campuses.length" class="pills pills--campus">
                <button
                    v-for="c in campuses"
                    :key="c"
                    type="button"
                    class="pill pill--campus"
                    :class="{ 'pill--active': form.campus === c }"
                    @click="toggleCampus(c)"
                >
                  <el-icon><School /></el-icon>{{ c }}
                </button>
              </div>
              <el-input
                  v-else
                  v-model="form.campus"
                  maxlength="20"
                  placeholder="填写你所在的校区或区域"
              />
            </div>

            <div class="field">
              <label class="field__label">面交地点</label>
              <el-input
                  v-model="form.location"
                  maxlength="30"
                  placeholder="如：三食堂门口 / 图书馆一楼 / 东区宿舍 5 栋楼下"
              />
            </div>
          </section>

          <!-- 商品描述 -->
          <section class="panel">
            <header class="panel__head">
              <span class="panel__step">03</span>
              <div>
                <h3 class="panel__title">商品描述</h3>
                <p class="panel__desc">说清楚使用情况、购买时间、瑕疵、配件与交易方式</p>
              </div>
            </header>

            <el-input
                v-model="form.description"
                type="textarea"
                :rows="6"
                maxlength="500"
                show-word-limit
                placeholder="例如：去年购入的拍立得，使用不到 10 次，功能完好无划痕，带原装相纸 2 盒。可当面验货，支持宿舍楼下自取。"
            />
          </section>
        </div>

        <!-- 实时预览 -->
        <aside class="workspace__preview">
          <div class="preview">
            <div class="preview__head">
              <span class="preview__dot"></span>
              实时预览
              <span class="preview__en">LIVE PREVIEW</span>
            </div>
            <p class="preview__tip">买家在商品中心看到的效果</p>

            <div class="preview__card">
              <GoodsCard
                  :goods="previewGoods"
                  :category-name="previewCategoryName"
                  :editable="false"
                  :favorite="false"
              />
            </div>

            <div class="preview__missing" v-if="missingFields.length">
              <span class="preview__missing-label">{{ isEditMode ? '保存前还需完善：' : '发布前还需完善：' }}</span>
              <span
                  v-for="m in missingFields"
                  :key="m"
                  class="preview__missing-item"
              >{{ m }}</span>
            </div>
            <div v-else class="preview__ready">
              <el-icon><CircleCheckFilled /></el-icon>{{ isEditMode ? '信息已就绪，可以保存' : '信息已就绪，可以发布' }}
            </div>
          </div>
        </aside>
      </div>

      <!-- 3. 底部操作条（编辑模式：草稿无意义，主按钮换为保存修改） -->
      <div class="actionbar">
        <div class="actionbar__inner">
          <button v-if="!isEditMode" class="actionbar__draft" @click="saveDraft">
            <el-icon><Collection /></el-icon>暂存草稿
          </button>
          <span v-else class="actionbar__edit-hint">
            正在编辑商品 #{{ editId }}，保存后图片与信息将全量更新
          </span>
          <div class="actionbar__right">
            <el-button size="large" @click="isEditMode ? goSeller() : goMarket()">取消</el-button>
            <el-button
                v-if="isEditMode"
                type="primary"
                size="large"
                :loading="saving"
                @click="handleSaveEdit"
            >
              {{ saving ? '正在保存…' : '保存修改' }}
            </el-button>
            <el-button
                v-else
                type="primary"
                size="large"
                :loading="publishing"
                @click="handlePublish"
            >
              {{ publishing ? '正在发布…' : '发布商品' }}
            </el-button>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Delete, ArrowLeft, ArrowRight, Loading, Camera, PriceTag,
  Location, School, Collection, Shop, Promotion, CircleCheckFilled, Picture
} from '@element-plus/icons-vue'
import GoodsCard from '../components/GoodsCard.vue'
import { formatPrice } from '../utils/format'
import request from '../utils/request'

const route = useRoute()
const router = useRouter()

// =========================
// 双模式：/publish 新建 / /publish?id=26 编辑（复用同一套工作台）
// =========================

const editId = Number(route.query.id)
const isEditMode = computed(() => Number.isInteger(editId) && editId > 0)

// 编辑回填加载中（覆盖整个工作区）
const editLoading = ref(false)

const currentUserId = Number(localStorage.getItem('userId'))

// =========================
// 角色与页面状态
// =========================

const role = ref(localStorage.getItem('role') || '')
const username = ref(localStorage.getItem('username') || '同学')
const isSeller = computed(() => role.value === 'seller')

// 卖家申请被通过后，Layout 会派发 role-changed，无需刷新即可切换为工作台
const handleRoleChanged = (e) => {
  const nextRole = e?.detail || localStorage.getItem('role')
  if (nextRole) role.value = nextRole
}

// view：form 填写中 / success 发布成功
const view = ref('form')

// =========================
// 表单数据
// =========================

const MAX_IMAGES = 9
const DRAFT_KEY = 'campus_publish_draft'

const emptyForm = () => ({
  goodsName: '',
  categoryId: null,
  price: null,
  conditionLevel: null,
  campus: '',
  location: '',
  description: ''
})

const form = ref(emptyForm())

// 成色选项：与数据库 condition_level 约定一致（1=全新 … 5=8成新及以下）
const CONDITION_OPTIONS = [
  { value: 1, name: '全新', note: '带吊牌未使用' },
  { value: 2, name: '99新', note: '仅拆封' },
  { value: 3, name: '95新', note: '轻微使用痕迹' },
  { value: 4, name: '9成新', note: '正常使用痕迹' },
  { value: 5, name: '8成新及以下', note: '有明显痕迹' }
]

// =========================
// 分类与校区（真实接口数据）
// =========================

const categories = ref([])
const categoriesLoading = ref(false)
const categoriesError = ref(false)
const campuses = ref([])

const loadCategories = async () => {
  categoriesLoading.value = true
  categoriesError.value = false
  try {
    categories.value = await request.get('/categories') || []
  } catch (e) {
    categoriesError.value = true
  } finally {
    categoriesLoading.value = false
  }
}

// 校区复用首页公开接口的真实动态校区（数据库中实际有在售商品的校区）
const loadCampuses = async () => {
  try {
    const res = await request.get('/home/overview')
    campuses.value = Array.isArray(res?.campuses) ? res.campuses : []
  } catch (e) {
    campuses.value = []
  }
}

const toggleCampus = (c) => {
  form.value.campus = form.value.campus === c ? '' : c
}

// =========================
// 图片上传（真实上传：multipart → 文件系统 → URL）
// 复用项目既有上传链路，与 GoodsList 发布弹窗同一接口与判断方式
// =========================

const uploadFileList = ref([])

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

// 已上传成功的服务端 URL 列表（顺序即展示顺序，第一张为主图）
const uploadedUrls = computed(() =>
    uploadFileList.value
        .filter(f => f.status === 'success')
        .map(f => (f.response && f.response.url) ? f.response.url : f.url)
        .filter(Boolean)
)

// 上传前校验：类型白名单 + 5MB（后端 UploadController 有同规则兜底）
const beforeImageUpload = (file) => {
  const allowTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowTypes.includes(file.type)) {
    ElMessage.warning('仅支持 jpg / png / gif / webp 格式图片')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  return true
}

// 后端风格：HTTP 200 + {url} 或 {error}，按字段判断成败
const handleUploadSuccess = (response, uploadFile) => {
  if (response && response.url) {
    uploadFile.url = response.url
    return
  }
  const index = uploadFileList.value.findIndex(f => f.uid === uploadFile.uid)
  if (index > -1) uploadFileList.value.splice(index, 1)
  ElMessage.error((response && response.error) || '图片上传失败')
}

const handleUploadError = () => {
  ElMessage.error('图片上传失败，请检查网络后重试')
}

const isPrimary = (file) => {
  const first = uploadFileList.value.find(f => f.status === 'success')
  return first && first.uid === file.uid
}

// 图片排序：前移 / 后移（操作 file-list 顺序即最终 goods_image 顺序）
const moveImage = (file, offset) => {
  const i = uploadFileList.value.findIndex(f => f.uid === file.uid)
  const j = i + offset
  if (i < 0 || j < 0 || j >= uploadFileList.value.length) return
  const list = uploadFileList.value
  ;[list[i], list[j]] = [list[j], list[i]]
  uploadFileList.value = [...list]
}

const removeImage = (file) => {
  const i = uploadFileList.value.findIndex(f => f.uid === file.uid)
  if (i > -1) uploadFileList.value.splice(i, 1)
}

// =========================
// 实时预览（表单响应式 → GoodsCard 自动更新）
// =========================

const previewGoods = computed(() => ({
  goodsId: isEditMode.value ? editId : 0,
  goodsName: form.value.goodsName || '商品标题会显示在这里',
  description: form.value.description,
  price: form.value.price ?? 0,
  status: 1,
  viewCount: 0,
  favoriteCount: 0,
  conditionLevel: form.value.conditionLevel,
  campus: form.value.campus,
  location: form.value.location,
  createTime: new Date().toISOString(),
  imageUrl: uploadedUrls.value[0] || ''
}))

const previewCategoryName = computed(() => {
  const cat = categories.value.find(c => c.categoryId === form.value.categoryId)
  return cat ? cat.categoryName : ''
})

const missingFields = computed(() => {
  const missing = []
  if (!form.value.goodsName.trim()) missing.push('标题')
  if (!form.value.categoryId) missing.push('分类')
  if (form.value.price === null || form.value.price === '') missing.push('价格')
  if (!form.value.conditionLevel) missing.push('成色')
  if (!form.value.description.trim()) missing.push('描述')
  return missing
})

// =========================
// 草稿（localStorage，无数据库草稿字段，不做假）
// =========================

const saveDraft = () => {
  const draft = { ...form.value, imageUrls: uploadedUrls.value }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  ElMessage.success('已暂存到本地草稿，下次打开发布页可恢复')
}

const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

const restoreDraftIfAny = async () => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return

  let draft
  try {
    draft = JSON.parse(raw)
  } catch (e) {
    clearDraft()
    return
  }

  // 空草稿不打扰
  if (!draft || (!draft.goodsName && !draft.description)) return

  try {
    await ElMessageBox.confirm(
        '检测到你有一份未完成的发布草稿，是否恢复继续填写？',
        '恢复草稿',
        { confirmButtonText: '恢复草稿', cancelButtonText: '重新开始', type: 'info' }
    )
    form.value = { ...emptyForm(), ...draft }
    uploadFileList.value = (Array.isArray(draft.imageUrls) ? draft.imageUrls : [])
        .map((url, i) => ({ name: `图片${i + 1}`, url, status: 'success' }))
  } catch (e) {
    // 用户选择重新开始
    clearDraft()
  }
}

// =========================
// 发布（防重复提交 + 真实两步链路）
// =========================

const publishing = ref(false)
const publishedGoods = ref({ id: null, name: '', price: 0, imageUrl: '' })

const validate = () => {
  if (uploadFileList.value.some(f => f.status === 'uploading')) {
    ElMessage.warning('图片还在上传中，请稍候')
    return false
  }
  if (!form.value.goodsName.trim()) {
    ElMessage.warning('请填写商品标题')
    return false
  }
  if (!form.value.categoryId) {
    ElMessage.warning('请选择商品分类')
    return false
  }
  if (form.value.price === null || form.value.price === '') {
    ElMessage.warning('请填写商品价格')
    return false
  }
  if (Number(form.value.price) < 0) {
    ElMessage.warning('商品价格不能小于 0')
    return false
  }
  if (!form.value.conditionLevel) {
    ElMessage.warning('请选择新旧程度')
    return false
  }
  if (!form.value.description.trim()) {
    ElMessage.warning('请填写商品描述，帮助买家了解商品情况')
    return false
  }
  return true
}

const handlePublish = async () => {
  if (publishing.value || !validate()) return
  publishing.value = true

  try {
    // 第一步：创建商品主记录（卖家身份由后端 Token → AuthContext 认定，
    // 不携带任何前端 userId，防止身份伪造）
    const result = await request.post('/goods', {
      goodsName: form.value.goodsName.trim(),
      categoryId: form.value.categoryId,
      price: form.value.price,
      conditionLevel: form.value.conditionLevel,
      campus: form.value.campus || null,
      location: form.value.location.trim() || null,
      description: form.value.description.trim()
    })

    // 项目既有风格：HTTP 200 + 文本表达业务结果
    if (!String(result).startsWith('商品发布成功')) {
      ElMessage.error(result || '商品发布失败，请稍后再试')
      return
    }

    // 从返回文本解析新商品ID（与 GoodsList 发布逻辑同一约定）
    const match = String(result).match(/商品ID：(\d+)/)

    // 第二步：把已上传图片写入 goods_image（第一张自动为主图）
    if (match && uploadedUrls.value.length) {
      const imgResult = await request.post(`/goods/${match[1]}/images`, {
        imageUrls: uploadedUrls.value
      })
      if (imgResult !== '商品图片保存成功') {
        // 商品已创建成功，图片关联失败不阻断，但明确告知
        ElMessage.warning(imgResult || '商品已发布，但图片保存失败，可在店铺中编辑补充')
      }
    }

    publishedGoods.value = {
      id: match ? Number(match[1]) : null,
      name: form.value.goodsName.trim(),
      price: form.value.price,
      imageUrl: uploadedUrls.value[0] || ''
    }

    clearDraft()
    view.value = 'success'

  } catch (e) {
    // request.js 已按错误类型统一提示（401/403/5xx/网络错误）
  } finally {
    publishing.value = false
  }
}

// =========================
// 编辑模式：回填（商品信息 + 全部图片）与保存
// =========================

// 进入 /publish?id=N：拉取商品详情与图片列表回填工作台
const loadEditGoods = async () => {
  editLoading.value = true

  try {
    const [g, imgs] = await Promise.all([
      request.get(`/goods/${editId}`),
      request.get(`/goods/${editId}/images`).catch(() => [])
    ])

    if (!g || !g.goodsId) {
      ElMessage.error('商品不存在或已被删除')
      router.replace('/seller')
      return
    }

    // 前端体验层校验：别人的商品直接劝退；
    // 真正的越权拦截在后端 PUT /goods 与图片接口的 checkOwnership（知道商品ID也改不了）
    if (g.userId !== currentUserId) {
      ElMessage.error('只能编辑自己发布的商品')
      router.replace('/seller')
      return
    }

    form.value = {
      goodsName: g.goodsName || '',
      categoryId: g.categoryId ?? null,
      price: g.price !== null && g.price !== undefined ? Number(g.price) : null,
      conditionLevel: g.conditionLevel ?? null,
      campus: g.campus || '',
      location: g.location || '',
      description: g.description || ''
    }

    // 已有图片回填为上传成功态条目，与刚上传的图片同一套排序/删除/主图交互
    uploadFileList.value = (Array.isArray(imgs) ? imgs : []).map((url, i) => ({
      name: `图片${i + 1}`,
      url,
      status: 'success'
    }))
  } catch (e) {
    ElMessage.error('商品信息加载失败，请稍后再试')
    router.replace('/seller')
  } finally {
    editLoading.value = false
  }
}

const saving = ref(false)

// 保存编辑：PUT 更新商品主记录 → 图片全量替换（先删后插幂等，第一张自动主图）
const handleSaveEdit = async () => {
  if (saving.value || !validate()) return
  saving.value = true

  try {
    const result = await request.put('/goods', {
      goodsId: editId,
      goodsName: form.value.goodsName.trim(),
      categoryId: form.value.categoryId,
      price: form.value.price,
      conditionLevel: form.value.conditionLevel,
      campus: form.value.campus || null,
      location: form.value.location.trim() || null,
      description: form.value.description.trim()
    })

    // 项目既有风格：HTTP 200 + 文本表达业务结果（越权时文本为拒绝原因）
    if (result !== '商品修改成功') {
      ElMessage.error(result || '商品保存失败，请稍后再试')
      return
    }

    // 图片全量替换：上传列表即最终形态（删除+新增+排序一次生效）；
    // 空数组也是合法意图（删光图片），后端先删后插 0 条
    const imgResult = await request.post(`/goods/${editId}/images`, {
      imageUrls: uploadedUrls.value
    })

    if (imgResult !== '商品图片保存成功') {
      ElMessage.warning(imgResult || '商品信息已保存，但图片保存失败，请再次保存')
    } else {
      ElMessage.success('商品修改成功')
    }

    // 保存后回到商品详情，立刻看到最新效果
    router.push(`/goods/${editId}`)
  } catch (e) {
    // request.js 已按错误类型统一提示（401/403/5xx/网络错误）
  } finally {
    saving.value = false
  }
}

// =========================
// 成功页动作
// =========================

const goPublishedDetail = () => {
  if (publishedGoods.value.id) {
    router.push(`/goods/${publishedGoods.value.id}`)
  } else {
    router.push('/goods')
  }
}

const resetForNext = () => {
  form.value = emptyForm()
  uploadFileList.value = []
  view.value = 'form'
}

// 庆祝粒子样式（品牌暖色系：浅粉/浅黄/奶杏/灰蓝）
const CONFETTI_COLORS = ['#d8a8ad', '#c9a85c', '#e8c9a0', '#a8b8c4', '#f0dee0', '#f5edd6']
const confettiStyle = (n) => {
  const seed = n * 137.5
  return {
    left: `${(seed * 7) % 100}%`,
    animationDelay: `${(n % 14) * 0.12}s`,
    animationDuration: `${2.6 + (n % 5) * 0.35}s`,
    background: CONFETTI_COLORS[n % CONFETTI_COLORS.length]
  }
}

// =========================
// 导航
// =========================

const goMarket = () => router.push('/goods')
const goSeller = () => router.push('/seller')
const goSellerApply = () => router.push('/seller-apply')

onMounted(async () => {
  window.addEventListener('role-changed', handleRoleChanged)
  loadCategories()
  loadCampuses()

  // 编辑模式：回填数据库中的商品，与本地草稿是两个互不干扰的场景
  if (isEditMode.value) {
    await loadEditGoods()
    return
  }

  await restoreDraftIfAny()
})

onBeforeUnmount(() => {
  window.removeEventListener('role-changed', handleRoleChanged)
})
</script>

<style scoped>
.publish-page {
  min-height: 100%;
  padding-bottom: 96px; /* 给底部操作条让位 */
}

/* ==================== Hero ==================== */

.hero {
  position: relative;
  border-radius: var(--brand-radius-lg);
  overflow: hidden;
  padding: 38px 36px;
  background: linear-gradient(118deg, #f9e7e9 0%, #fdf0dc 52%, #fdf6e3 100%);
  box-shadow: var(--brand-shadow-sm);
}

.hero__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(46px);
  opacity: 0.55;
  pointer-events: none;
}

.hero__blob--pink {
  width: 260px;
  height: 260px;
  right: 12%;
  top: -110px;
  background: #f2cdd1;
}

.hero__blob--butter {
  width: 220px;
  height: 220px;
  right: -60px;
  bottom: -120px;
  background: #f3e2b8;
}

.hero__inner {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.hero__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--brand-primary-active);
}

.hero__title {
  margin: 10px 0 6px;
  font-size: 30px;
  font-weight: 700;
  color: var(--brand-text);
}

.hero__sub {
  margin: 0;
  font-size: 14px;
  color: var(--brand-text-regular);
}

.hero__tips {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero__tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  color: var(--brand-text-regular);
  box-shadow: var(--brand-shadow-sm);
}

.hero__user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--brand-shadow-sm);
  flex-shrink: 0;
}

.hero__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--brand-sidebar-gradient);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero__user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
}

.hero__user-role {
  font-size: 11px;
  color: var(--brand-accent);
  font-weight: 600;
}

/* ==================== 主区布局 ==================== */

.workspace {
  margin-top: 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 22px;
  align-items: start;
}

.workspace__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

/* ==================== 面板 ==================== */

.panel {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  padding: 22px 24px;
}

.panel__head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.panel__step {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--brand-primary-soft), var(--brand-accent-soft));
  color: var(--brand-primary-active);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--brand-text);
}

.panel__desc {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.panel__count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--brand-text-secondary);
  font-variant-numeric: tabular-nums;
}

.panel__hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

/* ==================== 上传区 ==================== */

:deep(.el-upload--picture-card) {
  border-radius: var(--brand-radius);
  border: 1.5px dashed var(--brand-border);
  background: var(--brand-bg);
  transition: border-color 0.2s ease;
}

:deep(.el-upload--picture-card:hover) {
  border-color: var(--brand-primary);
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  border-radius: var(--brand-radius);
  border: none;
  overflow: hidden;
}

.hide-add :deep(.el-upload--picture-card) {
  display: none;
}

.upl {
  position: relative;
  width: 100%;
  height: 100%;
}

.upl__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.upl__mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: var(--brand-text-regular);
}

.upl__primary {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--brand-accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.upl__ops {
  position: absolute;
  inset: auto 0 0 0;
  padding: 18px 6px 6px;
  display: flex;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(transparent, rgba(74, 69, 72, 0.55));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.upl:hover .upl__ops {
  opacity: 1;
}

.upl__ops .el-icon {
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.upl__ops .el-icon:hover {
  transform: scale(1.2);
}

/* ==================== 表单字段 ==================== */

.field {
  margin-bottom: 18px;
}

.field:last-child {
  margin-bottom: 0;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-regular);
}

.field__label i {
  color: #d3766b;
  font-style: normal;
  margin-left: 2px;
}

.field__error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #d3766b;
}

/* 选择 pills（成色 / 校区） */
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pill {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  border: 1.5px solid var(--brand-border);
  border-radius: var(--brand-radius);
  background: var(--brand-white);
  cursor: pointer;
  transition: all 0.18s ease;
}

.pill__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text);
}

.pill__note {
  font-size: 11px;
  color: var(--brand-text-secondary);
}

.pill:hover {
  border-color: var(--brand-primary);
}

.pill--active {
  border-color: var(--brand-primary);
  background: var(--brand-primary-soft);
  box-shadow: 0 2px 8px rgba(216, 168, 173, 0.25);
}

.pill--active .pill__name {
  color: var(--brand-primary-active);
}

.pill--campus {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-regular);
}

.pill--campus.pill--active {
  color: var(--brand-primary-active);
}

/* ==================== 实时预览 ==================== */

.workspace__preview {
  position: sticky;
  top: 0;
}

.preview {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  padding: 18px;
}

.preview__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
}

.preview__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7d9d7a;
  animation: pulse 1.6s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.preview__en {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.6px;
  color: var(--brand-text-secondary);
}

.preview__tip {
  margin: 6px 0 14px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

/* 预览卡禁用交互：goodsId 为 0，避免误跳详情 */
.preview__card {
  pointer-events: none;
}

.preview__missing {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg-soft);
  font-size: 12px;
  color: var(--brand-text-regular);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.preview__missing-item {
  padding: 2px 8px;
  border-radius: 8px;
  background: var(--brand-white);
  color: var(--brand-accent-hover);
  font-weight: 600;
}

.preview__ready {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #7d9d7a;
}

/* ==================== 底部操作条 ==================== */

.actionbar {
  position: fixed;
  left: 224px; /* 与 Layout 侧边栏同宽 */
  right: 0;
  bottom: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--brand-border);
}

.actionbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 26px;
}

.actionbar__draft {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--brand-text-regular);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--brand-radius-sm);
  transition: all 0.18s ease;
}

.actionbar__draft:hover {
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

.actionbar__edit-hint {
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.actionbar__right {
  display: flex;
  gap: 12px;
}

@media (max-width: 860px) {
  .actionbar {
    left: 72px; /* 窄屏侧边栏收窄 */
  }
}

/* ==================== 学生引导态 ==================== */

.gate {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate__card {
  max-width: 560px;
  width: 100%;
  text-align: center;
  background: var(--brand-white);
  border-radius: var(--brand-radius-xl);
  box-shadow: var(--brand-shadow);
  padding: 44px 40px;
}

.gate__badge {
  width: 72px;
  height: 72px;
  margin: 0 auto;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--brand-primary-soft), var(--brand-accent-soft));
  color: var(--brand-primary-active);
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate__title {
  margin: 20px 0 10px;
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-text);
}

.gate__desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.gate__steps {
  margin: 26px 0 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.gate__step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
  font-size: 12.5px;
  color: var(--brand-text-regular);
}

.gate__no {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.gate__arrow {
  color: var(--brand-text-secondary);
}

.gate__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* ==================== 发布成功态 ==================== */

.success {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.confetti__dot {
  position: absolute;
  top: -12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  opacity: 0;
  animation: confetti-fall linear infinite;
}

@keyframes confetti-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  8% { opacity: 0.9; }
  100% { transform: translateY(78vh) rotate(320deg); opacity: 0; }
}

.success__card {
  position: relative;
  max-width: 520px;
  width: 100%;
  text-align: center;
  background: var(--brand-white);
  border-radius: var(--brand-radius-xl);
  box-shadow: var(--brand-shadow-lg);
  padding: 44px 40px;
}

.success__check {
  width: 76px;
  height: 76px;
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #e6f0e4, #d4e5d1);
  color: #7d9d7a;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.success__title {
  margin: 18px 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--brand-text);
}

.success__sub {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.success__goods {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg-soft);
  text-align: left;
}

.success__cover {
  width: 72px;
  height: 72px;
  border-radius: var(--brand-radius);
  overflow: hidden;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.success__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.success__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.success__meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.success__meta .price-text {
  font-size: 18px;
}

.success__id {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.success__actions {
  margin-top: 26px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ==================== 响应式 ==================== */

@media (max-width: 1080px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .workspace__preview {
    position: static;
    order: -1; /* 小屏预览在上，随时看到效果 */
  }

  .preview__card {
    max-width: 340px;
  }
}

@media (max-width: 720px) {
  .hero {
    padding: 28px 22px;
  }

  .hero__inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .field-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .panel {
    padding: 18px;
  }
}
</style>
