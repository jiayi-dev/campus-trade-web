<template>
  <div ref="rootEl" class="sf-page">

    <!-- ================= 顶部安全总览 ================= -->
    <header class="sf-hero reveal">
      <div class="sf-hero__main">
        <span class="sf-hero__kicker">CAMPUS TRADE · 交易安全中心</span>

        <h1 class="sf-hero__title">
          先看安全，<br />
          再谈<span class="sf-hero__title-accent">交易</span>
        </h1>

        <p class="sf-hero__desc">
          校园二手交易大多是同学之间的当面交换，风险往往藏在「图省事、图便宜」的细节里。
          本页把线下面交的经验整理成一份可核对的清单与指南，帮你把每一步都走稳。
        </p>

        <div class="sf-hero__meta">
          <span class="sf-hero__chip">
            <el-icon><CircleCheck /></el-icon>线下面交三原则
          </span>
          <span class="sf-hero__chip">
            <el-icon><Warning /></el-icon>{{ fraudTypes.length }} 类常见骗局
          </span>
          <span class="sf-hero__chip">
            <el-icon><Lock /></el-icon>交易前 / 中 / 后全流程
          </span>
        </div>
      </div>

      <!-- 三原则速览 -->
      <ul class="sf-principles">
        <li class="sf-principle">
          <span class="sf-principle__no">01</span>
          <div class="sf-principle__body">
            <div class="sf-principle__name">见光</div>
            <div class="sf-principle__text">白天、公共场所、人多的地方面交，不去偏僻角落。</div>
          </div>
        </li>
        <li class="sf-principle">
          <span class="sf-principle__no">02</span>
          <div class="sf-principle__body">
            <div class="sf-principle__name">结伴</div>
            <div class="sf-principle__text">约上同学同行，并让室友/家人知道你的行程。</div>
          </div>
        </li>
        <li class="sf-principle">
          <span class="sf-principle__no">03</span>
          <div class="sf-principle__body">
            <div class="sf-principle__name">当面</div>
            <div class="sf-principle__text">当面验货、当面付款，拒绝一切「先转账 / 先发货」。</div>
          </div>
        </li>
      </ul>

      <!-- 页面性质说明：明确不是系统检测、不是官方认证 -->
      <div class="sf-scopeline">
        <el-icon class="sf-scopeline__icon"><InfoFilled /></el-icon>
        <p class="sf-scopeline__text">
          本页内容为<strong>平台整理的安全指引与经验性建议</strong>，
          不是系统对你的账户/交易做出的风险判定，也不代表任何官方安全认证。
          请结合实际情况自行判断，遇到可疑情况及时向身边可信的人求助。
        </p>
      </div>
    </header>

    <!-- ================= 线下面交安全清单 ================= -->
    <section class="sf-section reveal">
      <div class="sf-section__head">
        <div>
          <h2 class="sf-section__title">
            <el-icon class="sf-section__icon"><CircleCheckFilled /></el-icon>
            线下面交安全清单
          </h2>
          <p class="sf-section__desc">赴约前逐条核对，勾掉你已经确认做到的项。</p>
        </div>

        <div class="sf-progress">
          <div class="sf-progress__num is-num">
            {{ checkedIds.length }}<span class="sf-progress__total">/{{ checklist.length }}</span>
          </div>
          <el-progress
              class="sf-progress__bar"
              :percentage="progressPercent"
              :stroke-width="8"
              :show-text="false"
              :color="progressColor"
          />
        </div>
      </div>

      <!-- 完成态提示 -->
      <transition name="sf-drop">
        <div v-if="allChecked" class="sf-allclear">
          <el-icon class="sf-allclear__icon"><CircleCheckFilled /></el-icon>
          <div class="sf-allclear__text">
            <strong>清单已全部核对完成。</strong>
            这只是你自己核对的一遍流程，不代表风险已经归零，实际交易仍需保持警惕。
          </div>
        </div>
      </transition>

      <div class="sf-checklist">
        <button
            v-for="(item, idx) in checklist"
            :key="item.id"
            type="button"
            class="sf-check"
            :class="{ 'is-checked': isChecked(item.id) }"
            @click="toggleCheck(item.id)"
        >
          <el-icon class="sf-check__box">
            <component :is="isChecked(item.id) ? CircleCheckFilled : CircleCheck" />
          </el-icon>
          <span class="sf-check__no is-num">{{ String(idx + 1).padStart(2, '0') }}</span>
          <span class="sf-check__label">{{ item.label }}</span>
        </button>
      </div>

      <div class="sf-checklist__foot">
        <div class="sf-checklist__note">
          <el-icon><InfoFilled /></el-icon>
          <span>
            勾选状态<strong>仅保存在当前浏览器的本地存储</strong>（localStorage），
            <strong>不会上传到服务器</strong>；换设备、换浏览器或清理浏览器数据后会丢失，多设备之间不同步。
          </span>
        </div>
        <el-button text :icon="Refresh" @click="resetChecklist">重置清单</el-button>
      </div>

      <!-- 本地存储不可用时的降级提示 -->
      <el-alert
          v-if="!storeAvailable"
          class="sf-degrade"
          type="warning"
          :closable="false"
          show-icon
          title="当前浏览器无法使用本地存储（可能处于隐私模式或已禁用存储），勾选状态在刷新后不会保留。"
      />
    </section>

    <!-- ================= 常见诈骗类型与识别方法 ================= -->
    <section class="sf-section reveal">
      <div class="sf-section__head">
        <div>
          <h2 class="sf-section__title">
            <el-icon class="sf-section__icon sf-section__icon--warn"><WarningFilled /></el-icon>
            常见诈骗类型与识别方法
          </h2>
          <p class="sf-section__desc">
            下面这些是校园二手场景里比较常见的手法，点击卡片展开「套路表现 / 识别要点 / 应对建议」。
          </p>
        </div>
        <el-button text :icon="ArrowDown" @click="toggleAllFraud">
          {{ allFraudOpen ? '全部收起' : '全部展开' }}
        </el-button>
      </div>

      <div class="sf-fraud">
        <article
            v-for="f in fraudTypes"
            :key="f.id"
            class="sf-fraud__card"
            :class="{ 'is-open': isFraudOpen(f.id) }"
        >
          <button
              type="button"
              class="sf-fraud__head"
              @click="toggleFraud(f.id)"
          >
            <span class="sf-fraud__badge">
              <el-icon><component :is="f.icon" /></el-icon>
            </span>
            <span class="sf-fraud__titles">
              <span class="sf-fraud__title">{{ f.title }}</span>
              <span class="sf-fraud__tag">{{ f.tag }}</span>
            </span>
            <el-icon class="sf-fraud__arrow"><ArrowDown /></el-icon>
          </button>

          <transition name="sf-fold">
            <div v-if="isFraudOpen(f.id)" class="sf-fraud__body">
              <div class="sf-fraud__block sf-fraud__block--trick">
                <div class="sf-fraud__label">套路表现</div>
                <p class="sf-fraud__text">{{ f.trick }}</p>
              </div>
              <div class="sf-fraud__block sf-fraud__block--detect">
                <div class="sf-fraud__label">识别要点</div>
                <ul class="sf-fraud__list">
                  <li v-for="(d, i) in f.detect" :key="i">{{ d }}</li>
                </ul>
              </div>
              <div class="sf-fraud__block sf-fraud__block--advice">
                <div class="sf-fraud__label">应对建议</div>
                <p class="sf-fraud__text">{{ f.advice }}</p>
              </div>
            </div>
          </transition>
        </article>
      </div>
    </section>

    <!-- ================= 交易前 / 中 / 后 三段指南 ================= -->
    <section class="sf-section reveal">
      <div class="sf-section__head">
        <div>
          <h2 class="sf-section__title">
            <el-icon class="sf-section__icon"><Reading /></el-icon>
            交易前 · 交易中 · 交易后
          </h2>
          <p class="sf-section__desc">按时间顺序核对，每一段都有需要你亲手确认的动作。</p>
        </div>
      </div>

      <div class="sf-stages">
        <div
            v-for="stage in stages"
            :key="stage.key"
            class="sf-stage"
            :class="`sf-stage--${stage.key}`"
        >
          <div class="sf-stage__head">
            <span class="sf-stage__dot">
              <el-icon><component :is="stage.icon" /></el-icon>
            </span>
            <div class="sf-stage__meta">
              <div class="sf-stage__name">{{ stage.name }}</div>
              <div class="sf-stage__sub">{{ stage.sub }}</div>
            </div>
          </div>

          <ol class="sf-stage__list">
            <li v-for="(step, i) in stage.steps" :key="i" class="sf-stage__item">
              <span class="sf-stage__idx is-num">{{ i + 1 }}</span>
              <span class="sf-stage__text">{{ step }}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- ================= 安全知识专题 + 风险提示 ================= -->
    <section class="sf-section reveal">
      <div class="sf-section__head">
        <div>
          <h2 class="sf-section__title">
            <el-icon class="sf-section__icon"><Help /></el-icon>
            安全知识专题
          </h2>
          <p class="sf-section__desc">几个交易里最常被问到、也最容易吃亏的知识点。</p>
        </div>
      </div>

      <div class="sf-topics">
        <div v-for="t in topics" :key="t.id" class="sf-topic">
          <div class="sf-topic__head">
            <el-icon class="sf-topic__icon"><component :is="t.icon" /></el-icon>
            <span class="sf-topic__title">{{ t.title }}</span>
          </div>
          <p class="sf-topic__text">{{ t.text }}</p>
        </div>
      </div>

      <div class="sf-risk">
        <el-icon class="sf-risk__icon"><WarningFilled /></el-icon>
        <div class="sf-risk__body">
          <div class="sf-risk__title">风险提示：平台当前能力边界</div>
          <ul class="sf-risk__list">
            <li>平台<strong>没有担保交易 / 资金托管</strong>功能，付款直接发生在你与对方之间，平台不代收、不代付、不冻结资金。</li>
            <li>平台<strong>目前没有在线举报、在线仲裁、在线客服</strong>通道，遇到纠纷无法在本站内提交处理。</li>
            <li>商品描述、图片、信誉数据由用户自行发布，平台暂无法逐一核验真伪，请以当面查验为准。</li>
            <li>涉及金额较大的交易，请更谨慎；一旦发现被骗，请尽快保留证据并报警。</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ================= FAQ ================= -->
    <section class="sf-section reveal">
      <div class="sf-section__head">
        <div>
          <h2 class="sf-section__title">
            <el-icon class="sf-section__icon"><ChatDotRound /></el-icon>
            常见疑问 FAQ
          </h2>
          <p class="sf-section__desc">点击问题展开回答，涉及平台能力的部分会如实说明。</p>
        </div>
      </div>

      <el-collapse v-model="activeFaq" class="sf-faq">
        <el-collapse-item
            v-for="faq in faqs"
            :key="faq.id"
            :name="faq.id"
            :title="faq.q"
        >
          <p class="sf-faq__answer">{{ faq.a }}</p>
        </el-collapse-item>
      </el-collapse>
    </section>

    <!-- ================= 举报与求助入口 ================= -->
    <section class="sf-section reveal">
      <div class="sf-section__head">
        <div>
          <h2 class="sf-section__title">
            <el-icon class="sf-section__icon sf-section__icon--warn"><Bell /></el-icon>
            遇到问题，去哪里求助
          </h2>
          <p class="sf-section__desc">以下为线下 / 校内求助指引，请按实际情况选择。</p>
        </div>
      </div>

      <!-- 如实标注：平台暂无在线举报 -->
      <div class="sf-report sf-report--disabled">
        <div class="sf-report__icon">
          <el-icon><Flag /></el-icon>
        </div>
        <div class="sf-report__body">
          <div class="sf-report__title">
            在线举报
            <el-tag size="small" type="warning" effect="light" round>暂未开放</el-tag>
          </div>
          <p class="sf-report__text">
            平台<strong>暂未提供在线举报功能</strong>，本站内无法提交举报或工单，
            也没有在线客服通道。请不要在此页寻找「一键举报」按钮——它并不存在。
            如需举报商品或账号，请先通过下面的线下渠道说明情况。
          </p>
        </div>
      </div>

      <div class="sf-report-grid">
        <div class="sf-report">
          <div class="sf-report__icon"><el-icon><UserFilled /></el-icon></div>
          <div class="sf-report__body">
            <div class="sf-report__title">校内求助：辅导员 / 班主任</div>
            <p class="sf-report__text">
              遇到纠纷、被威胁或疑似被骗，第一时间联系你的辅导员或班主任，
              他们能协助你对接学校处理，并提醒你保留证据。
            </p>
          </div>
        </div>

        <div class="sf-report">
          <div class="sf-report__icon"><el-icon><Service /></el-icon></div>
          <div class="sf-report__body">
            <div class="sf-report__title">校园安全：保卫处</div>
            <p class="sf-report__text">
              交易地点选在校内时，若现场出现冲突或人身安全风险，就近求助校园保卫处或值班保安。
              具体电话与办公地点请以你就读学校的官方公布信息为准。
            </p>
          </div>
        </div>

        <div class="sf-report sf-report--alert">
          <div class="sf-report__icon"><el-icon><PhoneFilled /></el-icon></div>
          <div class="sf-report__body">
            <div class="sf-report__title">涉及诈骗 / 财物损失：报警</div>
            <p class="sf-report__text">
              一旦确认被骗、被威胁或造成财物损失，请尽快<strong>拨打 110 报警</strong>，
              并保留聊天记录、转账凭证、对方账号信息等证据。
            </p>
          </div>
        </div>

        <div class="sf-report sf-report--muted">
          <div class="sf-report__icon"><el-icon><ChatDotRound /></el-icon></div>
          <div class="sf-report__body">
            <div class="sf-report__title">平台客服（仅为示例说明）</div>
            <p class="sf-report__text">
              平台当前没有在线客服，此处仅作说明：<strong>不要相信任何自称「平台客服」
              并要求你转账、退款、提供验证码的陌生联系方式</strong>——这正是常见的冒充手法之一。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= 页脚说明 ================= -->
    <footer class="sf-foot reveal">
      <el-icon class="sf-foot__icon"><Lock /></el-icon>
      <p class="sf-foot__text">
        本页由平台整理，属于<strong>安全指引与经验性建议</strong>，会随实践持续更新；
        它不是系统检测结果，也不构成法律或安全承诺。祝你在校园里交易顺利。
      </p>
    </footer>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  CircleCheck,
  CircleCheckFilled,
  Warning,
  WarningFilled,
  InfoFilled,
  Lock,
  Key,
  Reading,
  Help,
  ChatDotRound,
  Bell,
  Flag,
  Service,
  PhoneFilled,
  UserFilled,
  ArrowDown,
  Refresh,
  Money,
  CreditCard,
  Position,
  DocumentChecked,
  CircleCloseFilled
} from '@element-plus/icons-vue'

// =================================================================
// 线下面交安全清单（勾选状态仅本地 localStorage 持久化，不上传服务器）
// =================================================================

const STORAGE_KEY = 'ct_safety_checklist'

const storeAvailable = ref(true)
const checkedIds = ref([])

// 探测 localStorage 是否可用（隐私模式 / 被禁用 / 配额异常时返回 false）
const isStoreAvailable = () => {
  try {
    const probe = '__ct_safety_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch (e) {
    return false
  }
}

// 读取本地勾选记录，损坏 / 不可用时降级为空数组，绝不抛异常
const readChecked = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

// 写入勾选记录，失败静默忽略（内存数据仍可用）
const writeChecked = (list) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    // 静默失败
  }
}

// 清单条目：贴合校园二手线下面交的真实场景
const checklist = [
  { id: 'c01', label: '选白天、人流多的公共区域（图书馆门口、食堂广场、教学楼大厅等），不去偏僻角落' },
  { id: 'c02', label: '约同学 / 室友结伴同行，并提前告知他人你的行程与预计返回时间' },
  { id: 'c03', label: '避开天黑后单独赴约，不因对方催促而临时改到陌生时段' },
  { id: 'c04', label: '当面验货：通电开机、试用功能（电子产品查屏幕、接口、电池、按键）' },
  { id: 'c05', label: '核对序列号 / 型号 / 发票 / 保修凭证，与商品描述一致' },
  { id: 'c06', label: '检查有无维修痕迹、进水、暗病（相机、耳机、电脑尤其要细看）' },
  { id: 'c07', label: '坚持当面付款，拒绝任何「先转账 / 先定金 / 先退款 / 先发货」的要求' },
  { id: 'c08', label: '对方临时要求改到陌生或偏僻地点 → 果断拒绝并终止交易' },
  { id: 'c09', label: '不脱离熟悉区域赴约，不去对方指定的陌生出租屋或校外偏远地点' },
  { id: 'c10', label: '价格明显低于市价时提高警惕，问清原因，不因贪便宜而草率付款' },
  { id: 'c11', label: '不轻易出示身份证原件 / 银行卡 / 验证码，不帮对方代收、代付、垫付' },
  { id: 'c12', label: '交易完成后保留聊天记录与转账凭证，出现问题可回溯' }
]

const isChecked = (id) => checkedIds.value.includes(id)

// 完成态：仅当清单非空且全部勾选
const allChecked = computed(
    () => checklist.length > 0 && checkedIds.value.length >= checklist.length
)

const progressPercent = computed(() =>
    Math.round((checkedIds.value.length / checklist.length) * 100)
)

// 进度越高越偏暖金（与品牌强调色一致），未完成时用主色调
const progressColor = computed(() =>
    allChecked.value ? '#c9a85c' : '#d8a8ad'
)

let toastShown = false

const toggleCheck = (id) => {
  if (isChecked(id)) {
    checkedIds.value = checkedIds.value.filter(x => x !== id)
  } else {
    checkedIds.value = [...checkedIds.value, id]
  }

  if (storeAvailable.value) {
    writeChecked(checkedIds.value)
  }

  // 完成反馈：轻量提示，仅触发一次（取消后再完成可再次提示）
  if (allChecked.value) {
    if (!toastShown) {
      ElMessage.success('线下面交清单已全部核对完成，祝你交易顺利')
      toastShown = true
    }
  } else {
    toastShown = false
  }
}

const resetChecklist = async () => {
  if (checkedIds.value.length === 0) {
    ElMessage.info('清单尚未勾选任何项')
    return
  }
  try {
    await ElMessageBox.confirm(
        '将清空本清单在当前浏览器上的全部勾选记录，是否继续？',
        '重置清单',
        { confirmButtonText: '重置', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }
  checkedIds.value = []
  toastShown = false
  writeChecked([])
  ElMessage.success('已重置线下面交清单')
}

// =================================================================
// 常见诈骗类型（展开 / 收起）
// =================================================================

const fraudTypes = [
  {
    id: 'f1',
    icon: CircleCloseFilled,
    title: '假冒买家：要求先发货 / 先退款',
    tag: '高频',
    trick:
        '对方自称买家，要求你先发货、先寄快递，或谎称「多付了钱/付错了」让你先把差价或整笔退款转过去。',
    detect: [
      '正常二手交易应是当面付款或见物付款，没人会在没拿到货前要求卖家先发货',
      '以「平台规则」「系统要求」为由让你先垫资，往往是话术，不是规则',
      '所谓「付错款、需先退款」多是拆解转账的幌子，退出去就收不回'
    ],
    advice:
        '坚持当面交易、当面付款。凡是要求你先发货、先退款、先垫付的，直接拒绝并终止交易。'
  },
  {
    id: 'f2',
    icon: CreditCard,
    title: '假链接 / 假付款截图',
    tag: '高频',
    trick:
        '对方发来一个「付款页面」链接，或直接发一张转账截图，声称「钱已经打给你了，你发货吧/你先发货」。',
    detect: [
      '截图可以伪造，转账记录也可以 P 图，不能作为到账凭据',
      '陌生链接可能是钓鱼页面，用来套取账号、密码或验证码',
      '真正的到账应以你自己账户的实际收款为准，而不是对方发来的图片'
    ],
    advice:
        '只认自己账户里真实到账的记录，不点陌生链接、不填验证码。截图一律不作为发货依据。'
  },
  {
    id: 'f3',
    icon: Money,
    title: '代付 / 垫付骗局',
    tag: '谨慎',
    trick:
        '以「帮我拍一下/代付一下，回头还你」「你先垫付，见面再算」为由，让你替对方付款、垫付或走账。',
    detect: [
      '正常的二手买卖不需要你替对方付任何款',
        '「帮忙代付/走账」常被用于把资金绕进陌生链路，事后很难追回'
    ],
    advice:
        '不替任何人代付、垫付、走账、代收。哪怕对方是「同学」，也要先核实再行动。'
  },
  {
    id: 'f4',
    icon: Position,
    title: '低价诱饵 + 临时加价',
    tag: '常见',
    trick:
        '先用远低于市价的商品吸引你约见面，到场后改口说「便宜那台卖完了」，诱导你买更贵的东西，或临时加价、换货。',
    detect: [
      '价格明显低于市价，且理由含糊（「急用钱」「随便出」）时需要警惕',
      '坚持约在偏僻地点、只说「到了再谈」，往往是话术铺垫'
    ],
    advice:
        '不贪便宜，确认商品与价格再赴约。对方临时加价 / 换货，你有权拒绝并离开。'
  },
  {
    id: 'f5',
    icon: UserFilled,
    title: '冒充学长学姐 / 熟人身份',
    tag: '警惕',
    trick:
        '自称是你同校的学长学姐、社团成员或「朋友介绍」，用熟人身份降低你的警惕，进而要求你先付款或先发货。',
    detect: [
      '仅凭一句「同校」「学长」并不构成信任依据，身份无法验证时按陌生人处理',
      '催促、打感情牌、绕开正常流程，都是降低你防备心的信号'
    ],
    advice:
        '身份无法核实时，一律按公开规则当面交易；关键金额动作前先向认识的人确认。'
  },
  {
    id: 'f6',
    icon: Key,
    title: '要求脱离平台私下转账',
    tag: '谨慎',
    trick:
        '以「平台太麻烦」「私下方便」「给优惠价」为由，要求加陌生微信/QQ，或用不熟悉的支付方式私下转账。',
    detect: [
      '刻意脱离双方都在的平台，往往是为了不留记录、事后难追溯',
      '要求加陌生人好友、扫不明收款码，都是高风险信号'
    ],
    advice:
        '尽量在熟悉的沟通渠道留存记录。任何要求「先私下转账再见面」的，都应拒绝。'
  }
]

const openFraudIds = ref(['f1'])

const isFraudOpen = (id) => openFraudIds.value.includes(id)

const toggleFraud = (id) => {
  if (isFraudOpen(id)) {
    openFraudIds.value = openFraudIds.value.filter(x => x !== id)
  } else {
    openFraudIds.value = [...openFraudIds.value, id]
  }
}

// 全部展开 / 收起
const allFraudOpen = computed(
    () => openFraudIds.value.length === fraudTypes.length
)

const toggleAllFraud = () => {
  openFraudIds.value = allFraudOpen.value ? [] : fraudTypes.map(f => f.id)
}

// =================================================================
// 交易前 / 中 / 后 三段指南
// =================================================================

const stages = [
  {
    key: 'before',
    name: '交易前',
    sub: '把功课做在见面前',
    icon: Reading,
    steps: [
      '仔细核对商品描述与图片，多问细节，必要时再要实拍图或短视频',
      '了解对方身份与信誉：查看卖家主页、历史评价，判断是否长期活跃',
      '约定公开、安全的面交地点与白天时段，把地址和时间发给同行人',
      '心里先定好可接受的价位，不因对方催促、「最后一件」而冲动下单'
    ]
  },
  {
    key: 'during',
    name: '交易中',
    sub: '当面看清、当面付清',
    icon: DocumentChecked,
    steps: [
      '当面逐项验货：外观、功能、配件是否与描述一致，该试的都试一遍',
      '核对序列号 / 型号 / 发票 / 保修凭证，确认来源与描述吻合',
      '坚持当面付款，拒绝先转账、先定金、先退款、先发货等一切要求',
      '留意周围环境，保持手机畅通，人多处交易、不单独进入陌生场所'
    ]
  },
  {
    key: 'after',
    name: '交易后',
    sub: '留证据、防二次受骗',
    icon: ChatDotRound,
    steps: [
      '保留聊天记录、转账凭证与商品的凭证信息，方便日后回溯',
      '拿到东西后尽快再检查一遍，发现问题尽早与对方沟通',
      '警惕事后的「退款 / 补差价 / 平台要你配合处理」类要求，谨防二次诈骗'
    ]
  }
]

// =================================================================
// 安全知识专题
// =================================================================

const topics = [
  {
    id: 't1',
    icon: Position,
    title: '为什么线下面交要尽量选公共场所？',
    text:
        '公共场所人多、有监控、来往同学多，一旦出现纠纷或异常，你能更快被人看到、求助或脱身；' +
        '偏僻角落则缺少见证，风险与处置难度都会明显上升。'
  },
  {
    id: 't2',
    icon: DocumentChecked,
    title: '电子产品验货要看哪些地方？',
    text:
        '手机电脑重点看屏幕坏点、触控、接口、电池健康、摄像头；耳机看左右声道与连接；' +
        '同时核对序列号与保修状态，检查有无拆机、进水、维修痕迹，带简单工具当场试。'
  },
  {
    id: 't3',
    icon: ChatDotRound,
    title: '聊天记录和转账凭证为什么重要？',
    text:
        '它们能还原「约定了什么、付了多少、谁先承诺」的关键事实。' +
        '平台当前没有在线仲裁与资金托管，一旦发生纠纷，这些记录是你向学校或警方说明情况的主要凭据。'
  },
  {
    id: 't4',
    icon: Help,
    title: '「担保交易」到底是什么意思？',
    text:
        '通常指由第三方暂管资金、确认收货后再放款。' +
        '需要如实说明：本平台目前没有担保交易 / 资金托管功能，付款是买卖双方直接完成，平台不代收、不代付。'
  }
]

// =================================================================
// FAQ（可展开折叠面板）
// =================================================================

const activeFaq = ref(['q1'])

const faqs = [
  {
    id: 'q1',
    q: '可以在哪里面交？',
    a:
        '建议选白天的校园公共区域，如食堂广场、图书馆门口、教学楼大厅等有人流、光线好的地方；' +
        '尽量结伴前往，避免偏僻角落、夜间时段和校外陌生住所。本页不提供固定的面交点位清单，' +
        '请结合自己学校的地形与人流选择安全、好求助的地点。'
  },
  {
    id: 'q2',
    q: '对方要求先转账怎么办？',
    a:
        '直接拒绝。没有见到实物、没有当面验货就要求你先转账、先定金、先退款或先发货，' +
        '都属于高风险行为。坚持当面验货、当面付款；对方若以此为由催你或威胁你，请终止交易并考虑求助。'
  },
  {
    id: 'q3',
    q: '东西有明显暗病怎么办？',
    a:
        '当面拆穿是最好的时机：验货时把问题指出来，可以要求降价、更换或直接不买。' +
        '如果已经付款后才发现问题，尽快联系对方协商；平台当前没有在线仲裁通道，' +
        '所以「验货在付款前」这一点尤其重要。'
  },
  {
    id: 'q4',
    q: '交易后后悔了怎么办？',
    a:
        '先与对方友好沟通，看能否协商退换或补偿，并保留沟通记录。' +
        '需要注意的是，平台没有强制退款或资金退回能力，最终取决于双方协商；' +
        '如涉及欺诈，请保留证据并报警处理。'
  },
  {
    id: 'q5',
    q: '平台能担保交易吗？',
    a:
        '不能。请如实理解平台当前的能力边界：本平台没有担保交易、资金托管，' +
        '也没有在线举报、仲裁与在线客服功能，付款与交付都在买卖双方之间直接完成。' +
        '因此更需要你自己把好「当面验货、当面付款」这一关。'
  },
  {
    id: 'q6',
    q: '我的手机号 / 微信号能随便给对方吗？',
    a:
        '不建议随意给出。联系方式一旦泄露，可能被用于骚扰或冒充行骗。' +
        '尽量在双方都在的沟通渠道内交流；确需线下联系时，也优先用平台内消息约定时间地点，' +
        '不要轻易提供身份证号、银行卡、验证码等敏感信息。'
  }
]

// =================================================================
// 滚动进入淡入（尊重 prefers-reduced-motion）
// =================================================================

const rootEl = ref(null)
let observer = null

const initReveal = () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const nodes = rootEl.value ? rootEl.value.querySelectorAll('.reveal') : []

  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
    nodes.forEach(n => n.classList.add('is-visible'))
    return
  }

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })

  nodes.forEach(n => observer.observe(n))
}

onMounted(() => {
  storeAvailable.value = isStoreAvailable()
  checkedIds.value = storeAvailable.value ? readChecked() : []
  if (allChecked.value) toastShown = true
  initReveal()
})

onBeforeUnmount(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>

/* ========== 页面容器与局部色彩 ========== */

.sf-page {
  --sf-danger: #b9705f;          /* 柔和砖红：仅用于风险提示，少量 */
  --sf-danger-soft: #f6e3dd;
  --sf-amber: var(--brand-accent);
  --sf-amber-soft: var(--brand-accent-soft);

  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 8px;
}

/* 通用区块卡片 */
.sf-section {
  background: var(--brand-white);
  border-radius: var(--brand-radius-xl);
  box-shadow: var(--brand-shadow-sm);
  padding: 24px 26px 26px;
}

.sf-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.sf-section__title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-text);
  letter-spacing: 0.4px;
}

.sf-section__icon {
  font-size: 19px;
  color: var(--brand-primary);
}

.sf-section__icon--warn {
  color: var(--brand-accent);
}

.sf-section__desc {
  margin: 7px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--brand-text-secondary);
}

/* ========== 顶部安全总览 ========== */

.sf-hero {
  position: relative;
  padding: 30px 30px 26px;
  border-radius: var(--brand-radius-xl);
  background:
    radial-gradient(circle at 88% 16%, rgba(201, 168, 92, 0.18), transparent 46%),
    radial-gradient(circle at 10% 92%, rgba(216, 168, 173, 0.20), transparent 50%),
    linear-gradient(135deg, #fdf6e9 0%, var(--brand-bg) 60%, #fbeae6 100%);
  box-shadow: var(--brand-shadow-sm);
  border: 1px solid var(--brand-border);
  overflow: hidden;
}

.sf-hero__kicker {
  display: inline-block;
  font-size: 11.5px;
  letter-spacing: 2px;
  font-weight: 600;
  color: var(--brand-primary-active);
  text-transform: uppercase;
}

.sf-hero__title {
  margin: 12px 0 0;
  font-size: 30px;
  line-height: 1.32;
  font-weight: 800;
  color: var(--brand-text);
  letter-spacing: 0.6px;
}

.sf-hero__title-accent {
  color: var(--brand-accent);
}

.sf-hero__desc {
  max-width: 640px;
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.85;
  color: var(--brand-text-regular);
}

.sf-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.sf-hero__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--brand-text-regular);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--brand-border);
}

.sf-hero__chip .el-icon {
  font-size: 14px;
  color: var(--brand-accent);
}

/* 三原则速览 */
.sf-principles {
  list-style: none;
  margin: 22px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sf-principle {
  display: flex;
  gap: 12px;
  padding: 15px 16px;
  border-radius: var(--brand-radius-lg);
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid var(--brand-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.sf-principle:hover {
  transform: translateY(-2px);
  box-shadow: var(--brand-shadow-sm);
}

.sf-principle__no {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-accent);
  font-variant-numeric: tabular-nums;
}

.sf-principle__name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--brand-text);
}

.sf-principle__text {
  margin-top: 5px;
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--brand-text-secondary);
}

/* 页面性质说明条 */
.sf-scopeline {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 20px;
  padding: 13px 16px;
  border-radius: var(--brand-radius);
  background: var(--sf-amber-soft);
  border-left: 3px solid var(--brand-accent);
}

.sf-scopeline__icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 15px;
  color: var(--brand-accent-hover);
}

.sf-scopeline__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.sf-scopeline__text strong {
  color: var(--brand-text);
}

/* ========== 线下面交安全清单 ========== */

.sf-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
  width: 140px;
}

.sf-progress__num {
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-accent);
}

.sf-progress__total {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-secondary);
}

.sf-progress__bar {
  width: 140px;
}

/* 完成态横幅 */
.sf-allclear {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 13px 16px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-accent-soft);
  border: 1px solid rgba(201, 168, 92, 0.38);
}

.sf-allclear__icon {
  margin-top: 1px;
  font-size: 18px;
  color: var(--brand-accent-hover);
}

.sf-allclear__text {
  font-size: 12.5px;
  line-height: 1.75;
  color: var(--brand-text-regular);
}

.sf-allclear__text strong {
  color: var(--brand-accent-hover);
}

/* 清单网格 */
.sf-checklist {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sf-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 13px 15px;
  text-align: left;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--brand-text-regular);
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease, color 0.2s ease;
}

.sf-check:hover {
  border-color: var(--brand-primary);
  background: var(--brand-primary-soft);
}

.sf-check:active {
  transform: scale(0.99);
}

.sf-check__box {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 17px;
  color: var(--brand-primary);
  transition: color 0.2s ease, transform 0.2s ease;
}

.sf-check.is-checked {
  background: var(--brand-accent-soft);
  border-color: rgba(201, 168, 92, 0.5);
  color: var(--brand-text);
}

.sf-check.is-checked .sf-check__box {
  color: var(--brand-accent-hover);
  transform: scale(1.06);
}

.sf-check__no {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-text-secondary);
}

.sf-check.is-checked .sf-check__no {
  color: var(--brand-accent-hover);
}

.sf-check__label {
  flex: 1;
}

.sf-check.is-checked .sf-check__label {
  text-decoration: line-through;
  text-decoration-color: rgba(201, 168, 92, 0.6);
}

/* 清单脚注 */
.sf-checklist__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--brand-border);
}

.sf-checklist__note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--brand-text-secondary);
}

.sf-checklist__note .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--brand-aux);
}

.sf-checklist__note strong {
  color: var(--brand-text-regular);
}

.sf-degrade {
  margin-top: 14px;
  border-radius: var(--brand-radius);
}

/* ========== 常见诈骗类型 ========== */

.sf-fraud {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sf-fraud__card {
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.sf-fraud__card:hover {
  border-color: var(--brand-primary);
}

.sf-fraud__card.is-open {
  background: var(--brand-white);
  border-color: rgba(185, 112, 95, 0.4);
  box-shadow: var(--brand-shadow-sm);
}

.sf-fraud__head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  font-family: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
}

.sf-fraud__badge {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 17px;
  color: var(--sf-danger);
  background: var(--sf-danger-soft);
}

.sf-fraud__titles {
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.sf-fraud__title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.sf-fraud__tag {
  padding: 1px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sf-danger);
  background: var(--sf-danger-soft);
}

.sf-fraud__arrow {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--brand-text-secondary);
  transition: transform 0.25s ease;
}

.sf-fraud__card.is-open .sf-fraud__arrow {
  transform: rotate(180deg);
  color: var(--sf-danger);
}

.sf-fraud__body {
  padding: 2px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sf-fraud__block {
  padding: 12px 14px;
  border-radius: var(--brand-radius);
  border-left: 3px solid var(--brand-border);
  background: var(--brand-bg-soft);
}

.sf-fraud__block--trick {
  border-left-color: var(--sf-danger);
}

.sf-fraud__block--detect {
  border-left-color: var(--brand-accent);
}

.sf-fraud__block--advice {
  border-left-color: var(--brand-primary);
}

.sf-fraud__label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--brand-text-regular);
}

.sf-fraud__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.sf-fraud__list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--brand-text-regular);
}

/* ========== 交易三阶段 ========== */

.sf-stages {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.sf-stage {
  display: flex;
  flex-direction: column;
  padding: 18px 18px 20px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
  border-top: 3px solid var(--brand-primary);
}

.sf-stage--before {
  border-top-color: var(--brand-primary);
}

.sf-stage--during {
  border-top-color: var(--brand-accent);
}

.sf-stage--after {
  border-top-color: var(--sf-danger);
}

.sf-stage__head {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 14px;
}

.sf-stage__dot {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 17px;
  color: #fff;
  background: var(--brand-sidebar-gradient);
}

.sf-stage__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--brand-text);
}

.sf-stage__sub {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.sf-stage__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sf-stage__item {
  display: flex;
  gap: 9px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--brand-text-regular);
}

.sf-stage__idx {
  flex-shrink: 0;
  width: 19px;
  height: 19px;
  margin-top: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: var(--brand-primary);
}

.sf-stage--during .sf-stage__idx {
  background: var(--brand-accent);
}

.sf-stage--after .sf-stage__idx {
  background: var(--sf-danger);
}

/* ========== 安全知识专题 + 风险提示 ========== */

.sf-topics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sf-topic {
  padding: 16px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.sf-topic:hover {
  border-color: var(--brand-primary);
  transform: translateY(-2px);
}

.sf-topic__head {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 8px;
}

.sf-topic__icon {
  font-size: 16px;
  color: var(--brand-accent);
}

.sf-topic__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
}

.sf-topic__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--brand-text-regular);
}

.sf-risk {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--sf-danger-soft);
  border-left: 3px solid var(--sf-danger);
}

.sf-risk__icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 18px;
  color: var(--sf-danger);
}

.sf-risk__title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--sf-danger);
  margin-bottom: 8px;
}

.sf-risk__list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--brand-text-regular);
}

.sf-risk__list strong {
  color: var(--sf-danger);
}

/* ========== FAQ ========== */

.sf-faq {
  border: none;
}

.sf-faq :deep(.el-collapse-item) {
  margin-bottom: 10px;
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  overflow: hidden;
  background: var(--brand-bg);
}

.sf-faq :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 50px;
  padding: 12px 18px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
  background: transparent;
  border-bottom: none;
  line-height: 1.5;
}

.sf-faq :deep(.el-collapse-item__header.is-active) {
  color: var(--brand-accent-hover);
}

.sf-faq :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: var(--brand-white);
}

.sf-faq :deep(.el-collapse-item__content) {
  padding: 0 18px 16px;
}

.sf-faq__answer {
  margin: 0;
  font-size: 13px;
  line-height: 1.9;
  color: var(--brand-text-regular);
}

/* ========== 举报与求助入口 ========== */

.sf-report {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 16px 18px;
  border-radius: var(--brand-radius-lg);
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
}

.sf-report--disabled {
  background: var(--sf-danger-soft);
  border-color: rgba(185, 112, 95, 0.35);
  margin-bottom: 14px;
}

.sf-report__icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 19px;
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

.sf-report--disabled .sf-report__icon {
  color: var(--sf-danger);
  background: rgba(255, 255, 255, 0.7);
}

.sf-report--alert .sf-report__icon {
  color: var(--sf-danger);
  background: var(--sf-danger-soft);
}

.sf-report--muted .sf-report__icon {
  color: var(--brand-aux);
  background: var(--brand-aux-soft);
}

.sf-report__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
  margin-bottom: 6px;
}

.sf-report__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--brand-text-regular);
}

.sf-report__text strong {
  color: var(--sf-danger);
}

.sf-report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

/* ========== 页脚 ========== */

.sf-foot {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 18px 22px;
  border-radius: var(--brand-radius-xl);
  background: var(--brand-bg-soft);
  border: 1px dashed var(--brand-border);
}

.sf-foot__icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 17px;
  color: var(--brand-primary);
}

.sf-foot__text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--brand-text-secondary);
}

.sf-foot__text strong {
  color: var(--brand-text-regular);
}

/* ========== 过渡动画 ========== */

.sf-drop-enter-active,
.sf-drop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.sf-drop-enter-from,
.sf-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.sf-fold-enter-active,
.sf-fold-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
  transform-origin: top;
}

.sf-fold-enter-from,
.sf-fold-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ========== 滚动进入淡入 ========== */

.reveal {
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}

.reveal.is-visible {
  opacity: 1;
  transform: none;
}

/* ========== 响应式 ========== */

@media (max-width: 960px) {
  .sf-principles,
  .sf-stages {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .sf-section {
    padding: 20px 18px 22px;
  }

  .sf-hero {
    padding: 24px 20px 22px;
  }

  .sf-hero__title {
    font-size: 24px;
  }

  .sf-checklist,
  .sf-topics,
  .sf-report-grid {
    grid-template-columns: 1fr;
  }

  .sf-section__head {
    flex-direction: column;
  }

  .sf-progress {
    width: 100%;
    align-items: flex-start;
  }

  .sf-progress__bar {
    width: 100%;
  }

  .sf-checklist__foot {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

</style>
