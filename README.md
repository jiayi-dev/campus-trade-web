# 校园二手交易平台 · 前端（campus-trade-web）

Vue 3 + Vite + Element Plus 前端应用，通过 Axios 调用后端 RESTful API。

项目整体介绍、系统架构、角色权限、核心业务与升级路线见仓库根目录 [README](../README.md)。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | 3.5 |
| 构建 | Vite | 8.x |
| UI 组件库 | Element Plus | 2.14 |
| 路由 | Vue Router | 5.x |
| HTTP | Axios | 1.20 |
| 可视化 | ECharts | 6.1 |

## 快速启动

```bash
npm install
npm run dev      # 开发服务器 http://localhost:8081
npm run build    # 生产构建，产物输出 dist/
```

> 需先启动后端服务（默认 `http://localhost:8080`），Vite 开发代理已将 `/api` 转发至后端。

## 页面清单

| 页面 | 路由 | 说明 |
|------|------|------|
| Landing | `/landing` | 未登录用户的产品首页 |
| 登录 / 注册 | `/login`、`/register` | 登录后支持 `?redirect=` 回跳 |
| Home | `/home` | 登录后工作台（数据看板，ECharts） |
| 商品列表 | `/goods` | 搜索 / 筛选 / 分页 |
| 商品详情 | `/goods/:id` | 多图画廊、留言、收藏、下单 |
| 发布 / 编辑 | `/publish` | 多图上传 + 实时预览，`?id=` 进入编辑模式 |
| 订单 | `/orders` | 买家 / 卖家订单与状态流转 |
| 卖家工作台 | `/seller` | 我的商品管理 |
| 卖家申请 | `/seller-apply` | student 提交卖家资格申请 |
| 管理后台 | `/admin` | 用户 / 商品 / 订单 / 卖家申请审核 |
| AI 助手 | `/ai-assistant` | Mock 智能问答（游客可用） |

## 工程化

- `src/utils/request.js`：Axios 统一封装——请求拦截器自动携带 `Authorization: Bearer <token>`；响应拦截器统一解包，按 HTTP 状态码与后端统一 JSON（`{code, message, data}`）给出产品化错误提示。
- `src/router/index.js`：路由守卫——未登录跳转 `/login?redirect=...`；按 `meta.roles` 做角色拦截，越权重定向。
- 路由懒加载：页面组件动态 import 按需加载。
