#!/bin/sh
# =============================================================================
# 🔧 环境变量运行时注入脚本 - 解决NEXT_PUBLIC_*硬编码问题
# =============================================================================
# 问题：Next.js在构建时将NEXT_PUBLIC_*变量嵌入到客户端代码中
# 方案：在运行时通过此脚本生成.env.production，供PM2和Next.js使用
#
# 优先级：系统环境变量 > .env.production > 默认值
# =============================================================================

set -e

ENV_FILE=".env.production"

echo "🔧 [$(date '+%Y-%m-%d %H:%M:%S')] 正在生成运行时环境变量文件..."

# 检查是否存在.env.production，如果存在就备份
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "${ENV_FILE}.backup"
  echo "   ✓ 已备份现有的 $ENV_FILE 到 ${ENV_FILE}.backup"
fi

# 创建新的.env.production文件
cat > "$ENV_FILE" << 'ENVEOF'
# ============================================================================
# Next.js 生产环境配置 - 运行时生成
# ============================================================================
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0

# ============================================================================
# 🤖 AI 服务配置
# ============================================================================
ENVEOF

# DeepSeek API Key - 关键配置
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "❌ 错误：DEEPSEEK_API_KEY 环境变量未设置"
  echo "   请通过 docker run -e DEEPSEEK_API_KEY=sk-xxxxx 提供"
  exit 1
fi
echo "DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY" >> "$ENV_FILE"
echo "✓ DEEPSEEK_API_KEY 已配置" >&2

# 302.ai API Key - PPT生成服务（仅服务端使用）
if [ -z "$AI_302_API_KEY" ]; then
  echo "❌ 错误：AI_302_API_KEY 环境变量未设置"
  echo "   请通过 docker run -e AI_302_API_KEY=sk-xxxxx 提供"
  exit 1
fi
echo "AI_302_API_KEY=$AI_302_API_KEY" >> "$ENV_FILE"
echo "✓ AI_302_API_KEY 已配置" >&2

# API URLs
NEXT_PUBLIC_BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"
echo "NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL" >> "$ENV_FILE"

DEEPSEEK_API_URL="${DEEPSEEK_API_URL:-https://api.deepseek.com}"
echo "DEEPSEEK_API_URL=$DEEPSEEK_API_URL" >> "$ENV_FILE"

NEXT_PUBLIC_DEEPSEEK_API_URL="${NEXT_PUBLIC_DEEPSEEK_API_URL:-https://api.deepseek.com}"
echo "NEXT_PUBLIC_DEEPSEEK_API_URL=$NEXT_PUBLIC_DEEPSEEK_API_URL" >> "$ENV_FILE"

# ============================================================================
# 💾 数据库配置
# ============================================================================
cat >> "$ENV_FILE" << 'ENVEOF'

# SQLite 数据库路径
DATABASE_URL=file:/app/data/database.db
ENVEOF

# ============================================================================
# 验证和输出
# ============================================================================
echo "" >&2
echo "✅ 环境变量文件已生成：$ENV_FILE" >&2
echo "" >&2
echo "📝 已配置的变量：" >&2
echo "   ✓ NODE_ENV: production" >&2
echo "   ✓ DEEPSEEK_API_KEY: $([ -n "$DEEPSEEK_API_KEY" ] && echo '***已设置***' || echo '❌ 未设置')" >&2
echo "   ✓ AI_302_API_KEY: $([ -n "$AI_302_API_KEY" ] && echo '***已设置***' || echo '❌ 未设置')" >&2
echo "   ✓ NEXT_PUBLIC_BASE_URL: $NEXT_PUBLIC_BASE_URL" >&2
echo "" >&2

# 检查关键变量
MISSING_VARS=""
[ -z "$DEEPSEEK_API_KEY" ] && MISSING_VARS="DEEPSEEK_API_KEY "
[ -z "$AI_302_API_KEY" ] && MISSING_VARS="${MISSING_VARS}AI_302_API_KEY"

if [ -n "$MISSING_VARS" ]; then
  echo "⚠️  警告：以下变量未设置："
  for var in $MISSING_VARS; do
    echo "   - $var"
  done
  echo "" >&2
fi

echo "✅ 环境变量注入完成！" >&2
