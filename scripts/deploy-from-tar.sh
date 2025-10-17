#!/bin/bash
# =============================================================================
# 从tar文件部署Docker镜像到服务器
# =============================================================================
# 用途：在服务器上加载Docker镜像并启动容器
# 使用方法：在服务器上执行此脚本
# =============================================================================

set -e  # 遇到错误立即退出

IMAGE_FILE="law-education-platform-v1.2.0.tar"
MD5_FILE="${IMAGE_FILE}.md5"
IMAGE_NAME="law-education-platform"
IMAGE_TAG="v1.2.0"
CONTAINER_NAME="law-edu-app-prod"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Docker镜像服务器部署脚本"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ========================================
# Step 1: 检查文件是否存在
# ========================================
echo "📋 Step 1/7: 检查镜像文件..."

if [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ 错误：镜像文件不存在：$IMAGE_FILE"
    echo "   当前目录：$(pwd)"
    echo "   请确保文件已下载到当前目录"
    exit 1
fi

if [ ! -f "$MD5_FILE" ]; then
    echo "⚠️  警告：MD5文件不存在，跳过完整性验证"
else
    echo "🔍 验证文件完整性..."
    if md5sum -c "$MD5_FILE"; then
        echo "✅ 文件完整性验证通过"
    else
        echo "❌ 文件完整性验证失败！"
        echo "   文件可能在传输过程中损坏"
        echo "   请重新下载"
        exit 1
    fi
fi

FILE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
echo "   文件大小：$FILE_SIZE"
echo ""

# ========================================
# Step 2: 检查Docker环境
# ========================================
echo "🐳 Step 2/7: 检查Docker环境..."

if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker未安装"
    echo "   请先安装Docker"
    exit 1
fi

echo "✅ Docker版本："
docker --version
echo ""

# ========================================
# Step 3: 备份旧镜像（如果存在）
# ========================================
echo "💾 Step 3/7: 检查旧镜像..."

if docker images | grep -q "$IMAGE_NAME"; then
    echo "   发现旧镜像，创建备份..."
    BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
    OLD_IMAGE_ID=$(docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | grep "$IMAGE_NAME" | head -1 | awk '{print $2}')

    if [ -n "$OLD_IMAGE_ID" ]; then
        docker tag "$OLD_IMAGE_ID" "$IMAGE_NAME:$BACKUP_TAG"
        echo "   ✅ 备份完成：$IMAGE_NAME:$BACKUP_TAG"
    fi
else
    echo "   未发现旧镜像"
fi
echo ""

# ========================================
# Step 4: 加载镜像
# ========================================
echo "📦 Step 4/7: 加载Docker镜像..."
echo "   这可能需要1-2分钟..."

if docker load -i "$IMAGE_FILE"; then
    echo "✅ 镜像加载成功"
else
    echo "❌ 镜像加载失败"
    exit 1
fi
echo ""

# ========================================
# Step 5: 验证镜像
# ========================================
echo "🔍 Step 5/7: 验证镜像..."

if docker images | grep -q "$IMAGE_NAME.*$IMAGE_TAG"; then
    echo "✅ 镜像验证成功："
    docker images | grep "$IMAGE_NAME" | head -2
else
    echo "❌ 镜像验证失败"
    exit 1
fi
echo ""

# ========================================
# Step 6: 停止旧容器
# ========================================
echo "🛑 Step 6/7: 停止旧容器（如果存在）..."

if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo "   发现旧容器，正在停止..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo "   ✅ 旧容器已清理"
else
    echo "   未发现旧容器"
fi
echo ""

# ========================================
# Step 7: 检查环境变量配置
# ========================================
echo "⚙️  Step 7/7: 检查环境变量配置..."

PROJECT_DIR="$HOME/law-education-platform-z1"
ENV_FILE="$PROJECT_DIR/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  警告：环境变量文件不存在：$ENV_FILE"
    echo ""
    echo "请创建环境变量文件："
    echo "-----------------------------------"
    echo "cat > $ENV_FILE << 'EOF'"
    echo "# AI服务配置（必需）"
    echo "DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx"
    echo "NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx"
    echo "DEEPSEEK_API_URL=https://api.deepseek.com"
    echo "NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com"
    echo ""
    echo "# Socket.IO配置（必需）"
    echo "NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001"
    echo ""
    echo "# 应用配置"
    echo "NODE_ENV=production"
    echo "PORT=3000"
    echo "HOSTNAME=0.0.0.0"
    echo "EOF"
    echo "-----------------------------------"
    echo ""
    read -p "是否现在创建环境变量文件？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "$PROJECT_DIR"
        cat > "$ENV_FILE" << 'EOF'
# AI服务配置（必需）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com
NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com

# Socket.IO配置（必需）
NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001

# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
EOF
        echo "✅ 环境变量文件已创建"
        echo "⚠️  请编辑文件并填入真实的API密钥："
        echo "   nano $ENV_FILE"
        exit 0
    else
        echo "❌ 部署中止：需要环境变量文件"
        exit 1
    fi
fi

echo "✅ 环境变量文件存在"
echo ""

# ========================================
# 启动容器
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 启动容器..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 创建必要的目录
mkdir -p "$PROJECT_DIR/logs"
mkdir -p "$PROJECT_DIR/data"
mkdir -p "$PROJECT_DIR/backups"

# 启动容器
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 3000:3000 \
  -p 3001:3001 \
  --env-file "$ENV_FILE" \
  --restart always \
  -v "$PROJECT_DIR/logs:/app/logs" \
  -v "$PROJECT_DIR/data:/app/data" \
  -v "$PROJECT_DIR/backups:/app/backups" \
  "$IMAGE_NAME:$IMAGE_TAG"

echo "✅ 容器启动成功"
echo ""

# ========================================
# 等待容器启动
# ========================================
echo "⏳ 等待服务启动（30秒）..."
sleep 30

# ========================================
# 健康检查
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 健康检查..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查容器状态
echo "📊 容器状态："
docker ps | grep "$CONTAINER_NAME" || {
    echo "❌ 容器未运行！"
    echo "查看日志："
    docker logs "$CONTAINER_NAME" --tail 50
    exit 1
}
echo ""

# 检查Next.js健康
echo "🧪 测试Next.js服务（端口3000）："
if curl -f http://localhost:3000/api/health 2>/dev/null; then
    echo "   ✅ Next.js健康检查通过"
else
    echo "   ❌ Next.js健康检查失败"
    echo "   查看日志："
    docker logs "$CONTAINER_NAME" --tail 50
fi
echo ""

# 检查Socket.IO服务
echo "🧪 测试Socket.IO服务（端口3001）："
if curl http://localhost:3001/socket.io/ 2>&1 | grep -q "400\|Cannot GET"; then
    echo "   ✅ Socket.IO服务正常"
else
    echo "   ⚠️  Socket.IO服务响应异常"
fi
echo ""

# 检查PM2进程
echo "📊 PM2进程状态："
docker exec "$CONTAINER_NAME" pm2 list
echo ""

# 显示最近日志
echo "📜 最近日志（最后30行）："
docker logs "$CONTAINER_NAME" --tail 30
echo ""

# ========================================
# 完成
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 部署信息："
echo "   容器名称：$CONTAINER_NAME"
echo "   镜像版本：$IMAGE_NAME:$IMAGE_TAG"
echo "   Next.js：http://115.29.191.180:3000"
echo "   Socket.IO：http://115.29.191.180:3001"
echo ""
echo "📊 常用命令："
echo "   查看日志：docker logs -f $CONTAINER_NAME"
echo "   重启容器：docker restart $CONTAINER_NAME"
echo "   停止容器：docker stop $CONTAINER_NAME"
echo "   PM2状态：docker exec $CONTAINER_NAME pm2 list"
echo "   PM2日志：docker exec $CONTAINER_NAME pm2 logs"
echo ""
echo "🌐 访问应用："
echo "   http://115.29.191.180:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
