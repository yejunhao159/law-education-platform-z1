#!/bin/bash
# =============================================================================
# 法学教育平台 - 快速部署脚本
# =============================================================================
# 使用方法：./quick-deploy.sh [镜像文件路径]
# 示例：./quick-deploy.sh ./law-education-platform-z1-latest.tar.gz
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
if [ $# -eq 0 ]; then
    log_error "请提供Docker镜像文件路径"
    log_info "使用方法: $0 <镜像文件路径>"
    log_info "示例: $0 ./law-education-platform-z1-latest.tar.gz"
    exit 1
fi

IMAGE_FILE="$1"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production.configured"

# 检查文件是否存在
if [ ! -f "$IMAGE_FILE" ]; then
    log_error "镜像文件不存在: $IMAGE_FILE"
    exit 1
fi

log_info "开始部署法学教育平台..."
log_info "镜像文件: $IMAGE_FILE"

# 1. 检查Docker环境
log_info "检查Docker环境..."
if ! command -v docker &> /dev/null; then
    log_error "Docker未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose未安装"
    exit 1
fi

log_success "Docker环境检查通过"

# 2. 检查端口占用
log_info "检查端口占用..."
if netstat -tlnp | grep -q ":3000 "; then
    log_warning "端口3000已被占用，请检查或修改配置文件"
    read -p "是否继续部署? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi
fi

# 3. 停止现有服务
log_info "停止现有服务..."
if [ -f "$COMPOSE_FILE" ]; then
    docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    log_success "现有服务已停止"
fi

# 4. 加载Docker镜像
log_info "加载Docker镜像..."
if ! docker load < "$IMAGE_FILE"; then
    log_error "镜像加载失败"
    exit 1
fi

# 获取镜像名称
IMAGE_NAME=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep law-education-platform | head -n 1 | tr -d ' ')
if [ -z "$IMAGE_NAME" ]; then
    log_error "无法获取镜像名称"
    exit 1
fi

log_success "镜像加载完成: $IMAGE_NAME"

# 5. 检查并准备环境变量文件
log_info "准备环境变量文件..."
if [ ! -f "$ENV_FILE" ]; then
    log_error "环境变量文件不存在: $ENV_FILE"
    log_info "请确保已正确配置API密钥"
    exit 1
fi

# 复制环境变量文件
cp "$ENV_FILE" .env.production
log_success "环境变量文件已准备"

# 6. 更新docker-compose.yml中的镜像名称
if [ -f "$COMPOSE_FILE" ]; then
    sed -i "s|image:.*law-education-platform.*|image: $IMAGE_NAME|g" "$COMPOSE_FILE"
    log_success "已更新Docker Compose配置"
fi

# 7. 创建必要目录
log_info "创建数据目录..."
mkdir -p logs data backups
chmod 755 logs data backups
log_success "数据目录已创建"

# 8. 启动服务
log_info "启动服务..."
if ! docker-compose -f "$COMPOSE_FILE" up -d; then
    log_error "服务启动失败"
    log_info "查看错误日志: docker-compose -f $COMPOSE_FILE logs"
    exit 1
fi

log_success "服务启动完成"

# 9. 等待服务就绪
log_info "等待服务就绪..."
sleep 30

# 10. 验证部署
log_info "验证部署状态..."

# 检查容器状态
CONTAINER_STATUS=$(docker-compose -f "$COMPOSE_FILE" ps -q | xargs docker inspect --format='{{.State.Status}}' | grep -v running || true)
if [ -n "$CONTAINER_STATUS" ]; then
    log_error "部分容器未正常运行"
    docker-compose -f "$COMPOSE_FILE" ps
    exit 1
fi

# 检查健康状态
if curl -s http://localhost:3000/api/health > /dev/null; then
    log_success "Next.js服务正常"
else
    log_warning "Next.js服务可能尚未完全启动，请稍后检查"
fi

if curl -s http://localhost:3001/socket.io/ > /dev/null 2>&1; then
    log_success "Socket.IO服务正常"
else
    log_warning "Socket.IO服务可能尚未完全启动"
fi

# 11. 运行功能验证
log_info "运行功能验证..."
if docker-compose -f "$COMPOSE_FILE" exec -T app node scripts/verify-all-functionality.js; then
    log_success "功能验证通过"
else
    log_warning "功能验证失败，但服务已启动，请手动检查"
fi

# 12. 显示部署信息
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 部署完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 访问地址:"
echo "   主应用: http://$(hostname -I | awk '{print $1}'):3000"
echo "   登录页面: http://$(hostname -I | awk '{print $1}'):3000/login"
echo "   管理后台: http://$(hostname -I | awk '{print $1}'):3000/admin/dashboard"
echo ""
echo "👤 登录信息:"
echo "   用户名: teacher01 - teacher05"
echo "   密码: 2025"
echo "   管理员: teacher01"
echo ""
echo "🔧 管理命令:"
echo "   查看日志: docker-compose -f $COMPOSE_FILE logs -f"
echo "   重启服务: docker-compose -f $COMPOSE_FILE restart"
echo "   停止服务: docker-compose -f $COMPOSE_FILE down"
echo "   功能验证: docker-compose -f $COMPOSE_FILE exec app node scripts/verify-all-functionality.js"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 13. 提示后续操作
echo ""
log_info "建议执行以下操作:"
echo "1. 访问登录页面测试登录功能"
echo "2. 测试PPT生成功能"
echo "3. 检查系统日志确保运行正常"
echo "4. 配置防火墙规则（如需要）"
echo ""
log_success "部署脚本执行完成！"