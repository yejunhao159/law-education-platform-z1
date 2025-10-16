#!/bin/sh
# =============================================================================
# 环境变量验证脚本
# =============================================================================
# 用途：在Docker容器启动前验证必需的环境变量
# 作者：Sean - PromptX
# =============================================================================

echo "🔍 [ENV-CHECK] 开始检查必需的环境变量..."

missing=""
warnings=""

# ========== 核心API密钥检查（必需） ==========
if [ -z "$DEEPSEEK_API_KEY" ]; then
  missing="$missing\n  ❌ DEEPSEEK_API_KEY - DeepSeek AI服务密钥（核心功能必需）"
fi

if [ -z "$NEXT_PUBLIC_DEEPSEEK_API_KEY" ]; then
  missing="$missing\n  ❌ NEXT_PUBLIC_DEEPSEEK_API_KEY - DeepSeek前端调用密钥（核心功能必需）"
fi

# ========== PPT功能检查（重要但非致命） ==========
if [ -z "$NEXT_PUBLIC_AI_302_API_KEY" ]; then
  warnings="$warnings\n  ⚠️  NEXT_PUBLIC_AI_302_API_KEY - 302.ai PPT生成密钥（PPT功能将不可用）"
fi

# ========== Socket.IO配置检查（实时课堂功能） ==========
if [ -z "$NEXT_PUBLIC_SOCKET_URL" ]; then
  warnings="$warnings\n  ⚠️  NEXT_PUBLIC_SOCKET_URL - Socket.IO服务器地址（实时课堂功能将使用默认配置）"
fi

# ========== Node环境检查 ==========
if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "development" ]; then
  warnings="$warnings\n  ⚠️  NODE_ENV - 环境变量未设置或无效（当前: ${NODE_ENV:-未设置}）"
fi

# ========== 结果输出 ==========
if [ -n "$missing" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ [ENV-CHECK] 环境变量检查失败！缺少必需配置：$missing"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 解决方案："
  echo "   1. 检查 .env.production 文件是否存在"
  echo "   2. 参考 .env.example 补充缺失的环境变量"
  echo "   3. 确保 docker-compose.prod.yml 正确加载了 env_file"
  echo ""
  echo "📚 详细配置说明："
  echo "   - DEEPSEEK_API_KEY: https://platform.deepseek.com/api_keys"
  echo "   - NEXT_PUBLIC_AI_302_API_KEY: https://302.ai/ (注册后获取)"
  echo ""
  exit 1
fi

if [ -n "$warnings" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  [ENV-CHECK] 环境变量检查通过，但有以下警告：$warnings"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "💡 部分功能可能受限，建议补充上述环境变量以启用完整功能"
  echo ""
fi

echo "✅ [ENV-CHECK] 环境变量检查通过！"
echo ""
echo "📋 当前环境配置："
echo "   NODE_ENV: ${NODE_ENV:-未设置}"
echo "   DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:0:10}... (已配置)"
echo "   NEXT_PUBLIC_AI_302_API_KEY: ${NEXT_PUBLIC_AI_302_API_KEY:+已配置}"
echo "   NEXT_PUBLIC_SOCKET_URL: ${NEXT_PUBLIC_SOCKET_URL:-使用默认配置}"
echo ""
