<template>
  <!--
    订单中心 / 订单进度台（独立于 /orders 交易中心，单组件承载“列表 + 详情”）
    路由：/orders/center 与 /orders/center/:orderId（可选参数进入详情视图）

    与 OrderList.vue 复用同一套业务规则，但视觉语言完全不同：
      左侧竖向状态轨道 + 右侧时间线卡片流；详情为“交易档案”式纵向大时间线。

    真实接口（无任何模拟成功/假数据）：
      GET  /orders/buyer                          → 买家订单（全量，前端分页）
      GET  /orders/seller                         → 卖家订单（全量，前端分页）
      PUT  /orders/{id}/status { orderStatus: 1 } → 卖家确认已交付（0→1）
      PUT  /orders/{id}/status { orderStatus: 2 } → 买家确认收货（1→2）
      POST /evaluations/status { orderIds }       → 批量评价状态映射
      POST /evaluations                           → 提交评价
      GET  /evaluations/order/{orderId}           → 查询已提交评价

    订单状态机（后端仅支持三态，无取消/退款/关闭）：
      0 待交易 → 1 待买家确认（卖家已交付）→ 2 已完成（买家确认收货）
  -->
  <div class="oc-page">

    <!-- ==================== 列表视图 ==================== -->
    <template v-if="!isDetailMode">

      <!-- Hero：标题 + 真实统计 -->
      <section class="oc-hero">
        <div class="oc-hero__glow"></div>
        <div class="oc-hero__inner">
          <div class="oc-hero__copy">
            <span class="oc-hero__eyebrow">ORDER CENTER · 订单进度台</span>
            <h1 class="oc-hero__title">订单中心</h1>
            <p class="oc-hero__sub">从下单到收货，每一步都看得见。左侧按状态筛选，右侧用时间线追踪进度。</p>
          </div>
          <!-- 统计：全部基于当前视角真实订单数据计算 -->
          <div class="oc-hero__stats">
            <div class="hstat hstat--todo">
              <span class="hstat__num is-num">{{ myTodoCount }}</span>
              <span class="hstat__label">待我处理</span>
            </div>
            <span class="hstat__divider"></span>
            <div class="hstat">
              <span class="hstat__num is-num">{{ totalCount }}</span>
              <span class="hstat__label">全部</span>
            </div>
            <span class="hstat__divider"></span>
            <div class="hstat hstat--pending">
              <span class="hstat__num is-num">{{ pendingCount }}</span>
              <span class="hstat__label">待交易</span>
            </div>
            <span class="hstat__divider"></span>
            <div class="hstat hstat--confirming">
              <span class="hstat__num is-num">{{ confirmingCount }}</span>
              <span class="hstat__label">待买家确认</span>
            </div>
            <span class="hstat__divider"></span>
            <div class="hstat hstat--done">
              <span class="hstat__num is-num">{{ doneCount }}</span>
              <span class="hstat__label">已完成</span>
            </div>
          </div>
        </div>
      </section>

      <div class="oc-main">

        <!-- 左侧竖向状态轨道 -->
        <aside class="rail">
          <div class="rail__head">STATUS · 状态轨道</div>

          <button
              v-for="item in railItems"
              :key="item.key"
              type="button"
              class="rail__item"
              :class="{ 'rail__item--on': statusFilter === item.key }"
              @click="setFilter(item.key)"
          >
            <span class="rail__icon"><component :is="item.icon" /></span>
            <span class="rail__body">
              <span class="rail__label">{{ item.label }}</span>
              <span class="rail__desc">{{ item.desc }}</span>
            </span>
            <span class="rail__badge is-num">{{ item.count }}</span>
          </button>

          <!-- 后端无取消/关闭流程：仅提示，不伪造已取消订单 -->
          <el-tooltip
              placement="right"
              effect="light"
              content="当前系统不支持取消订单（后端无取消接口），仅支持 待交易→待买家确认→已完成 三态流转"
          >
            <div class="rail__item rail__item--locked">
              <span class="rail__icon"><el-icon><Lock /></el-icon></span>
              <span class="rail__body">
                <span class="rail__label">已取消</span>
                <span class="rail__desc">不支持</span>
              </span>
              <span class="rail__badge is-num">—</span>
            </div>
          </el-tooltip>

          <p class="rail__note">
            当前系统不支持取消订单（后端无取消接口）；交易流转：待交易 → 待买家确认 → 已完成。
          </p>
        </aside>

        <!-- 右侧卡片流 -->
        <section ref="streamRef" class="stream">

          <!-- 工具栏：视角分段控件 + 搜索 + 排序 -->
          <div class="stream__tools">
            <div class="seg">
              <button
                  type="button"
                  class="seg__item"
                  :class="{ 'seg__item--on': activeView === 'buyer' }"
                  @click="switchView('buyer')"
              >
                <el-icon><ShoppingBag /></el-icon>
                买家订单
                <span class="seg__count is-num">{{ buyerCount }}</span>
              </button>
              <button
                  type="button"
                  class="seg__item"
                  :class="{ 'seg__item--on': activeView === 'seller' }"
                  @click="switchView('seller')"
              >
                <el-icon><Shop /></el-icon>
                卖家订单
                <span class="seg__count is-num">{{ sellerCount }}</span>
              </button>
            </div>

            <div class="stream__filters">
              <el-input
                  v-model="keyword"
                  class="oc-search"
                  placeholder="搜索商品名称或订单号"
                  clearable
                  :prefix-icon="Search"
                  @input="resetPage"
              />
              <el-select v-model="sortOrder" class="oc-sort" @change="resetPage">
                <el-option label="下单时间：新 → 旧" value="latest" />
                <el-option label="下单时间：旧 → 新" value="earliest" />
                <el-option label="金额：高 → 低" value="amountDesc" />
                <el-option label="金额：低 → 高" value="amountAsc" />
              </el-select>
              <el-button :icon="Refresh" :loading="loading" @click="reload">刷新</el-button>
            </div>
          </div>

          <!-- 错误状态 -->
          <div v-if="loadError" class="state-block">
            <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
            <p class="state-block__title">订单加载失败</p>
            <p class="state-block__desc">网络可能不稳定，稍后再试一次就好</p>
            <el-button type="primary" round @click="reload">重新加载</el-button>
          </div>

          <!-- 骨架屏 -->
          <div v-else-if="loading && orders.length === 0" class="sk-list">
            <div v-for="n in 3" :key="n" class="sk-card">
              <div class="sk-card__media"></div>
              <div class="sk-card__body">
                <div class="sk-line sk-line--lg"></div>
                <div class="sk-line"></div>
                <div class="sk-track"></div>
              </div>
              <div class="sk-ops"></div>
            </div>
          </div>

          <!-- 卡片流 -->
          <template v-else>
            <div v-if="pagedOrders.length" class="stream__list">
              <article
                  v-for="order in pagedOrders"
                  :key="order.orderId"
                  class="oc-card"
                  :class="`oc-card--${statusClass(order.orderStatus)}`"
              >
                <!-- 商品图 -->
                <div class="oc-card__media" @click="goGoods(order.goodsId)">
                  <img
                      v-if="order.imageUrl"
                      :src="resolveImageUrl(order.imageUrl)"
                      alt="商品主图"
                      @error="onImageError(order)"
                  >
                  <div v-else class="oc-card__media-fallback"><el-icon><Picture /></el-icon></div>
                  <span class="oc-card__state" :class="`state-chip--${statusClass(order.orderStatus)}`">
                    {{ statusText(order.orderStatus) }}
                  </span>
                </div>

                <!-- 主体 + 时间线轨道 -->
                <div class="oc-card__main">
                  <div class="oc-card__top">
                    <h3 class="oc-card__name" @click="goGoods(order.goodsId)">
                      {{ order.goodsName || '商品已删除' }}
                    </h3>
                    <span class="oc-card__price is-num">{{ formatPrice(order.price) }}</span>
                  </div>

                  <div class="oc-card__facts">
                    <span class="fact"><el-icon><Tickets /></el-icon>#{{ order.orderId }}</span>
                    <span v-if="order.campus" class="fact"><el-icon><School /></el-icon>{{ order.campus }}</span>
                    <span v-if="order.location" class="fact"><el-icon><Location /></el-icon>{{ order.location }}</span>
                    <span class="fact">
                      <el-icon><User /></el-icon>{{ counterpartyLabel() }}{{ counterpartyName(order) || '已注销' }}
                    </span>
                    <span class="fact"><el-icon><Clock /></el-icon>{{ formatRelativeTime(order.createTime) }}下单</span>
                  </div>

                  <!-- 进度轨道：下单 → 卖家交付 → 买家确认 → 完成 -->
                  <div class="track">
                    <div class="track__rail">
                      <span class="track__fill" :style="{ width: trackPercent(order) }"></span>
                    </div>
                    <div class="track__nodes">
                      <div
                          v-for="(step, i) in TRACK_STEPS"
                          :key="step.key"
                          class="track__node"
                          :class="`track__node--${nodeState(order, i)}`"
                      >
                        <span class="track__dot"></span>
                        <span class="track__text">{{ step.label }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 操作区：规则与 OrderList.vue 的 cardAction 完全一致 -->
                <div class="oc-card__ops">
                  <el-button size="default" class="oc-btn" @click="openDetail(order)">
                    <el-icon><View /></el-icon>订单详情
                  </el-button>

                  <el-button
                      v-if="cardAction(order).kind === 'deliver'"
                      type="primary"
                      size="default"
                      class="oc-btn"
                      :loading="actingId === order.orderId"
                      @click="handleSellerDeliver(order)"
                  >
                    <el-icon v-if="actingId !== order.orderId"><Van /></el-icon>确认已交付
                  </el-button>

                  <el-button
                      v-else-if="cardAction(order).kind === 'confirm'"
                      type="success"
                      size="default"
                      class="oc-btn"
                      :loading="actingId === order.orderId"
                      @click="handleBuyerConfirm(order)"
                  >
                    <el-icon v-if="actingId !== order.orderId"><CircleCheck /></el-icon>确认收货
                  </el-button>

                  <el-button
                      v-else-if="cardAction(order).kind === 'evaluate'"
                      type="warning"
                      size="default"
                      class="oc-btn"
                      :loading="actingId === order.orderId"
                      @click="openEvaluate(order)"
                  >
                    <el-icon v-if="actingId !== order.orderId"><StarFilled /></el-icon>去评价
                  </el-button>

                  <el-button
                      v-else-if="cardAction(order).kind === 'viewEval'"
                      size="default"
                      class="oc-btn"
                      @click="openViewEval(order)"
                  >
                    <el-icon><StarFilled /></el-icon>查看评价
                  </el-button>

                  <div v-else-if="cardAction(order).kind === 'wait'" class="oc-hint oc-hint--wait">
                    <el-icon><Clock /></el-icon>{{ cardAction(order).text }}
                  </div>

                  <div v-else-if="cardAction(order).kind === 'done'" class="oc-hint oc-hint--done">
                    <el-icon><CircleCheckFilled /></el-icon>交易已完成
                  </div>
                </div>
              </article>
            </div>

            <!-- 空状态 -->
            <div v-else class="state-block">
              <el-icon class="state-block__icon state-block__icon--soft"><Box /></el-icon>
              <p class="state-block__title">{{ emptyTitle }}</p>
              <p class="state-block__desc">{{ emptyDesc }}</p>
              <div class="state-block__ops">
                <el-button
                    v-if="activeView === 'buyer' && statusFilter === 'all' && !keyword"
                    type="primary"
                    round
                    @click="router.push('/goods')"
                >去逛逛市场</el-button>
                <el-button
                    v-else-if="activeView === 'seller' && statusFilter === 'all' && !keyword"
                    type="primary"
                    round
                    @click="router.push('/goods/publish')"
                >发布一件闲置</el-button>
                <el-button v-else round @click="resetFilters">查看全部订单</el-button>
              </div>
            </div>

            <!-- 分页：前端分页，后端返回全量 -->
            <div v-if="totalFiltered > 0" class="oc-pager">
              <el-pagination
                  layout="prev, pager, next, total"
                  background
                  :total="totalFiltered"
                  :page-size="pageSize"
                  :current-page="currentPage"
                  @current-change="onPageChange"
              />
            </div>
          </template>
        </section>
      </div>
    </template>

    <!-- ==================== 详情视图（交易档案） ==================== -->
    <template v-else>
      <div class="archive">
        <div class="archive__bar">
          <button type="button" class="archive__back" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>返回订单中心
          </button>
          <span class="archive__crumb">TRADE ARCHIVE · 交易档案</span>
        </div>

        <!-- 加载中 -->
        <div v-if="detailLoading" class="sk-list">
          <div class="sk-card sk-card--detail">
            <div class="sk-card__media"></div>
            <div class="sk-card__body">
              <div class="sk-line sk-line--lg"></div>
              <div class="sk-line"></div>
              <div class="sk-track"></div>
            </div>
          </div>
          <div class="sk-panel">
            <div class="sk-line sk-line--lg"></div>
            <div class="sk-line"></div>
            <div class="sk-line sk-line--sm"></div>
          </div>
        </div>

        <!-- 请求失败 -->
        <div v-else-if="detailError" class="state-block">
          <el-icon class="state-block__icon"><CircleCloseFilled /></el-icon>
          <p class="state-block__title">订单详情加载失败</p>
          <p class="state-block__desc">网络可能不稳定，稍后再试一次就好</p>
          <div class="state-block__ops">
            <el-button type="primary" round @click="loadDetail">重新加载</el-button>
            <el-button round @click="goBack">返回订单中心</el-button>
          </div>
        </div>

        <!-- 不存在 / 无权查看 -->
        <div v-else-if="detailNotFound || !detailOrder" class="state-block">
          <el-icon class="state-block__icon state-block__icon--soft"><Box /></el-icon>
          <p class="state-block__title">订单不存在或无权查看</p>
          <p class="state-block__desc">该订单号未出现在你的买家订单或卖家订单中，可能已被删除或不属于当前账号。</p>
          <div class="state-block__ops">
            <el-button type="primary" round @click="goBack">返回订单中心</el-button>
          </div>
        </div>

        <template v-else>
          <!-- 档案抬头 -->
          <header class="archive__head" :class="`archive__head--${statusClass(detailOrder.orderStatus)}`">
            <div class="archive__head-main">
              <h1 class="archive__title">{{ detailOrder.goodsName || '商品已删除' }}</h1>
              <div class="archive__head-meta">
                <span class="archive__no is-num">订单编号 #{{ detailOrder.orderId }}</span>
                <span class="state-chip" :class="`state-chip--${statusClass(detailOrder.orderStatus)}`">
                  {{ statusText(detailOrder.orderStatus) }}
                </span>
                <span class="archive__time">{{ formatDateTime(detailOrder.createTime) }} 下单</span>
              </div>
            </div>
            <div class="archive__price is-num">{{ formatPrice(detailOrder.price) }}</div>
          </header>

          <div class="archive__grid">

            <!-- 商品摘要 -->
            <section class="panel panel--goods" @click="goGoods(detailOrder.goodsId)">
              <div class="panel__media">
                <img
                    v-if="detailOrder.imageUrl"
                    :src="resolveImageUrl(detailOrder.imageUrl)"
                    alt="商品主图"
                    @error="onImageError(detailOrder)"
                >
                <div v-else class="panel__media-fallback"><el-icon><Picture /></el-icon></div>
              </div>
              <div class="panel__goods">
                <div class="panel__goods-name">{{ detailOrder.goodsName || '商品已删除' }}</div>
                <div class="panel__goods-price is-num">{{ formatPrice(detailOrder.price) }}</div>
                <el-button size="small" type="primary" plain @click.stop="goGoods(detailOrder.goodsId)">
                  查看商品详情<el-icon><View /></el-icon>
                </el-button>
              </div>
            </section>

            <!-- 交易信息 -->
            <section class="panel">
              <h2 class="panel__title">交易信息</h2>
              <dl class="info">
                <div class="info__row">
                  <dt>订单编号</dt>
                  <dd class="is-num">#{{ detailOrder.orderId }}</dd>
                </div>
                <div class="info__row">
                  <dt>下单时间</dt>
                  <dd>{{ formatDateTime(detailOrder.createTime) }}</dd>
                </div>
                <div class="info__row">
                  <dt>买家</dt>
                  <dd>
                    {{ detailOrder.buyerName || '已注销' }}
                    <span v-if="isBuyerOrder(detailOrder)" class="me-tag">我</span>
                  </dd>
                </div>
                <div class="info__row">
                  <dt>卖家</dt>
                  <dd>
                    {{ detailOrder.sellerName || '已注销' }}
                    <span v-if="isSellerOrder(detailOrder)" class="me-tag">我</span>
                  </dd>
                </div>
                <div class="info__row">
                  <dt>校区</dt>
                  <dd>{{ detailOrder.campus || '未填写' }}</dd>
                </div>
                <div class="info__row">
                  <dt>面交地点</dt>
                  <dd>{{ detailOrder.location || '未填写' }}</dd>
                </div>
                <div class="info__row">
                  <dt>当前状态</dt>
                  <dd>
                    <span class="state-chip" :class="`state-chip--${statusClass(detailOrder.orderStatus)}`">
                      {{ statusText(detailOrder.orderStatus) }}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <!-- 交易进程：纵向大时间线 -->
            <section class="panel">
              <h2 class="panel__title">交易进程</h2>
              <ol class="vtl">
                <li
                    v-for="(step, i) in detailSteps"
                    :key="i"
                    class="vtl__item"
                    :class="`vtl__item--${step.state}`"
                >
                  <span class="vtl__node">
                    <el-icon v-if="step.state === 'done'"><Check /></el-icon>
                  </span>
                  <div class="vtl__body">
                    <div class="vtl__name">{{ step.title }}</div>
                    <div class="vtl__desc">{{ step.desc }}</div>
                  </div>
                </li>
              </ol>
            </section>

            <!-- 交易评价 -->
            <section class="panel">
              <h2 class="panel__title">交易评价</h2>

              <div v-if="detailEvalData" class="eval-view">
                <el-rate
                    :model-value="Number(detailEvalData.score)"
                    disabled
                    :max="5"
                    show-text
                    :texts="RATE_TEXTS"
                />
                <div class="eval-view__content">{{ detailEvalData.content }}</div>
                <div class="eval-view__time">
                  <el-icon><Clock /></el-icon>评价于 {{ formatDateTime(detailEvalData.createTime) }}
                </div>
              </div>

              <div
                  v-else-if="Number(detailOrder.orderStatus) === 2 && isBuyerOrder(detailOrder)"
                  class="eval-none"
              >
                <el-icon><StarFilled /></el-icon>
                <span>这次交易还没有评价，去说说你的真实体验吧。</span>
              </div>

              <div v-else-if="Number(detailOrder.orderStatus) === 2" class="eval-none">
                <el-icon><StarFilled /></el-icon>
                <span>买家尚未提交评价。</span>
              </div>

              <div v-else class="eval-none eval-none--muted">
                <el-icon><Clock /></el-icon>
                <span>交易完成后（待交易 → 待买家确认 → 已完成）即可评价本次交易。</span>
              </div>
            </section>
          </div>

          <!-- 底部操作区：与卡片使用同一套角色 + 状态规则 -->
          <footer class="archive__ops">
            <el-button
                v-if="cardAction(detailOrder).kind === 'deliver'"
                type="primary"
                size="large"
                :loading="actingId === detailOrder.orderId"
                @click="handleSellerDeliver(detailOrder)"
            >
              <el-icon v-if="actingId !== detailOrder.orderId"><Van /></el-icon>确认已交付
            </el-button>

            <el-button
                v-else-if="cardAction(detailOrder).kind === 'confirm'"
                type="success"
                size="large"
                :loading="actingId === detailOrder.orderId"
                @click="handleBuyerConfirm(detailOrder)"
            >
              <el-icon v-if="actingId !== detailOrder.orderId"><CircleCheck /></el-icon>确认收货
            </el-button>

            <el-button
                v-else-if="cardAction(detailOrder).kind === 'evaluate'"
                type="warning"
                size="large"
                :loading="actingId === detailOrder.orderId"
                @click="openEvaluate(detailOrder)"
            >
              <el-icon v-if="actingId !== detailOrder.orderId"><StarFilled /></el-icon>去评价这次交易
            </el-button>

            <el-button
                v-else-if="cardAction(detailOrder).kind === 'viewEval'"
                size="large"
                @click="openViewEval(detailOrder)"
            >
              <el-icon><StarFilled /></el-icon>查看我的评价
            </el-button>

            <span v-else-if="cardAction(detailOrder).kind === 'wait'" class="oc-hint oc-hint--wait">
              <el-icon><Clock /></el-icon>{{ cardAction(detailOrder).text }}
            </span>

            <span v-else-if="cardAction(detailOrder).kind === 'done'" class="oc-hint oc-hint--done">
              <el-icon><CircleCheckFilled /></el-icon>交易已完成
            </span>
          </footer>
        </template>
      </div>
    </template>

    <!-- ==================== 评价提交弹窗 ==================== -->
    <el-dialog
        v-model="evaluateDialogVisible"
        title="评价这次交易"
        width="480px"
        :close-on-click-modal="false"
        class="eval-dialog"
    >
      <div v-if="evalTargetOrder" class="eval-target">
        <el-icon><Tickets /></el-icon>
        <span>{{ evalTargetOrder.goodsName || '#' + evalTargetOrder.orderId }}</span>
      </div>

      <el-form
          ref="evalFormRef"
          :model="evalForm"
          :rules="evalRules"
          label-position="top"
          class="eval-form"
      >
        <el-form-item label="本次交易评分" prop="rating">
          <el-rate
              v-model="evalForm.rating"
              :max="5"
              show-text
              :texts="RATE_TEXTS"
              class="eval-rate"
          />
        </el-form-item>

        <el-form-item label="评价内容" prop="content">
          <el-input
              v-model="evalForm.content"
              type="textarea"
              :rows="4"
              maxlength="300"
              show-word-limit
              placeholder="说说商品描述是否准确、卖家沟通是否顺畅、面交体验等，至少 5 个字"
          />
        </el-form-item>

        <p class="eval-tip">
          评价提交后不可修改。后端会校验：当前用户 = 订单买家 · 订单状态 = 已完成 · 尚未评价。
        </p>
      </el-form>

      <template #footer>
        <el-button @click="evaluateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="evalSubmitting" @click="submitEvaluate">提交评价</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 查看评价弹窗 ==================== -->
    <el-dialog v-model="viewEvalDialogVisible" title="我的评价" width="480px" class="eval-dialog">
      <div v-if="viewEvalData" class="eval-view">
        <div class="eval-view__goods">
          <el-icon><Tickets /></el-icon>
          <span>{{ viewEvalData.goodsName || '商品已删除' }}</span>
        </div>
        <el-rate
            :model-value="Number(viewEvalData.score)"
            disabled
            :max="5"
            show-text
            :texts="RATE_TEXTS"
        />
        <div class="eval-view__content">{{ viewEvalData.content }}</div>
        <div class="eval-view__time">
          <el-icon><Clock /></el-icon>评价于 {{ formatDateTime(viewEvalData.createTime) }}
        </div>
      </div>
    </el-dialog>

  </div>
</template>


<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Refresh, Tickets, ShoppingBag, Shop, Clock, Van, Lock, Check,
  CircleCheck, CircleCheckFilled, CircleCloseFilled, Picture, View,
  Location, School, User, StarFilled, ArrowLeft, Box
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { formatPrice, formatDateTime, formatRelativeTime } from '../utils/format'

const route = useRoute()
const router = useRouter()

const currentUserId = Number(localStorage.getItem('userId'))

// 详情视图：路由带 orderId 参数时进入（/orders/center/12）
const isDetailMode = computed(() => !!route.params.orderId)

// =========================
// 列表状态
// =========================

// 视角：buyer 买家订单 / seller 卖家订单
const activeView = ref('buyer')
// 状态筛选：all | pending | confirming | done
const statusFilter = ref('all')
const keyword = ref('')
// 排序：latest 时间新→旧 / earliest 时间旧→新 / amountDesc 金额高→低 / amountAsc 金额低→高
const sortOrder = ref('latest')

const currentPage = ref(1)
const pageSize = 6
// 列表区根节点，翻页后滚动到这里（Layout 的 .content 为滚动容器）
const streamRef = ref(null)

const orders = ref([])
const loading = ref(false)
const loadError = ref(false)
// 正在做状态流转的订单 ID（卖家交付 / 买家确认共用，防重复点击）
const actingId = ref(null)

const buyerCount = ref(0)
const sellerCount = ref(0)

// 评价状态映射：orderId -> { orderId, evaluationId, score }
const evalStatus = ref({})

// =========================
// 详情状态
// =========================

const detailOrder = ref(null)
const detailLoading = ref(false)
const detailError = ref(false)
const detailNotFound = ref(false)
// 详情页展示的已提交评价（GET /evaluations/order/{orderId}）
const detailEvalData = ref(null)

// =========================
// 评价弹窗
// =========================

const evaluateDialogVisible = ref(false)
const evalTargetOrder = ref(null)
const evalSubmitting = ref(false)
const evalFormRef = ref()
const evalForm = reactive({ rating: 5, content: '' })
const RATE_TEXTS = ['很差', '一般', '还行', '满意', '超赞']
const evalRules = {
  rating: [{ required: true, message: '请选择评分', trigger: 'change' }],
  content: [
    { required: true, message: '请填写评价内容', trigger: 'blur' },
    { min: 5, max: 300, message: '评价内容 5-300 字', trigger: 'blur' }
  ]
}

const viewEvalDialogVisible = ref(false)
const viewEvalData = ref(null)

// =========================
// 数据加载
// =========================

// 列表：GET /orders/buyer 或 GET /orders/seller（后端返回全量，前端分页）
const loadList = async () => {
  loading.value = true
  loadError.value = false

  try {
    const url = activeView.value === 'buyer' ? '/orders/buyer' : '/orders/seller'
    const result = await request.get(url)
    orders.value = Array.isArray(result) ? result : []
    await loadEvalStatus()
  } catch (error) {
    loadError.value = true
    orders.value = []
  } finally {
    loading.value = false
  }
}

// 批量查询已完成订单的评价状态：POST /evaluations/status
// 仅买家视角需要（判断显示"去评价"还是"查看评价"）
const loadEvalStatus = async () => {
  if (activeView.value !== 'buyer') {
    evalStatus.value = {}
    return
  }

  const completedIds = orders.value
      .filter(o => Number(o.orderStatus) === 2)
      .map(o => Number(o.orderId))

  if (completedIds.length === 0) {
    evalStatus.value = {}
    return
  }

  try {
    const result = await request.post('/evaluations/status', { orderIds: completedIds })
    evalStatus.value = result || {}
  } catch (error) {
    // 评价状态查询失败不阻断订单列表展示，默认全部"未评价"
    evalStatus.value = {}
  }
}

// 两个视角的真实订单量（分段控件徽标）
const loadCounts = async () => {
  const [buyerRes, sellerRes] = await Promise.allSettled([
    request.get('/orders/buyer'),
    request.get('/orders/seller')
  ])
  if (buyerRes.status === 'fulfilled' && Array.isArray(buyerRes.value)) {
    buyerCount.value = buyerRes.value.length
  }
  if (sellerRes.status === 'fulfilled' && Array.isArray(sellerRes.value)) {
    sellerCount.value = sellerRes.value.length
  }
}

const reload = async () => {
  await Promise.allSettled([loadList(), loadCounts()])
}

// 详情：后端没有 GET /orders/{id}，用买家 + 卖家两接口合并后按 orderId 查找
// 两个接口都要调——当前用户可能是买家，也可能是卖家
const loadDetail = async () => {
  detailLoading.value = true
  detailError.value = false
  detailNotFound.value = false
  detailEvalData.value = null

  const orderId = Number(route.params.orderId)

  try {
    const [buyerRes, sellerRes] = await Promise.all([
      request.get('/orders/buyer'),
      request.get('/orders/seller')
    ])
    const buyerList = Array.isArray(buyerRes) ? buyerRes : []
    const sellerList = Array.isArray(sellerRes) ? sellerRes : []

    buyerCount.value = buyerList.length
    sellerCount.value = sellerList.length

    const found = [...buyerList, ...sellerList].find(o => Number(o.orderId) === orderId) || null

    if (!found) {
      detailOrder.value = null
      detailNotFound.value = true
      return
    }

    detailOrder.value = found
    await loadDetailEval()
  } catch (error) {
    detailError.value = true
    detailOrder.value = null
  } finally {
    detailLoading.value = false
  }
}

// 详情内的评价状态：仅当"当前用户是买家 且 订单已完成"时查询
const loadDetailEval = async () => {
  const order = detailOrder.value
  if (!order || Number(order.orderStatus) !== 2 || !isBuyerOrder(order)) return

  try {
    const map = await request.post('/evaluations/status', { orderIds: [Number(order.orderId)] })
    evalStatus.value = { ...evalStatus.value, ...(map || {}) }

    if (map && map[Number(order.orderId)]) {
      const result = await request.get(`/evaluations/order/${order.orderId}`)
      detailEvalData.value = result || null
    }
  } catch (error) {
    // 评价信息加载失败不阻断详情展示
  }
}

// 操作成功后的刷新：详情页刷新详情，列表页刷新列表 + 计数
const refreshAfterAction = async () => {
  if (isDetailMode.value) await loadDetail()
  else await reload()
}

// =========================
// 统计（当前视角真实数据）
// =========================

const totalCount = computed(() => orders.value.length)
const pendingCount = computed(() => orders.value.filter(o => Number(o.orderStatus) === 0).length)
const confirmingCount = computed(() => orders.value.filter(o => Number(o.orderStatus) === 1).length)
const doneCount = computed(() => orders.value.filter(o => Number(o.orderStatus) === 2).length)

// 待我处理：卖家视角 = 待交付（status 0），买家视角 = 待确认（status 1）
const myTodoCount = computed(() =>
  activeView.value === 'seller' ? pendingCount.value : confirmingCount.value
)

// =========================
// 筛选 / 搜索 / 排序 / 分页（全部前端计算）
// =========================

const STATUS_FILTER_MAP = { pending: 0, confirming: 1, done: 2 }

const searchedOrders = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = orders.value

  if (kw) {
    list = list.filter(o =>
        String(o.goodsName || '').toLowerCase().includes(kw) ||
        String(o.orderId).includes(kw)
    )
  }

  if (statusFilter.value !== 'all') {
    const target = STATUS_FILTER_MAP[statusFilter.value]
    list = list.filter(o => Number(o.orderStatus) === target)
  }

  return [...list].sort((a, b) => {
    if (sortOrder.value === 'amountDesc' || sortOrder.value === 'amountAsc') {
      const pa = Number(a.price) || 0
      const pb = Number(b.price) || 0
      return sortOrder.value === 'amountDesc' ? pb - pa : pa - pb
    }
    const ta = new Date(a.createTime).getTime() || 0
    const tb = new Date(b.createTime).getTime() || 0
    return sortOrder.value === 'earliest' ? ta - tb : tb - ta
  })
})

const totalFiltered = computed(() => searchedOrders.value.length)

const pagedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return searchedOrders.value.slice(start, start + pageSize)
})

const resetPage = () => {
  currentPage.value = 1
}

const onPageChange = (page) => {
  currentPage.value = page
  // 翻页后回到列表顶部，避免停留在上一页的滚动位置
  streamRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const setFilter = (key) => {
  if (statusFilter.value === key) return
  statusFilter.value = key
  resetPage()
}

const switchView = (view) => {
  if (activeView.value === view) return
  activeView.value = view
  statusFilter.value = 'all'
  resetPage()
  loadList()
}

const resetFilters = () => {
  statusFilter.value = 'all'
  keyword.value = ''
  resetPage()
}

// 左侧竖向状态轨道
const railItems = computed(() => [
  { key: 'all', label: '全部', desc: '当前视角的全部交易', icon: Tickets, count: totalCount.value },
  { key: 'pending', label: '待交易', desc: '等待卖家线下交付', icon: Clock, count: pendingCount.value },
  { key: 'confirming', label: '待买家确认', desc: '卖家已交付待确认', icon: Van, count: confirmingCount.value },
  { key: 'done', label: '已完成', desc: '交易已结束留档', icon: CircleCheckFilled, count: doneCount.value }
])

// =========================
// 状态展示（与 OrderList.vue 同一套定义）
// =========================

const statusText = (status) => {
  const s = Number(status)
  if (s === 0) return '待交易'
  if (s === 1) return '待买家确认'
  if (s === 2) return '已完成'
  return '未知'
}

const statusClass = (status) => {
  const s = Number(status)
  if (s === 0) return 'pending'
  if (s === 1) return 'confirming'
  if (s === 2) return 'done'
  return 'unknown'
}

// =========================
// 角色判定（越权拦截在后端，这里只决定按钮怎么显示）
// =========================

const isBuyerOrder = (order) => !!order && Number(order.buyerId) === currentUserId
const isSellerOrder = (order) => !!order && Number(order.sellerId) === currentUserId

/**
 * 按“当前用户角色 + 订单状态”计算应展示的动作（规则与 OrderList.vue 完全一致）
 *   deliver 卖家确认已交付（status=0） / confirm 买家确认收货（status=1）
 *   wait 等待态 / done 已完成 / evaluate 去评价 / viewEval 查看评价
 */
const cardAction = (order, statusMap = evalStatus.value) => {
  if (!order) return { kind: 'none' }

  const s = Number(order.orderStatus)

  if (s === 2) {
    if (isBuyerOrder(order)) {
      const ev = statusMap[Number(order.orderId)]
      return ev ? { kind: 'viewEval' } : { kind: 'evaluate' }
    }
    return { kind: 'done' }
  }

  if (s === 0) {
    return isSellerOrder(order)
        ? { kind: 'deliver' }
        : { kind: 'wait', text: '等待卖家交付' }
  }

  if (s === 1) {
    return isBuyerOrder(order)
        ? { kind: 'confirm' }
        : { kind: 'wait', text: '等待买家确认' }
  }

  return { kind: 'none' }
}

// =========================
// 卡片进度轨道
// =========================

const TRACK_STEPS = [
  { key: 'created', label: '下单' },
  { key: 'delivered', label: '卖家交付' },
  { key: 'confirmed', label: '买家确认' },
  { key: 'done', label: '完成' }
]

// 节点状态：品牌粉=已完成、灰蓝=进行中、灰=未开始
const nodeState = (order, idx) => {
  const s = Number(order.orderStatus)
  const doneNodes = s === 0 ? 1 : (s === 1 ? 2 : 4)
  if (idx < doneNodes) return 'done'
  if (idx === doneNodes) return 'current'
  return 'idle'
}

// 进度条宽度：0 → 25% / 1 → 50% / 2 → 100%
const trackPercent = (order) => {
  const s = Number(order.orderStatus)
  if (s === 2) return '100%'
  if (s === 1) return '50%'
  return '25%'
}

// =========================
// 详情纵向大时间线
// 面交模型：下单 → 卖家交付 → 买家确认 → 完成
// 只有 create_time 是真实时间，其余节点仅显示业务状态，不伪造时间戳
// =========================

const detailSteps = computed(() => {
  const order = detailOrder.value
  if (!order) return []

  const s = Number(order.orderStatus)
  const steps = [{ title: '下单成功', state: 'done', desc: formatDateTime(order.createTime) }]

  if (s === 0) {
    steps.push({ title: '等待卖家交付', state: 'current', desc: '下单后等待卖家在线下面交时交付商品' })
  } else {
    steps.push({ title: '卖家已交付', state: 'done', desc: '卖家已线下交付商品' })

    if (s === 1) {
      steps.push({ title: '等待买家确认', state: 'current', desc: '等待买家确认收到商品' })
    } else {
      steps.push({ title: '买家确认收货', state: 'done', desc: '买家已确认收到商品' })
      steps.push({ title: '交易完成', state: 'done', desc: '本次交易已结束，可评价' })
    }
  }

  return steps
})

// =========================
// 对方信息
// =========================

const counterpartyLabel = () => (activeView.value === 'buyer' ? '卖家：' : '买家：')

const counterpartyName = (order) => {
  if (!order) return ''
  return activeView.value === 'buyer' ? (order.sellerName || '') : (order.buyerName || '')
}

// =========================
// 图片处理
// =========================

const resolveImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  // 后端返回的 URL 已含 /api 前缀，不再二次拼接
  return url
}

const onImageError = (order) => {
  order.imageUrl = ''
}

const goGoods = (goodsId) => {
  if (goodsId) router.push(`/goods/${goodsId}`)
}

// =========================
// 详情入口 / 返回
// =========================

const openDetail = (order) => {
  router.push(`/orders/center/${order.orderId}`)
}

const goBack = () => {
  router.push('/orders/center')
}

// =========================
// 卖家确认已交付：PUT /orders/{id}/status { orderStatus: 1 }
// 后端校验：当前用户 == sellerId 且 当前状态 == 0
// =========================

const handleSellerDeliver = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确认已将「${order.goodsName || '#' + order.orderId}」线下交付给买家吗？交付后将等待买家确认收货。`,
      '确认已交付',
      { confirmButtonText: '确认已交付', cancelButtonText: '再等等', type: 'info' }
    )
  } catch (action) {
    return
  }

  actingId.value = order.orderId

  try {
    const result = await request.put(`/orders/${order.orderId}/status`, { orderStatus: 1 })

    if (result === '已确认交付，等待买家确认收货') {
      ElMessage.success(result)
      await refreshAfterAction()
    } else {
      // 后端状态机拒绝（越权 / 状态已被改变等），以服务端真实状态刷新
      ElMessage.error(result || '操作失败')
      await refreshAfterAction()
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    actingId.value = null
  }
}

// =========================
// 买家确认收货：PUT /orders/{id}/status { orderStatus: 2 }
// 后端校验：当前用户 == buyerId 且 当前状态 == 1
// =========================

const handleBuyerConfirm = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确认已经收到「${order.goodsName || '#' + order.orderId}」并完成交易吗？确认后不可撤销。`,
      '确认收货',
      { confirmButtonText: '确认收到商品并完成交易', cancelButtonText: '再检查一下', type: 'warning' }
    )
  } catch (action) {
    return
  }

  actingId.value = order.orderId

  try {
    const result = await request.put(`/orders/${order.orderId}/status`, { orderStatus: 2 })

    if (result === '交易已完成') {
      ElMessage.success('交易已完成')
      await refreshAfterAction()
    } else {
      ElMessage.error(result || '操作失败')
      await refreshAfterAction()
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    actingId.value = null
  }
}

// =========================
// 评价：提交 / 查看
// 后端规则：当前用户 == 订单买家 · 订单状态 = 2 · 尚未评价 · rating 1-5 · content 5-300
// =========================

const openEvaluate = (order) => {
  evalTargetOrder.value = order
  evalForm.rating = 5
  evalForm.content = ''
  evaluateDialogVisible.value = true
}

const submitEvaluate = async () => {
  await evalFormRef.value.validate()

  evalSubmitting.value = true

  try {
    const result = await request.post('/evaluations', {
      orderId: Number(evalTargetOrder.value.orderId),
      rating: Number(evalForm.rating),
      content: evalForm.content.trim()
    })

    if (result === '评价提交成功') {
      ElMessage.success('评价已提交，感谢你的反馈')
      evaluateDialogVisible.value = false
      await refreshAfterAction()
    } else {
      ElMessage.error(result || '评价提交失败')
    }
  } catch (error) {
    // request.js 已统一提示
  } finally {
    evalSubmitting.value = false
  }
}

const openViewEval = async (order) => {
  try {
    const result = await request.get(`/evaluations/order/${order.orderId}`)
    if (result) {
      viewEvalData.value = result
      viewEvalDialogVisible.value = true
    } else {
      ElMessage.info('该订单尚未评价')
      await refreshAfterAction()
    }
  } catch (error) {
    // request.js 已统一提示
  }
}

// =========================
// 空状态文案（按当前视角 + 筛选给出不同引导）
// =========================

const emptyTitle = computed(() => {
  if (keyword.value) return '没有匹配的订单'
  if (statusFilter.value === 'pending') return '当前没有待交易的订单'
  if (statusFilter.value === 'confirming') return '没有等待确认的订单'
  if (statusFilter.value === 'done') return '还没有完成的订单'
  return activeView.value === 'buyer' ? '还没有买过东西' : '还没有产生交易'
})

const emptyDesc = computed(() => {
  if (keyword.value) return '换个商品名称或订单号再试试。'
  if (statusFilter.value === 'pending') {
    return activeView.value === 'buyer'
        ? '下单成功后，卖家会在线下面交时把商品交给你。'
        : '买家下单后，记得在线下把商品交给对方。'
  }
  if (statusFilter.value === 'confirming') {
    return activeView.value === 'buyer'
        ? '卖家交付后，确认收到商品即可完成交易。'
        : '你已经完成交付，等待买家确认收货即可。'
  }
  if (statusFilter.value === 'done') return '完成的交易会留在这里，作为你的交易档案。'
  return activeView.value === 'buyer'
    ? '去校园市场看看，也许下一件宝贝正在等你。'
    : '发布一件闲置，开始你的第一笔校园交易。'
})

// =========================
// 路由驱动：列表 / 详情共用同一组件，靠参数切换
// =========================

watch(
  () => route.params.orderId,
  (orderId) => {
    if (orderId) {
      loadDetail()
      return
    }
    statusFilter.value = 'all'
    resetPage()
    loadList()
    loadCounts()
  },
  { immediate: true }
)
</script>


<style scoped>

.oc-page {
  width: 100%;
}

/* ==================== Hero ==================== */

.oc-hero {
  position: relative;
  overflow: hidden;
  padding: 30px 30px 26px;
  margin-bottom: 18px;
  border-radius: var(--brand-radius-xl);
  background: linear-gradient(120deg, #fbeef0 0%, #fdf3e4 54%, #fbf6f0 100%);
  box-shadow: var(--brand-shadow-sm);
}

.oc-hero__glow {
  position: absolute;
  right: -60px;
  top: -80px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(216, 168, 173, 0.42), transparent 68%);
  pointer-events: none;
}

.oc-hero__inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 26px;
  flex-wrap: wrap;
}

.oc-hero__copy {
  flex: 1;
  min-width: 240px;
}

.oc-hero__eyebrow {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--brand-primary-active);
}

.oc-hero__title {
  margin: 8px 0 6px;
  font-size: 27px;
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--brand-text);
}

.oc-hero__sub {
  margin: 0;
  font-size: 13px;
  color: var(--brand-text-regular);
}

.oc-hero__stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.hstat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 58px;
}

.hstat__num {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  color: var(--brand-text);
  animation: stat-pop 0.5s ease both;
}

/* 待我处理：醒目计数（浅粉底 + 强调色数字） */
.hstat--todo {
  min-width: 96px;
  padding: 8px 16px;
  border-radius: var(--brand-radius);
  background: linear-gradient(135deg, var(--brand-primary-soft) 0%, var(--brand-accent-soft) 100%);
  box-shadow: var(--brand-shadow-sm);
}

.hstat--todo .hstat__num {
  font-size: 30px;
  color: var(--brand-primary-active);
}

.hstat--todo .hstat__label {
  color: var(--brand-text-regular);
  font-weight: 600;
}

.hstat__label {
  margin-top: 5px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--brand-text-secondary);
}

.hstat__divider {
  width: 1px;
  height: 32px;
  background: linear-gradient(180deg, transparent, var(--brand-border), transparent);
}

/* 数字轻量淡入上浮（纯 CSS 递增观感） */
@keyframes stat-pop {
  from { opacity: 0; transform: translateY(6px) scale(0.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.hstat--pending .hstat__num { color: #c08a3e; }
.hstat--confirming .hstat__num { color: #7a9ea8; }
.hstat--done .hstat__num { color: #7d9d7a; }

/* ==================== 主体：竖向轨道 + 卡片流 ==================== */

.oc-main {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

/* 左侧状态轨道 */

.rail {
  position: sticky;
  top: 0;
  padding: 14px;
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
}

.rail__head {
  padding: 4px 8px 12px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: var(--brand-text-secondary);
}

.rail__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  margin-bottom: 4px;
  border: none;
  border-radius: var(--brand-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, box-shadow 0.18s ease;
}

.rail__item:hover {
  background: var(--brand-bg-soft);
}

.rail__item--on {
  background: linear-gradient(135deg, var(--brand-primary-soft) 0%, #fdf3e4 100%);
  box-shadow: inset 3px 0 0 var(--brand-primary);
}

.rail__icon {
  width: 27px;
  height: 27px;
  flex-shrink: 0;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: var(--brand-bg);
  color: var(--brand-text-regular);
  transition: all 0.18s ease;
}

.rail__item--on .rail__icon {
  background: var(--brand-primary);
  color: #fff;
}

.rail__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.rail__label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text-regular);
}

.rail__item--on .rail__label {
  color: var(--brand-text);
}

.rail__desc {
  font-size: 10.5px;
  color: var(--brand-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail__badge {
  flex-shrink: 0;
  min-width: 24px;
  padding: 2px 7px;
  border-radius: 999px;
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  background: var(--brand-bg);
  color: var(--brand-text-secondary);
}

.rail__item--on .rail__badge {
  background: var(--brand-white);
  color: var(--brand-primary-active);
}

/* 禁用项：后端无取消/关闭能力，不伪造数据 */
.rail__item--locked {
  opacity: 0.48;
  cursor: not-allowed;
}

.rail__item--locked:hover {
  background: transparent;
}

.rail__note {
  margin: 12px 4px 2px;
  padding: 9px 10px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
  font-size: 11px;
  line-height: 1.7;
  color: var(--brand-text-secondary);
}

/* 右侧卡片流 */

.stream {
  min-width: 0;
}

.stream__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px 14px;
  background: var(--brand-white);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
}

.seg {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--brand-bg-soft);
}

.seg__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.seg__item:hover {
  color: var(--brand-text);
}

.seg__item--on {
  background: var(--brand-white);
  color: var(--brand-primary-active);
  box-shadow: var(--brand-shadow-sm);
}

.seg__count {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  background: var(--brand-white);
  color: var(--brand-text-secondary);
}

.seg__item--on .seg__count {
  background: var(--brand-primary-soft);
  color: var(--brand-primary-active);
}

.stream__filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.oc-search {
  width: 232px;
}

.oc-sort {
  width: 186px;
}

.stream__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

/* ==================== 订单卡片（时间线驱动） ==================== */

.oc-card {
  position: relative;
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 150px;
  gap: 20px;
  align-items: center;
  padding: 16px 16px 16px 22px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
  overflow: hidden;
  animation: oc-fade 0.32s ease both;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

/* 状态色条 */
.oc-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--card-accent, #c9c0bb);
  transition: width 0.22s ease;
}

.oc-card--pending { --card-accent: #e0b775; }
.oc-card--confirming { --card-accent: #7a9ea8; }
.oc-card--done { --card-accent: #8fae6c; }
.oc-card--unknown { --card-accent: #c9c0bb; }

.oc-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--brand-shadow);
  border-color: #f0d6d8;
}

.oc-card:hover::before {
  width: 6px;
}

.oc-card__media {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: var(--brand-radius);
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #f6ecdf 0%, #f1e4d4 100%);
}

.oc-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.oc-card__media:hover img {
  transform: scale(1.04);
}

.oc-card__media-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  color: var(--brand-accent);
}

.oc-card__state {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  backdrop-filter: blur(4px);
}

.state-chip {
  display: inline-block;
  padding: 2px 11px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  color: #fff;
}

.state-chip--pending { background: rgba(224, 183, 117, 0.9); }
.state-chip--confirming { background: rgba(122, 158, 168, 0.9); }
.state-chip--done { background: rgba(143, 174, 108, 0.9); }
.state-chip--unknown { background: rgba(154, 142, 136, 0.9); }

.oc-card__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oc-card__top {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.oc-card__name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--brand-text);
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.oc-card__name:hover {
  color: var(--brand-primary);
}

.oc-card__price {
  font-size: 19px;
  font-weight: 800;
  color: var(--brand-primary);
  flex-shrink: 0;
}

.oc-card__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.fact {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 8px;
  background: var(--brand-bg);
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.fact .el-icon {
  font-size: 12.5px;
}

/* 进度轨道 */

.track {
  margin-top: 2px;
}

.track__rail {
  height: 6px;
  border-radius: 6px;
  background: var(--brand-bg-soft);
  overflow: hidden;
}

.track__fill {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-accent) 100%);
  transition: width 0.45s ease;
}

.track__nodes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 7px;
}

.track__node {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--brand-text-secondary);
}

.track__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd3cb;
  flex-shrink: 0;
}

.track__node--done .track__dot { background: var(--brand-primary); }
.track__node--done .track__text { color: var(--brand-text); }

.track__node--current .track__dot {
  background: #7a9ea8;
  box-shadow: 0 0 0 3px rgba(122, 158, 168, 0.18);
}

.track__node--current .track__text {
  color: #5d7d87;
  font-weight: 600;
}

/* 操作区 */

.oc-card__ops {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oc-btn {
  width: 100%;
}

.oc-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
}

.oc-hint--wait {
  color: #5d7d87;
  background: rgba(122, 158, 168, 0.12);
}

.oc-hint--done {
  color: #6f9369;
  background: rgba(143, 174, 108, 0.14);
}

/* ==================== 分页 ==================== */

.oc-pager {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

.oc-pager :deep(.el-pagination) {
  justify-content: center;
  --el-pagination-bg-color: transparent;
  --el-pagination-button-bg-color: var(--brand-white);
}

.oc-pager :deep(.el-pagination.is-background .el-pager li) {
  border-radius: 8px;
  box-shadow: var(--brand-shadow-sm);
}

/* ==================== 骨架屏 ==================== */

.sk-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
}

.sk-card,
.sk-panel {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 150px;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
}

.sk-panel {
  grid-template-columns: 1fr;
  align-items: start;
}

.sk-card__media {
  width: 132px;
  height: 132px;
  border-radius: var(--brand-radius);
}

.sk-card__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-line {
  height: 12px;
  border-radius: 5px;
  width: 70%;
}

.sk-line--lg { height: 16px; width: 46%; }
.sk-line--sm { width: 34%; }

.sk-track {
  height: 6px;
  border-radius: 6px;
  width: 100%;
}

.sk-ops {
  height: 116px;
  border-radius: var(--brand-radius);
}

.sk-card__media,
.sk-ops,
.sk-line,
.sk-track,
.sk-panel > .sk-line {
  background: linear-gradient(90deg, #f6ecdf 25%, #fbf6f0 50%, #f6ecdf 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ==================== 通用状态块（空 / 错误 / 不存在） ==================== */

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 22px;
  margin-top: 16px;
  text-align: center;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
}

.state-block__icon {
  font-size: 46px;
  color: #e0a8a8;
  margin-bottom: 12px;
}

.state-block__icon--soft {
  color: var(--brand-primary);
}

.state-block__title {
  margin: 0 0 6px;
  font-size: 15.5px;
  font-weight: 700;
  color: var(--brand-text);
}

.state-block__desc {
  margin: 0 0 18px;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--brand-text-secondary);
}

.state-block__ops {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ==================== 详情：交易档案 ==================== */

.archive__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.archive__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--brand-border);
  border-radius: 999px;
  background: var(--brand-white);
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-text-regular);
  cursor: pointer;
  transition: all 0.18s ease;
}

.archive__back:hover {
  color: var(--brand-primary-active);
  border-color: var(--brand-primary);
}

.archive__crumb {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--brand-text-secondary);
}

.archive__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  flex-wrap: wrap;
  padding: 24px 26px;
  border-radius: var(--brand-radius-xl);
  background: linear-gradient(120deg, #fbf6f0 0%, #fdf3e4 100%);
  box-shadow: var(--brand-shadow-sm);
  border-left: 4px solid var(--card-accent, #c9c0bb);
}

.archive__head--pending { --card-accent: #e0b775; }
.archive__head--confirming { --card-accent: #7a9ea8; }
.archive__head--done { --card-accent: #8fae6c; }
.archive__head--unknown { --card-accent: #c9c0bb; }

.archive__title {
  margin: 0 0 8px;
  font-size: 23px;
  font-weight: 800;
  color: var(--brand-text);
}

.archive__head-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--brand-text-secondary);
}

.archive__price {
  font-size: 30px;
  font-weight: 800;
  color: var(--brand-primary);
  line-height: 1;
}

.archive__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.panel {
  padding: 20px 22px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
}

.panel__title {
  margin: 0 0 16px;
  padding-left: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-text);
  border-left: 3px solid var(--brand-primary);
  line-height: 1.2;
}

/* 商品摘要 */

.panel--goods {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 18px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.panel--goods:hover {
  border-color: #f0d6d8;
}

.panel__media {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: var(--brand-radius);
  overflow: hidden;
  background: linear-gradient(135deg, #f6ecdf 0%, #f1e4d4 100%);
}

.panel__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.panel__media-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--brand-accent);
}

.panel__goods {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.panel__goods-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--brand-text);
}

.panel__goods-price {
  font-size: 22px;
  font-weight: 800;
  color: var(--brand-primary);
}

/* 交易信息：定义列表（非表格） */

.info {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
}

.info__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info dt {
  font-size: 11.5px;
  color: var(--brand-text-secondary);
}

.info dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
  word-break: break-word;
}

.me-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--brand-primary-active);
  background: var(--brand-primary-soft);
}

/* 纵向大时间线 */

.vtl {
  margin: 0;
  padding: 0 0 0 4px;
  list-style: none;
}

.vtl__item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 22px;
}

.vtl__item:last-child {
  padding-bottom: 0;
}

/* 连接线：只有“已完成”节点之后的线才是品牌色 */
.vtl__item::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 18px;
  bottom: 0;
  width: 2px;
  background: #ece5dd;
}

.vtl__item:last-child::before {
  display: none;
}

.vtl__item--done::before {
  background: linear-gradient(180deg, var(--brand-primary), rgba(216, 168, 173, 0.25));
}

.vtl__node {
  position: relative;
  z-index: 1;
  width: 14px;
  height: 14px;
  margin-top: 3px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  background: #e8ddd0;
  border: 2px solid var(--brand-white);
  box-shadow: 0 0 0 2px #e8ddd0;
}

.vtl__item--done .vtl__node {
  background: var(--brand-primary);
  box-shadow: 0 0 0 2px var(--brand-primary);
}

.vtl__item--current .vtl__node {
  background: #7a9ea8;
  box-shadow: 0 0 0 4px rgba(122, 158, 168, 0.2);
}

.vtl__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.vtl__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-text-secondary);
}

.vtl__item--done .vtl__name {
  color: var(--brand-text);
}

.vtl__item--current .vtl__name {
  color: #5d7d87;
}

.vtl__desc {
  font-size: 12px;
  color: var(--brand-text-secondary);
}

/* 评价区 */

.eval-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.eval-view__goods {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.eval-view__goods .el-icon {
  color: var(--brand-primary);
}

.eval-view__content {
  padding: 14px 16px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--brand-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.eval-view__time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

.eval-view :deep(.el-rate__icon),
.eval-rate :deep(.el-rate__icon) {
  font-size: 26px;
}

.eval-none {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: var(--brand-radius);
  background: var(--brand-primary-soft);
  font-size: 13px;
  color: var(--brand-primary-active);
}

.eval-none--muted {
  background: var(--brand-bg);
  color: var(--brand-text-secondary);
}

/* 底部操作区 */

.archive__ops {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px 22px;
  background: var(--brand-white);
  border: 1px solid var(--brand-border);
  border-radius: var(--brand-radius-lg);
  box-shadow: var(--brand-shadow-sm);
}

/* ==================== 评价弹窗 ==================== */

.eval-dialog :deep(.el-dialog__body) {
  padding: 0 24px 12px;
}

.eval-target {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: var(--brand-radius);
  background: var(--brand-bg);
  border: 1px solid var(--brand-border);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--brand-text);
}

.eval-target .el-icon {
  color: var(--brand-primary);
}

.eval-rate {
  margin: 4px 0 16px;
}

.eval-rate :deep(.el-rate__icon) {
  font-size: 32px;
}

.eval-tip {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--brand-accent);
  background: var(--brand-bg);
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--brand-text-secondary);
}

/* ==================== 动画 ==================== */

@keyframes oc-fade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 系统开启「减少动态效果」时，关闭所有入场动效与过渡 */
@media (prefers-reduced-motion: reduce) {
  .oc-card,
  .hstat__num,
  .sk-card__media,
  .sk-line,
  .sk-track {
    animation: none !important;
  }

  .oc-card,
  .rail__item,
  .track__fill,
  .track__dot,
  .vtl__node {
    transition: none !important;
  }
}

/* ==================== 响应式 ==================== */

@media (max-width: 1080px) {

  /* 左侧竖向轨道 → 横向滚动条 */
  .oc-main {
    grid-template-columns: 1fr;
  }

  .rail {
    position: static;
    display: flex;
    align-items: stretch;
    gap: 8px;
    padding: 10px;
    overflow-x: auto;
  }

  .rail__head,
  .rail__note {
    display: none;
  }

  .rail__item {
    flex: 0 0 auto;
    width: auto;
    min-width: 136px;
    margin-bottom: 0;
    background: var(--brand-bg);
  }

  .rail__item--on {
    background: linear-gradient(135deg, var(--brand-primary-soft) 0%, #fdf3e4 100%);
  }

  .rail__body {
    flex: 0 1 auto;
  }

  .rail__desc {
    display: none;
  }

  .archive__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {

  .oc-hero {
    padding: 22px 20px 20px;
  }

  .oc-hero__title {
    font-size: 22px;
  }

  .oc-hero__stats {
    gap: 10px;
  }

  .hstat {
    min-width: 48px;
  }

  .hstat__num {
    font-size: 21px;
  }

  .stream__tools {
    flex-direction: column;
    align-items: stretch;
  }

  .stream__filters {
    width: 100%;
  }

  .oc-search,
  .oc-sort {
    width: 100%;
  }

  /* 卡片改纵向堆叠 */
  .oc-card,
  .sk-card {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 14px;
  }

  .oc-card__media,
  .sk-card__media {
    width: 100%;
    height: 176px;
  }

  .sk-ops {
    height: 40px;
  }

  .oc-card__ops {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .oc-btn {
    width: auto;
    flex: 1;
    min-width: 104px;
  }

  .track__node {
    font-size: 10.5px;
  }

  .archive__head {
    padding: 20px;
  }

  .archive__title {
    font-size: 19px;
  }

  .archive__price {
    font-size: 24px;
  }

  .info {
    grid-template-columns: 1fr;
  }

  .panel--goods {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel__media {
    width: 100%;
    height: 180px;
  }
}

@media (max-width: 480px) {

  .oc-card__top {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .archive__ops {
    flex-direction: column;
    align-items: stretch;
  }

  .oc-hint {
    justify-content: center;
  }
}

</style>
