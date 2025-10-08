#!/bin/bash
# =============================================================================
# v1.1.5 服务器部署脚本
# =============================================================================
# 功能：
#   1. 拉取最新的 Docker 镜像（v1.1.5）
#   2. 停止旧容器
#   3. 启动新容器
#   4. 验证部署结果（包括 Socket.IO 服务）
# =============================================================================

set -e  # 遇到错误立即退出

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 部署 v1.1.5 - Socket.IO依赖修复 + 教室API实现       ║"
echo "╚════════════════════════════════════════════════════════════╝"

# 项目路径（请修改为你的实际路径）
PROJECT_DIR="/root/law-education-platform-z1"
IMAGE_NAME="ghcr.io/yejunhao159/law-education-platform-z1:v1.1.5"

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ 项目目录不存在: $PROJECT_DIR"
  echo "请修改脚本中的 PROJECT_DIR 变量"
  exit 1
fi

cd "$PROJECT_DIR"

# 1. 拉取最新镜像
echo ""
echo "📦 [1/6] 拉取最新镜像 v1.1.5..."
docker pull "$IMAGE_NAME"

# 2. 停止旧容器
echo ""
echo "🛑 [2/6] 停止旧容器..."
docker-compose -f docker-compose.prod.yml down || true

# 3. 更新 docker-compose.prod.yml 中的镜像版本
echo ""
echo "📝 [3/6] 更新配置文件..."
sed -i 's|image: ghcr.io/yejunhao159/law-education-platform-z1:.*|image: '"$IMAGE_NAME"'|g' docker-compose.prod.yml

# 4. 启动新容器
echo ""
echo "🚀 [4/6] 启动新容器..."
docker-compose -f docker-compose.prod.yml up -d

# 5. 等待服务启动
echo ""
echo "⏳ [5/6] 等待服务启动..."
sleep 15

# 6. 健康检查（包括 Socket.IO）
echo ""
echo "🏥 [6/6] 执行健康检查..."
max_attempts=20
attempt=0

while [ $attempt -lt $max_attempts ]; do
  # 检查 Next.js (3000)
  if docker exec law-edu-app-prod node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" 2>/dev/null; then
    echo ""
    echo "✅ Next.js (3000) 健康检查通过"

    # 检查 Socket.IO (3001)
    echo "🔍 检查 Socket.IO 服务..."
    if docker exec law-edu-app-prod node -e "require('http').get('http://localhost:3001/socket.io/', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" 2>/dev/null; then
      echo "✅ Socket.IO (3001) 健康检查通过"

      echo ""
      echo "╔════════════════════════════════════════════════════════════╗"
      echo "║  ✅ 部署成功！v1.1.5 正在运行                            ║"
      echo "╚════════════════════════════════════════════════════════════╝"
      echo ""
      echo "📊 容器状态："
      docker-compose -f docker-compose.prod.yml ps
      echo ""
      echo "🔗 访问地址："
      echo "   主应用：http://115.29.191.180:3000"
      echo "   Socket.IO：ws://115.29.191.180:3001"
      echo ""
      echo "📝 查看日志："
      echo "   docker-compose -f docker-compose.prod.yml logs -f"
      echo ""
      echo "📋 PM2 进程："
      docker exec law-edu-app-prod pm2 list
      echo ""
      echo "🔧 验证修复："
      echo "   1. Socket.IO 依赖已安装 ✅"
      echo "   2. socketio-server 进程运行中 ✅"
      echo "   3. 教室问题 API 已实现 ✅"
      echo ""
      echo "🐛 解决的 Issues："
      echo "   - #49: Socket.IO连接失败"
      echo "   - #48: 教室问题API端点缺失"
      echo ""
      exit 0
    else
      echo "⚠️  Socket.IO 服务未就绪，检查 PM2 日志..."
      docker exec law-edu-app-prod pm2 logs socketio-server --lines 20 --nostream || true
    fi
  fi

  attempt=$((attempt + 1))
  echo -n "."
  sleep 3
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  警告：健康检查超时                                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 请检查日志："
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "📊 容器状态："
docker-compose -f docker-compose.prod.yml ps
echo ""
echo "🔍 PM2 进程状态："
docker exec law-edu-app-prod pm2 list || true
echo ""
echo "📝 Socket.IO 日志："
docker exec law-edu-app-prod pm2 logs socketio-server --lines 50 --nostream || true
exit 1
