# =============================================================================
# 法学教育平台 - Docker 多阶段构建（v4.2 - 修复npm PATH问题）
# =============================================================================

FROM node:20

WORKDIR /app

# =============================================================================
# 接收构建参数（从GitHub Actions或docker build --build-arg传入）
# =============================================================================
ARG DEEPSEEK_API_KEY=""
ARG NEXT_PUBLIC_AI_302_API_KEY=""
ARG NEXT_PUBLIC_BASE_URL="http://localhost:3000"
ARG NEXT_PUBLIC_SOCKET_IO_URL="http://localhost:3001"

# =============================================================================
# 构建阶段
# =============================================================================
# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# 复制源代码
COPY . .

# 设置环境变量并构建
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
ENV NEXT_PUBLIC_AI_302_API_KEY=${NEXT_PUBLIC_AI_302_API_KEY}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_SOCKET_IO_URL=${NEXT_PUBLIC_SOCKET_IO_URL}

# 构建 Next.js 应用
RUN npm run build

# =============================================================================
# 生产运行环境准备
# =============================================================================

# 清理构建依赖（保留生产依赖）
RUN npm ci --only=production --legacy-peer-deps --omit=dev --ignore-scripts

# 创建非 root 用户
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 安装PM2进程管理器
RUN npm install -g pm2

# =============================================================================
# 复制环境变量脚本
# =============================================================================
COPY scripts/generate-env.sh ./scripts/generate-env.sh
COPY scripts/check-env.sh ./scripts/check-env.sh
RUN chmod +x ./scripts/generate-env.sh ./scripts/check-env.sh

# 复制Socket.IO服务和PM2配置
COPY server ./server
COPY ecosystem.config.js ./ecosystem.config.js

# 创建必要的目录
RUN mkdir -p /app/logs /app/data && chown -R nextjs:nodejs /app/logs /app/data

# 修复权限
RUN chown -R nextjs:nodejs /app

# 切换到非 root 用户
USER nextjs

# =============================================================================
# 暴露端口和健康检查
# =============================================================================
EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

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
