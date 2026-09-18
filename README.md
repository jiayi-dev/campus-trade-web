# 校园二手交易平台（前端）

## 项目简介

校园二手交易平台前端项目，基于 Vue3 + Vite + Element Plus 开发，采用前后端分离架构，通过 Axios 调用 Spring Boot 后端 RESTful API。

项目覆盖学生、卖家、管理员三种角色的完整使用流程，包括多角色登录、商品浏览与管理、批量发布商品、订单查询、个人店铺管理、运营数据统计与 ECharts 可视化等功能，并通过路由守卫与 Token 机制实现登录校验和角色权限控制。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | 3.5 |
| 构建工具 | Vite | 8.x |
| UI 组件库 | Element Plus | 2.14 |
| 图标 | @element-plus/icons-vue | 2.3 |
| 路由 | Vue Router | 5.x |
| HTTP 请求 | Axios | 1.x |
| 图表 | ECharts | 6.1 |
| 语言 | JavaScript（ES Module） | - |
| 包管理 | npm | - |

## 核心功能

### 认证与权限

- 三角色登录：同一登录页通过 Tab 切换学生（student）/ 卖家（seller）/ 管理员（admin）登录入口
- 登录态持久化：Token、userId、username、role 保存在 localStorage
- 路由守卫：未登录自动跳转登录页；按 `meta.roles` 做角色权限拦截，越权访问重定向首页
- 动态菜单：侧边栏菜单根据当前角色动态渲染
- 退出登录：清空本地登录信息并返回登录页

### 首页数据看板（Dashboard）

- 4 项核心指标卡片：商品总数、用户总数、分类数量、商品总价值
- ECharts 各分类平均价格柱状图
- ECharts 商品价格区间分布环形图
- 支持手动刷新数据，窗口缩放时图表自适应

### 商品中心（GoodsList）

- 商品分页列表查询（默认每页 5 条）
- 按商品名称模糊搜索、重置查询条件
- 发布商品 / 编辑商品（弹窗表单，含名称、分类、价格、描述、在售状态）
- 删除商品（二次确认弹窗）
- 批量发布商品：一次填写最多 5 行商品信息，前端逐行校验后批量提交

### 交易中心（OrderList）

- 订单列表展示：订单 ID、商品 ID、买家 / 卖家 ID、创建时间
- 订单状态标签：待交易、已完成、其他

### 我的店铺（SellerDashboard，卖家）

- 查询当前登录用户发布的全部商品（`/goods/my`）
- 我的商品数、在售商品数、已下架商品数统计卡片
- 商品状态标签、空数据占位、加载状态

### 管理后台（AdminDashboard，管理员）

- 系统级运营指标卡片（商品总数、用户总数、分类数量、商品总价值）
- 全部订单信息查看与订单数量统计

### 工程化

- Axios 统一封装：请求拦截器自动携带 Token，响应拦截器统一解包与错误提示
- Vite 开发代理：`/api` 转发到后端 `http://localhost:8080`，规避跨域问题
- 路由懒加载：所有页面组件动态 import 按需加载
- 响应式栅格布局，适配不同屏幕宽度

## 角色与页面

| 页面 | 路由 | 学生 | 卖家 | 管理员 |
|------|------|:----:|:----:|:------:|
| 登录 | `/login` | - | - | - |
| 首页（数据看板） | `/home` | ✅ | ✅ | ✅ |
| 商品中心 | `/goods` | ✅ | ✅ | ✅ |
| 交易中心 | `/orders` | ✅ | ✅ | ✅ |
| 我的店铺 | `/seller` | ❌ | ✅ | ❌ |
| 管理后台 | `/admin` | ❌ | ❌ | ✅ |

## 路由与权限

路由配置位于 `src/router/index.js`，采用 `createWebHistory` 模式：

- `/login`：登录页，无需 Token
- `/`：Layout 布局容器，子页面通过 `<router-view />` 渲染
  - `/home`、`/goods`、`/orders`：所有登录用户可访问
  - `/seller`：`meta.roles = ['seller']`
  - `/admin`：`meta.roles = ['admin']`

全局前置守卫 `router.beforeEach` 校验逻辑：

1. 访问登录页直接放行
2. localStorage 中无 Token → 重定向到 `/login`
3. 目标路由配置了 `meta.roles` 且当前角色不在允许列表 → 重定向到 `/home`

## HTTP 请求封装

`src/utils/request.js` 基于 Axios 创建实例：

- `baseURL: '/api'`：统一接口前缀，由 Vite 代理转发
- `timeout: 10000`：10 秒超时
- 请求拦截器：自动在请求头添加 `Authorization: Bearer <token>`
- 响应拦截器：成功直接返回 `response.data`；失败统一弹出 Element Plus 错误提示

## 项目结构

```
campus-trade-web
├── public/
│   ├── favicon.svg              # 站点图标
│   └── icons.svg
├── src/
│   ├── assets/                  # 静态资源
│   ├── components/
│   │   └── HelloWorld.vue       # 脚手架示例组件
│   ├── router/
│   │   └── index.js             # 路由配置 + 登录/角色守卫
│   ├── utils/
│   │   └── request.js           # Axios 实例与拦截器封装
│   ├── views/
│   │   ├── Login.vue            # 三角色登录页
│   │   ├── Layout.vue           # 顶栏 + 侧边菜单布局
│   │   ├── Dashboard.vue        # 首页数据看板（ECharts）
│   │   ├── GoodsList.vue        # 商品中心（分页/增删改/批量发布）
│   │   ├── OrderList.vue        # 交易中心（订单列表）
│   │   ├── SellerDashboard.vue  # 卖家我的店铺
│   │   └── AdminDashboard.vue   # 管理员后台
│   ├── App.vue                  # 根组件
│   ├── main.js                  # 应用入口（注册 Element Plus / Router）
│   └── style.css                # 全局样式
├── index.html
├── vite.config.js               # Vite 配置（端口 8081 + /api 代理）
├── package.json
└── README.md
```

## 接口联调与代理配置

`vite.config.js` 中配置了开发服务器端口与后端代理：

```js
server: {
  port: 8081,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true
    }
  }
}
```

前端请求 `/api/**` 会被代理到后端服务 `http://localhost:8080/api/**`，因此本地开发需先启动后端 Spring Boot 服务。

## 环境要求

- Node.js 20 LTS 及以上
- npm 9 及以上
- 后端服务正常运行（默认 `http://localhost:8080`）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动成功后访问：

```
http://localhost:8081
```

### 3. 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录，可使用 `npm run preview` 本地预览构建结果。

## 后端项目

后端仓库：[https://github.com/jiayi-dev/campus-trade](https://github.com/jiayi-dev/campus-trade)

后端技术栈：Spring Boot 2.6 + MyBatis + MySQL 8.0 + Token 认证 + RBAC 权限控制

## 项目信息

- 项目名称：校园二手交易平台
- 开发模式：前后端分离
- 前端技术：Vue3 + Vite + Element Plus + ECharts
- 后端技术：Spring Boot + MyBatis + MySQL
- 项目功能：实现校园二手交易业务流程，涵盖多角色登录认证、商品管理、批量发布、订单查询、店铺管理与运营数据可视化。
