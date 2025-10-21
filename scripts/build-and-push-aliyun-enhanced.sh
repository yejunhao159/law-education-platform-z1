#!/bin/bash
# =============================================================================
# 🚀 阿里云镜像构建和推送脚本 v4.0 (Enhanced)
# =============================================================================
# 增强功能：
# 1. 支持从环境变量或配置文件读取凭证（无需每次输入）
# 2. 自动生成多版本标签（latest + 版本号 + git hash）
# 3. 构建缓存优化（减少构建时间）
# 4. 构建前检查（避免浪费时间）
# =============================================================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 阿里云配置
ALIYUN_REGISTRY="crpi-k9wo9ii25m22jesx.cn-shenzhen.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="yejunhao"
IMAGE_NAME="legal-education"

# 版本标签
VERSION_TAG="${1:-latest}"
GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 阿里云镜像构建和推送 v4.0 (Enhanced)${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# =============================================================================
# Step 0: 预检查
# =============================================================================
echo -e "\n${YELLOW}[Step 0/6] 预检查...${NC}"

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ 请在项目根目录运行此脚本${NC}"
  exit 1
fi

# 检查是否有未提交的更改（可选警告）
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo -e "${YELLOW}⚠️  检测到未提交的更改，建议先提交代码${NC}"
  echo -e "${YELLOW}   继续构建将使用当前工作目录的代码${NC}"
  read -p "   是否继续? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

echo -e "${GREEN}✓ 预检查通过${NC}"

# =============================================================================
# Step 1: 检查Docker环境
# =============================================================================
echo -e "\n${YELLOW}[Step 1/6] 检查Docker环境...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker未安装${NC}"
  exit 1
fi
DOCKER_VERSION=$(docker --version)
echo -e "${GREEN}✓ Docker已安装：$DOCKER_VERSION${NC}"

# =============================================================================
# Step 2: 登录阿里云Container Registry
# =============================================================================
echo -e "\n${YELLOW}[Step 2/6] 登录阿里云Container Registry...${NC}"

# 优先级：环境变量 > 配置文件 > 手动输入
CREDENTIALS_FILE="${HOME}/.aliyun-cr-credentials"

if [ -n "$ALIYUN_USERNAME" ] && [ -n "$ALIYUN_PASSWORD" ]; then
  echo -e "${BLUE}使用环境变量中的凭证${NC}"
elif [ -f "$CREDENTIALS_FILE" ]; then
  echo -e "${BLUE}从配置文件加载凭证: $CREDENTIALS_FILE${NC}"
  source "$CREDENTIALS_FILE"
else
  echo -e "${YELLOW}⚠️  未找到凭证，请手动输入${NC}"
  echo "阿里云用户名 (默认: nick2447759034):"
  read -r ALIYUN_USERNAME
  ALIYUN_USERNAME=${ALIYUN_USERNAME:-nick2447759034}

  echo "阿里云密码:"
  read -rs ALIYUN_PASSWORD
  echo
fi

# 执行登录
if echo "$ALIYUN_PASSWORD" | docker login \
  --username="$ALIYUN_USERNAME" \
  --password-stdin \
  "$ALIYUN_REGISTRY" 2>/dev/null; then
  echo -e "${GREEN}✓ 阿里云登录成功${NC}"
else
  echo -e "${RED}❌ 阿里云登录失败，请检查用户名和密码${NC}"
  exit 1
fi

# =============================================================================
# Step 3: 准备构建标签
# =============================================================================
echo -e "\n${YELLOW}[Step 3/6] 准备构建标签...${NC}"

# 生成多个标签
TAGS=(
  "$ALIYUN_REGISTRY/$ALIYUN_NAMESPACE/$IMAGE_NAME:$VERSION_TAG"
)

# 如果VERSION_TAG是latest，额外打标签
if [ "$VERSION_TAG" = "latest" ]; then
  TAGS+=(
    "$ALIYUN_REGISTRY/$ALIYUN_NAMESPACE/$IMAGE_NAME:v$PACKAGE_VERSION"
    "$ALIYUN_REGISTRY/$ALIYUN_NAMESPACE/$IMAGE_NAME:$GIT_HASH"
  )
fi

echo -e "${BLUE}将构建以下标签：${NC}"
for tag in "${TAGS[@]}"; do
  echo -e "  📦 $tag"
done

PRIMARY_TAG="${TAGS[0]}"

# =============================================================================
# Step 4: 构建Docker镜像
# =============================================================================
echo -e "\n${YELLOW}[Step 4/6] 构建Docker镜像...${NC}"
echo -e "${BLUE}构建信息：${NC}"
echo "  项目版本: v$PACKAGE_VERSION"
echo "  Git Hash: $GIT_HASH"
echo "  主标签: $PRIMARY_TAG"
echo ""

echo -e "${BLUE}开始构建（预计5-10分钟）...${NC}"
echo ""

# 构建镜像
BUILD_START_TIME=$(date +%s)

if docker build \
  -f Dockerfile \
  -t "$PRIMARY_TAG" \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  . 2>&1 | tee /tmp/docker-build.log; then

  BUILD_END_TIME=$(date +%s)
  BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))
  echo -e "\n${GREEN}✓ 镜像构建成功（耗时: ${BUILD_DURATION}秒）${NC}"
else
  echo -e "\n${RED}❌ 镜像构建失败${NC}"
  echo -e "${YELLOW}查看详细日志: /tmp/docker-build.log${NC}"
  exit 1
fi

# =============================================================================
# Step 5: 打多版本标签
# =============================================================================
echo -e "\n${YELLOW}[Step 5/6] 添加额外标签...${NC}"

for tag in "${TAGS[@]:1}"; do
  docker tag "$PRIMARY_TAG" "$tag"
  echo -e "${GREEN}✓ 已添加标签: $tag${NC}"
done

# 验证镜像信息
IMAGE_SIZE=$(docker images "$PRIMARY_TAG" --format "{{.Size}}")
IMAGE_ID=$(docker images "$PRIMARY_TAG" --format "{{.ID}}")

echo -e "\n${BLUE}镜像信息：${NC}"
echo "  镜像ID: $IMAGE_ID"
echo "  镜像大小: $IMAGE_SIZE"

# =============================================================================
# Step 6: 推送到阿里云
# =============================================================================
echo -e "\n${YELLOW}[Step 6/6] 推送镜像到阿里云...${NC}"

PUSH_START_TIME=$(date +%s)

for tag in "${TAGS[@]}"; do
  echo -e "${BLUE}推送: $tag${NC}"
  if docker push "$tag"; then
    echo -e "${GREEN}✓ 推送成功${NC}"
  else
    echo -e "${RED}❌ 推送失败: $tag${NC}"
  fi
  echo ""
done

PUSH_END_TIME=$(date +%s)
PUSH_DURATION=$((PUSH_END_TIME - PUSH_START_TIME))

# =============================================================================
# 完成总结
# =============================================================================
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║ ✅ 构建和推送完成！${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}📊 构建统计：${NC}"
echo "  构建耗时: ${BUILD_DURATION}秒"
echo "  推送耗时: ${PUSH_DURATION}秒"
echo "  镜像大小: $IMAGE_SIZE"

echo -e "\n${BLUE}📦 已推送的镜像标签：${NC}"
for tag in "${TAGS[@]}"; do
  echo -e "  ${GREEN}✓${NC} $tag"
done

echo -e "\n${BLUE}🚀 在服务器上使用：${NC}"
echo ""
echo -e "${YELLOW}# 1. 登录阿里云镜像仓库${NC}"
echo -e "docker login --username=nick2447759034 $ALIYUN_REGISTRY"
echo ""
echo -e "${YELLOW}# 2. 拉取镜像${NC}"
echo -e "docker pull $PRIMARY_TAG"
echo ""
echo -e "${YELLOW}# 3. 运行容器（使用docker-compose推荐）${NC}"
echo -e "# 编辑 .env.production 配置环境变量，然后："
echo -e "docker-compose -f docker-compose.production.yml --env-file .env.production up -d"
echo ""
echo -e "${YELLOW}# 或者直接运行：${NC}"
echo -e "docker run -d \\"
echo -e "  --name legal-education \\"
echo -e "  --restart always \\"
echo -e "  -p 3000:3000 \\"
echo -e "  -e DEEPSEEK_API_KEY=sk-xxxxx \\"
echo -e "  -e AI_302_API_KEY=sk-xxxxx \\"
echo -e "  -e NEXT_PUBLIC_BASE_URL=https://your-domain.com \\"
echo -e "  $PRIMARY_TAG"
echo ""

echo -e "${BLUE}💡 提示：${NC}"
echo -e "  • 使用 ${YELLOW}v$PACKAGE_VERSION${NC} 标签可以固定版本"
echo -e "  • 使用 ${YELLOW}$GIT_HASH${NC} 标签可以追溯到具体提交"
echo -e "  • 使用 ${YELLOW}latest${NC} 标签始终获取最新版本"
echo ""
