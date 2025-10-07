# =============================================================================
# 法学教育平台 - Docker 多阶段构建
# =============================================================================
# 基于 Next.js 官方推荐的 Dockerfile
# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
# =============================================================================

FROM node:20-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: 安装依赖
# -----------------------------------------------------------------------------
FROM base AS deps

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装依赖（使用 --legacy-peer-deps）
RUN npm ci --legacy-peer-deps

# -----------------------------------------------------------------------------
# Stage 2: 构建应用
# -----------------------------------------------------------------------------
FROM base AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制所有源代码
COPY . .

# 设置环境变量（构建时需要）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 设置占位符环境变量（避免构建时出错）
# 实际的环境变量会在运行时通过 .env.production 注入
ENV DEEPSEEK_API_KEY=placeholder
ENV NEXT_PUBLIC_DEEPSEEK_API_KEY=placeholder
ENV DEEPSEEK_API_URL=https://api.deepseek.com
ENV NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com

# 构建 Next.js 应用（会生成 .next/standalone）
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: 生产运行
# -----------------------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要的文件
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# 启动命令
CMD ["node", "server.js"]
