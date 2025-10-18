#!/bin/bash
# =============================================================================
# 从cloudflared隧道下载Docker镜像（服务器端执行）
# =============================================================================
# 用途：在服务器上使用单线程wget下载镜像文件
# 使用方法：在服务器上执行此脚本，并提供隧道URL作为参数
# 示例：./download-image-from-tunnel.sh https://your-tunnel-url.trycloudflare.com
# =============================================================================

set -e

# 检查参数
if [ -z "$1" ]; then
    echo "❌ 错误：请提供cloudflared隧道URL"
    echo "用法：$0 <TUNNEL_URL>"
    echo "示例：$0 https://terminals-wood-affecting-browse.trycloudflare.com"
    exit 1
fi

TUNNEL_URL="$1"
IMAGE_FILE="law-education-platform-v1.2.0.tar"
MD5_FILE="${IMAGE_FILE}.md5"
EXPECTED_MD5="e08700f4c2e7d3c788e75cbc0598d009"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 Docker镜像下载脚本（单线程wget）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 下载信息："
echo "  隧道URL: $TUNNEL_URL"
echo "  目标文件: $IMAGE_FILE"
echo "  预期MD5: $EXPECTED_MD5"
echo ""

# ========================================
# Step 1: 清理旧文件
# ========================================
echo "🧹 Step 1/4: 清理旧文件..."

if [ -f "$IMAGE_FILE" ]; then
    echo "  发现旧文件，正在删除..."
    rm -f "$IMAGE_FILE"
fi

if [ -f "${IMAGE_FILE}.aria2" ]; then
    echo "  清理aria2临时文件..."
    rm -f "${IMAGE_FILE}.aria2"
fi

if [ -f "$MD5_FILE" ]; then
    rm -f "$MD5_FILE"
fi

echo "✅ 清理完成"
echo ""

# ========================================
# Step 2: 下载MD5文件
# ========================================
echo "📥 Step 2/4: 下载MD5校验文件..."

wget --timeout=30 --tries=3 --no-check-certificate \
    -O "$MD5_FILE" \
    "${TUNNEL_URL}/${MD5_FILE}"

if [ -f "$MD5_FILE" ]; then
    echo "✅ MD5文件下载成功"
    cat "$MD5_FILE"
else
    echo "⚠️  MD5文件下载失败，将使用内置MD5值"
    echo "$EXPECTED_MD5  $IMAGE_FILE" > "$MD5_FILE"
fi
echo ""

# ========================================
# Step 3: 下载镜像文件（单线程）
# ========================================
echo "📥 Step 3/4: 下载镜像文件（单线程wget）..."
echo "  文件大小：约1.2GB"
echo "  预计时间：10-30分钟（取决于网络速度）"
echo "  使用单线程下载避免Range请求问题"
echo ""

DOWNLOAD_START=$(date +%s)

# 使用wget单线程下载
# -c: 支持断点续传
# --timeout=60: 超时60秒
# --tries=0: 无限重试
# --waitretry=10: 重试前等待10秒
# --progress=bar:force: 显示进度条
# --no-check-certificate: 忽略SSL证书验证（cloudflared使用自签名证书）
wget \
    -c \
    --timeout=60 \
    --tries=0 \
    --waitretry=10 \
    --progress=bar:force \
    --no-check-certificate \
    -O "$IMAGE_FILE" \
    "${TUNNEL_URL}/${IMAGE_FILE}"

DOWNLOAD_END=$(date +%s)
DOWNLOAD_DURATION=$((DOWNLOAD_END - DOWNLOAD_START))
DOWNLOAD_MINUTES=$((DOWNLOAD_DURATION / 60))
DOWNLOAD_SECONDS=$((DOWNLOAD_DURATION % 60))

if [ -f "$IMAGE_FILE" ]; then
    FILE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
    echo ""
    echo "✅ 下载完成"
    echo "  耗时：${DOWNLOAD_MINUTES}分${DOWNLOAD_SECONDS}秒"
    echo "  文件大小：$FILE_SIZE"
else
    echo "❌ 下载失败：文件不存在"
    exit 1
fi
echo ""

# ========================================
# Step 4: 验证文件完整性
# ========================================
echo "🔍 Step 4/4: 验证文件完整性..."
echo ""

if md5sum -c "$MD5_FILE"; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 下载成功！文件完整性验证通过"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 文件信息："
    echo "  文件名：$IMAGE_FILE"
    echo "  大小：$FILE_SIZE"
    echo "  MD5：$EXPECTED_MD5"
    echo ""
    echo "📌 下一步："
    echo "  运行部署脚本加载并启动镜像："
    echo "  wget ${TUNNEL_URL}/scripts/deploy-from-tar.sh"
    echo "  chmod +x deploy-from-tar.sh"
    echo "  ./deploy-from-tar.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ 错误：文件完整性验证失败！"
    echo ""
    echo "可能的原因："
    echo "  1. 网络传输中断或不稳定"
    echo "  2. 隧道连接断开"
    echo "  3. 文件在传输过程中损坏"
    echo ""
    echo "解决方案："
    echo "  1. 确保本地HTTP服务器和cloudflared隧道正常运行"
    echo "  2. 重新运行此脚本（wget的-c参数支持断点续传）"
    echo "  3. 如果多次失败，考虑使用其他传输方式（rsync、云存储等）"
    echo ""
    exit 1
fi
