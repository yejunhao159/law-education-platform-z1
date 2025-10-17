# =============================================================================
# 法学教育平台 - Docker 多阶段构建（v4.1 - GitHub Actions优化版）
# =============================================================================
# 优化方案：
# - 在GitHub Actions云端完整构建（npm ci + npm run build）
# - 使用多阶段构建减小最终镜像
# - 环境变量运行时动态注入
# =============================================================================

FROM node:20 AS base

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# =============================================================================
# Stage 1: 安装依赖
# =============================================================================
FROM base AS deps

COPY package.json package-lock.json ./

# 安装依赖（包含lightningcss预编译二进制）
RUN npm ci --legacy-peer-deps && npm cache clean --force

# =============================================================================
# Stage 2: 构建应用
# =============================================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建时环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建 Next.js 应用
RUN npm run build

# =============================================================================
# Stage 3: 生产运行环境
# =============================================================================
FROM node:20 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 安装PM2进程管理器
RUN npm install -g pm2

# =============================================================================
# 复制构建产物
# =============================================================================

# 复制 .next standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 复制静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制package文件
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./

# =============================================================================
# 复制依赖和脚本
# =============================================================================

# 重新安装生产依赖（为了Socket.IO和其他runtime依赖）
RUN npm ci --only=production --legacy-peer-deps --omit=dev --ignore-scripts

# 复制Socket.IO服务和PM2配置
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/ecosystem.config.js ./ecosystem.config.js

# =============================================================================
# 复制环境变量脚本
# =============================================================================

# 复制并赋予执行权限
COPY --from=builder --chown=nextjs:nodejs /app/scripts/generate-env.sh ./scripts/generate-env.sh
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-env.sh ./scripts/check-env.sh
RUN chmod +x ./scripts/generate-env.sh ./scripts/check-env.sh

# 创建必要目录
RUN mkdir -p /app/logs /app/data && chown -R nextjs:nodejs /app/logs /app/data

# 切换用户
USER nextjs

# =============================================================================
# 暴露端口和健康检查
# =============================================================================
EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# =============================================================================
# 启动命令 - 三步初始化流程
# =============================================================================
# 关键：确保所有API环境变量都被正确注入
# 1. generate-env.sh   → 运行时生成.env.production
# 2. check-env.sh      → 验证必要的API密钥（DEEPSEEK_API_KEY、NEXT_PUBLIC_AI_302_API_KEY）
# 3. pm2-runtime       → 启动Next.js（3000）+ Socket.IO（3001）
# =============================================================================

CMD ["sh", "-c", "set -e && \
  echo '🚀 [1/3] 生成运行时环境变量...' && \
  ./scripts/generate-env.sh && \
  echo '✓ 环境变量生成完成' && \
  echo '' && \
  echo '🔍 [2/3] 验证环境变量...' && \
  ./scripts/check-env.sh && \
  echo '✓ 环境变量验证完成' && \
  echo '' && \
  echo '🎬 [3/3] 启动服务...' && \
  pm2-runtime ecosystem.config.js"]
