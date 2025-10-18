#!/bin/bash
# =============================================================================
# 生产服务器部署脚本 v2.0
# =============================================================================
# 用途：在生产服务器上快速部署最新版本
# 运行环境：生产服务器（115.29.191.180）
# 使用方法：./scripts/deploy-server.sh
# =============================================================================

set -e  # 遇到错误立即退出

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 法学教育平台 - 生产环境部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏰ 开始时间：$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ========================================
# 预检查
# ========================================
echo "🔍 Step 1/6: 环境检查..."

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装！"
    exit 1
fi
echo "  ✅ Docker已安装：$(docker --version)"

# 检查docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose未安装！"
    exit 1
fi
echo "  ✅ docker-compose已安装：$(docker-compose --version)"

# 检查.env.production
if [ ! -f .env.production ]; then
    echo "❌ .env.production文件不存在！"
    echo ""
    echo "请创建.env.production文件，参考.env.example"
    echo "必需的环境变量："
    echo "  - DEEPSEEK_API_KEY"
    echo "  - NEXT_PUBLIC_DEEPSEEK_API_KEY"
    echo "  - NEXT_PUBLIC_AI_302_API_KEY（PPT功能）"
    echo "  - NEXT_PUBLIC_SOCKET_URL（实时课堂）"
    exit 1
fi
echo "  ✅ .env.production存在"

echo ""

# ========================================
# 备份当前版本
# ========================================
echo "💾 Step 2/6: 备份当前运行的镜像..."

CURRENT_IMAGE=$(docker ps --filter "name=law-edu-app-prod" --format "{{.Image}}" 2>/dev/null || echo "none")
if [ "$CURRENT_IMAGE" != "none" ]; then
    BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
    echo "  当前镜像：$CURRENT_IMAGE"
    echo "  备份标签：$BACKUP_TAG"
    docker tag "$CURRENT_IMAGE" "law-education:$BACKUP_TAG" || true
    echo "  ✅ 已备份到 law-education:$BACKUP_TAG"
else
    echo "  ℹ️  未发现运行中的容器，跳过备份"
fi

echo ""

# ========================================
# 拉取最新镜像
# ========================================
echo "📥 Step 3/6: 拉取最新Docker镜像..."

docker-compose -f docker-compose.prod.yml pull || {
    echo "❌ 拉取镜像失败！"
    echo ""
    echo "可能的原因："
    echo "  1. GitHub Container Registry认证失效"
    echo "  2. 网络连接问题"
    echo ""
    echo "解决方法："
    echo "  1. 重新登录GHCR："
    echo "     echo 'YOUR_TOKEN' | docker login ghcr.io -u YOUR_USERNAME --password-stdin"
    echo "  2. 检查网络连接"
    exit 1
}

echo "  ✅ 最新镜像拉取成功"
echo ""

# ========================================
# 停止旧容器
# ========================================
echo "🛑 Step 4/6: 停止旧容器..."

docker-compose -f docker-compose.prod.yml down || true
echo "  ✅ 旧容器已停止"
echo ""

# ========================================
# 启动新容器
# ========================================
echo "🚀 Step 5/6: 启动新容器..."

docker-compose -f docker-compose.prod.yml up -d || {
    echo "❌ 启动失败！"
    echo ""
    echo "尝试回滚到备份版本..."
    if [ "$CURRENT_IMAGE" != "none" ]; then
        docker-compose -f docker-compose.prod.yml down || true
        docker tag "law-education:$BACKUP_TAG" "$CURRENT_IMAGE" || true
        docker-compose -f docker-compose.prod.yml up -d || true
        echo "⚠️  已回滚到备份版本，请检查日志"
    fi
    exit 1
}

echo "  ✅ 新容器已启动"
echo ""

# 等待容器完全启动
echo "⏳ 等待服务启动（30秒）..."
sleep 30

# ========================================
# 验证部署
# ========================================
echo "🏥 Step 6/6: 验证部署..."

# 检查容器状态
if ! docker ps | grep -q "law-edu-app-prod"; then
    echo "❌ 容器未运行！"
    echo ""
    echo "查看错误日志："
    docker logs law-edu-app-prod --tail 50
    exit 1
fi
echo "  ✅ 容器运行中"

# 检查健康状态
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "  ✅ Next.js健康检查通过"
else
    echo "  ⚠️  Next.js健康检查失败，但可能正在启动中"
fi

# 检查Socket.IO
if curl http://localhost:3001/socket.io/ 2>&1 | grep -q "400\|Cannot GET"; then
    echo "  ✅ Socket.IO服务正常"
else
    echo "  ⚠️  Socket.IO服务响应异常"
fi

# 检查PM2进程
echo ""
echo "  📊 PM2进程状态："
docker exec law-edu-app-prod pm2 list | grep -E "nextjs-app|socketio-server" || echo "  ⚠️  无法获取PM2状态"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 部署信息："
echo "  时间：$(date '+%Y-%m-%d %H:%M:%S')"
echo "  镜像：$(docker ps --filter 'name=law-edu-app-prod' --format '{{.Image}}')"
echo "  容器ID：$(docker ps --filter 'name=law-edu-app-prod' --format '{{.ID}}')"
echo ""
echo "🔍 查看日志："
echo "  docker logs law-edu-app-prod -f"
echo ""
echo "🌐 访问服务："
echo "  http://115.29.191.180:3000"
echo ""
echo "📚 完整文档："
echo "  docs/DEPLOYMENT-V2-GUIDE.md"
echo ""
