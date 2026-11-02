# 校园二手交易平台 · 前端（campus-trade-web）

Vue 3 + Vite + Element Plus 前端应用，通过 Axios 调用后端 RESTful API，覆盖校园闲置交易、求购、社区、私聊、卖家工作台与运营后台。

- 后端仓库：[campus-trade](https://github.com/jiayi-dev/campus-trade)
- 部署与演示数据方案：[DEPLOYMENT_AND_DEMO_DATA_PLAN.md](https://github.com/jiayi-dev/campus-trade/blob/v1.1/DEPLOYMENT_AND_DEMO_DATA_PLAN.md)（仓库推送后生效）

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue（`<script setup>`） | 3.5 |
| 构建 | Vite | 8.x |
| UI 组件库 | Element Plus | 2.14 |
| 路由 | Vue Router（`createWebHistory`） | 5.3 |
| HTTP | Axios | 1.20 |
| 可视化 | ECharts | 6.1 |

## 本地启动

```bash
npm install
npm run dev      # 开发服务器 http://localhost:8081
npm run build    # 生产构建，产物输出 dist/
npm run preview  # 本地预览构建产物
```

> 需先启动后端服务（默认 `http://localhost:8080`）。`vite.config.js` 已将 `/api` 代理到后端，前端代码中的请求与图片地址全部使用相对路径 `/api`。

## 页面清单

### 公开页面（游客可访问）

| 页面 | 路由 | 说明 |
|------|------|------|
| 产品首页 | `/landing` | 未登录用户第一站，含精选商品 |
| 登录 / 注册 | `/login`、`/register` | 三种身份入口，支持 `?redirect=` 回跳 |
| 商品中心 | `/goods` | 搜索 / 分类筛选 / 价格筛选 / 分页 |
| 商品详情 | `/goods/:id` | 多图画廊、卖家信誉、留言、收藏、下单 |
| 专题集市 | `/discover` | 编辑式专题探索与商品聚合 |
| 交易安全中心 | `/safety` | 平台安全指引 |
| AI 助手 | `/ai-assistant` | 游客可用，SSE 流式问答 |
| 卖家主页 | `/seller/:id` | 商品与信誉展示，联系方式需登录 |

### 登录后页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 个人工作台 | `/home` | 数据看板与快捷入口（含 ECharts） |
| 发布商品 | `/goods/publish` | 四步向导：信息 / 图片 / 定价 / 确认 |
| 编辑商品 | `/publish?id=N` | 编辑已有商品 |
| 交易中心 | `/orders` | 买家 / 卖家订单列表与状态流转 |
| 订单中心 | `/orders/center/:orderId?` | 单笔订单详情、评价、申诉 |
| 消息中心 | `/messages` | 用户私聊、未读红点、图片与订单卡片 |
| 求购市场 | `/wanted`、`/wanted/:wantedId` | 发布求购、多条报价、选定报价 |
| 校园社区 | `/community`、`/community/:postId` | 动态流、评论、点赞、关联商品 |
| 收藏与足迹 | `/me/collections` | 服务端收藏 + 本地浏览足迹 |
| 个人中心 | `/profile` | 资料、头像、密码、数据概览 |
| 申请成为卖家 | `/seller-apply` | 学生提交申请，管理员审核 |
| 我的店铺 | `/seller` | 商品管理与订单处理 |
| 经营工作台 | `/seller/dashboard` | 经营数据驾驶舱 |
| 管理后台 | `/admin` | 用户 / 商品 / 订单 / 卖家申请 / 操作记录 |
| 运营数据中心 | `/admin/analytics` | 平台数据洞察 |

> `src/views/Dashboard.vue` 为历史视图组件，当前路由未引用。

## 目录结构

```text
src/
├── main.js                 # 应用入口
├── App.vue
├── router/index.js         # 路由表 + 登录/角色守卫 + 标题
├── views/                  # 27 个页面视图
├── components/             # GoodsCard / GoodsDetailPreview / ConversationSidebar / StatCard
├── utils/
│   ├── request.js          # Axios 封装：Bearer Token、统一错误提示
│   ├── auth.js             # Token / 角色本地存取
│   ├── avatar.js           # 头像地址解析
│   ├── image.js            # 商品图片解析与兜底
│   ├── upload.js           # 图片上传
│   ├── footprint.js        # 浏览足迹（localStorage）
│   ├── format.js           # 价格/时间格式化
│   └── scenes.js           # 专题集市配置
└── styles/index.css        # 全局样式与设计变量
```

## 工程化

- **请求封装**：`src/utils/request.js` 的 `baseURL` 为 `/api`；请求拦截器自动附加 `Authorization: Bearer <token>`；响应拦截器按后端统一 JSON（`{code, message, data}`）给出产品化错误提示。
- **路由守卫**：未登录访问受保护页面跳转 `/login?redirect=...`；按 `meta.roles` 做角色拦截，越权重定向 `/home`。
- **懒加载**：页面组件全部动态 `import`，按需加载。
- **滚动容器**：`Layout.vue` 的 `.content` 是业务页唯一滚动容器，路由切换会重置滚动位置。
- **实时状态同步**：消息未读数、卖家申请红点通过 `window.dispatchEvent(new CustomEvent(...))` 在页面间同步。

## 与后端的关系

- 后端默认地址 `http://localhost:8080`，context-path `/api`；前端开发期通过 Vite 代理访问，生产期通过 Nginx 同源反代，代码中不写死后端域名。
- 图片地址由后端返回相对路径（如 `/api/files/goods/xxx.jpg`），前端直接作为 `<img src>` 使用，换部署地址无需改动前端。
- 登录、角色、权限均以后端返回的真实 `role` 为准，前端守卫只做体验层拦截。

## 部署

前端为纯静态产物：

1. `npm run build` 生成 `dist/`；
2. 由 Nginx 托管静态文件；
3. 由于使用 `createWebHistory`，Nginx 必须配置 SPA fallback：`try_files $uri $uri/ /index.html;`；
4. `/api/` 反向代理到后端并**保留** `/api` 前缀（后端 context-path 为 `/api`）。

完整的 Docker 部署前置条件、Nginx 配置要点与验收标准见后端仓库的 [部署方案](https://github.com/jiayi-dev/campus-trade/blob/v1.1/DEPLOYMENT_AND_DEMO_DATA_PLAN.md)。部署完成后，在此补充经过验证的构建与访问命令。

## 公开演示环境

> 状态：尚未部署，演示账号尚未创建。
> 部署与账号验证完成后，在此填写访问地址，以及 `demo_buyer` / `demo_seller` / `demo_admin` 三个公共演示账号和密码，并注明“公共演示账号，数据可能被其他访客修改”。

## 文档

- 后端仓库：[campus-trade](https://github.com/jiayi-dev/campus-trade)
- 部署与演示数据方案：[DEPLOYMENT_AND_DEMO_DATA_PLAN.md](https://github.com/jiayi-dev/campus-trade/blob/v1.1/DEPLOYMENT_AND_DEMO_DATA_PLAN.md)
