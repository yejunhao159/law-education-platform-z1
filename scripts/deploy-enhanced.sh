#!/bin/bash
# =============================================================================
# 法学教育平台 - 增强版部署脚本
# =============================================================================
# 版本: Enhanced v1.0
# 日期: 2025-10-11
# 作者: Claude Code with DevOps Automation
#
# 新增功能:
# - ✅ 自动备份（数据库、配置）
# - ✅ 一键回滚机制
# - ✅ 部署前验证
# - ✅ 冒烟测试
# - ✅ 详细的错误处理
# - ✅ 部署日志记录
# =============================================================================

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令中任何命令失败都会导致整个管道失败

# =============================================================================
# 配置变量
# =============================================================================
VERSION="${1:-latest}"
IMAGE_NAME="ghcr.io/yejunhao159/law-education-platform-z1:${VERSION}"
COMPOSE_FILE="docker-compose.prod.yml"
CONTAINER_NAME="law-edu-app-prod"
BACKUP_DIR="./backups"
LOG_DIR="./deployment-logs"
DEPLOYMENT_LOG="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# 工具函数
# =============================================================================

# 日志记录函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DEPLOYMENT_LOG"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

print_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

print_step() {
    echo -e "${PURPLE}▶️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# 错误处理
handle_error() {
    print_error "部署失败！错误发生在第 $1 行"
    print_warning "正在触发回滚..."
    rollback_deployment
    exit 1
}

trap 'handle_error $LINENO' ERR

# =============================================================================
# 前置检查
# =============================================================================

pre_deployment_check() {
    print_step "步骤1: 前置检查"

    # 创建必要的目录
    mkdir -p "$BACKUP_DIR" "$LOG_DIR"

    # 检查必需文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "未找到 $COMPOSE_FILE 文件"
        exit 1
    fi

    if [ ! -f ".env.production" ]; then
        print_error "未找到 .env.production 文件"
        exit 1
    fi

    # 检查 Docker 是否运行
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker 未运行或无权限访问"
        exit 1
    fi

    # 检查磁盘空间（至少需要5GB）
    AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        print_warning "磁盘空间不足5GB，当前可用: ${AVAILABLE_SPACE}GB"
    fi

    print_success "前置检查通过"
}

# =============================================================================
# 备份功能
# =============================================================================

backup_current_version() {
    print_step "步骤2: 备份当前版本"

    BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_PATH="${BACKUP_DIR}/backup-${BACKUP_TIMESTAMP}"
    mkdir -p "$BACKUP_PATH"

    # 备份数据库
    if [ -d "./data" ]; then
        print_info "备份数据库..."
        cp -r ./data "$BACKUP_PATH/"
        print_success "数据库备份完成"
    fi

    # 备份环境变量
    if [ -f ".env.production" ]; then
        print_info "备份环境配置..."
        cp .env.production "$BACKUP_PATH/"
        print_success "环境配置备份完成"
    fi

    # 记录当前运行的容器信息
    if docker ps -a | grep -q "$CONTAINER_NAME"; then
        docker inspect "$CONTAINER_NAME" > "$BACKUP_PATH/container-info.json" 2>/dev/null || true
        CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
        echo "$CURRENT_IMAGE" > "$BACKUP_PATH/previous-image.txt"
        print_info "当前镜像: $CURRENT_IMAGE"
    fi

    # 保存备份路径供回滚使用
    echo "$BACKUP_PATH" > "${BACKUP_DIR}/latest-backup.txt"

    print_success "备份完成: $BACKUP_PATH"

    # 清理旧备份（保留最近5个）
    ls -t "${BACKUP_DIR}" | grep "backup-" | tail -n +6 | xargs -I {} rm -rf "${BACKUP_DIR}/{}" 2>/dev/null || true
}

# =============================================================================
# 镜像拉取
# =============================================================================

pull_new_image() {
    print_step "步骤3: 拉取新镜像"

    print_info "拉取镜像: $IMAGE_NAME"

    if docker pull "$IMAGE_NAME"; then
        print_success "镜像拉取成功"

        # 验证镜像
        IMAGE_ID=$(docker images --format "{{.ID}}" "$IMAGE_NAME" | head -1)
        print_info "镜像ID: $IMAGE_ID"
    else
        print_error "镜像拉取失败"
        print_warning "请检查："
        echo "  1. GitHub Actions 是否构建完成"
        echo "  2. 镜像标签是否正确: $IMAGE_NAME"
        echo "  3. 是否需要登录: docker login ghcr.io"
        exit 1
    fi
}

# =============================================================================
# 部署新版本
# =============================================================================

deploy_new_version() {
    print_step "步骤4: 部署新版本"

    # 停止旧容器
    print_info "停止旧容器..."
    docker-compose -f "$COMPOSE_FILE" down
    print_success "旧容器已停止"

    # 启动新容器
    print_info "启动新容器 (版本: $VERSION)..."
    docker-compose -f "$COMPOSE_FILE" up -d
    print_success "新容器已启动"
}

# =============================================================================
# 健康检查
# =============================================================================

health_check() {
    print_step "步骤5: 健康检查"

    print_info "等待容器启动 (最多120秒)..."

    RETRY_COUNT=0
    MAX_RETRIES=24  # 24 * 5秒 = 120秒

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            print_success "容器健康检查通过"
            return 0
        elif [ "$HEALTH_STATUS" = "unhealthy" ]; then
            print_error "容器健康检查失败"
            docker logs --tail 100 "$CONTAINER_NAME"
            return 1
        else
            echo -n "."
            sleep 5
            RETRY_COUNT=$((RETRY_COUNT + 1))
        fi
    done

    print_warning "健康检查超时"
    return 1
}

# =============================================================================
# 冒烟测试
# =============================================================================

smoke_test() {
    print_step "步骤6: 冒烟测试"

    # 等待服务完全启动
    sleep 5

    # 测试 Next.js (3000端口)
    print_info "测试 Next.js 服务..."
    if curl -f -s --max-time 10 http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Next.js 服务正常 (端口3000)"
    else
        print_error "Next.js 服务测试失败"
        return 1
    fi

    # 测试 Socket.IO (3001端口)
    print_info "测试 Socket.IO 服务..."
    if curl -f -s --max-time 10 "http://localhost:3001/socket.io/?EIO=4&transport=polling" > /dev/null 2>&1; then
        print_success "Socket.IO 服务正常 (端口3001)"
    else
        print_error "Socket.IO 服务测试失败"
        return 1
    fi

    # 检查PM2进程
    print_info "检查 PM2 进程..."
    PM2_STATUS=$(docker exec "$CONTAINER_NAME" pm2 list 2>/dev/null || echo "failed")
    if echo "$PM2_STATUS" | grep -q "online"; then
        print_success "PM2 进程正常运行"
    else
        print_warning "PM2 进程状态异常"
    fi

    print_success "冒烟测试通过"
    return 0
}

# =============================================================================
# 回滚功能
# =============================================================================

rollback_deployment() {
    print_step "🔄 开始回滚部署"

    # 读取最新备份路径
    if [ -f "${BACKUP_DIR}/latest-backup.txt" ]; then
        BACKUP_PATH=$(cat "${BACKUP_DIR}/latest-backup.txt")

        if [ -d "$BACKUP_PATH" ]; then
            print_info "从备份恢复: $BACKUP_PATH"

            # 读取之前的镜像
            if [ -f "$BACKUP_PATH/previous-image.txt" ]; then
                PREVIOUS_IMAGE=$(cat "$BACKUP_PATH/previous-image.txt")
                print_info "回滚到镜像: $PREVIOUS_IMAGE"

                # 停止当前容器
                docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

                # 恢复数据
                if [ -d "$BACKUP_PATH/data" ]; then
                    rm -rf ./data
                    cp -r "$BACKUP_PATH/data" ./data
                fi

                # 恢复环境配置
                if [ -f "$BACKUP_PATH/.env.production" ]; then
                    cp "$BACKUP_PATH/.env.production" .env.production
                fi

                # 更新 docker-compose 文件中的镜像版本（临时）
                sed -i.bak "s|image:.*|image: $PREVIOUS_IMAGE|" "$COMPOSE_FILE"

                # 启动旧版本
                docker-compose -f "$COMPOSE_FILE" up -d

                # 恢复 docker-compose 文件
                mv "$COMPOSE_FILE.bak" "$COMPOSE_FILE"

                print_success "回滚完成"
            else
                print_error "找不到之前的镜像信息"
            fi
        else
            print_error "备份目录不存在: $BACKUP_PATH"
        fi
    else
        print_error "找不到备份信息"
    fi
}

# =============================================================================
# 部署报告
# =============================================================================

generate_deployment_report() {
    print_step "步骤7: 生成部署报告"

    cat << EOF

╔════════════════════════════════════════════════════════════╗
║  🎉 部署完成！                                             ║
║  📊 版本: ${VERSION}                                         ║
║  ⏰ 时间: $(date '+%Y-%m-%d %H:%M:%S')                        ║
╚════════════════════════════════════════════════════════════╝

📋 部署信息：
  • 镜像: $IMAGE_NAME
  • 容器: $CONTAINER_NAME
  • 日志: $DEPLOYMENT_LOG

🌐 访问地址:
  • Next.js:   http://115.29.191.180:3000
  • Socket.IO: http://115.29.191.180:3001

📝 常用命令：
  查看日志：docker logs -f $CONTAINER_NAME
  查看PM2：docker exec $CONTAINER_NAME pm2 list
  重启服务：docker-compose -f $COMPOSE_FILE restart
  停止服务：docker-compose -f $COMPOSE_FILE down
  进入容器：docker exec -it $CONTAINER_NAME sh

🔄 回滚命令（如果需要）：
  $0 rollback

🔍 验证命令：
  curl http://localhost:3000/api/health
  curl "http://localhost:3001/socket.io/?EIO=4&transport=polling"

EOF
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    # 打印banner
    cat << EOF

╔════════════════════════════════════════════════════════════╗
║  📦 法学教育平台 - 增强版部署脚本                         ║
║  🏷️  版本: ${VERSION}                                        ║
║  📅 时间: $(date '+%Y-%m-%d %H:%M:%S')                        ║
╚════════════════════════════════════════════════════════════╝

EOF

    log "开始部署流程 - 版本: $VERSION"

    # 执行部署步骤
    pre_deployment_check
    backup_current_version
    pull_new_image
    deploy_new_version

    # 健康检查和冒烟测试
    if health_check && smoke_test; then
        generate_deployment_report
        log "部署成功完成"
        print_success "✨ 部署成功！"
        exit 0
    else
        print_error "部署验证失败"
        print_warning "是否自动回滚？(y/n)"
        read -r -t 30 ROLLBACK_CHOICE || ROLLBACK_CHOICE="y"

        if [ "$ROLLBACK_CHOICE" = "y" ] || [ "$ROLLBACK_CHOICE" = "Y" ]; then
            rollback_deployment
        fi

        exit 1
    fi
}

# =============================================================================
# 命令行参数处理
# =============================================================================

case "${1:-deploy}" in
    rollback)
        print_warning "手动触发回滚"
        rollback_deployment
        ;;
    deploy|*)
        main
        ;;
esac
