#!/bin/bash
# =============================================================================
# 🚀 阿里云镜像构建和推送脚本 v3.0
# =============================================================================
# 功能：
# 1. 构建优化的Docker镜像（解决Python3、环境变量、Socket.IO问题）
# 2. 推送到阿里云Container Registry
# 3. 支持远程服务器拉取和运行
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
ALIYUN_REGISTRY="crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="yejunhao"
IMAGE_NAME="legal-education"
IMAGE_VERSION="${1:-latest}"
FULL_IMAGE_NAME="$ALIYUN_REGISTRY/$ALIYUN_NAMESPACE/$IMAGE_NAME:$IMAGE_VERSION"

# 构建参数
BUILD_ARGS=""

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 阿里云镜像构建和推送 v3.0${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Step 1: 检查Docker是否安装
echo -e "\n${YELLOW}[Step 1/5] 检查Docker环境...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker未安装${NC}"
  exit 1
fi
DOCKER_VERSION=$(docker --version)
echo -e "${GREEN}✓ Docker已安装：$DOCKER_VERSION${NC}"

# Step 2: 验证阿里云凭证
echo -e "\n${YELLOW}[Step 2/5] 验证阿里云Container Registry登录...${NC}"
if docker info | grep -q "crpi-k9wo9ii25m22jesx"; then
  echo -e "${GREEN}✓ 已登录阿里云镜像仓库${NC}"
else
  echo -e "${YELLOW}⚠️  未登录阿里云，尝试登录...${NC}"
  echo "请输入阿里云用户名："
  read -r ALIYUN_USERNAME
  echo "请输入阿里云密码："
  read -rs ALIYUN_PASSWORD

  echo "$ALIYUN_PASSWORD" | docker login \
    --username="$ALIYUN_USERNAME" \
    --password-stdin \
    "$ALIYUN_REGISTRY"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 阿里云登录成功${NC}"
  else
    echo -e "${RED}❌ 阿里云登录失败${NC}"
    exit 1
  fi
fi

# Step 3: 构建Docker镜像
echo -e "\n${YELLOW}[Step 3/5] 构建Docker镜像...${NC}"
echo -e "${BLUE}构建参数:${NC}"
echo "  镜像名称: $FULL_IMAGE_NAME"
echo "  Dockerfile: ./Dockerfile"
echo ""

BUILD_CONTEXT="."
echo -e "${BLUE}开始构建（这会耗时5-10分钟）...${NC}"
echo ""

if docker build \
  -f Dockerfile \
  -t "$FULL_IMAGE_NAME" \
  $BUILD_ARGS \
  "$BUILD_CONTEXT"; then
  echo -e "\n${GREEN}✓ 镜像构建成功${NC}"
else
  echo -e "\n${RED}❌ 镜像构建失败${NC}"
  exit 1
fi

# Step 4: 验证镜像大小
echo -e "\n${YELLOW}[Step 4/5] 验证镜像信息...${NC}"
IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME" --format "{{.Size}}")
IMAGE_ID=$(docker images "$FULL_IMAGE_NAME" --format "{{.ID}}")

echo -e "${BLUE}镜像信息:${NC}"
echo "  镜像ID: $IMAGE_ID"
echo "  镜像大小: $IMAGE_SIZE"
echo "  标签: $FULL_IMAGE_NAME"

# Step 5: 推送到阿里云
echo -e "\n${YELLOW}[Step 5/5] 推送镜像到阿里云Container Registry...${NC}"
echo -e "${BLUE}推送目标: $FULL_IMAGE_NAME${NC}"
echo ""

if docker push "$FULL_IMAGE_NAME"; then
  echo -e "\n${GREEN}✓ 镜像推送成功${NC}"
else
  echo -e "\n${RED}❌ 镜像推送失败${NC}"
  exit 1
fi

# 完成
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║✅ 构建和推送完成！${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}📋 下一步操作：${NC}"
echo ""
echo -e "${YELLOW}1️⃣  在远程服务器登录阿里云镜像仓库：${NC}"
echo -e "    ${BLUE}docker login --username=nick2447759034 $ALIYUN_REGISTRY${NC}"
echo ""

echo -e "${YELLOW}2️⃣  拉取镜像：${NC}"
echo -e "    ${BLUE}docker pull $FULL_IMAGE_NAME${NC}"
echo ""

echo -e "${YELLOW}3️⃣  运行容器（在服务器上执行）：${NC}"
echo -e "    ${BLUE}docker run -d \\${NC}"
echo -e "      ${BLUE}--name legal-education \\${NC}"
echo -e "      ${BLUE}--restart always \\${NC}"
echo -e "      ${BLUE}-p 3000:3000 \\${NC}"
echo -e "      ${BLUE}-p 3001:3001 \\${NC}"
echo -e "      ${BLUE}-e DEEPSEEK_API_KEY=sk-xxxxx \\${NC}"
echo -e "      ${BLUE}-e NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-xxxxx \\${NC}"
echo -e "      ${BLUE}-e NEXT_PUBLIC_AI_302_API_KEY=sk-xxxxx \\${NC}"
echo -e "      ${BLUE}-e NEXT_PUBLIC_BASE_URL=https://your-domain.com \\${NC}"
echo -e "      ${BLUE}-e NEXT_PUBLIC_SOCKET_IO_URL=https://your-domain.com:3001 \\${NC}"
echo -e "      ${BLUE}-v legal-data:/app/data \\${NC}"
echo -e "      ${BLUE}$FULL_IMAGE_NAME${NC}"
echo ""

echo -e "${YELLOW}4️⃣  验证容器运行：${NC}"
echo -e "    ${BLUE}docker ps${NC}"
echo -e "    ${BLUE}docker logs -f legal-education${NC}"
echo ""

echo -e "${BLUE}⚠️  关键注意事项：${NC}"
echo -e "  ✓ 必须提供 DEEPSEEK_API_KEY（否则会启动失败）"
echo -e "  ✓ 必须提供 NEXT_PUBLIC_AI_302_API_KEY（否则PPT功能不可用）"
echo -e "  ✓ NEXT_PUBLIC_BASE_URL 和 NEXT_PUBLIC_SOCKET_IO_URL 需指向生产域名"
echo -e "  ✓ 建议使用 docker volume 持久化 /app/data 目录"
echo ""
