# syntax=docker/dockerfile:1
# ============================================================
# 校园二手交易平台 · 前端镜像（多阶段构建）
# ------------------------------------------------------------
# builder：Node 22 内执行 npm ci + npm run build，生成 dist
# runtime：Nginx 托管静态文件，并把 /api/ 反向代理到后端
# ============================================================

# ---------- 构建阶段 ----------
FROM node:22-alpine AS builder

WORKDIR /app

# 先装依赖，利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 再拷贝源码构建（vite.config.js 中的 proxy 只在开发服务器生效，
# 生产构建不会写入任何开发期代理配置）
COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM nginx:1.27-alpine

# 站点配置：SPA fallback + /api 反向代理
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
