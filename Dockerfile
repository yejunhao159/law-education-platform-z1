# =============================================================================
# 法学教育平台 - Docker 多阶段构建
# =============================================================================
# 特性：
# - 多阶段构建优化镜像体积（最终 < 500MB）
# - 支持 Socket.io 实时通信
# - 生产优化（移除开发依赖）
# - 健康检查和优雅关闭
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: 依赖安装阶段
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# 安装必要的系统依赖（canvas、pdf 处理等）
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# 复制依赖配置文件
COPY package.json package-lock.json ./

# 安装所有依赖（用于构建）
# 使用 --legacy-peer-deps 解决依赖冲突
RUN npm ci --legacy-peer-deps && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: 构建阶段
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 设置环境变量（构建时）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建 Next.js 应用
# 注意：.env.local 不会被复制（在 .dockerignore 中排除）
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: 生产运行阶段
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# 安装 dumb-init（优雅处理信号）
RUN apk add --no-cache dumb-init

WORKDIR /app

# 创建非 root 用户（安全性）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 从构建阶段复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 复制 .next 构建产物（使用 standalone 模式）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# 使用 dumb-init 启动（优雅处理 SIGTERM）
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "server.js"]
