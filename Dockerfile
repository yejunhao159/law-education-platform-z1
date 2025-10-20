# =============================================================================
# 法学教育平台 - Docker 生产部署镜像（v5.0 - 方案A架构）
# =============================================================================
#
# 架构设计（方案A）：
# - Socket.IO: PM2管理（需要进程守护，独立3001端口）
# - Next.js: Docker原生管理（标准npm start，3000端口）
#
# 关键改进：
# - 修复PM2权限问题（设置PM2_HOME=/app/.pm2）
# - 职责分离：PM2专注Socket.IO，Docker管理Next.js
# - 符合Next.js最佳实践（使用官方推荐的next start）
#
# =============================================================================

FROM node:20

WORKDIR /app

# =============================================================================
# 接收构建参数（仅公开信息）
# =============================================================================
ARG NEXT_PUBLIC_BASE_URL="http://localhost:3000"
# ⚠️ 安全说明：API密钥不在构建时注入，避免写入镜像层
# 密钥应在运行时通过环境变量提供（docker-compose或docker run -e）

# =============================================================================
# 构建阶段
# =============================================================================

# 🎯 游客模式优化：不安装编译工具
# 因为better-sqlite3变成可选依赖，游客模式下不需要数据库
# 如果需要数据库功能，取消下面的注释：
# RUN apt-get update && apt-get install -y \
#     python3 make g++ \
#     && rm -rf /var/lib/apt/lists/*

# 配置npm使用国内镜像源（解决网络问题）
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖（允许可选依赖失败）
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps || npm ci --legacy-peer-deps --no-optional

# 复制源代码
COPY . .

# 设置环境变量并构建
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
# API密钥将在运行时注入，不写入镜像层

# 构建 Next.js 应用
RUN npm run build

# =============================================================================
# 生产运行环境准备
# =============================================================================

# 安装PM2（全局安装，在创建用户之前，显式指定registry避免网络问题）
RUN npm install -g pm2 --registry=https://registry.npmmirror.com || \
    npm install -g pm2 --registry=https://registry.npmjs.org

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# 清理构建依赖（重新安装仅生产依赖）
# 🎯 游客模式：允许better-sqlite3安装失败
# 跳过prepare脚本（husky install不需要在生产环境运行）
RUN rm -rf node_modules \
    && npm ci --only=production --legacy-peer-deps --omit=dev --ignore-scripts || \
    npm ci --only=production --legacy-peer-deps --omit=dev --no-optional --ignore-scripts

# 创建PM2工作目录，解决权限问题
# 关键：设置PM2_HOME到/app/.pm2，避免使用/nonexistent目录
RUN mkdir -p /app/.pm2/logs /app/.pm2/pids /app/.pm2/modules \
    && chown -R nextjs:nodejs /app/.pm2

# =============================================================================
# 复制环境变量脚本和启动脚本
# =============================================================================
COPY scripts/generate-env.sh ./scripts/generate-env.sh
COPY scripts/check-env.sh ./scripts/check-env.sh
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/generate-env.sh ./scripts/check-env.sh ./scripts/start.sh

# 复制Socket.IO服务器和PM2配置
COPY server ./server
COPY ecosystem.config.js ./ecosystem.config.js

# 创建必要的目录
RUN mkdir -p /app/logs /app/data && chown -R nextjs:nodejs /app/logs /app/data

# 修复权限
RUN chown -R nextjs:nodejs /app

# 设置PM2环境变量（解决权限问题的关键）
ENV PM2_HOME=/app/.pm2

# 设置数据库自动seed（容器首次启动时自动创建用户）
ENV AUTO_SEED_DATABASE=true

# 🎯 游客模式：跳过登录验证（临时调试用）
# 设置为true可以快速验证系统核心功能，无需登录
ENV GUEST_MODE=true

# 切换到非 root 用户
USER nextjs

# =============================================================================
# 暴露端口和健康检查
# =============================================================================
EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# =============================================================================
# 启动命令 - 简化启动流程（移除PM2依赖）
# =============================================================================
# 流程：
# 1. generate-env.sh   → 运行时生成.env.production
# 2. check-env.sh      → 验证必要的API密钥（DEEPSEEK_API_KEY、AI_302_API_KEY）
# 3. start.sh          → 启动Next.js（3000）+ Socket.IO（3001）
#
# 优势：
# - 移除PM2依赖，简化架构
# - Docker自带进程管理和重启机制
# - 符合Next.js官方最佳实践
# =============================================================================

CMD ["./scripts/start.sh"]
