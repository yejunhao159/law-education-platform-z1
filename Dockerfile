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

# 安装PM2进程管理器（用于同时运行Next.js和Socket.IO）
RUN npm install -g pm2

# 复制必要的文件
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# =============================================================================
# 🔧 依赖修复方案（治本版本 v2.0）
# =============================================================================
# 问题：Next.js standalone模式只打包Next.js应用依赖，不包含独立Node.js服务（Socket.IO）的依赖
# 旧方案：手动COPY依赖列表 → 脆弱，容易遗漏传递依赖
# 新方案：重新安装生产依赖 → 自动处理所有依赖，包括传递依赖
#
# 权衡：
# - 镜像大小增加约50-100MB（从200MB → 250-300MB）
# - 构建时间增加约30-60秒
# - 但彻底解决依赖完整性问题，socket.io升级不再需要修改Dockerfile
# =============================================================================

RUN mkdir -p ./node_modules

# 方案：重新安装生产依赖（推荐）
# 复制package文件到runner阶段
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./

# 安装生产依赖（自动处理所有dependencies和传递依赖）
# 使用--legacy-peer-deps避免peer依赖冲突
# 使用--ignore-scripts跳过prepare script（husky是开发依赖，生产环境不需要）
# 这会安装所有package.json中的dependencies，包括socket.io及其所有依赖
RUN npm ci --only=production --legacy-peer-deps --omit=dev --ignore-scripts

# 特殊处理：tiktoken（WASM依赖）
# tiktoken在next.config.mjs中被标记为外部依赖，但上面的npm ci已经安装了
# 无需额外处理，但保留这个注释说明为什么不需要特殊复制

# 复制Socket.IO服务器和PM2配置
COPY --from=builder --chown=nextjs:nodejs /app/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/ecosystem.config.js ./ecosystem.config.js

# 复制环境变量验证脚本（治本方案的安全网）
COPY --from=builder --chown=nextjs:nodejs /app/scripts/check-env.sh ./scripts/check-env.sh
RUN chmod +x ./scripts/check-env.sh

# 创建日志目录
RUN mkdir -p /app/logs && chown -R nextjs:nodejs /app/logs

# 创建数据目录（用于SQLite数据库）
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 切换到非 root 用户
USER nextjs

# 暴露端口（3000=Next.js, 3001=Socket.IO）
EXPOSE 3000 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# 启动命令（先验证环境变量，再启动服务）
# 使用sh -c包装命令，先执行环境检查，成功后再启动PM2
CMD ["sh", "-c", "./scripts/check-env.sh && pm2-runtime ecosystem.config.js"]
