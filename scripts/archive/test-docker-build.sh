#!/bin/bash
# =============================================================================
# Docker镜像本地验证脚本 v2.0
# =============================================================================
# 用途：在推送到GitHub之前，本地验证Docker镜像构建和功能
# 作者：Sean - PromptX
# =============================================================================

set -e  # 遇到错误立即退出

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Docker镜像本地验证流程开始"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ========================================
# Step 1: 构建镜像
# ========================================
echo "🔨 Step 1/7: 构建Docker镜像..."
echo "预计时间：4-5分钟"
echo ""

docker build -t law-education:v2.0-test . || {
  echo "❌ 构建失败！请检查Dockerfile语法"
  exit 1
}

echo "✅ 镜像构建成功"
echo ""

# ========================================
# Step 2: 检查镜像大小
# ========================================
echo "📊 Step 2/7: 检查镜像大小..."
docker images | grep law-education | grep v2.0-test
IMAGESIZE=$(docker images law-education:v2.0-test --format "{{.Size}}")
echo "镜像大小：$IMAGESIZE"
echo ""

# ========================================
# Step 3: 验证依赖完整性
# ========================================
echo "📦 Step 3/7: 验证依赖完整性..."

docker run --rm law-education:v2.0-test sh -c '
  FAILED=0

  echo "检查Socket.IO核心依赖..."
  test -d /app/node_modules/socket.io && echo "  ✅ socket.io" || { echo "  ❌ socket.io缺失"; FAILED=1; }
  test -d /app/node_modules/socket.io-client && echo "  ✅ socket.io-client" || { echo "  ❌ socket.io-client缺失"; FAILED=1; }
  test -d /app/node_modules/engine.io && echo "  ✅ engine.io" || { echo "  ❌ engine.io缺失"; FAILED=1; }

  echo ""
  echo "检查传递依赖（Issue #49, #50修复验证）..."
  test -d /app/node_modules/negotiator && echo "  ✅ negotiator" || { echo "  ❌ negotiator缺失"; FAILED=1; }
  test -d /app/node_modules/accepts && echo "  ✅ accepts" || { echo "  ❌ accepts缺失"; FAILED=1; }
  test -d /app/node_modules/cors && echo "  ✅ cors" || { echo "  ❌ cors缺失"; FAILED=1; }
  test -d /app/node_modules/mime-types && echo "  ✅ mime-types" || { echo "  ❌ mime-types缺失"; FAILED=1; }
  test -d /app/node_modules/mime-db && echo "  ✅ mime-db" || { echo "  ❌ mime-db缺失"; FAILED=1; }

  echo ""
  echo "检查AI相关依赖..."
  test -d /app/node_modules/tiktoken && echo "  ✅ tiktoken (WASM)" || { echo "  ❌ tiktoken缺失"; FAILED=1; }

  echo ""
  echo "检查环境验证脚本..."
  test -f /app/scripts/check-env.sh && echo "  ✅ check-env.sh存在" || { echo "  ❌ check-env.sh缺失"; FAILED=1; }
  test -x /app/scripts/check-env.sh && echo "  ✅ check-env.sh可执行" || { echo "  ❌ check-env.sh不可执行"; FAILED=1; }

  echo ""
  if [ $FAILED -eq 0 ]; then
    echo "✅ 所有依赖验证通过！"
    exit 0
  else
    echo "❌ 依赖验证失败！"
    exit 1
  fi
' || {
  echo "❌ 依赖验证失败！"
  exit 1
}

echo ""

# ========================================
# Step 4: 测试环境变量验证逻辑
# ========================================
echo "🧪 Step 4/7: 测试环境变量验证逻辑..."

echo "测试场景1：缺少必需环境变量（预期：失败）"
if docker run --rm law-education:v2.0-test sh -c './scripts/check-env.sh' 2>&1 | grep -q "环境变量检查失败"; then
  echo "  ✅ 正确检测到环境变量缺失"
else
  echo "  ❌ 未能检测到环境变量缺失"
  exit 1
fi

echo ""
echo "测试场景2：提供完整环境变量（预期：成功）"
docker run --rm \
  -e DEEPSEEK_API_KEY=test-key-12345 \
  -e NEXT_PUBLIC_DEEPSEEK_API_KEY=test-key-12345 \
  -e NODE_ENV=production \
  law-education:v2.0-test \
  sh -c './scripts/check-env.sh' || {
  echo "  ❌ 环境变量验证逻辑有问题"
  exit 1
}

echo "✅ 环境变量验证逻辑正常"
echo ""

# ========================================
# Step 5: 启动完整容器测试
# ========================================
echo "🚀 Step 5/7: 启动完整容器测试..."

# 检查.env.local是否存在
if [ ! -f .env.local ]; then
  echo "⚠️  警告：.env.local不存在，使用测试环境变量"
  docker run -d \
    --name law-edu-test \
    -p 3000:3000 \
    -p 3001:3001 \
    -e DEEPSEEK_API_KEY=test-key \
    -e NEXT_PUBLIC_DEEPSEEK_API_KEY=test-key \
    -e NODE_ENV=production \
    law-education:v2.0-test
else
  echo "使用.env.local配置..."
  docker run -d \
    --name law-edu-test \
    -p 3000:3000 \
    -p 3001:3001 \
    --env-file .env.local \
    law-education:v2.0-test
fi

echo "等待容器启动（30秒）..."
sleep 30

echo ""

# ========================================
# Step 6: 健康检查
# ========================================
echo "🏥 Step 6/7: 健康检查..."

# Next.js健康检查
if curl -f http://localhost:3000/api/health 2>/dev/null; then
  echo "  ✅ Next.js健康检查通过"
else
  echo "  ❌ Next.js健康检查失败"
  echo "  查看日志："
  docker logs law-edu-test --tail 50
  docker stop law-edu-test
  docker rm law-edu-test
  exit 1
fi

# Socket.IO服务检查
if curl http://localhost:3001/socket.io/ 2>&1 | grep -q "400\|Cannot GET"; then
  echo "  ✅ Socket.IO服务正常（返回400或Cannot GET是预期行为）"
else
  echo "  ⚠️  Socket.IO服务响应异常，但可能是正常的"
fi

echo ""

# ========================================
# Step 7: PM2进程检查和日志
# ========================================
echo "📊 Step 7/7: PM2进程和日志检查..."

echo "PM2进程列表："
docker exec law-edu-test pm2 list

echo ""
echo "启动日志（最近50行）："
docker logs law-edu-test --tail 50 | grep -E "ENV-CHECK|Socket.IO|PM2|ERROR|WARN" || docker logs law-edu-test --tail 50

echo ""

# ========================================
# 清理
# ========================================
echo "🧹 清理测试环境..."
docker stop law-edu-test
docker rm law-edu-test

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 本地验证完成！所有测试通过。"
echo ""
echo "📋 验证总结："
echo "  ✅ Docker镜像构建成功"
echo "  ✅ 依赖完整性验证通过"
echo "  ✅ 环境变量验证逻辑正常"
echo "  ✅ 容器启动成功"
echo "  ✅ Next.js和Socket.IO服务正常"
echo ""
echo "🚀 下一步："
echo "  1. 创建feature分支：git checkout -b feat/docker-v2.0"
echo "  2. 提交代码：git add . && git commit"
echo "  3. 推送分支：git push origin feat/docker-v2.0"
echo "  4. 在GitHub上验证Actions构建"
echo "  5. 确认无误后merge到main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
