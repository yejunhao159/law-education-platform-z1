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
else
  echo "  ✅ DEEPSEEK_API_KEY - DeepSeek AI服务密钥已配置"
fi

if [ -z "$AI_302_API_KEY" ]; then
  missing="$missing\n  ❌ AI_302_API_KEY - 302.ai PPT生成密钥（服务端代理 /api/ppt 必需）"
else
  echo "  ✅ AI_302_API_KEY - 302.ai PPT生成密钥已配置"
fi

# ========== Socket.IO配置提醒（信息提示） ==========
if [ -n "$NEXT_PUBLIC_SOCKET_URL" ] || [ -n "$NEXT_PUBLIC_SOCKET_IO_URL" ]; then
  warnings="$warnings\n  ⚠️  检测到 NEXT_PUBLIC_SOCKET_URL/NEXT_PUBLIC_SOCKET_IO_URL（前端已使用同域 \"/socket.io/\"，建议移除旧变量）"
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
  echo "   - AI_302_API_KEY: https://302.ai/ (注册后获取)"
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

# 显示API密钥前10个字符（兼容sh/dash）
if [ -n "$DEEPSEEK_API_KEY" ]; then
  API_KEY_SHORT=$(printf "%.10s" "$DEEPSEEK_API_KEY")
  echo "   DEEPSEEK_API_KEY: ${API_KEY_SHORT}... (已配置)"
else
  echo "   DEEPSEEK_API_KEY: 未设置"
fi

# 显示PPT API是否已配置
if [ -n "$AI_302_API_KEY" ]; then
  echo "   AI_302_API_KEY: 已配置"
else
  echo "   AI_302_API_KEY: 未配置"
fi

if [ -n "$NEXT_PUBLIC_SOCKET_URL" ]; then
  echo "   NEXT_PUBLIC_SOCKET_URL: ${NEXT_PUBLIC_SOCKET_URL} (建议清理，改用同域)"
elif [ -n "$NEXT_PUBLIC_SOCKET_IO_URL" ]; then
  echo "   NEXT_PUBLIC_SOCKET_IO_URL: ${NEXT_PUBLIC_SOCKET_IO_URL} (建议清理，改用同域)"
else
  echo "   Socket 连接: 使用同域 /socket.io/"
fi
echo ""
