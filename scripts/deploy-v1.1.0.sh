#!/bin/bash
# =============================================================================
# v1.1.0 一键部署脚本
# =============================================================================
# 功能：自动部署Socket.IO实时通信版本
# 用法：bash deploy-v1.1.0.sh
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 配置
VERSION="v1.1.0"
IMAGE="ghcr.io/yejunhao159/law-education-platform-z1:${VERSION}"
COMPOSE_FILE="docker-compose.prod.yml"
CONTAINER_NAME="law-edu-app-prod"
SERVER_IP="115.29.191.180"  # 替换为你的服务器IP

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 法学教育平台 v1.1.0 部署脚本                          ║"
echo "║  📦 Socket.IO实时通信 + PM2进程管理                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# 步骤1: 检查环境
# =============================================================================
log_step "[1/8] 检查Docker环境..."

if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

log_info "✅ Docker 环境检查通过"
docker --version
docker-compose --version
echo ""

# =============================================================================
# 步骤2: 更新 docker-compose.prod.yml
# =============================================================================
log_step "[2/8] 更新 docker-compose.prod.yml 配置..."

# 备份现有配置
if [ -f "${COMPOSE_FILE}" ]; then
    cp "${COMPOSE_FILE}" "${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "✅ 已备份现有配置"
fi

# 写入新配置
cat > "${COMPOSE_FILE}" << 'COMPOSE_EOF'
# =============================================================================
# Docker Compose 配置 - 生产环境 v1.1.0
# =============================================================================

services:
  app:
    image: ghcr.io/yejunhao159/law-education-platform-z1:v1.1.0
    container_name: law-edu-app-prod

    ports:
      - "3000:3000"  # Next.js应用
      - "3001:3001"  # Socket.IO服务器（新增）

    env_file:
      - .env.production

    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0

    volumes:
      - ./logs:/app/logs
      - ./data:/app/data

    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    restart: always

    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "10"

networks:
  default:
    name: law-edu-prod-network
    driver: bridge
COMPOSE_EOF

log_info "✅ docker-compose.prod.yml 已更新"
echo ""

# =============================================================================
# 步骤3: 检查/更新环境变量
# =============================================================================
log_step "[3/8] 检查环境变量配置..."

if [ ! -f .env.production ]; then
    log_warn ".env.production 不存在，创建示例文件"
    cat > .env.production << 'ENV_EOF'
# API配置
DEEPSEEK_API_KEY=your_api_key_here

# Socket.IO配置
NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001

# 其他配置
NODE_ENV=production
ENV_EOF
    log_warn "⚠️  请编辑 .env.production 并填写正确的配置"
    read -p "按回车键继续..." dummy
else
    # 检查是否已有Socket.IO配置
    if ! grep -q "NEXT_PUBLIC_SOCKET_URL" .env.production; then
        log_info "添加Socket.IO配置到.env.production"
        echo "" >> .env.production
        echo "# Socket.IO配置" >> .env.production
        echo "NEXT_PUBLIC_SOCKET_URL=http://${SERVER_IP}:3001" >> .env.production
    fi
    log_info "✅ 环境变量配置检查完成"
fi
echo ""

# =============================================================================
# 步骤4: 停止旧容器
# =============================================================================
log_step "[4/8] 停止旧容器..."

if docker ps -a | grep -q "${CONTAINER_NAME}"; then
    docker-compose -f "${COMPOSE_FILE}" down
    log_info "✅ 已停止旧容器"
else
    log_info "未发现运行中的容器"
fi
echo ""

# =============================================================================
# 步骤5: 拉取新镜像
# =============================================================================
log_step "[5/8] 拉取新镜像 ${VERSION}..."

docker pull "${IMAGE}"
log_info "✅ 镜像拉取成功"
echo ""

# =============================================================================
# 步骤6: 清理并创建网络
# =============================================================================
log_step "[6/8] 配置Docker网络..."

if ! docker network ls | grep -q law-edu-prod-network; then
    docker network create law-edu-prod-network
    log_info "✅ 已创建Docker网络"
else
    log_info "✅ Docker网络已存在"
fi

# 清理未使用的镜像（可选）
log_info "清理未使用的镜像..."
docker image prune -f || true
echo ""

# =============================================================================
# 步骤7: 启动新容器
# =============================================================================
log_step "[7/8] 启动新容器..."

docker-compose -f "${COMPOSE_FILE}" up -d
log_info "✅ 容器已启动"
echo ""

# =============================================================================
# 步骤8: 健康检查
# =============================================================================
log_step "[8/8] 执行健康检查..."

log_info "等待服务启动（15秒）..."
sleep 15

max_attempts=20
attempt=0

echo -n "检查服务状态"
while [ $attempt -lt $max_attempts ]; do
    if docker exec "${CONTAINER_NAME}" node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" 2>/dev/null; then
        echo ""
        log_info "✅ 健康检查通过！"
        echo ""

        # =============================================================================
        # 部署成功
        # =============================================================================
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║  ✅ 部署成功！服务运行正常                                ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""

        log_info "📊 容器状态："
        docker-compose -f "${COMPOSE_FILE}" ps
        echo ""

        log_info "🔗 访问地址："
        echo "   主应用：      http://${SERVER_IP}:3000"
        echo "   Socket.IO：   ws://${SERVER_IP}:3001"
        echo ""

        log_info "📝 常用命令："
        echo "   查看日志：    docker-compose -f ${COMPOSE_FILE} logs -f"
        echo "   查看PM2：     docker exec ${CONTAINER_NAME} pm2 list"
        echo "   查看Socket：  docker exec ${CONTAINER_NAME} pm2 logs socketio-server"
        echo "   查看Next.js： docker exec ${CONTAINER_NAME} pm2 logs nextjs-app"
        echo "   重启服务：    docker-compose -f ${COMPOSE_FILE} restart"
        echo "   停止服务：    docker-compose -f ${COMPOSE_FILE} down"
        echo ""

        log_info "🧪 验证步骤："
        echo "   1. 浏览器访问：http://${SERVER_IP}:3000"
        echo "   2. 进入苏格拉底课堂"
        echo "   3. 测试教师发布问题 → 学生实时接收"
        echo "   4. 测试学生作答（移动端输入不应中断）"
        echo ""

        log_info "🔍 检查PM2进程："
        docker exec "${CONTAINER_NAME}" pm2 list
        echo ""

        log_info "🔍 检查端口监听："
        docker exec "${CONTAINER_NAME}" netstat -tunlp | grep -E "3000|3001" || log_warn "netstat命令不可用"
        echo ""

        exit 0
    fi

    attempt=$((attempt + 1))
    echo -n "."
    sleep 3
done

# =============================================================================
# 健康检查失败
# =============================================================================
echo ""
log_error "╔════════════════════════════════════════════════════════════╗"
log_error "║  ⚠️  警告：健康检查超时                                   ║"
log_error "╚════════════════════════════════════════════════════════════╝"
echo ""

log_warn "容器已启动但健康检查未通过，请查看日志排查问题："
echo ""
echo "查看完整日志："
echo "  docker-compose -f ${COMPOSE_FILE} logs -f"
echo ""
echo "查看PM2状态："
echo "  docker exec ${CONTAINER_NAME} pm2 list"
echo ""
echo "查看PM2日志："
echo "  docker exec ${CONTAINER_NAME} pm2 logs --lines 50"
echo ""

# 显示最近的日志
log_info "最近的容器日志："
docker-compose -f "${COMPOSE_FILE}" logs --tail=30

exit 1
