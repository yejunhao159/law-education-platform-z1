#!/bin/bash
# =============================================================================
# Docker镜像构建和导出脚本
# =============================================================================
# 用途：构建Docker镜像并导出为tar文件，方便传输
# 使用方法：./scripts/build-and-export-image.sh [版本号]
# 示例：./scripts/build-and-export-image.sh v1.2.0
# =============================================================================

set -e  # 遇到错误立即退出

# 获取版本号参数，如果没有提供则使用日期
VERSION=${1:-"v$(date +%Y%m%d-%H%M%S)"}
IMAGE_NAME="law-education-platform"
IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
OUTPUT_FILE="${IMAGE_NAME}-${VERSION}.tar"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Docker镜像构建和导出流程"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 镜像信息："
echo "  - 镜像名称: ${IMAGE_NAME}"
echo "  - 镜像标签: ${IMAGE_TAG}"
echo "  - 输出文件: ${OUTPUT_FILE}"
echo ""

# ========================================
# Step 1: 检查Docker是否可用
# ========================================
echo "🔍 Step 1/5: 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker未安装或未配置"
    echo ""
    echo "WSL2环境下的解决方案："
    echo "  1. 确保已安装Docker Desktop for Windows"
    echo "  2. 打开Docker Desktop设置"
    echo "  3. 进入 Resources → WSL Integration"
    echo "  4. 启用你的WSL2发行版"
    echo "  5. 重启WSL2：wsl --shutdown（在Windows PowerShell中执行）"
    echo ""
    exit 1
fi

echo "✅ Docker环境正常"
docker --version
echo ""

# ========================================
# Step 2: 构建Docker镜像
# ========================================
echo "🔨 Step 2/5: 构建Docker镜像..."
echo "预计时间：5-8分钟（首次构建）"
echo ""

BUILD_START_TIME=$(date +%s)

docker build \
  --tag ${IMAGE_TAG} \
  --tag ${IMAGE_NAME}:latest \
  --progress=plain \
  . 2>&1 | tee /tmp/docker-build-${VERSION}.log

BUILD_END_TIME=$(date +%s)
BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))

echo ""
echo "✅ 镜像构建成功（耗时：${BUILD_DURATION}秒）"
echo ""

# ========================================
# Step 3: 检查镜像大小
# ========================================
echo "📊 Step 3/5: 检查镜像信息..."
docker images | grep ${IMAGE_NAME} | head -2
IMAGE_SIZE=$(docker images ${IMAGE_TAG} --format "{{.Size}}")
echo ""
echo "镜像大小：${IMAGE_SIZE}"
echo ""

# ========================================
# Step 4: 导出镜像为tar文件
# ========================================
echo "📦 Step 4/5: 导出镜像为tar文件..."
echo "目标文件：${OUTPUT_FILE}"
echo ""

EXPORT_START_TIME=$(date +%s)

docker save ${IMAGE_TAG} -o ${OUTPUT_FILE}

EXPORT_END_TIME=$(date +%s)
EXPORT_DURATION=$((EXPORT_END_TIME - EXPORT_START_TIME))

echo "✅ 镜像导出成功（耗时：${EXPORT_DURATION}秒）"
echo ""

# ========================================
# Step 5: 验证导出的文件
# ========================================
echo "✅ Step 5/5: 验证导出文件..."
if [ -f ${OUTPUT_FILE} ]; then
    FILE_SIZE=$(du -h ${OUTPUT_FILE} | cut -f1)
    echo "  文件名称: ${OUTPUT_FILE}"
    echo "  文件大小: ${FILE_SIZE}"
    echo "  文件路径: $(pwd)/${OUTPUT_FILE}"
    echo ""

    # 生成MD5校验和
    if command -v md5sum &> /dev/null; then
        MD5=$(md5sum ${OUTPUT_FILE} | cut -d' ' -f1)
        echo "  MD5校验: ${MD5}"
        echo "${MD5}  ${OUTPUT_FILE}" > ${OUTPUT_FILE}.md5
        echo "  已生成MD5文件: ${OUTPUT_FILE}.md5"
    fi
else
    echo "❌ 错误：导出文件不存在"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 构建和导出完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 输出文件："
echo "  - 镜像文件: ${OUTPUT_FILE}"
echo "  - MD5校验: ${OUTPUT_FILE}.md5"
echo "  - 构建日志: /tmp/docker-build-${VERSION}.log"
echo ""
echo "📤 传输镜像的方法："
echo ""
echo "1️⃣  使用SCP传输到服务器："
echo "   scp ${OUTPUT_FILE} user@server:/path/to/destination/"
echo ""
echo "2️⃣  使用rsync传输（支持断点续传）："
echo "   rsync -avz --progress ${OUTPUT_FILE} user@server:/path/to/destination/"
echo ""
echo "3️⃣  在目标服务器上加载镜像："
echo "   docker load -i ${OUTPUT_FILE}"
echo ""
echo "4️⃣  验证加载的镜像："
echo "   docker images | grep ${IMAGE_NAME}"
echo ""
echo "5️⃣  运行容器："
echo "   docker run -d -p 3000:3000 -p 3001:3001 \\"
echo "     --env-file .env.production \\"
echo "     --name law-education-app \\"
echo "     ${IMAGE_TAG}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
