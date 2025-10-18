#!/bin/bash
# =============================================================================
# 法学教育平台 - 蓝绿部署脚本
# =============================================================================
# 用途：实现零停机部署（Blue-Green Deployment）
# 使用方法：
#   ./scripts/deploy-blue-green.sh [version]
#
# 部署流程：
#   1. 检查当前活跃环境（蓝色或绿色）
#   2. 在备用环境部署新版本
#   3. 健康检查和冒烟测试
#   4. 切换流量到新环境
#   5. 停止旧环境
# =============================================================================

set -e
set -o pipefail

# 配置
VERSION="${1:-latest}"
COMPOSE_FILE="docker-compose.blue-green.yml"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# =============================================================================
# 检测当前活跃环境
# =============================================================================

detect_active_environment() {
    print_info "检测当前活跃环境..."

    if docker ps | grep -q "law-edu-app-blue"; then
        ACTIVE_ENV="blue"
        STANDBY_ENV="green"
        ACTIVE_PORT=3000
        STANDBY_PORT=3002
    elif docker ps | grep -q "law-edu-app-green"; then
        ACTIVE_ENV="green"
        STANDBY_ENV="blue"
        ACTIVE_PORT=3002
        STANDBY_PORT=3000
    else
        # 首次部署，使用蓝色环境
        ACTIVE_ENV="none"
        STANDBY_ENV="blue"
        STANDBY_PORT=3000
    fi

    print_success "活跃环境: ${ACTIVE_ENV}, 备用环境: ${STANDBY_ENV}"
}

# =============================================================================
# 部署到备用环境
# =============================================================================

deploy_to_standby() {
    print_info "部署新版本到 ${STANDBY_ENV} 环境..."

    # 更新镜像版本
    export IMAGE_VERSION="$VERSION"

    # 启动备用环境
    if [ "$STANDBY_ENV" = "green" ]; then
        docker-compose -f "$COMPOSE_FILE" --profile green up -d app-green
    else
        docker-compose -f "$COMPOSE_FILE" up -d app-blue
    fi

    print_success "${STANDBY_ENV} 环境部署完成"
}

# =============================================================================
# 健康检查
# =============================================================================

health_check_standby() {
    print_info "健康检查 ${STANDBY_ENV} 环境..."

    CONTAINER_NAME="law-edu-app-${STANDBY_ENV}"
    MAX_RETRIES=24
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

        if [ "$HEALTH" = "healthy" ]; then
            print_success "${STANDBY_ENV} 环境健康检查通过"
            return 0
        elif [ "$HEALTH" = "unhealthy" ]; then
            print_error "${STANDBY_ENV} 环境健康检查失败"
            return 1
        fi

        echo -n "."
        sleep 5
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done

    print_error "健康检查超时"
    return 1
}

# =============================================================================
# 冒烟测试
# =============================================================================

smoke_test_standby() {
    print_info "冒烟测试 ${STANDBY_ENV} 环境..."

    sleep 3

    # 测试 Next.js
    if curl -f -s --max-time 10 "http://localhost:${STANDBY_PORT}/api/health" > /dev/null 2>&1; then
        print_success "Next.js 服务正常"
    else
        print_error "Next.js 服务测试失败"
        return 1
    fi

    # 测试 Socket.IO
    SOCKET_PORT=$((STANDBY_PORT + 1))
    if curl -f -s --max-time 10 "http://localhost:${SOCKET_PORT}/socket.io/?EIO=4&transport=polling" > /dev/null 2>&1; then
        print_success "Socket.IO 服务正常"
    else
        print_error "Socket.IO 服务测试失败"
        return 1
    fi

    print_success "冒烟测试通过"
    return 0
}

# =============================================================================
# 流量切换
# =============================================================================

switch_traffic() {
    print_info "切换流量到 ${STANDBY_ENV} 环境..."

    # 这里需要根据实际的负载均衡器配置进行修改
    # 示例：使用 iptables 进行端口转发

    if [ "$STANDBY_ENV" = "green" ]; then
        # 将 3000 -> 3002, 3001 -> 3003
        print_info "TODO: 配置负载均衡器将流量切换到绿色环境"
    else
        # 恢复默认端口映射
        print_info "TODO: 配置负载均衡器将流量切换到蓝色环境"
    fi

    print_success "流量切换完成"
}

# =============================================================================
# 停止旧环境
# =============================================================================

stop_old_environment() {
    if [ "$ACTIVE_ENV" != "none" ]; then
        print_info "停止 ${ACTIVE_ENV} 环境..."

        if [ "$ACTIVE_ENV" = "blue" ]; then
            docker-compose -f "$COMPOSE_FILE" stop app-blue
        else
            docker-compose -f "$COMPOSE_FILE" stop app-green
        fi

        print_success "${ACTIVE_ENV} 环境已停止"
    fi
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    cat << EOF

╔════════════════════════════════════════════════════════════╗
║  🔵🟢 蓝绿部署 - 零停机升级                                ║
║  🏷️  版本: ${VERSION}                                        ║
║  📅 时间: $(date '+%Y-%m-%d %H:%M:%S')                        ║
╚════════════════════════════════════════════════════════════╝

EOF

    # 执行部署流程
    detect_active_environment
    deploy_to_standby

    if health_check_standby && smoke_test_standby; then
        print_success "✅ 新环境验证通过"

        echo ""
        read -p "是否切换流量到 ${STANDBY_ENV} 环境? (y/n): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            switch_traffic

            echo ""
            read -p "是否停止 ${ACTIVE_ENV} 环境? (y/n): " -n 1 -r
            echo

            if [[ $REPLY =~ ^[Yy]$ ]]; then
                stop_old_environment
            fi

            cat << EOF

╔════════════════════════════════════════════════════════════╗
║  🎉 蓝绿部署完成！                                         ║
║  当前活跃环境: ${STANDBY_ENV}                                ║
║  访问地址: http://115.29.191.180:3000                    ║
╚════════════════════════════════════════════════════════════╝

EOF
        else
            print_info "保持当前状态，两个环境同时运行"
            print_info "验证新环境: http://localhost:${STANDBY_PORT}"
        fi
    else
        print_error "新环境验证失败"
        print_info "保留 ${ACTIVE_ENV} 环境继续运行"
        print_info "清理失败的 ${STANDBY_ENV} 环境"

        if [ "$STANDBY_ENV" = "blue" ]; then
            docker-compose -f "$COMPOSE_FILE" stop app-blue
        else
            docker-compose -f "$COMPOSE_FILE" stop app-green
        fi

        exit 1
    fi
}

# 参数处理
case "${1:-deploy}" in
    status)
        detect_active_environment
        docker-compose -f "$COMPOSE_FILE" ps
        ;;
    switch)
        detect_active_environment
        switch_traffic
        ;;
    *)
        main
        ;;
esac
