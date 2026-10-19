<template>
  <!--
    校园求购市场（单组件承载「需求广场 + 求购详情」）
    路由：/wanted 与 /wanted/:wantedId（可选参数切换详情视图）
    视觉定位：校园公告墙 + 社区需求流（便签瀑布流），与商品列表的电商网格版式完全不同。

    真实接口（无任何假数据；成功/失败都按后端返回文本判定）：
      GET  /wanted/page            需求广场分页（keyword/categoryId/campus/budgetMax/sortBy/status/pageNum/pageSize）
      GET  /wanted/{id}            单条求购（不存在返回 null）
      POST /wanted                 发布求购
      PUT  /wanted                 更新求购（仅本人）
      PUT  /wanted/{id}/status     关闭求购（status=2，仅本人）
      GET  /wanted/{id}/responses  响应列表
      POST /wanted/{id}/responses  提交响应
      GET  /categories             分类字典
      GET  /home/overview          真实校区列表（campuses）

    注意：求购接口依赖数据库表，需先手动执行 campus-trade/sql/v1.2-wanted.sql；
          接口失败时页面会给出明确的服务端未就绪横幅，不做假数据兜底。
  -->
  <div class="wanted-page">

    <!-- ==================== 列表视图：需求广场 ==================== -->
    <template v-if="!isDetailMode">

      <!-- 1. 公告墙头部 -->
      <section class="board-hero">
        <span class="board-hero__tape"></span>
        <div class="board-hero__copy">
          <span class="board-hero__eyebrow">WANTED BOARD · 校园求购墙</span>
          <h1 class="board-hero__title">说说你想买什么</h1>
          <p class="board-hero__sub">把需求贴出来，让有货的同学找到你</p>
        </div>
        <div class="board-hero__stat">
          <span class="board-hero__stat-num is-num">{{ activeTotal === null ? '—' : activeTotal }}</span>
          <span class="board-hero__stat-label">进行中的求购</span>
        </div>
      </section>

      <!-- 2. 服务端未就绪提示（仅列表接口失败时出现，不做假数据兜底） -->
      <div v-if="loadError" class="setup-banner">
        <el-icon class="setup-banner__icon"><WarningFilled /></el-icon>
        <div class="setup-banner__body">
          <div class="setup-banner__title">求购服务端尚未就绪</div>
          <div class="setup-banner__desc">
            需要先手动执行 sql/v1.2-wanted.sql 初始化表结构，求购接口才可用。
          </div>
        </div>
      </div>

      <!-- 3. 筛选区 -->
      <section class="filters">
        <div class="filters__row filters__row--top">
          <el-input
              v-model="keyword"
              class="filters__search"
              placeholder="搜索求购标题，如「显示器」「自行车」"
              clearable
              :prefix-icon="Search"
              @input="onKeywordInput"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
          />

          <el-select
              v-model="categoryId"
              class="filters__select"
              placeholder="全部品类"
              clearable
              @change="handleSearch"
          >
            <el-option
                v-for="cat in categories"
                :key="cat.categoryId"
                :label="cat.categoryName"
                :value="cat.categoryId"
            />
          </el-select>

          <el-select
              v-model="sortBy"
              class="filters__select"
              @change="handleSearch"
          >
            <el-option label="最新发布" value="latest" />
            <el-option label="预算 高 → 低" value="budget_desc" />
            <el-option label="预算 低 → 高" value="budget_asc" />
          </el-select>

          <el-button type="primary" class="filters__publish" @click="openCreate">
            <el-icon><Plus /></el-icon>发布求购
          </el-button>
        </div>

        <!-- 状态切换：进行中 / 已关闭（对应 status 参数，默认 1） -->
        <div class="filters__row filters__row--seg">
          <button
              type="button"
              class="seg__item"
              :class="{ 'seg__item--on': status === 1 }"
              @click="setStatus(1)"
          >
            进行中
          </button>
          <button
              type="button"
              class="seg__item"
              :class="{ 'seg__item--on': status === 2 }"
              @click="setStatus(2)"
          >
            已关闭
          </button>
        </div>

        <!-- 校区 chips（真实 campuses） -->
        <div v-if="campuses.length > 0" class="filters__group">
          <span class="filters__group-label"><el-icon><School /></el-icon>校区</span>
          <div class="chips">
            <button
                type="button"
                class="chip"
                :class="{ 'chip--on': !campus }"
                @click="selectCampus('')"
            >全部</button>
            <button
                v-for="c in campuses"
                :key="c"
                type="button"
                class="chip"
                :class="{ 'chip--on': campus === c }"
                @click="selectCampus(c)"
            >{{ c }}</button>
          </div>
        </div>

        <!-- 预算快捷筛选：诚实说明为「预算上限不超过」的匹配 -->
        <div class="filters__group">
          <span class="filters__group-label">
            <el-icon><Coin /></el-icon>预算上限
          </span>
          <div class="chips">
            <button
                v-for="opt in BUDGET_OPTIONS"
                :key="opt.key"
                type="button"
                class="chip"
                :class="{ 'chip--on': budgetKey === opt.key }"
                @click="selectBudget(opt.key)"
            >{{ opt.label }}</button>
          </div>
          <span class="filters__note">按「预算上限不超过所选值」匹配，非区间下限筛选</span>
        </div>
      </section>

      <!-- 4. 结果信息条 -->
      <div class="result-bar">
        <span class="result-bar__count">
          当前展示 <strong class="is-num">{{ total }}</strong> 条{{ status === 1 ? '进行中' : '已关闭' }}求购
        </span>
        <span v-if="hasFilters" class="result-bar__hint">已按筛选条件展示</span>
      </div>

      <!-- 5. 骨架屏 -->
      <div v-if="loading && wantedList.length === 0" class="wall">
        <div v-for="n in 6" :key="n" class="sk-note">
          <div class="sk-line sk-line--lg"></div>
          <div class="sk-line sk-line--sm"></div>
          <div class="sk-budget"></div>
          <div class="sk-line"></div>
          <div class="sk-line sk-line--sm"></div>
        </div>
      </div>

      <!-- 6. 请求失败 -->
      <div v-else-if="loadError" class="state-block">
        <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
        <p class="state-block__title">加载失败，请重试</p>
        <p class="state-block__desc">需求广场暂时无法连接，可能是服务端尚未初始化，也可能是网络波动。</p>
        <el-button type="primary" round @click="reload">
          <el-icon><Refresh /></el-icon>重新加载
        </el-button>
      </div>

      <!-- 7. 空状态 -->
      <div v-else-if="wantedList.length === 0" class="state-block">
        <el-icon class="state-block__icon state-block__icon--soft"><Memo /></el-icon>
        <p class="state-block__title">{{ emptyTitle }}</p>
        <p class="state-block__desc">{{ emptyDesc }}</p>
        <el-button type="primary" round @click="hasFilters ? resetFilters() : openCreate()">
          {{ hasFilters ? '清空筛选条件' : '发布你的第一条求购' }}
        </el-button>
      </div>

      <!-- 8. 需求流主体：便签瀑布墙 -->
      <div v-else class="wall">
        <article
            v-for="(w, index) in wantedList"
            :key="w.wantedId"
            class="note"
            :class="{
              'note--closed': Number(w.status) === 2,
              'note--hot': isHot(w),
              [`note--tilt-${index % 4}`]: true
            }"
        >
          <span class="note__pin"></span>

          <!-- 热门需求角标：仅基于真实 responseCount -->
          <span v-if="isHot(w)" class="note__hot-flag">
            <el-icon><StarFilled /></el-icon>热门需求
          </span>

          <div class="note__head">
            <h3 class="note__title" @click="goDetail(w.wantedId)">{{ w.title }}</h3>
            <span class="note__status" :class="Number(w.status) === 2 ? 'note__status--closed' : 'note__status--open'">
              {{ Number(w.status) === 2 ? '已关闭' : '进行中' }}
            </span>
          </div>

          <div class="note__byline">
            <span class="note__avatar">{{ (w.username || '同').charAt(0).toUpperCase() }}</span>
            <span class="note__author">{{ w.username || '匿名同学' }}</span>
            <span class="note__dot">·</span>
            <span class="note__time">{{ formatRelativeTime(w.createTime) }}</span>
          </div>

          <!-- 预算强调块 -->
          <div class="budget" :class="{ 'budget--negotiable': budgetInfo(w).negotiable }">
            <span class="budget__label">预算</span>
            <span class="budget__value is-num">{{ budgetInfo(w).text }}</span>
          </div>

          <div class="note__tags">
            <span class="tag tag--category">{{ categoryName(w.categoryId) }}</span>
            <span v-if="w.campus" class="tag tag--campus">
              <el-icon><Location /></el-icon>{{ w.campus }}
            </span>
          </div>

          <p v-if="w.description" class="note__desc">{{ w.description }}</p>
          <p v-else class="note__desc note__desc--empty">（需求方未填写详细说明）</p>

          <div class="note__foot">
            <span class="note__responses">
              <el-icon><ChatDotRound /></el-icon>
              <span class="is-num">{{ w.responseCount ?? 0 }}</span> 人响应
            </span>
            <div class="note__ops">
              <el-button
                  v-if="w.userId !== currentUserId && Number(w.status) !== 2"
                  size="small"
                  type="primary"
                  round
                  @click="goDetail(w.wantedId, true)"
              >我要响应</el-button>
              <span v-else-if="w.userId === currentUserId" class="note__own">你发布的</span>
              <el-button size="small" round @click="goDetail(w.wantedId)">查看详情</el-button>
            </div>
          </div>
        </article>
      </div>

      <!-- 9. 分页（接口分页，每页 9 条） -->
      <div v-if="total > 0 && !loadError" class="pager">
        <el-pagination
            layout="total, prev, pager, next, jumper"
            background
            :total="total"
            :page-size="pageSize"
            :current-page="pageNum"
            @current-change="onPageChange"
        />
      </div>
    </template>

    <!-- ==================== 详情视图：需求档案 ==================== -->
    <template v-else>
      <div class="archive">
        <div class="archive__bar">
          <button type="button" class="archive__back" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>返回求购市场
          </button>
          <button
              v-if="detailWanted"
              type="button"
              class="archive__share"
              @click="copyLink"
          >
            <el-icon><CopyDocument /></el-icon>复制需求链接
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="detailLoading" class="sk-note sk-note--detail">
          <div class="sk-line sk-line--lg"></div>
          <div class="sk-line sk-line--sm"></div>
          <div class="sk-budget"></div>
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line sk-line--sm"></div>
        </div>

        <!-- 请求失败 -->
        <div v-else-if="detailError" class="state-block">
          <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
          <p class="state-block__title">求购详情加载失败</p>
          <p class="state-block__desc">可能是服务端尚未就绪或网络波动，稍后再试一次。</p>
          <div class="state-block__ops">
            <el-button type="primary" round @click="loadDetail">重新加载</el-button>
            <el-button round @click="goBack">返回求购市场</el-button>
          </div>
        </div>

        <!-- 不存在 -->
        <div v-else-if="detailNotFound || !detailWanted" class="state-block">
          <el-icon class="state-block__icon state-block__icon--soft"><Box /></el-icon>
          <p class="state-block__title">这条求购不存在</p>
          <p class="state-block__desc">可能已被删除，或链接不正确。</p>
          <el-button type="primary" round @click="goBack">返回求购市场</el-button>
        </div>

        <template v-else>
          <!-- 档案抬头 -->
          <header class="archive__head" :class="{ 'archive__head--closed': isClosed }">
            <div class="archive__head-main">
              <span class="archive__eyebrow">WANTED · 需求档案 #{{ detailWanted.wantedId }}</span>
              <h1 class="archive__title">{{ detailWanted.title }}</h1>
              <div class="archive__meta">
                <span class="archive__avatar">{{ (detailWanted.username || '同').charAt(0).toUpperCase() }}</span>
                <span class="archive__author">{{ detailWanted.username || '匿名同学' }}</span>
                <span class="archive__dot">·</span>
                <span class="archive__time">{{ formatDateTime(detailWanted.createTime) }} 发布</span>
                <span class="note__status" :class="isClosed ? 'note__status--closed' : 'note__status--open'">
                  {{ isClosed ? '已关闭' : '进行中' }}
                </span>
              </div>
            </div>

            <div class="archive__budget" :class="{ 'budget--negotiable': budgetInfo(detailWanted).negotiable }">
              <span class="budget__label">预算</span>
              <span class="budget__value is-num">{{ budgetInfo(detailWanted).text }}</span>
            </div>
          </header>

          <div class="archive__tags">
            <span class="tag tag--category">{{ categoryName(detailWanted.categoryId) }}</span>
            <span v-if="detailWanted.campus" class="tag tag--campus">
              <el-icon><Location /></el-icon>{{ detailWanted.campus }}
            </span>
            <span class="tag tag--count">
              <el-icon><ChatDotRound /></el-icon><span class="is-num">{{ detailWanted.responseCount ?? responses.length }}</span> 人响应
            </span>
          </div>

          <section class="archive__panel">
            <h2 class="panel__title">需求说明</h2>
            <p v-if="detailWanted.description" class="panel__text">{{ detailWanted.description }}</p>
            <p v-else class="panel__text panel__text--empty">需求方没有填写更多说明，可以通过下方响应进一步沟通。</p>
          </section>

          <!-- 响应留言板 -->
          <section class="archive__panel">
            <h2 class="panel__title">响应留言板</h2>

            <div v-if="responsesLoading" class="resp-loading">
              <div v-for="n in 2" :key="n" class="sk-line"></div>
            </div>

            <div v-else-if="responsesError" class="resp-error">
              <span>响应加载失败</span>
              <el-button size="small" round @click="loadResponses">重试</el-button>
            </div>

            <div v-else-if="responses.length === 0" class="resp-empty">
              还没有人响应，快来做第一个吧
            </div>

            <ul v-else class="resp-list">
              <li v-for="r in responses" :key="r.responseId" class="resp">
                <span class="resp__avatar">{{ (r.username || '同').charAt(0).toUpperCase() }}</span>
                <div class="resp__body">
                  <div class="resp__meta">
                    <span class="resp__name">{{ r.username || '匿名同学' }}</span>
                    <span class="resp__time">{{ formatRelativeTime(r.createTime) }}</span>
                  </div>
                  <p class="resp__msg">{{ r.message }}</p>
                </div>
              </li>
            </ul>
          </section>

          <!-- 响应 / 本人操作 -->
          <section class="archive__panel composer">
            <template v-if="isOwn">
              <div class="own-panel">
                <el-icon class="own-panel__icon"><StarFilled /></el-icon>
                <div class="own-panel__text">
                  这是你发布的求购{{ isClosed ? '（已关闭）' : '' }}
                </div>
                <div class="own-panel__ops">
                  <el-button @click="openEdit(detailWanted)">
                    <el-icon><Edit /></el-icon>编辑
                  </el-button>
                  <el-button
                      v-if="!isClosed"
                      type="danger"
                      plain
                      :loading="closing"
                      @click="handleClose"
                  >
                    <el-icon v-if="!closing"><Lock /></el-icon>关闭求购
                  </el-button>
                </div>
              </div>
            </template>

            <div v-else-if="isClosed" class="closed-hint">
              <el-icon><Lock /></el-icon>该求购已关闭，无法再提交响应
            </div>

            <template v-else>
              <h2 class="panel__title">我要响应</h2>
              <el-input
                  ref="responseInputRef"
                  v-model="responseText"
                  type="textarea"
                  :rows="4"
                  maxlength="200"
                  show-word-limit
                  placeholder="说说你手里有什么、成色如何、方便在哪里面交…"
              />
              <div class="composer__foot">
                <el-button
                    type="primary"
                    round
                    :loading="responseSubmitting"
                    @click="submitResponse"
                >提交响应</el-button>
              </div>
            </template>
          </section>
        </template>
      </div>
    </template>

    <!-- ==================== 发布 / 编辑抽屉 ==================== -->
    <el-drawer
        v-model="formVisible"
        :title="isEdit ? '编辑求购' : '发布求购'"
        direction="rtl"
        size="520px"
        class="wanted-drawer"
    >
      <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-position="top"
          class="wanted-form"
      >
        <el-form-item label="求购标题" prop="title">
          <el-input
              v-model="form.title"
              maxlength="60"
              show-word-limit
              placeholder="一句话说明你想买什么，如「求购一台二手显示器」"
          />
        </el-form-item>

        <el-form-item label="品类" prop="categoryId">
          <el-select
              v-model="form.categoryId"
              placeholder="可选，选择品类更易被找到"
              clearable
              style="width: 100%"
          >
            <el-option
                v-for="cat in categories"
                :key="cat.categoryId"
                :label="cat.categoryName"
                :value="cat.categoryId"
            />
          </el-select>
        </el-form-item>

        <div class="wanted-form__row">
          <el-form-item label="预算下限" prop="budgetMin">
            <el-input-number
                v-model="form.budgetMin"
                :min="0"
                :controls="false"
                placeholder="可选"
                style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="预算上限" prop="budgetMax">
            <el-input-number
                v-model="form.budgetMax"
                :min="0"
                :controls="false"
                placeholder="可选"
                style="width: 100%"
            />
          </el-form-item>
        </div>

        <el-form-item label="期望校区" prop="campus">
          <el-select
              v-model="form.campus"
              placeholder="可选，来自真实校区列表"
              clearable
              style="width: 100%"
          >
            <el-option
                v-for="c in campuses"
                :key="c"
                :label="c"
                :value="c"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="需求说明" prop="description">
          <el-input
              v-model="form.description"
              type="textarea"
              :rows="5"
              maxlength="500"
              show-word-limit
              placeholder="补充成色、型号、预算弹性、面交方式等（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitForm">
          {{ isEdit ? '保存修改' : '发布求购' }}
        </el-button>
      </template>
    </el-drawer>

  </div>
</template>


<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, School, Location, Coin, Memo, Box, Edit, Lock,
  Refresh, ArrowLeft, ChatDotRound, StarFilled, CopyDocument,
  WarningFilled, CircleCloseFilled
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime, formatRelativeTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

// 详情视图：路由带 wantedId 参数时进入（/wanted/12）
const isDetailMode = computed(() => !!route.params.wantedId)

// 热门需求的判定阈值：完全基于真实 responseCount，不造假
const HOT_RESPONSE_THRESHOLD = 3
const isHot = (w) => Number(w.responseCount ?? 0) >= HOT_RESPONSE_THRESHOLD

// =========================
// 列表状态
// =========================
const pageSize = 9

const keyword = ref('')
const categoryId = ref(null)
const campus = ref('')
const budgetKey = ref('all')
const sortBy = ref('latest')
const status = ref(1)

const pageNum = ref(1)
const total = ref(0)
// 进行中的求购总数（公告墙头部统计，独立于当前 status 视图）
const activeTotal = ref(null)

const wantedList = ref([])
const loading = ref(false)
const loadError = ref(false)

const categories = ref([])
const campuses = ref([])

// 预算快捷筛选 → budgetMax（接口按「预算上限 ≤ 该值」匹配；不限不传）
const BUDGET_OPTIONS = [
  { key: 'all', label: '不限', max: null },
  { key: 'le50', label: '≤ 50', max: 50 },
  { key: '50_200', label: '50 - 200', max: 200 },
  { key: '200_500', label: '200 - 500', max: 500 },
  { key: 'ge500', label: '500+', max: 999999 }
]

const currentBudgetMax = computed(() => {
  const opt = BUDGET_OPTIONS.find(o => o.key === budgetKey.value)
  return opt && opt.max !== null ? opt.max : undefined
})

const hasFilters = computed(() =>
    !!keyword.value || !!categoryId.value || !!campus.value || budgetKey.value !== 'all'
)

const emptyTitle = computed(() =>
    hasFilters.value ? '没有找到符合条件的求购' : (status.value === 2 ? '还没有已关闭的求购' : '公告墙还空着')
)
const emptyDesc = computed(() =>
    hasFilters.value
        ? '换个关键词或放宽预算、校区条件试试'
        : (status.value === 2 ? '关闭的求购会归档到这里' : '贴出你的第一条需求，让有货的同学找到你')
)

// 分类ID → 名称
const categoryName = (id) => {
  if (!id) return '未分类'
  const hit = categories.value.find(c => c.categoryId === id)
  return hit ? hit.categoryName : '未分类'
}

// 预算展示：区间 / 起始 / 上限 / 面议
const budgetInfo = (w) => {
  const min = (w.budgetMin === null || w.budgetMin === undefined || w.budgetMin === '') ? null : Number(w.budgetMin)
  const max = (w.budgetMax === null || w.budgetMax === undefined || w.budgetMax === '') ? null : Number(w.budgetMax)

  if (min === null && max === null) return { text: '预算面议', negotiable: true }
  if (min !== null && max !== null) {
    return { text: min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`, negotiable: false }
  }
  if (min !== null) return { text: `${formatPrice(min)} 起`, negotiable: false }
  return { text: `${formatPrice(max)} 以内`, negotiable: false }
}

// =========================
// 详情状态
// =========================
const detailWanted = ref(null)
const detailLoading = ref(false)
const detailError = ref(false)
const detailNotFound = ref(false)

const responses = ref([])
const responsesLoading = ref(false)
const responsesError = ref(false)

const responseText = ref('')
const responseSubmitting = ref(false)
const responseInputRef = ref(null)
const closing = ref(false)

const isOwn = computed(() => !!detailWanted.value && Number(detailWanted.value.userId) === currentUserId)
const isClosed = computed(() => !!detailWanted.value && Number(detailWanted.value.status) === 2)

// =========================
// 数据加载
// =========================
const loadCategories = async () => {
  try {
    const res = await request.get('/categories')
    categories.value = Array.isArray(res) ? res : []
  } catch (error) {
    categories.value = []
  }
}

const loadCampuses = async () => {
  try {
    const res = await request.get('/home/overview')
    campuses.value = Array.isArray(res?.campuses) ? res.campuses : []
  } catch (error) {
    campuses.value = []
  }
}

// 求购详情页头部统计：仅在查看「已关闭」时单独取一次进行中总数
const loadActiveTotal = async () => {
  try {
    const res = await request.get('/wanted/page', { params: { status: 1, pageNum: 1, pageSize: 1 } })
    activeTotal.value = Number(res?.total) || 0
  } catch (error) {
    activeTotal.value = null
  }
}

const loadWanted = async () => {
  loading.value = true
  loadError.value = false

  try {
    const result = await request.get('/wanted/page', {
      params: {
        keyword: keyword.value || undefined,
        categoryId: categoryId.value ?? undefined,
        campus: campus.value || undefined,
        budgetMax: currentBudgetMax.value,
        sortBy: sortBy.value,
        status: status.value,
        pageNum: pageNum.value,
        pageSize
      }
    })

    wantedList.value = Array.isArray(result?.list) ? result.list : []
    total.value = Number(result?.total) || 0

    // 头部「进行中的求购」：当前即在进行中视图时直接用 total，否则单独取一次
    if (status.value === 1) {
      activeTotal.value = total.value
    } else {
      await loadActiveTotal()
    }
  } catch (error) {
    // request.js 已统一提示错误；这里标记自身状态并给出「服务端未就绪」横幅
    loadError.value = true
    wantedList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const reload = async () => {
  await Promise.allSettled([loadCategories(), loadCampuses()])
  await loadWanted()
}

const loadDetail = async () => {
  detailLoading.value = true
  detailError.value = false
  detailNotFound.value = false
  responseText.value = ''

  const id = route.params.wantedId

  try {
    const res = await request.get(`/wanted/${id}`)

    if (!res) {
      detailWanted.value = null
      detailNotFound.value = true
      return
    }

    detailWanted.value = res
    await loadResponses()

    // 进入详情时若带 respond=1，自动聚焦响应输入框
    if (route.query.respond === '1' && !isOwn.value && !isClosed.value) {
      nextTick(() => responseInputRef.value?.focus?.())
    }
  } catch (error) {
    detailError.value = true
    detailWanted.value = null
  } finally {
    detailLoading.value = false
  }
}

const loadResponses = async () => {
  responsesLoading.value = true
  responsesError.value = false

  try {
    const res = await request.get(`/wanted/${route.params.wantedId}/responses`)
    responses.value = Array.isArray(res) ? res : []
  } catch (error) {
    responsesError.value = true
    responses.value = []
  } finally {
    responsesLoading.value = false
  }
}

// 静默刷新详情（更新 responseCount / status），不切换 loading 态
const refreshDetailSilently = async () => {
  try {
    const res = await request.get(`/wanted/${route.params.wantedId}`)
    if (res) detailWanted.value = res
  } catch (error) {
    // 静默失败不打断当前页面
  }
}

// =========================
// 筛选交互
// =========================
let searchTimer = null

const onKeywordInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNum.value = 1
    loadWanted()
  }, 420)
}

const handleSearch = () => {
  clearTimeout(searchTimer)
  pageNum.value = 1
  loadWanted()
}

const selectCampus = (c) => {
  campus.value = campus.value === c ? '' : c
  handleSearch()
}

const selectBudget = (key) => {
  budgetKey.value = key
  handleSearch()
}

const setStatus = (val) => {
  if (status.value === val) return
  status.value = val
  pageNum.value = 1
  loadWanted()
}

const resetFilters = () => {
  keyword.value = ''
  categoryId.value = null
  campus.value = ''
  budgetKey.value = 'all'
  sortBy.value = 'latest'
  pageNum.value = 1
  loadWanted()
}

const onPageChange = (page) => {
  pageNum.value = page
  loadWanted()
  // 翻页后回到列表顶部
  const el = document.querySelector('.content')
  if (el) {
    el.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
}

const prefersReducedMotion = () =>
    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

// =========================
// 路由跳转 / 分享
// =========================
const goDetail = (wantedId, respond = false) => {
  router.push({ path: `/wanted/${wantedId}`, query: respond ? { respond: '1' } : {} })
}

const goBack = () => {
  router.push('/wanted')
}

const copyLink = async () => {
  const url = `${window.location.origin}/wanted/${route.params.wantedId}`
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
      ElMessage.success('需求链接已复制')
    } else {
      throw new Error('clipboard unavailable')
    }
  } catch (error) {
    ElMessage.warning('复制失败，请手动复制浏览器地址栏中的链接')
  }
}

// =========================
// 发布 / 编辑表单
// =========================
const formVisible = ref(false)
const isEdit = ref(false)
const formSubmitting = ref(false)
const formRef = ref()

const form = reactive({
  wantedId: null,
  title: '',
  categoryId: null,
  budgetMin: null,
  budgetMax: null,
  campus: '',
  description: ''
})

// 预算校验：非负 + 下限不高于上限
const validateBudget = (rule, value, callback) => {
  const min = form.budgetMin === null || form.budgetMin === '' ? null : Number(form.budgetMin)
  const max = form.budgetMax === null || form.budgetMax === '' ? null : Number(form.budgetMax)

  if (min !== null && min < 0) return callback(new Error('预算下限不能小于 0'))
  if (max !== null && max < 0) return callback(new Error('预算上限不能小于 0'))
  if (min !== null && max !== null && min > max) return callback(new Error('预算下限不能高于上限'))
  callback()
}

const formRules = {
  title: [
    { required: true, message: '请填写求购标题', trigger: 'blur' },
    { max: 60, message: '标题不超过 60 个字', trigger: 'blur' }
  ],
  budgetMin: [{ validator: validateBudget, trigger: 'change' }],
  budgetMax: [{ validator: validateBudget, trigger: 'change' }],
  description: [{ max: 500, message: '需求说明不超过 500 个字', trigger: 'blur' }]
}

const resetForm = () => {
  form.wantedId = null
  form.title = ''
  form.categoryId = null
  form.budgetMin = null
  form.budgetMax = null
  form.campus = ''
  form.description = ''
  formRef.value?.clearValidate?.()
}

const openCreate = () => {
  isEdit.value = false
  resetForm()
  formVisible.value = true
}

const openEdit = (w) => {
  isEdit.value = true
  form.wantedId = w.wantedId
  form.title = w.title || ''
  form.categoryId = w.categoryId ?? null
  form.budgetMin = (w.budgetMin === null || w.budgetMin === undefined) ? null : Number(w.budgetMin)
  form.budgetMax = (w.budgetMax === null || w.budgetMax === undefined) ? null : Number(w.budgetMax)
  form.campus = w.campus || ''
  form.description = w.description || ''
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate?.())
}

const submitForm = async () => {
  if (!formRef.value) return

  // el-form 校验：校验失败返回 false，不做后续请求
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  formSubmitting.value = true

  const payload = {
    title: form.title.trim(),
    categoryId: form.categoryId ?? undefined,
    budgetMin: form.budgetMin === null || form.budgetMin === '' ? undefined : form.budgetMin,
    budgetMax: form.budgetMax === null || form.budgetMax === '' ? undefined : form.budgetMax,
    campus: form.campus || undefined,
    description: form.description || undefined
  }

  try {
    if (isEdit.value) {
      const result = await request.put('/wanted', { wantedId: form.wantedId, ...payload })

      // 后端以文本返回业务结果（HTTP 200）
      if (result === '求购更新成功') {
        ElMessage.success(result)
        formVisible.value = false
        if (isDetailMode.value) {
          await loadDetail()
        } else {
          await loadWanted()
        }
      } else {
        ElMessage.error(result || '求购更新失败')
      }
    } else {
      const result = await request.post('/wanted', payload)

      if (String(result).startsWith('求购发布成功')) {
        ElMessage.success(result)
        formVisible.value = false
        if (isDetailMode.value) {
          await loadDetail()
        } else {
          pageNum.value = 1
          await loadWanted()
        }
      } else {
        ElMessage.error(result || '求购发布失败')
      }
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    formSubmitting.value = false
  }
}

// =========================
// 响应提交 / 关闭求购
// =========================
const submitResponse = async () => {
  const message = responseText.value.trim()
  if (!message) {
    ElMessage.warning('请先写下你的响应内容')
    return
  }

  responseSubmitting.value = true

  try {
    const result = await request.post(`/wanted/${route.params.wantedId}/responses`, { message })

    if (result === '响应已提交') {
      ElMessage.success(result)
      responseText.value = ''
      await Promise.all([loadResponses(), refreshDetailSilently()])
    } else {
      ElMessage.error(result || '响应提交失败')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    responseSubmitting.value = false
  }
}

const handleClose = async () => {
  try {
    await ElMessageBox.confirm(
        '关闭后该求购将从需求广场下架，且不再接受新的响应。确定关闭吗？',
        '关闭求购',
        {
          confirmButtonText: '确定关闭',
          cancelButtonText: '再想想',
          type: 'warning'
        }
    )
  } catch (error) {
    // 用户取消
    return
  }

  closing.value = true

  try {
    const result = await request.put(`/wanted/${route.params.wantedId}/status`, { status: 2 })

    if (result === '求购已关闭') {
      ElMessage.success(result)
      await refreshDetailSilently()
      await loadActiveTotalSilent()
    } else {
      ElMessage.error(result || '关闭求购失败')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    closing.value = false
  }
}

// 关闭后同步刷新列表头部统计（静默，避免额外失败提示）
const loadActiveTotalSilent = async () => {
  try {
    const res = await request.get('/wanted/page', { params: { status: 1, pageNum: 1, pageSize: 1 } })
    activeTotal.value = Number(res?.total) || 0
  } catch (error) {
    // 忽略
  }
}

// =========================
// 生命周期 / 路由切换
// =========================
watch(() => route.params.wantedId, (val) => {
  if (val) {
    loadDetail()
  } else {
    // 从详情返回列表：重新拉取以反映最新的响应数 / 状态
    pageNum.value = 1
    loadWanted()
  }
})

onMounted(() => {
  loadCategories()
  loadCampuses()

  if (isDetailMode.value) {
    loadDetail()
  } else {
    loadWanted()
  }
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>


<style scoped>

.wanted-page {
  width: 100%;
}

/* ============================================================
 * 公告墙头部
 * ============================================================ */

.board-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 34px;
  margin-bottom: 18px;
  border-radius: var(--brand-radius-xl);
  border: 1px solid var(--brand-border);
  overflow: hidden;
  background:
    radial-gradient(circle at 92% 10%, rgba(201, 168, 92, 0.30), transparent 46%),
    radial-gradient(circle at 6% 92%, rgba(216, 168, 173, 0.34), transparent 48%),
    linear-gradient(120deg, var(--brand-bg-soft) 0%, var(--brand-white) 58%, var(--brand-accent-soft) 100%);
  box-shadow: var(--brand-shadow-sm);
}

/* 顶部胶带装饰 */
.board-hero__tape {
  position: absolute;
  top: -14px;
  left: 46px;
  width: 128px;
  height: 30px;
  transform: rotate(-4deg);
  background: rgba(216, 168, 173, 0.36);
  border: 1px dashed rgba(184, 152, 90, 0.42);
  border-radius: 4px;
}

.board-hero__copy {
  position: relative;
  min-width: 0;
}

.board-hero__eyebrow {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 2px;
  color: var(--brand-primary-active);
  font-weight: 700;
}

.board-hero__title {
  margin: 8px 0 6px;
  font-size: 30px;
  line-height: 1.2;
  color: var(--brand-text);
  letter-spacing: 1px;
}

.board-hero__sub {
  margin: 0;
  font-size: 13.5px;
  color: var(--brand-text-regular);
}

.board-hero__stat {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 128px;
  padding: 16px 20px;
  border-radius: var(--brand-radius-lg);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
}

.board-hero__stat-num {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--brand-accent-hover);
}

.board-hero__stat-label {
  font-size: 12px;
  color: var(--brand-text-secondary);
  letter-spacing: 0.5px;
}

/* ============================================================
 * 服务端未就绪横幅
 * ============================================================ */

.setup-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-accent-soft);
  border: 1px solid rgba(184, 152, 90, 0.42);
}

.setup-banner__icon {
  font-size: 20px;
  color: var(--brand-accent-hover);
  flex-shrink: 0;
  margin-top: 1px;
}

.setup-banner__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
}

.setup-banner__desc {
  margin-top: 3px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--brand-text-regular);
}

/* ============================================================
 * 筛选区
 * ============================================================ */

.filters {
  padding: 16px 18px;
  margin-bottom: 14px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  box-shadow: var(--brand-shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filters__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filters__search {
  width: 300px;
}

.filters__select {
  width: 150px;
}

.filters__publish {
  margin-left: auto;
}

/* 状态分段控件 */
.seg__item {
  border: 1px solid var(--brand-border);
  background: var(--brand-bg-soft);
  color: var(--brand-text-regular);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.seg__item--on {
  background: var(--brand-white);
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
  box-shadow: var(--brand-shadow-sm);
}

.filters__group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.filters__group-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-text-secondary);
  min-width: 66px;
}

.filters__note {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

/* chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  color: var(--brand-text-regular);
  font-size: 12.5px;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

.chip--on {
  background: var(--brand-primary-soft);
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
  font-weight: 600;
}

/* ============================================================
 * 结果条
 * ============================================================ */

.result-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0 4px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.result-bar__count strong {
  color: var(--brand-text);
  font-size: 15px;
  margin: 0 3px;
}

.result-bar__hint {
  padding: 2px 10px;
  font-size: 11.5px;
  background: var(--brand-bg-soft);
  color: var(--brand-accent-hover);
  border-radius: 10px;
}

/* ============================================================
 * 需求流：便签瀑布墙
 * ============================================================ */

.wall {
  column-count: 3;
  column-gap: 18px;
}

.note {
  position: relative;
  break-inside: avoid;
  margin: 0 0 18px;
  padding: 22px 20px 16px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: 4px 18px 18px 18px;
  box-shadow: var(--brand-shadow-sm);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

/* 便签轻微错落（确定性倾斜，非随机） */
.note--tilt-0 { transform: rotate(-0.6deg); }
.note--tilt-1 { transform: rotate(0.5deg); }
.note--tilt-2 { transform: rotate(-0.3deg); }
.note--tilt-3 { transform: rotate(0.8deg); }

.note:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow: var(--brand-shadow-lg);
  border-color: var(--brand-primary);
  z-index: 2;
}

/* 图钉 */
.note__pin {
  position: absolute;
  top: -7px;
  right: 22px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle at 34% 30%, #f2ddba, var(--brand-accent));
  box-shadow: 0 3px 6px rgba(74, 69, 72, 0.24);
}

/* 热门需求：仅基于真实 responseCount 的强调描边 */
.note--hot {
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 2px var(--brand-accent-soft), var(--brand-shadow-sm);
}

.note__hot-flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  margin-bottom: 10px;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
  background: var(--brand-accent);
  border-radius: 999px;
}

/* 已关闭：中性灰 + 整体弱化 */
.note--closed {
  background: var(--brand-bg-soft);
  border-color: var(--brand-border);
  opacity: 0.72;
  filter: saturate(0.5);
}

.note--closed:hover {
  border-color: var(--brand-border);
}

.note__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.note__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--brand-text);
  cursor: pointer;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note__title:hover {
  color: var(--brand-primary-active);
}

.note__status {
  flex-shrink: 0;
  padding: 2px 10px;
  font-size: 11.5px;
  border-radius: 999px;
  white-space: nowrap;
}

.note__status--open {
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

.note__status--closed {
  color: var(--brand-aux);
  background: var(--brand-aux-soft);
}

.note__byline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.note__avatar,
.archive__avatar,
.resp__avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--brand-sidebar-gradient);
}

.note__author {
  color: var(--brand-text-regular);
  font-weight: 600;
}

.note__dot {
  color: var(--brand-text-secondary);
}

/* 预算强调块：与商品卡的小字价格完全不同 */
.budget {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 14px 0;
  padding: 10px 14px;
  border-radius: var(--brand-radius);
  background: var(--brand-accent-soft);
  border-left: 3px solid var(--brand-accent);
}

.budget__label {
  font-size: 11.5px;
  letter-spacing: 1px;
  color: var(--brand-text-secondary);
  flex-shrink: 0;
}

.budget__value {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--brand-accent-hover);
}

.budget--negotiable .budget__value {
  font-size: 17px;
  color: var(--brand-text-regular);
}

.note__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  font-size: 11.5px;
  border-radius: 999px;
}

.tag--category {
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

.tag--campus {
  color: var(--brand-text-regular);
  background: var(--brand-bg-soft);
}

.tag--count {
  color: var(--brand-aux);
  background: var(--brand-aux-soft);
}

.note__desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--brand-text-regular);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note__desc--empty {
  color: var(--brand-text-secondary);
  font-style: italic;
}

.note__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--brand-border);
}

.note__responses {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.note__own {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.note__ops {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ============================================================
 * 骨架屏
 * ============================================================ */

.sk-note {
  break-inside: avoid;
  margin-bottom: 18px;
  padding: 20px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
}

.sk-note--detail {
  column-span: all;
}

.sk-line {
  height: 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1ebe3 25%, #f8f4ee 37%, #f1ebe3 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line--lg { height: 20px; width: 70%; }
.sk-line--sm { width: 40%; }

.sk-budget {
  height: 46px;
  margin-bottom: 14px;
  border-radius: var(--brand-radius);
  background: linear-gradient(90deg, #f3ecdd 25%, #faf5ea 37%, #f3ecdd 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

@keyframes sk-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* ============================================================
 * 状态块（失败 / 空）
 * ============================================================ */

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 64px 20px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  text-align: center;
}

.state-block__icon {
  font-size: 44px;
  color: var(--brand-primary);
}

.state-block__icon--soft {
  color: var(--brand-primary);
  opacity: 0.75;
}

.state-block__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--brand-text);
}

.state-block__desc {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--brand-text-secondary);
  max-width: 460px;
  line-height: 1.6;
}

.state-block__ops {
  display: flex;
  gap: 10px;
}

/* ============================================================
 * 分页
 * ============================================================ */

.pager {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

/* ============================================================
 * 详情视图：需求档案
 * ============================================================ */

.archive {
  width: 100%;
}

.archive__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.archive__back,
.archive__share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 1px solid var(--brand-border);
  background: var(--brand-white);
  color: var(--brand-text-regular);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.archive__back:hover,
.archive__share:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary-active);
}

.archive__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
  border-radius: var(--brand-radius-xl) var(--brand-radius-xl) 0 0;
  background: linear-gradient(120deg, var(--brand-bg-soft) 0%, var(--brand-white) 62%, var(--brand-accent-soft) 100%);
  border: 1px solid var(--brand-border);
  border-bottom: none;
}

.archive__head--closed {
  background: linear-gradient(120deg, var(--brand-bg-soft) 0%, var(--brand-bg) 100%);
  filter: saturate(0.7);
}

.archive__eyebrow {
  font-size: 11px;
  letter-spacing: 1.6px;
  color: var(--brand-primary-active);
  font-weight: 700;
}

.archive__title {
  margin: 8px 0 12px;
  font-size: 27px;
  line-height: 1.3;
  color: var(--brand-text);
}

.archive__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.archive__author {
  color: var(--brand-text-regular);
  font-weight: 600;
}

.archive__budget {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding: 14px 20px;
  border-radius: var(--brand-radius-lg);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--brand-accent);
  box-shadow: var(--brand-shadow-sm);
}

.archive__budget .budget__value {
  font-size: 26px;
}

.archive__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 30px;
  border: 1px solid var(--brand-border);
  border-top: none;
  border-bottom: none;
  background: var(--brand-white);
}

.archive__panel {
  padding: 22px 30px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-bottom: none;
}

.archive__panel:last-of-type {
  border-bottom: 1px solid var(--brand-border);
  border-radius: 0 0 var(--brand-radius-xl) var(--brand-radius-xl);
  margin-bottom: 24px;
}

.panel__title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
  padding-left: 10px;
  border-left: 3px solid var(--brand-primary);
}

.panel__text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.9;
  color: var(--brand-text-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.panel__text--empty {
  color: var(--brand-text-secondary);
}

/* 响应留言板 */
.resp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.resp {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--brand-radius-lg) 4px var(--brand-radius-lg) var(--brand-radius-lg);
  background: var(--brand-bg);
  border: 1px dashed var(--brand-border);
}

.resp__body {
  min-width: 0;
  flex: 1;
}

.resp__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}

.resp__name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--brand-text);
}

.resp__time {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.resp__msg {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--brand-text-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.resp-empty,
.resp-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg-soft);
  font-size: 13px;
  color: var(--brand-text-secondary);
}

.resp-loading {
  padding: 6px 0;
}

/* 响应 / 本人操作 */
.composer__foot {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.own-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.own-panel__icon {
  font-size: 22px;
  color: var(--brand-accent);
}

.own-panel__text {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
}

.own-panel__ops {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.closed-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg-soft);
  color: var(--brand-aux);
  font-size: 13.5px;
}

/* 抽屉表单 */
.wanted-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ============================================================
 * 响应式：≥1200 三列 / 768~1200 两列 / <768 单列
 * ============================================================ */

@media (max-width: 1200px) {
  .wall {
    column-count: 2;
  }
}

@media (max-width: 768px) {
  .wall {
    column-count: 1;
  }

  .board-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 22px;
  }

  .board-hero__title {
    font-size: 24px;
  }

  .filters__search,
  .filters__select {
    width: 100%;
  }

  .filters__publish {
    margin-left: 0;
    width: 100%;
  }

  .archive__head {
    flex-direction: column;
    padding: 22px 20px;
  }

  .archive__budget {
    align-items: flex-start;
  }

  .archive__tags,
  .archive__panel {
    padding-left: 20px;
    padding-right: 20px;
  }

  .wanted-form__row {
    grid-template-columns: 1fr;
  }
}

/* ============================================================
 * 减少动效偏好
 * ============================================================ */

@media (prefers-reduced-motion: reduce) {
  .note,
  .note:hover {
    transition: none;
    transform: none;
  }

  .chip,
  .seg__item,
  .archive__back,
  .archive__share {
    transition: none;
  }

  .sk-line,
  .sk-budget {
    animation: none;
  }
}

</style>
