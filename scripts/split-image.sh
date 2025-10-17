#!/bin/bash
# =============================================================================
# 分割Docker镜像为小文件
# =============================================================================

set -e

IMAGE_FILE="law-education-platform-v1.2.0.tar"
CHUNK_SIZE="100M"  # 每个分片100MB

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 分割Docker镜像文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查文件
if [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ 错误：找不到镜像文件 $IMAGE_FILE"
    exit 1
fi

FILE_SIZE=$(stat -c%s "$IMAGE_FILE")
FILE_SIZE_MB=$((FILE_SIZE / 1024 / 1024))
echo "📋 原始文件信息："
echo "  文件名：$IMAGE_FILE"
echo "  大小：${FILE_SIZE_MB}MB"
echo ""

# 分割文件
echo "🔨 开始分割文件（每片${CHUNK_SIZE}）..."
split -b $CHUNK_SIZE -d $IMAGE_FILE law-edu-part-

# 统计分片数量
PART_COUNT=$(ls -1 law-edu-part-* | wc -l)
echo "✅ 分割完成，共 $PART_COUNT 个分片"
echo ""

# 显示分片列表
echo "📋 分片列表："
ls -lh law-edu-part-* | awk '{print "  " $9 " - " $5}'
echo ""

# 生成MD5清单
echo "🔍 生成MD5校验文件..."
md5sum law-edu-part-* > law-edu-parts.md5
echo "e08700f4c2e7d3c788e75cbc0598d009  $IMAGE_FILE" >> law-edu-parts.md5

echo "✅ MD5文件已生成：law-edu-parts.md5"
echo ""

# 生成服务器端合并脚本
cat > download-and-merge.sh << 'DOWNLOAD_SCRIPT'
#!/bin/bash
# =============================================================================
# 服务器端：下载分片并合并（在服务器上执行）
# =============================================================================

set -e

# 请替换为实际的cloudflared隧道URL
TUNNEL_URL="${1:-https://terminals-wood-affecting-browse.trycloudflare.com}"

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ 错误：请提供隧道URL"
    echo "用法：$0 <TUNNEL_URL>"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 下载并合并Docker镜像分片"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "隧道URL：$TUNNEL_URL"
echo ""

cd /root
rm -f law-edu-part-* law-education-platform-v1.2.0.tar 2>/dev/null || true

# 下载分片数量（根据实际情况调整）
TOTAL_PARTS=PART_COUNT_PLACEHOLDER

echo "📥 开始下载 $TOTAL_PARTS 个分片..."
echo ""

FAILED=0

for i in $(seq -f "%02g" 0 $((TOTAL_PARTS-1))); do
    PART_FILE="law-edu-part-$i"
    echo "[$((i+1))/$TOTAL_PARTS] 下载 $PART_FILE ..."

    wget -c \
        --timeout=60 \
        --tries=3 \
        --waitretry=10 \
        --progress=bar:force \
        --no-check-certificate \
        -O "$PART_FILE" \
        "${TUNNEL_URL}/${PART_FILE}" 2>&1

    if [ $? -eq 0 ] && [ -f "$PART_FILE" ] && [ -s "$PART_FILE" ]; then
        SIZE=$(du -h "$PART_FILE" | cut -f1)
        echo "  ✅ 下载成功 ($SIZE)"
    else
        echo "  ❌ 下载失败"
        FAILED=$((FAILED+1))
    fi

    echo ""
    sleep 3  # 休息3秒，避免隧道过载
done

if [ $FAILED -gt 0 ]; then
    echo "❌ 有 $FAILED 个分片下载失败"
    echo "请重新运行此脚本继续下载（支持断点续传）"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔗 合并文件..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat law-edu-part-* > law-education-platform-v1.2.0.tar

# 检查文件大小
FILE_SIZE=$(stat -c%s law-education-platform-v1.2.0.tar 2>/dev/null || stat -f%z law-education-platform-v1.2.0.tar)
EXPECTED_SIZE=1269304832

echo "文件大小检查："
echo "  实际：$FILE_SIZE 字节"
echo "  期望：$EXPECTED_SIZE 字节"
echo ""

if [ "$FILE_SIZE" -eq "$EXPECTED_SIZE" ]; then
    echo "✅ 文件大小正确"
else
    echo "❌ 文件大小不匹配！"
    exit 1
fi

# 验证MD5
echo "🔍 验证MD5..."
ACTUAL_MD5=$(md5sum law-education-platform-v1.2.0.tar | awk '{print $1}')
EXPECTED_MD5="e08700f4c2e7d3c788e75cbc0598d009"

echo "  实际：$ACTUAL_MD5"
echo "  期望：$EXPECTED_MD5"
echo ""

if [ "$ACTUAL_MD5" = "$EXPECTED_MD5" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ 文件传输成功！MD5验证通过"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 文件信息："
    ls -lh law-education-platform-v1.2.0.tar
    echo ""
    echo "🧹 清理分片文件："
    echo "  rm -f law-edu-part-*"
    echo ""
    echo "📌 下一步："
    echo "  docker load -i law-education-platform-v1.2.0.tar"
else
    echo "❌ MD5验证失败！"
    exit 1
fi
DOWNLOAD_SCRIPT

# 替换分片数量
sed -i "s/PART_COUNT_PLACEHOLDER/$PART_COUNT/" download-and-merge.sh
chmod +x download-and-merge.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 分割完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 生成的文件："
echo "  - 分片文件：law-edu-part-00 至 law-edu-part-$(printf "%02d" $((PART_COUNT-1))) (共$PART_COUNT个)"
echo "  - MD5清单：law-edu-parts.md5"
echo "  - 服务器脚本：download-and-merge.sh"
echo ""
echo "📤 下一步："
echo "  1. 确保HTTP服务器运行：python3 -m http.server 8888"
echo "  2. 确保cloudflared运行：./cloudflared tunnel --url http://localhost:8888"
echo "  3. 在服务器下载脚本："
echo "     wget --no-check-certificate -O merge.sh \\"
echo "       https://your-tunnel-url/download-and-merge.sh"
echo "     chmod +x merge.sh"
echo "     ./merge.sh https://your-tunnel-url"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
