#!/bin/bash
# =============================================================================
# 通过隧道传输Docker镜像到服务器
# =============================================================================
# 用途：使用Python HTTP服务器创建本地文件服务
# 然后通过ngrok/cloudflared等隧道工具暴露到公网
# =============================================================================

IMAGE_FILE="law-education-platform-v1.2.0.tar"
MD5_FILE="${IMAGE_FILE}.md5"
PORT=8000

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 Docker镜像隧道传输助手"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查镜像文件是否存在
if [ ! -f "$IMAGE_FILE" ]; then
    echo "❌ 错误：镜像文件不存在：$IMAGE_FILE"
    echo "   请先运行构建脚本：./scripts/build-and-export-image.sh"
    exit 1
fi

FILE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
echo "📦 准备传输："
echo "   文件：$IMAGE_FILE"
echo "   大小：$FILE_SIZE"
echo ""

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告：端口 $PORT 已被占用"
    echo "   尝试停止占用进程..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "🚀 启动HTTP文件服务器..."
echo "   监听端口：$PORT"
echo "   访问地址：http://localhost:$PORT"
echo ""

# 启动HTTP服务器（后台运行）
python3 -m http.server $PORT > /tmp/http-server.log 2>&1 &
HTTP_PID=$!

sleep 2

# 检查服务器是否启动成功
if ! ps -p $HTTP_PID > /dev/null; then
    echo "❌ HTTP服务器启动失败"
    cat /tmp/http-server.log
    exit 1
fi

echo "✅ HTTP服务器已启动（PID: $HTTP_PID）"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 下一步操作："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  在另一个终端启动隧道（三选一）："
echo ""
echo "   【方案A：使用ngrok】"
echo "   下载：https://ngrok.com/download"
echo "   启动：ngrok http $PORT"
echo ""
echo "   【方案B：使用cloudflared（推荐，更快）】"
echo "   安装：curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared"
echo "   启动：chmod +x cloudflared && ./cloudflared tunnel --url http://localhost:$PORT"
echo ""
echo "   【方案C：使用localtunnel】"
echo "   安装：npm install -g localtunnel"
echo "   启动：lt --port $PORT"
echo ""
echo "2️⃣  复制隧道工具输出的公网URL（例如：https://abc123.ngrok.io）"
echo ""
echo "3️⃣  在服务器上下载镜像："
echo "   ssh root@115.29.191.180"
echo "   cd /root"
echo "   wget https://YOUR_TUNNEL_URL/$IMAGE_FILE"
echo "   wget https://YOUR_TUNNEL_URL/$MD5_FILE"
echo "   md5sum -c $MD5_FILE"
echo ""
echo "4️⃣  下载完成后，按Ctrl+C停止本脚本"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 提示："
echo "   - 文件大小：$FILE_SIZE，预计下载时间：10-30分钟"
echo "   - 保持本窗口运行，不要关闭"
echo "   - 下载过程中可以在浏览器访问隧道URL查看文件列表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⏳ HTTP服务器运行中...（按Ctrl+C停止）"
echo ""

# 等待用户中断
trap "echo '' && echo '🛑 停止HTTP服务器...' && kill $HTTP_PID 2>/dev/null && echo '✅ 已停止' && exit 0" INT TERM

# 显示访问日志
tail -f /tmp/http-server.log
