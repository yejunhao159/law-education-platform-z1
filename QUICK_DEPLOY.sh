#!/bin/bash
# ============================================================================
# 🚀 法学AI教学系统 - 阿里云快速部署脚本
# ============================================================================
# 一行命令完成从构建到部署的全流程
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
ALIYUN_REGISTRY="crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="yejunhao"
IMAGE_NAME="legal-education"
VERSION="${1:-v1.0.1}"
FULL_IMAGE="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${VERSION}"
SERVER_IP="${2:-115.29.191.180}"

# Banner
print_banner() {
  clear
  echo -e "${CYAN}"
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║     🚀 法学AI教学系统 - 阿里云快速部署 v1.0                  ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# 打印步骤
print_step() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${MAGENTA}📍 $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 打印成功
print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# 打印错误
print_error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# 打印信息
print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Main流程
main() {
  print_banner

  # Step 1: 参数验证
  print_step "参数验证"
  echo "镜像版本: $VERSION"
  echo "服务器IP: $SERVER_IP"
  echo "完整镜像: $FULL_IMAGE"
  print_success "参数已验证"

  # Step 2: 本地构建
  print_step "本地构建Docker镜像"
  echo -e "${YELLOW}这会耗时8-15分钟，取决于网络和系统性能...${NC}\n"

  if docker build -f Dockerfile -t "$FULL_IMAGE" .; then
    print_success "镜像构建成功"
    BUILT_IMAGE_SIZE=$(docker images "$FULL_IMAGE" --format "{{.Size}}")
    print_info "镜像大小: $BUILT_IMAGE_SIZE"
  else
    print_error "镜像构建失败，请检查Dockerfile和依赖"
  fi

  # Step 3: 推送到阿里云
  print_step "推送到阿里云Container Registry"

  # 检查Docker登录
  if ! docker images | grep -q "$ALIYUN_REGISTRY"; then
    print_info "未登录阿里云，正在尝试登录..."
    echo "请输入阿里云用户名 (nick2447759034):"
    read -r ALIYUN_USER
    ALIYUN_USER="${ALIYUN_USER:-nick2447759034}"
    echo "请输入密码:"
    read -rs ALIYUN_PASS

    if echo "$ALIYUN_PASS" | docker login \
      --username="$ALIYUN_USER" \
      --password-stdin \
      "$ALIYUN_REGISTRY"; then
      print_success "阿里云登录成功"
    else
      print_error "阿里云登录失败"
    fi
  fi

  # 推送镜像
  if docker push "$FULL_IMAGE"; then
    print_success "镜像推送成功"
  else
    print_error "镜像推送失败，请检查网络连接"
  fi

  # Step 4: 在服务器部署
  print_step "在服务器上部署"

  # 提示用户输入必需的环境变量
  echo -e "${YELLOW}请输入生产环境的配置:${NC}\n"

  echo "输入 DEEPSEEK_API_KEY (必需):"
  read -rs DEEPSEEK_KEY
  [ -z "$DEEPSEEK_KEY" ] && print_error "DEEPSEEK_API_KEY 不能为空"

  echo -e "\n输入 AI_302_API_KEY (必需，用于PPT生成):"
  read -rs AI_302_KEY
  [ -z "$AI_302_KEY" ] && print_error "AI_302_API_KEY 不能为空"

  echo -e "\n输入应用前端URL (默认: https://$SERVER_IP):"
  read -r BASE_URL
  BASE_URL="${BASE_URL:-https://$SERVER_IP}"

  # 生成远程部署命令
  DEPLOY_CMD="docker run -d \
  --name legal-education-prod \
  --restart always \
  -p 3000:3000 \
  -e DEEPSEEK_API_KEY='$DEEPSEEK_KEY' \
  -e AI_302_API_KEY='$AI_302_KEY' \
  -e NEXT_PUBLIC_BASE_URL='$BASE_URL' \
  -v legal-education-data:/app/data \
  -v legal-education-logs:/app/logs \
  '$FULL_IMAGE'"

  # 在远程服务器执行
  print_info "连接到服务器: $SERVER_IP"

  SSH_CMD="ssh root@$SERVER_IP"

  # 创建Docker卷
  $SSH_CMD "docker volume create legal-education-data 2>/dev/null || true"
  $SSH_CMD "docker volume create legal-education-logs 2>/dev/null || true"

  # 停止旧容器（如果存在）
  $SSH_CMD "docker stop legal-education-prod 2>/dev/null || true"
  $SSH_CMD "docker rm legal-education-prod 2>/dev/null || true"

  # 拉取新镜像
  if $SSH_CMD "docker pull '$FULL_IMAGE'"; then
    print_success "镜像拉取成功"
  else
    print_error "镜像拉取失败"
  fi

  # 运行新容器
  if $SSH_CMD "$DEPLOY_CMD"; then
    print_success "容器启动成功"
  else
    print_error "容器启动失败"
  fi

  # Step 5: 验证部署
  print_step "验证部署"

  sleep 3

  # 检查容器状态
  CONTAINER_STATUS=$($SSH_CMD "docker ps | grep legal-education-prod" || echo "")
  if [ -n "$CONTAINER_STATUS" ]; then
    print_success "容器正在运行"
    echo -e "${BLUE}$CONTAINER_STATUS${NC}"
  else
    print_error "容器未运行，请检查日志"
  fi

  # 显示实时日志的前20行
  echo -e "\n${YELLOW}📋 容器启动日志（前20行）:${NC}"
  $SSH_CMD "docker logs legal-education-prod 2>&1 | head -20"

  # 完成
  print_step "部署完成"

  echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║ ✅ 部署完成！${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

  echo -e "\n${BLUE}📝 后续操作:${NC}"
  echo ""
  echo "1️⃣  查看完整日志:"
  echo -e "   ${CYAN}ssh root@$SERVER_IP 'docker logs -f legal-education-prod'${NC}"
  echo ""
  echo "2️⃣  访问应用:"
  echo -e "   ${CYAN}http://$SERVER_IP:3000${NC}"
  echo ""
  echo "3️⃣  检查进程:"
  echo -e "   ${CYAN}ssh root@$SERVER_IP 'docker exec legal-education-prod pm2 list'${NC}"
  echo ""
  echo "4️⃣  查看环境变量:"
  echo -e "   ${CYAN}ssh root@$SERVER_IP 'docker exec legal-education-prod cat /app/.env.production'${NC}"
  echo ""
  echo "5️⃣  重启容器:"
  echo -e "   ${CYAN}ssh root@$SERVER_IP 'docker restart legal-education-prod'${NC}"
  echo ""

  echo -e "${YELLOW}⚠️  如有问题，查看详细日志：${NC}"
  echo -e "   ${CYAN}ssh root@$SERVER_IP 'docker logs legal-education-prod'${NC}"
  echo ""
}

# 错误处理
trap 'print_error "部署过程中出现错误"' ERR

# 运行主程序
main
