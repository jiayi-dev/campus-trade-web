<template>
  <!--
    /goods/publish 商品发布向导（V1.2 新增独立页面，四步创作流）

    与既有 /publish 单页工作台并存，互不影响：
    - /publish        ：一页式填写（已有，保持稳定）
    - /goods/publish  ：分步向导（本页），强调创作引导与逐步校验

    真实业务链路（全部复用既有接口，无模拟成功）：
      分类：GET  /categories
      校区：GET  /home/overview  → campuses（真实在售校区）
      图片：POST /upload/image   → { url }
      发布：POST /goods          → 文本"商品发布成功，商品ID：N"
      关联：POST /goods/{id}/images → 文本"商品图片保存成功"
    草稿：仅 localStorage 本地草稿（数据库无草稿字段），页面明确标注为本地暂存
  -->
  <div class="wizard-page">

    <!-- ==================== 角色门禁 ==================== -->
    <div v-if="!isSeller" class="gate">
      <div class="gate__card">
        <div class="gate__badge"><el-icon><Shop /></el-icon></div>
        <h2 class="gate__title">成为卖家后即可发布商品</h2>
        <p class="gate__desc">
          发布向导面向具备卖家身份的同学开放。提交申请并通过管理员审核后，
          就能用这套向导一步步把闲置物品上架给全校同学。
        </p>
        <div class="gate__actions">
          <el-button type="primary" size="large" @click="router.push('/seller-apply')">
            <el-icon><Promotion /></el-icon>申请成为卖家
          </el-button>
          <el-button size="large" @click="router.push('/goods')">先去逛逛市场</el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 发布成功 ==================== -->
    <div v-else-if="view === 'success'" class="done">
      <div class="done__card">
        <div class="done__check"><el-icon><CircleCheckFilled /></el-icon></div>
        <h2 class="done__title">发布完成</h2>
        <p class="done__sub">你的闲置已上架，正在等待校园里的下一位主人</p>
        <div class="done__goods">
          <div class="done__cover">
            <img v-if="published.imageUrl" :src="published.imageUrl" alt="商品主图" />
            <el-icon v-else><Picture /></el-icon>
          </div>
          <div class="done__info">
            <div class="done__name">{{ published.name }}</div>
            <div class="done__meta">
              <span class="price-text">{{ formatPrice(published.price) }}</span>
              <span class="done__id">编号 #{{ published.id }}</span>
            </div>
          </div>
        </div>
        <div class="done__actions">
          <el-button type="primary" size="large" @click="goDetail">
            查看商品<el-icon><ArrowRight /></el-icon>
          </el-button>
          <el-button size="large" @click="resetAll">再发一件</el-button>
          <el-button size="large" text @click="router.push('/goods')">返回市场</el-button>
        </div>
      </div>
    </div>

    <!-- ==================== 向导主体 ==================== -->
    <template v-else>
      <!-- 顶部进度条 -->
      <header class="wz-header">
        <div class="wz-header__copy">
          <span class="wz-header__eyebrow">PUBLISH WIZARD · 发布向导</span>
          <h1 class="wz-header__title">把闲置讲成一个好故事</h1>
          <p class="wz-header__sub">四步完成，右侧实时预览买家看到的样子</p>
        </div>
        <button class="wz-header__draft" type="button" @click="saveDraft">
          <el-icon><Collection /></el-icon>本地暂存草稿
        </button>
      </header>

      <!-- 步骤进度 -->
      <div class="stepper">
        <button
            v-for="(s, i) in STEPS"
            :key="s.key"
            type="button"
            class="stepper__item"
            :class="{
              'stepper__item--active': i === stepIndex,
              'stepper__item--done': i < stepIndex
            }"
            @click="goStep(i)"
        >
          <span class="stepper__dot">
            <el-icon v-if="i < stepIndex"><Check /></el-icon>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="stepper__text">
            <span class="stepper__name">{{ s.title }}</span>
            <span class="stepper__desc">{{ s.desc }}</span>
          </span>
        </button>
        <div class="stepper__bar">
          <div class="stepper__bar-fill" :style="{ width: progressWidth }"></div>
        </div>
      </div>

      <div class="wz-body">
        <!-- 左：当前步骤表单 -->
        <div class="wz-panel">

          <!-- 步骤 1：基本信息 -->
          <section v-show="stepIndex === 0" class="wz-step">
            <h3 class="wz-step__title">先说说这是什么</h3>
            <p class="wz-step__hint">标题与分类决定买家能不能搜到你</p>

            <div class="field">
              <label class="field__label">商品标题<i>*</i></label>
              <el-input
                  v-model="form.goodsName"
                  maxlength="30"
                  show-word-limit
                  placeholder="如：95新《数据结构》考研教材（含习题解析）"
              />
            </div>

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
              <p v-if="categoriesError" class="field__error">分类加载失败，请刷新重试</p>
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
          </section>

          <!-- 步骤 2：图片与描述 -->
          <section v-show="stepIndex === 1" class="wz-step">
            <h3 class="wz-step__title">用图片和文字打动买家</h3>
            <p class="wz-step__hint">第一张图片将作为列表封面主图</p>

            <div class="field">
              <label class="field__label">商品图片（{{ uploadedUrls.length }}/{{ MAX_IMAGES }}）</label>
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
              <p class="field__tip">支持 jpg / png / gif / webp，单张不超过 5MB，最多 {{ MAX_IMAGES }} 张</p>
            </div>

            <div class="field">
              <label class="field__label">商品描述<i>*</i></label>
              <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="6"
                  maxlength="500"
                  show-word-limit
                  placeholder="使用多久、有无瑕疵、配件是否齐全、可否当面验货…写清楚更容易成交"
              />
            </div>
          </section>

          <!-- 步骤 3：交易信息 -->
          <section v-show="stepIndex === 2" class="wz-step">
            <h3 class="wz-step__title">约定价格与见面地点</h3>
            <p class="wz-step__hint">合理的定价与清晰的见面点能减少沟通成本</p>

            <div class="field">
              <label class="field__label">商品价格（元）<i>*</i></label>
              <el-input-number
                  v-model="form.price"
                  :min="0"
                  :max="999999.99"
                  :precision="2"
                  controls-position="right"
                  placeholder="0.00"
                  style="width: 100%"
              />
              <div class="price-tip">
                <span>参考：同分类均价</span>
                <span class="price-tip__val">{{ avgPriceText }}</span>
              </div>
            </div>

            <div class="field">
              <label class="field__label">交易校区</label>
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
              <el-input v-else v-model="form.campus" maxlength="20" placeholder="填写你所在的校区或区域" />
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

          <!-- 步骤 4：确认发布 -->
          <section v-show="stepIndex === 3" class="wz-step">
            <h3 class="wz-step__title">核对无误后发布</h3>
            <p class="wz-step__hint">发布后商品会立即出现在商品中心</p>

            <div class="confirm">
              <div class="confirm__row">
                <span class="confirm__k">标题</span>
                <span class="confirm__v">{{ form.goodsName || '—' }}</span>
              </div>
              <div class="confirm__row">
                <span class="confirm__k">分类</span>
                <span class="confirm__v">{{ previewCategoryName || '—' }}</span>
              </div>
              <div class="confirm__row">
                <span class="confirm__k">成色</span>
                <span class="confirm__v">{{ conditionText || '—' }}</span>
              </div>
              <div class="confirm__row">
                <span class="confirm__k">价格</span>
                <span class="confirm__v price-text">{{ formatPrice(form.price ?? 0) }}</span>
              </div>
              <div class="confirm__row">
                <span class="confirm__k">校区 / 面交</span>
                <span class="confirm__v">{{ [form.campus, form.location].filter(Boolean).join(' · ') || '—' }}</span>
              </div>
              <div class="confirm__row confirm__row--desc">
                <span class="confirm__k">描述</span>
                <span class="confirm__v">{{ form.description || '—' }}</span>
              </div>
              <div class="confirm__row">
                <span class="confirm__k">图片</span>
                <span class="confirm__v">{{ uploadedUrls.length }} 张</span>
              </div>
            </div>

            <div v-if="missingFields.length" class="confirm__missing">
              还需完善：{{ missingFields.join('、') }}
            </div>
          </section>

          <!-- 步骤操作条 -->
          <div class="wz-actions">
            <el-button v-if="stepIndex > 0" size="large" @click="prevStep">上一步</el-button>
            <el-button v-else size="large" @click="router.push('/goods')">取消</el-button>

            <div class="wz-actions__right">
              <el-button
                  v-if="stepIndex < STEPS.length - 1"
                  type="primary"
                  size="large"
                  @click="nextStep"
              >
                下一步<el-icon><ArrowRight /></el-icon>
              </el-button>
              <el-button
                  v-else
                  type="primary"
                  size="large"
                  :loading="publishing"
                  :disabled="missingFields.length > 0"
                  @click="handlePublish"
              >
                {{ publishing ? '正在发布…' : '确认发布' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 右：实时预览 -->
        <aside class="wz-preview">
          <div class="preview">
            <div class="preview__head">
              <span class="preview__dot"></span>实时预览
              <span class="preview__en">LIVE</span>
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
            <div v-if="missingFields.length" class="preview__missing">
              <span class="preview__missing-label">发布前还需完善：</span>
              <span v-for="m in missingFields" :key="m" class="preview__missing-item">{{ m }}</span>
            </div>
            <div v-else class="preview__ready">
              <el-icon><CircleCheckFilled /></el-icon>信息已就绪，可以发布
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Delete, ArrowLeft, ArrowRight, Loading, School, Collection,
  Shop, Promotion, CircleCheckFilled, Picture, Check
} from '@element-plus/icons-vue'
import GoodsCard from '../components/GoodsCard.vue'
import { formatPrice } from '../utils/format'
import request from '../utils/request'

const router = useRouter()

// =========================
// 角色与视图状态
// =========================

const role = ref(localStorage.getItem('role') || '')
const isSeller = computed(() => role.value === 'seller')
const view = ref('form') // form | success

const handleRoleChanged = (e) => {
  const nextRole = e?.detail || localStorage.getItem('role')
  if (nextRole) role.value = nextRole
}

// =========================
// 步骤定义
// =========================

const STEPS = [
  { key: 'basic', title: '基本信息', desc: '标题 / 分类 / 成色' },
  { key: 'media', title: '图片与描述', desc: '实拍图 + 文字' },
  { key: 'trade', title: '交易信息', desc: '价格 / 校区 / 面交' },
  { key: 'confirm', title: '确认发布', desc: '核对后上架' }
]

const stepIndex = ref(0)

const progressWidth = computed(() =>
    `${((stepIndex.value + 1) / STEPS.length) * 100}%`
)

// 各步骤的必填校验，Next 按钮按步骤拦截
const stepValidators = [
  () => {
    if (!form.value.goodsName.trim()) return '请填写商品标题'
    if (!form.value.categoryId) return '请选择商品分类'
    if (!form.value.conditionLevel) return '请选择新旧程度'
    return ''
  },
  () => {
    if (!form.value.description.trim()) return '请填写商品描述'
    if (uploadFileList.value.some(f => f.status === 'uploading')) return '图片还在上传中，请稍候'
    return ''
  },
  () => {
    if (form.value.price === null || form.value.price === '') return '请填写商品价格'
    if (Number(form.value.price) < 0) return '商品价格不能小于 0'
    return ''
  },
  () => ''
]

const nextStep = () => {
  const err = stepValidators[stepIndex.value]()
  if (err) {
    ElMessage.warning(err)
    return
  }
  if (stepIndex.value < STEPS.length - 1) stepIndex.value += 1
}

const prevStep = () => {
  if (stepIndex.value > 0) stepIndex.value -= 1
}

// 点击进度条跳转：只允许回退到已完成步骤，或前进到已通过校验的下一步
const goStep = (i) => {
  if (i <= stepIndex.value) {
    stepIndex.value = i
    return
  }
  // 前向跳转：必须逐步通过前面所有步骤的校验
  for (let k = stepIndex.value; k < i; k++) {
    const err = stepValidators[k]()
    if (err) {
      ElMessage.warning(err)
      stepIndex.value = k
      return
    }
  }
  stepIndex.value = i
}

// =========================
// 表单数据
// =========================

const MAX_IMAGES = 9
const DRAFT_KEY = 'campus_publish_wizard_draft'

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

const CONDITION_OPTIONS = [
  { value: 1, name: '全新', note: '带吊牌未使用' },
  { value: 2, name: '99新', note: '仅拆封' },
  { value: 3, name: '95新', note: '轻微使用痕迹' },
  { value: 4, name: '9成新', note: '正常使用痕迹' },
  { value: 5, name: '8成新及以下', note: '有明显痕迹' }
]

const conditionText = computed(() => {
  const c = CONDITION_OPTIONS.find(o => o.value === form.value.conditionLevel)
  return c ? c.name : ''
})

// =========================
// 分类 / 校区 / 均价（真实接口）
// =========================

const categories = ref([])
const categoriesLoading = ref(false)
const categoriesError = ref(false)
const campuses = ref([])
// 分类平均价格：GET /goods/categoryAvg（真实聚合数据，仅作定价参考）
const categoryAvg = ref([])

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

const loadCampuses = async () => {
  try {
    const res = await request.get('/home/overview')
    campuses.value = Array.isArray(res?.campuses) ? res.campuses : []
  } catch (e) {
    campuses.value = []
  }
}

const loadCategoryAvg = async () => {
  try {
    const res = await request.get('/goods/categoryAvg')
    categoryAvg.value = Array.isArray(res) ? res : []
  } catch (e) {
    categoryAvg.value = []
  }
}

// 当前分类的均价（用于定价参考；无数据时显示 —）
const avgPriceText = computed(() => {
  const row = categoryAvg.value.find(r =>
      Number(r.categoryId) === Number(form.value.categoryId))
  const v = row && (row.avgPrice ?? row.avg_price)
  return v !== null && v !== undefined && v !== '' ? formatPrice(Number(v)) : '暂无数据'
})

const toggleCampus = (c) => {
  form.value.campus = form.value.campus === c ? '' : c
}

// =========================
// 图片上传（真实上传链路，与 /publish 同一接口）
// =========================

const uploadFileList = ref([])

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const uploadedUrls = computed(() =>
    uploadFileList.value
        .filter(f => f.status === 'success')
        .map(f => (f.response && f.response.url) ? f.response.url : f.url)
        .filter(Boolean)
)

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
// 实时预览与完整性校验
// =========================

const previewGoods = computed(() => ({
  goodsId: 0,
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
// 本地草稿（localStorage，明确标注为本地暂存，非服务器持久化）
// =========================

const saveDraft = () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    ...form.value,
    imageUrls: uploadedUrls.value
  }))
  ElMessage.success('已暂存到本地草稿（仅当前浏览器可见，未上传服务器）')
}

const restoreDraftIfAny = async () => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return
  let draft
  try {
    draft = JSON.parse(raw)
  } catch (e) {
    localStorage.removeItem(DRAFT_KEY)
    return
  }
  if (!draft || (!draft.goodsName && !draft.description)) return
  try {
    await ElMessageBox.confirm(
        '检测到一份未完成的本地草稿，是否恢复继续填写？',
        '恢复草稿',
        { confirmButtonText: '恢复草稿', cancelButtonText: '重新开始', type: 'info' }
    )
    form.value = { ...emptyForm(), ...draft }
    uploadFileList.value = (Array.isArray(draft.imageUrls) ? draft.imageUrls : [])
        .map((url, i) => ({ name: `图片${i + 1}`, url, status: 'success' }))
  } catch (e) {
    localStorage.removeItem(DRAFT_KEY)
  }
}

// =========================
// 发布（真实两步链路：POST /goods → POST /goods/{id}/images）
// =========================

const publishing = ref(false)
const published = ref({ id: null, name: '', price: 0, imageUrl: '' })

const handlePublish = async () => {
  if (publishing.value) return
  if (missingFields.value.length) {
    ElMessage.warning('还有信息未完善：' + missingFields.value.join('、'))
    return
  }
  publishing.value = true

  try {
    const result = await request.post('/goods', {
      goodsName: form.value.goodsName.trim(),
      categoryId: form.value.categoryId,
      price: form.value.price,
      conditionLevel: form.value.conditionLevel,
      campus: form.value.campus || null,
      location: form.value.location.trim() || null,
      description: form.value.description.trim()
    })

    if (!String(result).startsWith('商品发布成功')) {
      ElMessage.error(result || '商品发布失败，请稍后再试')
      return
    }

    const match = String(result).match(/商品ID：(\d+)/)

    if (match && uploadedUrls.value.length) {
      const imgResult = await request.post(`/goods/${match[1]}/images`, {
        imageUrls: uploadedUrls.value
      })
      if (imgResult !== '商品图片保存成功') {
        ElMessage.warning(imgResult || '商品已发布，但图片保存失败，可在店铺中编辑补充')
      }
    }

    published.value = {
      id: match ? Number(match[1]) : null,
      name: form.value.goodsName.trim(),
      price: form.value.price,
      imageUrl: uploadedUrls.value[0] || ''
    }

    localStorage.removeItem(DRAFT_KEY)
    view.value = 'success'
  } catch (e) {
    // request.js 已统一提示
  } finally {
    publishing.value = false
  }
}

const goDetail = () => {
  if (published.value.id) router.push(`/goods/${published.value.id}`)
  else router.push('/goods')
}

const resetAll = () => {
  form.value = emptyForm()
  uploadFileList.value = []
  stepIndex.value = 0
  view.value = 'form'
}

onMounted(async () => {
  window.addEventListener('role-changed', handleRoleChanged)
  loadCategories()
  loadCampuses()
  loadCategoryAvg()
  if (isSeller.value) await restoreDraftIfAny()
})

onBeforeUnmount(() => {
  window.removeEventListener('role-changed', handleRoleChanged)
})
</script>

<style scoped>
.wizard-page {
  min-height: 100%;
  padding-bottom: 24px;
}

/* ==================== 顶部 ==================== */
.wz-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 28px;
  border-radius: var(--brand-radius-lg);
  background: linear-gradient(120deg, #fbeef0 0%, #fdf3e4 55%, #fbf6f0 100%);
  box-shadow: var(--brand-shadow-sm);
}

.wz-header__eyebrow {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--brand-primary-active);
}

.wz-header__title {
  margin: 8px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: var(--brand-text);
}

.wz-header__sub {
  margin: 0;
  font-size: 13px;
  color: var(--brand-text-regular);
}

.wz-header__draft {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid var(--brand-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 12.5px;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.wz-header__draft:hover {
  color: var(--brand-primary-active);
  border-color: var(--brand-primary);
}

/* ==================== 步骤进度 ==================== */
.stepper {
  position: relative;
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 16px 18px;
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
}

.stepper__item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  border-radius: var(--brand-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease;
}

.stepper__item:hover {
  background: var(--brand-bg-soft);
}

.stepper__dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--brand-bg-soft);
  color: var(--brand-text-secondary);
  transition: all 0.2s ease;
}

.stepper__item--active .stepper__dot {
  background: var(--brand-primary);
  color: #fff;
  box-shadow: 0 3px 10px rgba(216, 168, 173, 0.4);
}

.stepper__item--done .stepper__dot {
  background: #e3efe0;
  color: #6f9369;
}

.stepper__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stepper__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-regular);
}

.stepper__item--active .stepper__name {
  color: var(--brand-text);
}

.stepper__desc {
  font-size: 11px;
  color: var(--brand-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stepper__bar {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 8px;
  height: 3px;
  border-radius: 3px;
  background: var(--brand-bg-soft);
  overflow: hidden;
}

.stepper__bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-accent));
  transition: width 0.3s ease;
}

/* ==================== 主体 ==================== */
.wz-body {
  margin-top: 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
  align-items: start;
}

.wz-panel {
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  padding: 24px 26px;
}

.wz-step {
  animation: step-in 0.26s ease both;
}

@keyframes step-in {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.wz-step__title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-text);
}

.wz-step__hint {
  margin: 0 0 20px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

/* ==================== 字段 ==================== */
.field {
  margin-bottom: 18px;
}

.field:last-child {
  margin-bottom: 0;
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

.field__tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.field__error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #d3766b;
}

/* 成色 pills */
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

/* 定价参考 */
.price-tip {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.price-tip__val {
  font-weight: 700;
  color: var(--brand-accent);
  font-variant-numeric: tabular-nums;
}

/* ==================== 上传 ==================== */
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
}

/* ==================== 确认页 ==================== */
.confirm {
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  overflow: hidden;
}

.confirm__row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--brand-border);
  font-size: 13px;
}

.confirm__row:last-child {
  border-bottom: none;
}

.confirm__row--desc .confirm__v {
  white-space: pre-wrap;
}

.confirm__k {
  color: var(--brand-text-secondary);
}

.confirm__v {
  color: var(--brand-text);
  font-weight: 500;
  word-break: break-word;
}

.confirm__missing {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: var(--brand-radius);
  background: #fdf1e8;
  color: #b8763f;
  font-size: 12.5px;
  font-weight: 600;
}

/* ==================== 操作条 ==================== */
.wz-actions {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.wz-actions__right {
  display: flex;
  gap: 12px;
}

/* ==================== 预览 ==================== */
.wz-preview {
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

/* ==================== 门禁 / 成功态 ==================== */
.gate,
.done {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate__card,
.done__card {
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
  margin: 0 0 26px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.gate__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.done__check {
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

.done__title {
  margin: 18px 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--brand-text);
}

.done__sub {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.done__goods {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg-soft);
  text-align: left;
}

.done__cover {
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

.done__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.done__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.done__meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.done__meta .price-text {
  font-size: 18px;
}

.done__id {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.done__actions {
  margin-top: 26px;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ==================== 响应式 ==================== */
@media (max-width: 1080px) {
  .wz-body {
    grid-template-columns: 1fr;
  }

  .wz-preview {
    position: static;
    order: -1;
  }

  .preview__card {
    max-width: 340px;
  }
}

@media (max-width: 860px) {
  .stepper {
    grid-template-columns: repeat(2, 1fr);
  }

  .stepper__desc {
    display: none;
  }
}

@media (max-width: 720px) {
  .wz-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .wz-panel {
    padding: 18px;
  }
}
</style>
