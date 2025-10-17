# =============================================================================
# 法学教育平台 - Docker 轻量级镜像（优化版 v4.0）
# =============================================================================
# 🚀 新方案：使用本地预构建产物
# - 本地 .next/ 和 node_modules/ 已准备好
# - Docker只负责打包和运行，不重新构建
# - 构建时间从20分钟降低到30秒 ⚡
# =============================================================================

FROM node:20

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# =============================================================================
# 创建非 root 用户和安装基础工具
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 安装PM2进程管理器（用于同时运行Next.js和Socket.IO）
RUN npm install -g pm2

# =============================================================================
# 📦 复制预构建的产物（最关键 - 极快）
# =============================================================================

# 1. 复制package文件
COPY --chown=nextjs:nodejs package.json package-lock.json ./

# 2. 复制预安装的 node_modules（~600MB，已包含所有依赖）
COPY --chown=nextjs:nodejs node_modules ./node_modules

# 3. 复制预编译的 .next 目录（~200MB，Next.js应用产物）
COPY --chown=nextjs:nodejs .next ./.next

# 4. 复制公共文件
COPY --chown=nextjs:nodejs public ./public

# 5. 复制Socket.IO服务器和PM2配置
COPY --chown=nextjs:nodejs server ./server
COPY --chown=nextjs:nodejs ecosystem.config.js ./ecosystem.config.js

# =============================================================================
# 🔧 环境变量运行时注入脚本
# =============================================================================
# 关键：这些脚本会在容器启动时运行
# 作用：动态生成.env.production，将docker run -e传入的环境变量注入到应用中
# =============================================================================

# 复制环境变量脚本（核心：运行时动态注入环境变量）
COPY --chown=nextjs:nodejs scripts/generate-env.sh ./scripts/generate-env.sh
COPY --chown=nextjs:nodejs scripts/check-env.sh ./scripts/check-env.sh

# 赋予执行权限
RUN chmod +x ./scripts/generate-env.sh ./scripts/check-env.sh

# =============================================================================
# 创建必要的目录（日志、数据等）
# =============================================================================
RUN mkdir -p /app/logs /app/data \
    && chown -R nextjs:nodejs /app/logs /app/data

# 切换到非 root 用户
USER nextjs

# =============================================================================
# 暴露端口和健康检查
# =============================================================================
EXPOSE 3000 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# =============================================================================
# 🚀 启动命令 - 三步初始化流程
# =============================================================================
# 执行顺序（确保所有API环境变量都被正确注入）：
# 1. generate-env.sh   → 生成.env.production，动态注入docker run -e传入的环境变量
# 2. check-env.sh      → 验证必要的API密钥已设置（DEEPSEEK_API_KEY、NEXT_PUBLIC_AI_302_API_KEY等）
# 3. pm2-runtime       → 启动Next.js（3000）+ Socket.IO（3001）服务
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
