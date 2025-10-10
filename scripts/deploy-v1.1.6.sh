#!/bin/bash
# =============================================================================
# 法学教育平台 - v1.1.6 部署脚本
# =============================================================================
# 版本: v1.1.6
# 日期: 2025-10-10
# 作者: Sean - PromptX
#
# 修复内容:
# - Socket.IO CORS配置支持生产域名
# - 前端WebSocket连接使用window.location.origin
# - 完整的PM2双进程架构（Next.js + Socket.IO）
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 配置变量
VERSION="v1.1.6"
IMAGE_NAME="ghcr.io/yejunhao159/law-education-platform-z1:${VERSION}"
COMPOSE_FILE="docker-compose.prod.yml"
CONTAINER_NAME="law-edu-app-prod"

# 打印banner
echo "
╔════════════════════════════════════════════════════════════╗
║  📦 法学教育平台部署脚本                                   ║
║  🏷️  版本: ${VERSION}                                        ║
║  📅 日期: $(date '+%Y-%m-%d %H:%M:%S')                        ║
╚════════════════════════════════════════════════════════════╝
"

# 步骤1: 检查必需文件
print_info "检查必需文件..."
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "未找到 $COMPOSE_FILE 文件"
    exit 1
fi

if [ ! -f ".env.production" ]; then
    print_error "未找到 .env.production 文件"
    print_warning "请从 .env.production.example 创建 .env.production 并填写配置"
    exit 1
fi

print_success "所有必需文件检查通过"

# 步骤2: 拉取最新镜像
print_info "拉取Docker镜像: $IMAGE_NAME"
if docker pull "$IMAGE_NAME"; then
    print_success "镜像拉取成功"
else
    print_error "镜像拉取失败"
    print_warning "可能原因："
    echo "  1. GitHub Actions尚未构建完成（请检查：https://github.com/yejunhao159/law-education-platform-z1/actions）"
    echo "  2. 需要登录GitHub Container Registry: docker login ghcr.io"
    echo "  3. 镜像标签不存在"
    exit 1
fi

# 步骤3: 停止旧容器
print_info "停止并删除旧容器..."
docker-compose -f "$COMPOSE_FILE" down

print_success "旧容器已停止"

# 步骤4: 启动新容器
print_info "启动新容器 (版本: $VERSION)..."
docker-compose -f "$COMPOSE_FILE" up -d

print_success "新容器已启动"

# 步骤5: 等待容器健康检查
print_info "等待容器健康检查 (最多60秒)..."
RETRY_COUNT=0
MAX_RETRIES=12  # 12 * 5秒 = 60秒

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        print_success "容器健康检查通过"
        break
    elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
        print_error "容器健康检查失败"
        print_warning "查看日志："
        docker logs --tail 50 "$CONTAINER_NAME"
        exit 1
    else
        echo -n "."
        sleep 5
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_warning "健康检查超时，但容器可能正在启动..."
fi

echo ""

# 步骤6: 验证服务
print_info "验证服务状态..."

# 检查Next.js (3000端口)
if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "Next.js服务正常 (端口3000)"
else
    print_warning "Next.js服务未响应 (端口3000)"
fi

# 检查Socket.IO (3001端口)
if curl -f -s "http://localhost:3001/socket.io/?EIO=4&transport=polling" > /dev/null 2>&1; then
    print_success "Socket.IO服务正常 (端口3001)"
else
    print_warning "Socket.IO服务未响应 (端口3001)"
fi

# 步骤7: 显示容器状态
print_info "容器运行状态："
docker-compose -f "$COMPOSE_FILE" ps

# 步骤8: 显示PM2进程
print_info "PM2进程状态："
docker exec "$CONTAINER_NAME" pm2 list

# 步骤9: 显示最新日志
print_info "最新日志（最后20行）："
docker logs --tail 20 "$CONTAINER_NAME"

# 完成
echo "
╔════════════════════════════════════════════════════════════╗
║  🎉 部署完成！                                             ║
║  📊 版本: ${VERSION}                                         ║
║  🌐 访问地址:                                              ║
║     - Next.js:   http://115.29.191.180:3000              ║
║     - Socket.IO: http://115.29.191.180:3001              ║
║  📝 查看日志: docker logs -f ${CONTAINER_NAME}             ║
║  🔧 PM2状态:  docker exec ${CONTAINER_NAME} pm2 list      ║
╚════════════════════════════════════════════════════════════╝
"

print_success "部署成功！"

# 使用说明
cat << 'EOF'

📋 常用命令：
  查看日志：docker logs -f law-edu-app-prod
  查看PM2：docker exec law-edu-app-prod pm2 list
  重启服务：docker-compose -f docker-compose.prod.yml restart
  停止服务：docker-compose -f docker-compose.prod.yml down
  进入容器：docker exec -it law-edu-app-prod sh

🔍 验证Socket.IO连接：
  curl "http://115.29.191.180:3001/socket.io/?EIO=4&transport=polling"

EOF
