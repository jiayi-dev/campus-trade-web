<template>
  <div class="space" v-loading="loading">

    <!-- ============ ① 校园数字身份卡 Hero ============ -->
    <section class="id-card id-card--float">
      <!-- 卡面装饰纹理 -->
      <div class="id-card__deco">
        <span class="dot d1"></span><span class="dot d2"></span>
        <span class="dot d3"></span><span class="dot d4"></span>
        <span class="dot d5"></span><span class="dot d6"></span>
      </div>
      <div class="id-card__shine"></div>

      <div class="id-card__main">
        <div class="id-card__avatar-wrap">
          <div class="id-card__avatar-ring"></div>
          <div class="id-card__avatar">{{ avatarLetter }}</div>
          <div class="id-card__avatar-badge">
            <el-icon><Medal /></el-icon>
          </div>
        </div>

        <div class="id-card__info">
          <div class="id-card__name-line">
            <h2>{{ profile.username || '同学' }}</h2>
            <span class="role-chip" :class="`role-chip--${profile.role}`">{{ roleLabel }}</span>
          </div>
          <p class="id-card__identity">{{ identitySlogan }}</p>
          <div class="id-card__tags">
            <span class="meta-tag pop-in p1"><el-icon><Postcard /></el-icon>校园编号 No.{{ campusNo }}</span>
            <span class="meta-tag pop-in p2"><el-icon><Clock /></el-icon>{{ formatDateTime(profile.createTime) }} 加入</span>
            <span class="meta-tag pop-in p3">
              <el-icon><CircleCheckFilled /></el-icon>
              账号{{ profile.status === 1 ? '正常' : '已禁用' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 信誉徽章：环形积分 -->
      <div class="credit-badge">
        <svg viewBox="0 0 120 120" class="credit-badge__svg">
          <circle cx="60" cy="60" r="50" class="ring-bg" />
          <circle
              cx="60" cy="60" r="50" class="ring-fg"
              :stroke-dasharray="ring.circumference"
              :stroke-dashoffset="ring.offset"
          />
        </svg>
        <div class="credit-badge__center">
          <div class="credit-badge__score is-num">{{ display.creditScore }}</div>
          <div class="credit-badge__label">信誉积分</div>
        </div>
        <div class="credit-badge__level">
          <el-icon><Trophy /></el-icon>{{ overview.creditLevel || '校园新生' }}
        </div>
      </div>
    </section>

    <!-- ============ ② 交易成长面板 ============ -->
    <section class="block rise">
      <header class="block__head">
        <h3><span class="block__bar"></span>交易成长面板</h3>
        <p>每一次发布与交易，都在积累你的校园信用资产</p>
      </header>

      <div class="growth-grid">
        <div
            v-for="(item, i) in growthItems"
            :key="item.key"
            class="growth-card"
            :class="`growth-card--${item.theme}`"
            @click="item.to && $router.push(item.to)"
        >
          <div class="growth-card__top">
            <el-icon class="growth-card__icon"><component :is="item.icon" /></el-icon>
            <span class="growth-card__hint">{{ item.hint }}</span>
          </div>
          <div class="growth-card__num is-num">{{ display[item.key] }}</div>
          <div class="growth-card__label">{{ item.label }}</div>
          <div class="growth-card__track">
            <div class="growth-card__fill" :style="{ width: item.percent + '%', transitionDelay: (i * 0.08) + 's' }"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ ③ 信誉档案（B2：交易评价 + 卖家信誉） ============ -->
    <section class="block rep rise rise--d1">
      <header class="block__head">
        <h3><span class="block__bar block__bar--gold"></span>卖家信誉档案</h3>
        <p>每一笔真实交易，都在沉淀你的校园口碑资产</p>
      </header>

      <!-- 非卖家：引导态（不说“你没有信誉”，给出建立信誉的路径） -->
      <div v-if="profile.role !== 'seller'" class="rep-empty">
        <div class="rep-empty__seal"><el-icon><Medal /></el-icon></div>
        <div class="rep-empty__main">
          <h4>信誉档案待开启</h4>
          <p>完成交易后即可建立你的校园信誉档案，买家的真实评价会成为你的信用名片</p>
          <el-button type="primary" round @click="$router.push('/seller-apply')">
            去申请成为卖家<el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 卖家：完整信誉档案（信用分/等级 + 评价口碑） -->
      <div v-else class="rep-body" v-loading="repLoading">

        <!-- 左：评分印章 -->
        <div class="rep-score">
          <div class="rep-score__ring">
            <span class="rep-score__num is-num">{{ avgScoreText }}</span>
            <span class="rep-score__total">/ 5.0</span>
          </div>
          <el-rate :model-value="avgScoreValue" disabled allow-half class="rep-score__rate" />
          <div class="rep-score__label">买家平均评分</div>
        </div>

        <!-- 中：三项统计 + 信誉标签 -->
        <div class="rep-mid">
          <div class="rep-stat">
            <span class="rep-stat__num is-num">{{ rep.totalCount || 0 }}</span>
            <span class="rep-stat__label">收到评价</span>
          </div>
          <div class="rep-stat">
            <span class="rep-stat__num is-num">{{ rep.completedCount || 0 }}</span>
            <span class="rep-stat__label">完成交易</span>
          </div>
          <div class="rep-stat">
            <span class="rep-stat__num is-num">{{ rep.creditScore || 100 }}</span>
            <span class="rep-stat__label">信誉积分</span>
          </div>
          <div class="rep-tags">
            <span class="rep-tag rep-tag--level">
              <el-icon><Trophy /></el-icon>{{ rep.creditLevel || '校园新生' }}
            </span>
            <span v-if="isPraiseWorthy" class="rep-tag rep-tag--praise">
              <el-icon><Star /></el-icon>好评如潮
            </span>
            <span v-if="(rep.completedCount || 0) >= 3" class="rep-tag rep-tag--stable">
              <el-icon><CircleCheckFilled /></el-icon>稳定履约
            </span>
          </div>
        </div>

        <!-- 右：评分分布 -->
        <div class="rep-dist">
          <div class="rep-dist__title">评分分布</div>
          <template v-if="(rep.totalCount || 0) > 0">
            <div v-for="row in distRows" :key="row.star" class="rep-dist__row">
              <span class="rep-dist__star">{{ row.star }}星</span>
              <div class="rep-dist__track">
                <div class="rep-dist__fill" :style="{ width: row.percent + '%' }"></div>
              </div>
              <span class="rep-dist__count is-num">{{ row.count }}</span>
            </div>
          </template>
          <p v-else class="rep-dist__empty">暂无评价，完成交易后将逐步积累校园信誉</p>
        </div>

      </div>
    </section>

    <div class="space__two-col">

      <!-- ============ ③ 交易轨迹 + ④ 快捷入口 ============ -->
      <div class="space__left">

        <section class="block rise rise--d1">
          <header class="block__head">
            <h3><span class="block__bar"></span>我的交易轨迹</h3>
            <p>校园集市里的每一个第一次，都值得被记录</p>
          </header>

          <ul class="timeline">
            <li
                v-for="node in timelineNodes"
                :key="node.key"
                class="timeline__item"
                :class="{ 'is-empty': !node.time }"
            >
              <div class="timeline__dot" :class="`timeline__dot--${node.theme}`">
                <el-icon><component :is="node.icon" /></el-icon>
              </div>
              <div class="timeline__body">
                <div class="timeline__title">{{ node.title }}</div>
                <div v-if="node.time" class="timeline__time">{{ formatDateTime(node.time) }}</div>
                <button v-else class="timeline__empty" @click="node.to && $router.push(node.to)">
                  {{ node.emptyText }}<el-icon><ArrowRight /></el-icon>
                </button>
              </div>
            </li>
          </ul>
        </section>

        <section class="block rise rise--d2">
          <header class="block__head">
            <h3><span class="block__bar"></span>校园应用入口</h3>
            <p>常用功能，一键直达</p>
          </header>

          <div class="app-grid">
            <button
                v-for="app in quickApps"
                :key="app.name"
                class="app-tile"
                :class="`app-tile--${app.theme}`"
                @click="$router.push(app.to)"
            >
              <el-icon class="app-tile__icon"><component :is="app.icon" /></el-icon>
              <span class="app-tile__name">{{ app.name }}</span>
              <span class="app-tile__desc">{{ app.desc }}</span>
            </button>
          </div>
        </section>
      </div>

      <!-- ============ ⑤ 卖家认证状态卡 ============ -->
      <div class="space__right">
        <section class="block seller-cert rise rise--d2" v-loading="false">
          <header class="block__head">
            <h3><span class="block__bar"></span>卖家认证</h3>
            <p>官方认证身份，交易更值得信赖</p>
          </header>

          <!-- 已认证卖家 -->
          <div v-if="profile.role === 'seller'" class="cert cert--pass">
            <div class="cert__seal"><el-icon><Medal /></el-icon></div>
            <h4>认证卖家</h4>
            <p>你已通过官方审核，拥有完整卖家权限</p>
            <div v-if="application" class="cert__meta">
              <span>认证时间：{{ formatDateTime(application.reviewTime) }}</span>
            </div>
            <el-button type="primary" round @click="$router.push('/seller')">
              进入卖家工作台<el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>

          <!-- 审核中：三步进度 -->
          <div v-else-if="appStatus === 0" class="cert cert--pending">
            <div class="cert__seal"><el-icon class="is-spinning"><Loading /></el-icon></div>
            <h4>认证审核中</h4>
            <div class="cert-steps">
              <span class="on">提交申请</span><i></i>
              <span class="on">管理员审核</span><i></i>
              <span>开通权限</span>
            </div>
            <div class="cert__meta">
              <span>提交时间：{{ formatDateTime(application.createTime) }}</span>
            </div>
          </div>

          <!-- 已通过（本地角色待刷新） -->
          <div v-else-if="appStatus === 1" class="cert cert--pass">
            <div class="cert__seal"><el-icon><Medal /></el-icon></div>
            <h4>审核已通过</h4>
            <p>卖家权限已开通，刷新身份即可使用</p>
            <el-button type="primary" round @click="refreshToSeller">刷新为卖家身份</el-button>
          </div>

          <!-- 被拒绝 -->
          <div v-else-if="appStatus === 2" class="cert cert--reject">
            <div class="cert__seal"><el-icon><WarningFilled /></el-icon></div>
            <h4>认证未通过</h4>
            <p class="cert__reason">审核意见：{{ application.reviewComment || '管理员未填写意见' }}</p>
            <div class="cert__meta">
              <span>{{ formatDateTime(application.reviewTime) }}</span>
            </div>
            <el-button type="primary" round @click="$router.push('/seller-apply')">
              修改理由重新申请
            </el-button>
          </div>

          <!-- 管理员 -->
          <div v-else-if="profile.role === 'admin'" class="cert cert--admin">
            <div class="cert__seal"><el-icon><UserFilled /></el-icon></div>
            <h4>平台管理员</h4>
            <p>卖家申请审核请在管理后台处理</p>
            <el-button round @click="$router.push('/admin')">前往管理后台</el-button>
          </div>

          <!-- 未申请 -->
          <div v-else class="cert cert--none">
            <div class="cert__seal"><el-icon><Promotion /></el-icon></div>
            <h4>还不是卖家</h4>
            <p>通过认证后即可发布闲置、打理自己的校园小铺</p>
            <el-button type="primary" round @click="$router.push('/seller-apply')">
              去申请成为卖家
            </el-button>
          </div>
        </section>
      </div>
    </div>

    <!-- ============ ⑥ 安全中心 ============ -->
    <section class="block rise rise--d3">
      <header class="block__head">
        <h3><span class="block__bar block__bar--gold"></span>安全中心</h3>
        <p>账号防护盾 · 信息变更需要通过登录身份验证</p>
      </header>

      <div class="shield-grid">
        <div class="shield-card">
          <div class="shield-card__icon shield-card__icon--pink"><el-icon><Iphone /></el-icon></div>
          <div class="shield-card__main">
            <div class="shield-card__title">手机号</div>
            <div class="shield-card__value">{{ maskedPhone || '未绑定' }}</div>
          </div>
          <el-button text type="primary" @click="openProfileDialog">更换</el-button>
        </div>

        <div class="shield-card">
          <div class="shield-card__icon shield-card__icon--gold"><el-icon><Message /></el-icon></div>
          <div class="shield-card__main">
            <div class="shield-card__title">邮箱</div>
            <div class="shield-card__value">{{ profile.email || '未绑定，建议补充' }}</div>
          </div>
          <el-button text type="primary" @click="openProfileDialog">更换</el-button>
        </div>

        <div class="shield-card">
          <div class="shield-card__icon shield-card__icon--blue"><el-icon><Lock /></el-icon></div>
          <div class="shield-card__main">
            <div class="shield-card__title">登录密码</div>
            <div class="shield-card__value">已设置 · 建议定期更换</div>
          </div>
          <el-button text type="primary" @click="openPasswordDialog">修改</el-button>
        </div>
      </div>
    </section>

    <!-- ===== 资料编辑弹窗（手机 / 邮箱） ===== -->
    <el-dialog v-model="profileDialogVisible" title="更换联系方式" width="440px">
      <el-form ref="profileFormRef" :model="profileForm" :rules="profileRules" label-position="top">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="profileForm.phone" maxlength="11" placeholder="11 位手机号">
            <template #prefix><el-icon><Iphone /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="profileForm.email" maxlength="100" placeholder="选填">
            <template #prefix><el-icon><Message /></el-icon></template>
          </el-input>
        </el-form-item>
        <p class="dialog-tip">用户名、角色、账号状态均为系统字段，不支持自行修改</p>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingProfile" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 修改密码弹窗 ===== -->
    <el-dialog v-model="passwordDialogVisible" title="修改登录密码" width="440px">
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password maxlength="32" placeholder="6-32 位" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password maxlength="32" placeholder="再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingPassword" @click="savePassword">确认修改</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  UserFilled, Medal, Trophy, Postcard, Clock, CircleCheckFilled, ArrowRight,
  Goods, Star, Tickets, ShoppingBag, CirclePlus, Shop, MagicStick, Promotion,
  Loading, WarningFilled, Lock, Iphone, Message
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatDateTime } from '../utils/format'

const router = useRouter()

// ================= 数据 =================

const loading = ref(false)
const profile = ref({})
const overview = ref({})

const application = computed(() => profile.value.sellerApplication || null)
const appStatus = computed(() => {
  const s = application.value?.status
  return s === null || s === undefined ? null : Number(s)
})

const roleLabelMap = { admin: '管理员', seller: '认证卖家', student: '在校学生' }
const roleLabel = computed(() => roleLabelMap[profile.value.role] || '用户')
const avatarLetter = computed(() => (profile.value.username || '同').charAt(0).toUpperCase())
const campusNo = computed(() => String(profile.value.userId || 0).padStart(5, '0'))

const identitySlogan = computed(() => {
  if (profile.value.role === 'admin') return '校园集市秩序的守护者'
  if (profile.value.role === 'seller') return '校园闲置流转的认证摊主'
  return '在校园集市里发现好物、遇见同好'
})

// 手机号脱敏：138****0004（展示层脱敏，原始值编辑时才暴露）
const maskedPhone = computed(() => {
  const phone = profile.value.phone
  if (!phone || phone.length !== 11) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
})

// ================= 数字递增动画 =================

const display = ref({
  goodsCount: 0,
  completedOrderCount: 0,
  creditScore: 100,
  favoriteCount: 0,
  pendingOrderCount: 0
})

const animateNumber = (key, target, duration = 900) => {
  const start = performance.now()
  const step = (now) => {
    const p = Math.min((now - start) / duration, 1)
    display.value[key] = Math.round(target * (1 - Math.pow(1 - p, 3)))
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

// ================= 信誉环形进度 =================

const ring = computed(() => {
  const r = 50
  const circumference = 2 * Math.PI * r
  const completed = overview.value.completedOrderCount || 0
  // 距下一等级还需完成的订单数（6 单封顶为信誉之星）
  let percent
  if (completed <= 0) percent = 0
  else if (completed <= 2) percent = completed / 3
  else if (completed <= 5) percent = completed / 6
  else percent = 1
  return { circumference, offset: circumference * (1 - percent) }
})

// ================= 信誉档案（B2：交易评价 + 卖家信誉） =================
//
// 数据来源 GET /evaluations/seller/{userId}：
// 后端用 evaluation JOIN orders 汇总该卖家收到的全部评价，
// 并与 B1 信誉规则（100 + 完成订单数 × 20）统一，前端不做任何写死/二次计算

const rep = ref({})
const repLoading = ref(false)

// 平均评分：无评价时显示占位符，避免伪造 “0.0 分” 口碑
const avgScoreText = computed(() => {
  return (rep.value.totalCount || 0) > 0
      ? Number(rep.value.avgScore || 0).toFixed(1)
      : '--'
})

const avgScoreValue = computed(() => Number(rep.value.avgScore || 0))

// 5 星占比 ≥ 90% 且至少有 3 条评价 → “好评如潮”标签（可解释、可复现）
const isPraiseWorthy = computed(() => {
  const total = rep.value.totalCount || 0
  return total >= 3 && (rep.value.star5 || 0) / total >= 0.9
})

// 评分分布条：5 → 1 星，占比基于真实评价总数
const distRows = computed(() => {
  const total = rep.value.totalCount || 0
  return [5, 4, 3, 2, 1].map(star => {
    const count = Number(rep.value['star' + star] || 0)
    return {
      star,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0
    }
  })
})

const loadReputation = async (userId) => {
  repLoading.value = true
  try {
    rep.value = (await request.get(`/evaluations/seller/${userId}`)) || {}
  } catch (e) {
    // 信誉档案为附加信息，失败不阻塞个人中心主数据
  } finally {
    repLoading.value = false
  }
}

// ================= 成长面板 =================

const growthItems = computed(() => [
  {
    key: 'goodsCount', label: '商品成长值', icon: Goods, theme: 'pink',
    hint: '我发布的商品', percent: Math.min((overview.value.goodsCount || 0) * 20, 100), to: '/goods/publish'
  },
  {
    key: 'completedOrderCount', label: '完成交易', icon: CircleCheckFilled, theme: 'gold',
    hint: '成功交易笔数', percent: Math.min((overview.value.completedOrderCount || 0) * 25, 100), to: '/orders'
  },
  {
    key: 'creditScore', label: '信誉积分', icon: Trophy, theme: 'blue',
    hint: overview.value.creditLevel || '校园新生', percent: 100 - (ring.value.offset / ring.value.circumference) * 100, to: ''
  },
  {
    key: 'favoriteCount', label: '关注热度', icon: Star, theme: 'gold',
    hint: '我的收藏', percent: Math.min((overview.value.favoriteCount || 0) * 20, 100), to: '/goods'
  }
])

// ================= 交易轨迹 =================

const timelineNodes = computed(() => {
  const m = overview.value.milestones || {}
  return [
    {
      key: 'register', title: '加入校园二手', icon: UserFilled, theme: 'pink',
      time: profile.value.createTime, emptyText: '', to: ''
    },
    {
      key: 'firstGoods', title: '第一次发布商品', icon: Goods, theme: 'gold',
      time: m.firstGoodsTime, emptyText: '还没有发布过商品，去发布第一件闲置', to: '/goods/publish'
    },
    {
      key: 'firstOrder', title: '完成第一笔交易', icon: Tickets, theme: 'blue',
      time: m.firstOrderTime, emptyText: '还没有交易记录，去市场淘第一件好物', to: '/goods'
    },
    {
      key: 'lastOrder', title: '最近一次交易', icon: Clock, theme: 'pink',
      time: m.lastOrderTime, emptyText: '最近暂无交易动态', to: '/orders'
    }
  ]
})

// ================= 快捷入口 =================

const quickApps = computed(() => [
  { name: '交易中心', desc: '买入订单与进度', icon: Tickets, theme: 'pink', to: '/orders' },
  { name: '商品市场', desc: '发现校园好物', icon: ShoppingBag, theme: 'gold', to: '/goods' },
  { name: '发布商品', desc: '上架我的闲置', icon: CirclePlus, theme: 'blue', to: '/goods/publish' },
  {
    name: '卖家中心', desc: '店铺与申请', icon: Shop, theme: 'pink',
    to: profile.value.role === 'seller' ? '/seller' : '/seller-apply'
  },
  { name: 'AI 助手', desc: '校园智能问答', icon: MagicStick, theme: 'gold', to: '/ai-assistant' }
])

// ================= 资料编辑 =================

const profileDialogVisible = ref(false)
const profileFormRef = ref()
const savingProfile = ref(false)
const profileForm = reactive({ phone: '', email: '' })

const profileRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^\d{11}$/, message: '手机号应为 11 位数字', trigger: 'blur' }
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const openProfileDialog = () => {
  profileForm.phone = profile.value.phone || ''
  profileForm.email = profile.value.email || ''
  profileDialogVisible.value = true
}

const saveProfile = async () => {
  await profileFormRef.value.validate()
  savingProfile.value = true
  try {
    // 只提交 phone / email；userId 由后端从 Token 链路解析
    profile.value = await request.put('/user/profile', {
      phone: profileForm.phone.trim(),
      email: profileForm.email.trim()
    })
    ElMessage.success('联系方式已更新')
    profileDialogVisible.value = false
  } catch (e) {
    // request.js 已统一提示
  } finally {
    savingProfile.value = false
  }
}

// ================= 修改密码 =================

const passwordDialogVisible = ref(false)
const passwordFormRef = ref()
const savingPassword = ref(false)
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '新密码长度需在 6-32 位之间', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        value !== passwordForm.newPassword ? callback(new Error('两次输入的新密码不一致')) : callback()
      },
      trigger: 'blur'
    }
  ]
}

const openPasswordDialog = () => {
  passwordForm.oldPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordDialogVisible.value = true
}

const savePassword = async () => {
  await passwordFormRef.value.validate()
  savingPassword.value = true
  try {
    await request.put('/user/password', {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    })
    ElMessage.success('密码修改成功，请重新登录')
    passwordDialogVisible.value = false
    // 后端已使该用户所有 Token 失效
    setTimeout(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
      router.push('/login')
    }, 900)
  } catch (e) {
    // request.js 已统一提示
  } finally {
    savingPassword.value = false
  }
}

// 审核已通过但本地角色未更新：同步并通知 Layout 刷新菜单
const refreshToSeller = () => {
  localStorage.setItem('role', 'seller')
  window.dispatchEvent(new CustomEvent('role-changed', { detail: 'seller' }))
  router.push('/seller')
}

// ================= 初始加载 =================

onMounted(async () => {
  loading.value = true
  try {
    // 两个聚合接口并行：profile 已内嵌 sellerApplication，无需再单独请求
    const [pr, ov] = await Promise.allSettled([
      request.get('/user/profile'),
      request.get('/user/profile/overview')
    ])

    if (pr.status === 'fulfilled') {
      profile.value = pr.value || {}
      // 角色以服务端实时值为准（卖家审核通过后刷新即可见）
      const serverRole = profile.value.role
      if (serverRole && serverRole !== localStorage.getItem('role')) {
        localStorage.setItem('role', serverRole)
        window.dispatchEvent(new CustomEvent('role-changed', { detail: serverRole }))
      }
      // 卖家额外加载信誉档案（B2），独立请求不阻塞主数据
      if (profile.value.role === 'seller' && profile.value.userId) {
        loadReputation(profile.value.userId)
      }
    }

    if (ov.status === 'fulfilled') {
      overview.value = ov.value || {}
      animateNumber('goodsCount', overview.value.goodsCount || 0)
      animateNumber('completedOrderCount', overview.value.completedOrderCount || 0)
      animateNumber('favoriteCount', overview.value.favoriteCount || 0)
      animateNumber('pendingOrderCount', overview.value.pendingOrderCount || 0)
      animateNumber('creditScore', overview.value.creditScore || 100, 1100)
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>

/* ============ 页面级独立主题：校园数字档案 ============ */

.space {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rise { animation: rise-in 0.5s ease both; }
.rise--d1 { animation-delay: 0.08s; }
.rise--d2 { animation-delay: 0.16s; }
.rise--d3 { animation-delay: 0.24s; }

@keyframes rise-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============ ① 数字身份卡 ============ */

.id-card {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  padding: 30px 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  color: #fff;
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(255, 255, 255, 0.14), transparent 55%),
    linear-gradient(120deg, #6e5559 0%, #8c6f74 48%, #b39398 100%);
  box-shadow: 0 20px 44px rgba(110, 85, 89, 0.28);
}

@keyframes card-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.id-card--float { animation: rise-in 0.55s ease both, card-float 6s ease-in-out 0.6s infinite; }

.id-card__shine {
  position: absolute;
  top: -60%;
  left: -30%;
  width: 45%;
  height: 220%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.10), transparent);
  transform: rotate(12deg);
  animation: shine-sweep 7s ease-in-out infinite;
}

@keyframes shine-sweep {
  0%, 55% { left: -40%; }
  100% { left: 130%; }
}

.id-card__deco { position: absolute; inset: 0; pointer-events: none; }
.dot { position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.10); }
.d1 { width: 90px; height: 90px; right: 26%; top: -40px; }
.d2 { width: 40px; height: 40px; right: 8%; bottom: 14px; background: rgba(255, 230, 200, 0.16); }
.d3 { width: 14px; height: 14px; left: 46%; top: 18px; }
.d4 { width: 22px; height: 22px; left: 40%; bottom: 10px; }
.d5 { width: 8px; height: 8px; right: 42%; bottom: 26px; }
.d6 { width: 60px; height: 60px; right: 2%; top: -18px; background: rgba(255, 255, 255, 0.06); }

.id-card__main { display: flex; align-items: center; gap: 22px; z-index: 1; }

.id-card__avatar-wrap { position: relative; width: 86px; height: 86px; flex-shrink: 0; }

.id-card__avatar {
  position: relative;
  width: 86px; height: 86px;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.30), rgba(255, 255, 255, 0.10));
  border: 2px solid rgba(255, 255, 255, 0.55);
  display: flex; align-items: center; justify-content: center;
  font-size: 34px; font-weight: 700;
  backdrop-filter: blur(4px);
}

.id-card__avatar-ring {
  position: absolute; inset: -7px;
  border-radius: 50%;
  border: 1.5px dashed rgba(255, 255, 255, 0.45);
  animation: ring-spin 18s linear infinite;
}

@keyframes ring-spin { to { transform: rotate(360deg); } }

.id-card__avatar-badge {
  position: absolute; right: -4px; bottom: -4px;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--brand-accent);
  border: 2.5px solid #8c6f74;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; color: #fff;
}

.id-card__name-line { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.id-card__name-line h2 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }

.role-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.role-chip--seller { background: rgba(201, 168, 92, 0.85); border-color: rgba(255, 235, 200, 0.6); }
.role-chip--admin { background: rgba(255, 255, 255, 0.85); color: #6e5559; border-color: transparent; }

.id-card__identity { margin: 8px 0 14px; font-size: 13px; color: rgba(255, 255, 255, 0.78); }

.id-card__tags { display: flex; gap: 10px; flex-wrap: wrap; }

.meta-tag {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.13);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.9);
}

.pop-in { opacity: 0; animation: pop-in 0.45s ease forwards; }
.p1 { animation-delay: 0.25s; }
.p2 { animation-delay: 0.38s; }
.p3 { animation-delay: 0.51s; }

@keyframes pop-in {
  from { opacity: 0; transform: translateY(6px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* 信誉徽章环 */
.credit-badge {
  position: relative;
  width: 132px; height: 132px;
  flex-shrink: 0;
  z-index: 1;
}

.credit-badge__svg { width: 132px; height: 132px; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(255, 255, 255, 0.16); stroke-width: 8; }
.ring-fg {
  fill: none;
  stroke: #f0d48a;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1);
  filter: drop-shadow(0 0 6px rgba(240, 212, 138, 0.5));
}

.credit-badge__center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}

.credit-badge__score { font-size: 26px; font-weight: 700; line-height: 1; }
.credit-badge__label { margin-top: 4px; font-size: 10.5px; color: rgba(255, 255, 255, 0.7); letter-spacing: 1px; }

.credit-badge__level {
  position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 4px;
  white-space: nowrap;
  font-size: 11.5px; font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--brand-accent);
  color: #fff;
  box-shadow: 0 4px 12px rgba(201, 168, 92, 0.4);
}

/* ============ 通用区块 ============ */

.block {
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: var(--brand-shadow-sm);
}

.block__head { margin-bottom: 18px; }
.block__head h3 {
  margin: 0 0 4px;
  display: flex; align-items: center; gap: 9px;
  font-size: 16.5px;
  color: var(--brand-text);
}
.block__head p { margin: 0; font-size: 12.5px; color: var(--brand-text-secondary); }

.block__bar { width: 4px; height: 17px; border-radius: 4px; background: var(--brand-primary); }
.block__bar--gold { background: var(--brand-accent); }

/* ============ ② 成长面板 ============ */

.growth-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.growth-card {
  position: relative;
  padding: 16px 18px 14px;
  border-radius: 14px;
  border: 1px solid var(--brand-border);
  background: linear-gradient(165deg, var(--card-tint, #fdf1f2) 0%, #fff 68%);
  cursor: default;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  overflow: hidden;
}

.growth-card[class*='growth-card--'] { cursor: pointer; }
.growth-card:hover { transform: translateY(-4px); box-shadow: var(--brand-shadow); }
.growth-card--pink { --card-tint: #fdf1f2; }
.growth-card--gold { --card-tint: #faf4e2; }
.growth-card--blue { --card-tint: #eef2f5; }

.growth-card__top { display: flex; align-items: center; justify-content: space-between; }
.growth-card__icon { font-size: 22px; }
.growth-card--pink .growth-card__icon { color: var(--brand-primary); }
.growth-card--gold .growth-card__icon { color: var(--brand-accent); }
.growth-card--blue .growth-card__icon { color: var(--brand-aux); }

.growth-card__hint { font-size: 11px; color: var(--brand-text-secondary); }
.growth-card__num { margin-top: 10px; font-size: 28px; font-weight: 700; color: var(--brand-text); line-height: 1.05; }
.growth-card__label { margin-top: 3px; font-size: 12.5px; color: var(--brand-text-regular); }

.growth-card__track {
  margin-top: 12px;
  height: 5px;
  border-radius: 99px;
  background: rgba(74, 69, 72, 0.07);
  overflow: hidden;
}

.growth-card__fill {
  height: 100%;
  width: 0;
  border-radius: 99px;
  transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
}
.growth-card--pink .growth-card__fill { background: var(--brand-primary); }
.growth-card--gold .growth-card__fill { background: var(--brand-accent); }
.growth-card--blue .growth-card__fill { background: var(--brand-aux); }

/* ============ 双栏布局 ============ */

.space__two-col {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 18px;
  align-items: start;
}

.space__left { display: flex; flex-direction: column; gap: 18px; }

/* ============ ③ 时间轴 ============ */

.timeline { list-style: none; margin: 0; padding: 0; }

.timeline__item {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: 20px;
}

.timeline__item:last-child { padding-bottom: 0; }

.timeline__item::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 38px;
  bottom: -2px;
  width: 2px;
  background: linear-gradient(var(--brand-border), transparent);
}

.timeline__item:last-child::before { display: none; }

.timeline__dot {
  position: relative;
  z-index: 1;
  width: 40px; height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}

.timeline__dot--pink { background: var(--brand-primary-soft); color: var(--brand-primary); }
.timeline__dot--gold { background: var(--brand-accent-soft); color: var(--brand-accent); }
.timeline__dot--blue { background: var(--brand-aux-soft); color: var(--brand-aux); }

.timeline__item.is-empty .timeline__dot {
  background: var(--brand-bg-soft);
  color: var(--brand-text-secondary);
  opacity: 0.75;
}

.timeline__body { padding-top: 2px; min-width: 0; }
.timeline__title { font-size: 14px; font-weight: 600; color: var(--brand-text); }
.timeline__time { margin-top: 3px; font-size: 12.5px; color: var(--brand-text-secondary); }

.timeline__empty {
  margin-top: 4px;
  padding: 0;
  border: none;
  background: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  color: var(--brand-primary);
  cursor: pointer;
}
.timeline__empty .el-icon { font-size: 13px; }
.timeline__empty:hover { text-decoration: underline; }

/* ============ ④ 应用宫格 ============ */

.app-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.app-tile {
  border: 1px solid var(--brand-border);
  border-radius: 14px;
  background: var(--brand-bg);
  padding: 16px 8px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.app-tile:hover { transform: translateY(-3px); box-shadow: var(--brand-shadow-sm); background: #fff; }

.app-tile__icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 21px;
}

.app-tile--pink .app-tile__icon { background: var(--brand-primary-soft); color: var(--brand-primary); }
.app-tile--gold .app-tile__icon { background: var(--brand-accent-soft); color: var(--brand-accent); }
.app-tile--blue .app-tile__icon { background: var(--brand-aux-soft); color: var(--brand-aux); }

.app-tile__name { font-size: 13px; font-weight: 600; color: var(--brand-text); }
.app-tile__desc { font-size: 10.5px; color: var(--brand-text-secondary); text-align: center; }

/* ============ ⑤ 卖家认证卡 ============ */

.cert {
  text-align: center;
  padding: 10px 8px 4px;
}

.cert__seal {
  width: 72px; height: 72px;
  margin: 4px auto 14px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  color: #fff;
}

.cert--pass .cert__seal {
  background: linear-gradient(145deg, #d9b868, var(--brand-accent));
  box-shadow: 0 10px 24px rgba(201, 168, 92, 0.4);
  animation: seal-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes seal-pop {
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.cert--pending .cert__seal { background: var(--brand-accent); box-shadow: 0 10px 24px rgba(201, 168, 92, 0.32); }
.cert--reject .cert__seal { background: var(--brand-primary); box-shadow: 0 10px 24px rgba(216, 168, 173, 0.35); }
.cert--admin .cert__seal { background: var(--brand-aux); }
.cert--none .cert__seal { background: var(--brand-primary-soft); color: var(--brand-primary); border: 1.5px dashed var(--brand-primary); }

.is-spinning { animation: cert-rotate 1.6s linear infinite; }
@keyframes cert-rotate { to { transform: rotate(360deg); } }

.cert h4 { margin: 0 0 8px; font-size: 17px; color: var(--brand-text); }
.cert p { margin: 0 auto 12px; font-size: 12.5px; line-height: 1.7; color: var(--brand-text-regular); }

.cert__reason {
  text-align: left;
  background: var(--brand-primary-soft);
  border-radius: 10px;
  padding: 8px 12px !important;
  color: var(--brand-text) !important;
}

.cert__meta {
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--brand-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cert-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.cert-steps span { white-space: nowrap; }
.cert-steps .on { color: var(--brand-accent); font-weight: 600; }
.cert-steps i { width: 18px; height: 1.5px; background: var(--brand-border); }

/* ============ ⑥ 安全中心 ============ */

.shield-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.shield-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid var(--brand-border);
  background:
      linear-gradient(135deg, rgba(216, 168, 173, 0.05), transparent 60%),
      var(--brand-bg);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.shield-card:hover { transform: translateY(-2px); box-shadow: var(--brand-shadow-sm); }

.shield-card__icon {
  width: 44px; height: 44px;
  border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  font-size: 21px;
  flex-shrink: 0;
}

.shield-card__icon--pink { background: var(--brand-primary-soft); color: var(--brand-primary); }
.shield-card__icon--gold { background: var(--brand-accent-soft); color: var(--brand-accent); }
.shield-card__icon--blue { background: var(--brand-aux-soft); color: var(--brand-aux); }

.shield-card__main { flex: 1; min-width: 0; }
.shield-card__title { font-size: 12.5px; color: var(--brand-text-secondary); }
.shield-card__value {
  margin-top: 3px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dialog-tip { margin: -4px 0 0; font-size: 12px; color: var(--brand-text-secondary); }

/* ============ ③ 信誉档案（B2） ============ */

/* 非卖家引导态：信用印章 + 文案 */
.rep-empty {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 10px 6px 4px;
}

.rep-empty__seal {
  width: 76px; height: 76px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 36px;
  color: var(--brand-accent);
  background: var(--brand-accent-soft);
  border: 1.5px dashed var(--brand-accent);
}

.rep-empty__main h4 { margin: 0 0 6px; font-size: 16px; color: var(--brand-text); }
.rep-empty__main p { margin: 0 0 14px; font-size: 13px; line-height: 1.7; color: var(--brand-text-regular); }

/* 卖家信誉档案主体：评分印章 | 统计 + 标签 | 评分分布 */
.rep-body {
  display: grid;
  grid-template-columns: auto 1fr 1.1fr;
  gap: 30px;
  align-items: center;
}

/* 左：评分印章（双环 + 金色评分） */
.rep-score { text-align: center; }

.rep-score__ring {
  width: 108px; height: 108px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex; align-items: baseline; justify-content: center;
  padding-top: 30px;
  background:
      radial-gradient(circle at 50% 32%, rgba(201, 168, 92, 0.16), transparent 62%),
      var(--brand-bg);
  border: 2px solid rgba(201, 168, 92, 0.42);
  box-shadow:
      inset 0 0 0 5px #fff,
      inset 0 0 0 6.5px rgba(201, 168, 92, 0.30),
      0 10px 22px rgba(201, 168, 92, 0.18);
}

.rep-score__num {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  color: var(--brand-accent);
}

.rep-score__total { margin-left: 3px; font-size: 12px; color: var(--brand-text-secondary); }

.rep-score__rate { margin-top: 10px; justify-content: center; }
.rep-score__label { margin-top: 6px; font-size: 12px; color: var(--brand-text-secondary); letter-spacing: 1px; }

/* 中：三项统计 + 信誉标签 */
.rep-mid {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: 14px 26px;
  align-content: center;
}

.rep-stat__num { display: block; font-size: 26px; font-weight: 700; color: var(--brand-text); line-height: 1.1; }
.rep-stat__label { display: block; margin-top: 3px; font-size: 12px; color: var(--brand-text-secondary); }

.rep-tags { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }

.rep-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}

.rep-tag--level {
  color: #fff;
  background: linear-gradient(135deg, #d9b868, var(--brand-accent));
  box-shadow: 0 4px 12px rgba(201, 168, 92, 0.32);
}

.rep-tag--praise { color: var(--brand-primary-active); background: var(--brand-primary-soft); }
.rep-tag--stable { color: var(--brand-aux); background: var(--brand-aux-soft); }

/* 右：评分分布条 */
.rep-dist__title { margin-bottom: 10px; font-size: 12.5px; font-weight: 600; color: var(--brand-text-regular); }

.rep-dist__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
}

.rep-dist__row:last-child { margin-bottom: 0; }

.rep-dist__star { width: 30px; flex-shrink: 0; font-size: 12px; color: var(--brand-text-secondary); }

.rep-dist__track {
  flex: 1;
  height: 7px;
  border-radius: 99px;
  background: rgba(74, 69, 72, 0.07);
  overflow: hidden;
}

.rep-dist__fill {
  height: 100%;
  width: 0;
  border-radius: 99px;
  background: linear-gradient(90deg, #e3c887, var(--brand-accent));
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.rep-dist__count { width: 22px; text-align: right; font-size: 12px; color: var(--brand-text-regular); }

.rep-dist__empty { margin: 0; font-size: 12.5px; color: var(--brand-text-secondary); }

/* ============ 响应式 ============ */

@media (max-width: 1020px) {
  .growth-grid { grid-template-columns: repeat(2, 1fr); }
  .space__two-col { grid-template-columns: 1fr; }
  .app-grid { grid-template-columns: repeat(5, 1fr); }
  .rep-body { grid-template-columns: auto 1fr; }
  .rep-dist { grid-column: 1 / -1; }
}

@media (max-width: 760px) {
  .id-card { flex-direction: column; align-items: flex-start; padding: 24px; }
  .credit-badge { align-self: flex-end; margin-top: -96px; }
  .shield-grid { grid-template-columns: 1fr; }
  .app-grid { grid-template-columns: repeat(3, 1fr); }
  .rep-body { grid-template-columns: 1fr; gap: 20px; }
  .rep-mid { grid-template-columns: repeat(3, auto); justify-content: start; }
  .rep-empty { flex-direction: column; text-align: center; }
}

@media (max-width: 480px) {
  .growth-grid { grid-template-columns: 1fr; }
  .app-grid { grid-template-columns: repeat(2, 1fr); }
}

</style>
