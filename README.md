```md
# 校园二手交易平台（前端）

## 项目简介

校园二手交易平台前端项目。

本项目基于 Vue3 + Vite 开发，实现校园二手商品浏览、商品管理、订单展示等功能。

项目采用前后端分离架构，通过 Axios 调用 Spring Boot 后端 RESTful API，实现前后端数据交互。

## 技术栈

* Vue 3
* Vite
* Element Plus
* Vue Router
* Axios
* JavaScript

## 已实现功能

### 用户模块

* 用户登录
* Token 身份认证
* 登录状态保存
* 基于用户角色的权限路由控制

### 商品模块

* 商品分页查询
* 商品名称搜索
* 商品新增
* 商品编辑
* 商品删除
* 商品列表展示

### 交易模块

* 订单列表展示
* 订单接口联调
* Token 请求认证

### 系统功能

* Axios 请求统一封装
* 路由权限控制
* Element Plus 组件开发
* 前后端接口联调

## 项目结构

```
campus-trade-web
│
├── src
│   │
│   ├── router
│   │   └── index.js        # 路由配置
│   │
│   ├── utils
│   │   └── request.js      # Axios请求封装
│   │
│   ├── views
│   │   ├── Login.vue       # 登录页面
│   │   ├── Layout.vue      # 系统布局
│   │   ├── Home.vue        # 首页
│   │   ├── GoodsList.vue   # 商品管理页面
│   │   └── OrderList.vue   # 订单展示页面
│   │
│   ├── App.vue
│   └── main.js
│
├── package.json
├── vite.config.js
└── README.md
```

## 后端项目

后端仓库：

[https://github.com/jiayi-dev/campus-trade](https://github.com/jiayi-dev/campus-trade)

后端技术栈：

* Spring Boot
* MyBatis
* MySQL
* RESTful API

## 项目运行

### 安装依赖

```
npm install
```

### 启动项目

```
npm run dev
```

启动成功后访问：

```
http://localhost:5173
```

## 开发状态

当前已完成：

* Vue3 项目搭建
* 用户登录功能
* Token 身份认证
* 权限路由控制
* 商品管理页面
* 订单展示页面
* 前后端接口联调

后续完善：

* 数据统计可视化
* ECharts 图表展示
* 项目部署
* 项目交付文档整理

## 项目信息

项目名称：

校园二手交易平台

开发模式：

前后端分离

前端技术：

Vue3 + Vite + Element Plus

后端技术：

Spring Boot + MyBatis + MySQL

项目功能：

实现校园二手交易业务流程，包括用户登录、商品管理、订单交易和数据展示等功能。


```

campus-trade-web  
│  
├── src  
│ │  
│ ├── router  
│ │ └── index.js # 路由配置  
│ │  
│ ├── utils  
│ │ └── request.js # Axios请求封装  
│ │  
│ ├── views  
│ │ ├── Login.vue # 登录页面  
│ │ ├── Layout.vue # 系统布局  
│ │ ├── Home.vue # 首页  
│ │ ├── GoodsList.vue # 商品管理页面  
│ │ └── OrderList.vue # 订单展示页面  
│ │  
│ ├── App.vue  
│ └── main.js  
│  
├── package.json  
├── vite.config.js  
└── README.md

```
---

## 后端项目

后端仓库：

https://github.com/jiayi-dev/campus-trade


后端技术栈：

- Spring Boot
- MyBatis
- MySQL
- RESTful API

---

## 项目运行

### 安装依赖

```bash
npm install
```

### 启动项目

```bash
npm run dev
```

启动成功后访问：

```
http://localhost:5173
```

---

## 开发状态

当前已完成：

- Vue3 项目搭建

- 用户登录功能

- Token 身份认证

- 权限路由控制

- 商品管理页面

- 订单展示页面

- 前后端接口联调

后续完善：

- 数据统计可视化

- ECharts 图表展示

- 项目部署

- 项目交付文档整理

---

## 项目信息

项目名称：

校园二手交易平台

开发模式：

前后端分离

前端技术：

Vue3 + Vite + Element Plus

后端技术：

Spring Boot + MyBatis + MySQL

项目功能：

实现校园二手交易业务流程，包括用户登录、商品管理、订单交易和数据展示等功能。
