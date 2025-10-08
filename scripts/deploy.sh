#!/bin/bash
# =============================================================================
# 法学教育平台 - 服务器部署脚本
# =============================================================================
# 功能：
#   - 一键部署/更新应用
#   - 支持版本回滚
#   - 健康检查
#   - 日志查看
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
IMAGE_NAME="ghcr.io/yejunhao159/law-education-platform-z1"
COMPOSE_FILE="docker-compose.prod.yml"
CONTAINER_NAME="law-edu-app-prod"

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

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    log_info "Docker 环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f .env.production ]; then
        log_error ".env.production 文件不存在"
        log_info "请复制 .env.production.example 并填写配置："
        echo "    cp .env.production.example .env.production"
        echo "    vim .env.production"
        exit 1
    fi
    log_info "环境变量文件检查通过"
}

# 拉取最新镜像
pull_image() {
    local version=${1:-latest}
    log_info "拉取镜像：${IMAGE_NAME}:${version}"
    docker pull ${IMAGE_NAME}:${version}
}

# 停止并移除旧容器
stop_container() {
    log_info "停止旧容器..."
    docker-compose -f ${COMPOSE_FILE} down || true
}

# 启动容器
start_container() {
    log_info "启动新容器..."
    docker-compose -f ${COMPOSE_FILE} up -d
}

# 健康检查
health_check() {
    log_info "等待服务启动..."
    sleep 10

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec ${CONTAINER_NAME} node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" &> /dev/null; then
            log_info "✅ 健康检查通过！服务运行正常"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    log_error "❌ 健康检查失败！服务可能未正常启动"
    log_warn "查看日志：docker-compose -f ${COMPOSE_FILE} logs -f"
    return 1
}

# 查看日志
view_logs() {
    local lines=${1:-100}
    docker-compose -f ${COMPOSE_FILE} logs --tail=${lines} -f
}

# 查看状态
view_status() {
    log_info "容器状态："
    docker-compose -f ${COMPOSE_FILE} ps

    echo ""
    log_info "服务信息："
    docker inspect ${CONTAINER_NAME} --format='Image: {{.Config.Image}}' || log_warn "容器未运行"
    docker inspect ${CONTAINER_NAME} --format='Status: {{.State.Status}}' || log_warn "容器未运行"
    docker inspect ${CONTAINER_NAME} --format='Started: {{.State.StartedAt}}' || log_warn "容器未运行"
}

# 回滚到指定版本
rollback() {
    local version=$1
    if [ -z "$version" ]; then
        log_error "请指定回滚版本，例如：./deploy.sh rollback v1.0.0"
        exit 1
    fi

    log_warn "准备回滚到版本：${version}"
    read -p "确认回滚？(y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_container
        pull_image ${version}
        # 临时修改 docker-compose.prod.yml 中的镜像版本
        sed -i.bak "s|${IMAGE_NAME}:.*|${IMAGE_NAME}:${version}|" ${COMPOSE_FILE}
        start_container
        health_check
        # 恢复原文件
        mv ${COMPOSE_FILE}.bak ${COMPOSE_FILE}
        log_info "✅ 回滚完成！"
    else
        log_info "取消回滚"
    fi
}

# 清理未使用的镜像
cleanup() {
    log_info "清理未使用的 Docker 镜像..."
    docker image prune -f
    log_info "✅ 清理完成"
}

# 主部署流程
deploy() {
    local version=${1:-latest}

    log_info "=========================================="
    log_info "  法学教育平台 - 开始部署"
    log_info "  版本：${version}"
    log_info "=========================================="

    check_docker
    check_env_file

    # 备份当前运行的镜像版本
    if docker ps | grep -q ${CONTAINER_NAME}; then
        local current_image=$(docker inspect ${CONTAINER_NAME} --format='{{.Config.Image}}' || echo "unknown")
        log_info "当前运行版本：${current_image}"
    fi

    pull_image ${version}
    stop_container
    start_container

    if health_check; then
        log_info "=========================================="
        log_info "  ✅ 部署成功！"
        log_info "=========================================="
        log_info "访问地址：http://localhost:3000"
        log_info "查看日志：./deploy.sh logs"
        log_info "查看状态：./deploy.sh status"
    else
        log_error "=========================================="
        log_error "  ❌ 部署失败！"
        log_error "=========================================="
        log_warn "建议操作："
        echo "  1. 查看日志：./deploy.sh logs"
        echo "  2. 检查环境变量：cat .env.production"
        echo "  3. 回滚到上一版本：./deploy.sh rollback <version>"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
法学教育平台 - 服务器部署脚本

用法：
  ./deploy.sh [命令] [参数]

命令：
  deploy [version]   部署应用（默认：latest）
  rollback <version> 回滚到指定版本
  logs [lines]       查看日志（默认：最近100行）
  status            查看服务状态
  stop              停止服务
  start             启动服务
  restart           重启服务
  cleanup           清理未使用的镜像
  help              显示帮助信息

示例：
  ./deploy.sh deploy              # 部署最新版本
  ./deploy.sh deploy v1.2.0       # 部署指定版本
  ./deploy.sh rollback v1.1.0     # 回滚到 v1.1.0
  ./deploy.sh logs 200            # 查看最近200行日志
  ./deploy.sh status              # 查看服务状态

更多信息请查看：DEPLOYMENT.md
EOF
}

# 命令路由
case "${1:-deploy}" in
    deploy)
        deploy ${2:-latest}
        ;;
    rollback)
        rollback $2
        ;;
    logs)
        view_logs ${2:-100}
        ;;
    status)
        view_status
        ;;
    stop)
        stop_container
        ;;
    start)
        start_container
        health_check
        ;;
    restart)
        stop_container
        start_container
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知命令：$1"
        show_help
        exit 1
        ;;
esac
