#!/bin/bash
# =============================================================================
# Docker 部署就绪检查脚本
# =============================================================================
# 用途：在部署前检查所有必需的条件，避免部署失败
# 使用：./scripts/docker-deploy-check.sh [production|development]
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 环境类型（默认development）
ENV_TYPE="${1:-development}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🚀 Docker 部署就绪检查${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "环境类型: ${YELLOW}${ENV_TYPE}${NC}"
echo ""

# 检查计数器
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# 检查函数
check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((CHECKS_PASSED++))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((CHECKS_FAILED++))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNINGS++))
}

echo -e "${BLUE}[1/7] 检查系统依赖...${NC}"
echo "-----------------------------------"

# 检查 Docker
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
  check_pass "Docker 已安装 (版本: $DOCKER_VERSION)"
else
  check_fail "Docker 未安装"
  echo "   安装方法: curl -fsSL https://get.docker.com | sh"
fi

# 检查 Docker Compose
if command -v docker-compose &> /dev/null; then
  COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | tr -d ',')
  check_pass "Docker Compose 已安装 (版本: $COMPOSE_VERSION)"
else
  check_fail "Docker Compose 未安装"
  echo "   安装方法: https://docs.docker.com/compose/install/"
fi

# 检查 Docker 服务状态
if docker info &> /dev/null; then
  check_pass "Docker 服务运行正常"
else
  check_fail "Docker 服务未运行"
  echo "   启动方法: sudo systemctl start docker"
fi

echo ""
echo -e "${BLUE}[2/7] 检查配置文件...${NC}"
echo "-----------------------------------"

# 检查 Dockerfile
if [ -f "Dockerfile" ]; then
  check_pass "Dockerfile 存在"
else
  check_fail "Dockerfile 不存在"
fi

# 检查 docker-compose 文件
if [ "$ENV_TYPE" = "production" ]; then
  COMPOSE_FILE="docker-compose.production.yml"
else
  COMPOSE_FILE="docker-compose.postgres.yml"
fi

if [ -f "$COMPOSE_FILE" ]; then
  check_pass "$COMPOSE_FILE 存在"
else
  check_fail "$COMPOSE_FILE 不存在"
fi

# 检查 .dockerignore
if [ -f ".dockerignore" ]; then
  check_pass ".dockerignore 存在"
else
  check_warn ".dockerignore 不存在（可选，但建议添加以优化构建）"
fi

echo ""
echo -e "${BLUE}[3/7] 检查环境变量配置...${NC}"
echo "-----------------------------------"

# 确定环境文件
if [ "$ENV_TYPE" = "production" ]; then
  ENV_FILE=".env.production"
else
  ENV_FILE=".env.docker"
fi

if [ -f "$ENV_FILE" ]; then
  check_pass "$ENV_FILE 存在"

  # 检查关键环境变量
  source "$ENV_FILE" 2>/dev/null || true

  # 检查 DEEPSEEK_API_KEY
  if grep -q "^DEEPSEEK_API_KEY=" "$ENV_FILE" && [ -n "$DEEPSEEK_API_KEY" ]; then
    if [[ "$DEEPSEEK_API_KEY" == sk-* ]]; then
      check_pass "DEEPSEEK_API_KEY 已配置"
    else
      check_fail "DEEPSEEK_API_KEY 格式错误（应以 sk- 开头）"
    fi
  else
    check_fail "DEEPSEEK_API_KEY 未配置"
  fi

  # 检查 AI_302_API_KEY（服务端版本）
  if grep -q "^AI_302_API_KEY=" "$ENV_FILE"; then
    check_pass "AI_302_API_KEY（服务端）已配置"
  else
    check_fail "AI_302_API_KEY（服务端）未配置 - 这是PPT生成失败的常见原因！"
    echo "   请在 $ENV_FILE 中添加："
    echo "   AI_302_API_KEY=sk-your-key"
  fi

  # 检查 NEXT_PUBLIC_AI_302_API_KEY（客户端版本，可选）
  if grep -q "^NEXT_PUBLIC_AI_302_API_KEY=" "$ENV_FILE"; then
    check_pass "NEXT_PUBLIC_AI_302_API_KEY（客户端）已配置"
  else
    check_warn "NEXT_PUBLIC_AI_302_API_KEY（客户端）未配置（可选）"
  fi

  # 检查 NEXT_PUBLIC_BASE_URL
  if grep -q "^NEXT_PUBLIC_BASE_URL=" "$ENV_FILE"; then
    check_pass "NEXT_PUBLIC_BASE_URL 已配置"
  else
    check_warn "NEXT_PUBLIC_BASE_URL 未配置（将使用默认值）"
  fi

  # 生产环境额外检查
  if [ "$ENV_TYPE" = "production" ]; then
    # 检查数据库密码
    if grep -q "^DB_PASSWORD=" "$ENV_FILE" && [ -n "$DB_PASSWORD" ]; then
      if [ ${#DB_PASSWORD} -ge 12 ]; then
        check_pass "DB_PASSWORD 已配置（强密码）"
      else
        check_warn "DB_PASSWORD 过于简单（建议至少12位）"
      fi
    else
      check_fail "DB_PASSWORD 未配置"
    fi

    # 检查 GUEST_MODE
    if grep -q "^GUEST_MODE=false" "$ENV_FILE"; then
      check_pass "GUEST_MODE 已关闭（生产环境推荐）"
    else
      check_warn "GUEST_MODE 未关闭（生产环境建议关闭）"
    fi
  fi

else
  check_fail "$ENV_FILE 不存在"
  echo "   创建方法: cp .env.example $ENV_FILE && vim $ENV_FILE"
fi

echo ""
echo -e "${BLUE}[4/7] 检查启动脚本...${NC}"
echo "-----------------------------------"

# 检查脚本文件
for script in scripts/generate-env.sh scripts/check-env.sh scripts/start.sh; do
  if [ -f "$script" ]; then
    if [ -x "$script" ]; then
      check_pass "$script 存在且可执行"
    else
      check_warn "$script 存在但不可执行"
      echo "   修复方法: chmod +x $script"
    fi
  else
    check_fail "$script 不存在"
  fi
done

echo ""
echo -e "${BLUE}[5/7] 检查端口占用...${NC}"
echo "-----------------------------------"

# 检查关键端口
check_port() {
  PORT=$1
  SERVICE=$2
  if lsof -i:$PORT &> /dev/null; then
    check_warn "端口 $PORT 已被占用（$SERVICE）"
    echo "   占用进程: $(lsof -ti:$PORT | xargs ps -p | tail -n 1)"
  else
    check_pass "端口 $PORT 可用（$SERVICE）"
  fi
}

check_port 3000 "Next.js"
check_port 3001 "Socket.IO"
check_port 5432 "PostgreSQL"

if [ "$ENV_TYPE" = "production" ]; then
  check_port 80 "HTTP"
  check_port 443 "HTTPS"
fi

echo ""
echo -e "${BLUE}[6/7] 检查磁盘空间...${NC}"
echo "-----------------------------------"

# 检查磁盘空间
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
if (( $(echo "$AVAILABLE_SPACE > 5" | bc -l) )); then
  check_pass "磁盘空间充足 (${AVAILABLE_SPACE}G 可用)"
else
  check_warn "磁盘空间不足 (${AVAILABLE_SPACE}G 可用，建议至少5G)"
fi

echo ""
echo -e "${BLUE}[7/7] 检查Docker Compose配置...${NC}"
echo "-----------------------------------"

# 验证 docker-compose 配置
if [ -f "$COMPOSE_FILE" ]; then
  if docker-compose -f "$COMPOSE_FILE" config > /dev/null 2>&1; then
    check_pass "$COMPOSE_FILE 配置语法正确"
  else
    check_fail "$COMPOSE_FILE 配置语法错误"
    echo "   调试方法: docker-compose -f $COMPOSE_FILE config"
  fi
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}📊 检查结果汇总${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

echo -e "${GREEN}通过: $CHECKS_PASSED${NC}"
echo -e "${RED}失败: $CHECKS_FAILED${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"

echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ 所有关键检查通过！可以开始部署。${NC}"
  echo ""
  echo -e "${BLUE}推荐的部署命令：${NC}"
  if [ "$ENV_TYPE" = "production" ]; then
    echo "  docker-compose -f docker-compose.production.yml --env-file .env.production up -d"
  else
    echo "  docker-compose -f docker-compose.postgres.yml --env-file .env.docker up -d"
  fi
  echo ""
  exit 0
else
  echo -e "${RED}❌ 发现 $CHECKS_FAILED 个关键问题，请先修复后再部署。${NC}"
  echo ""
  exit 1
fi
