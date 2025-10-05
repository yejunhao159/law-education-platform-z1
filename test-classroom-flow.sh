#!/bin/bash

# 课堂二维码连接测试脚本
# 用于验证局域网环境下的SSE连接是否正常

set -e

echo "🧪 开始测试课堂二维码连接流程..."
echo ""

# 获取本机局域网IP
echo "📡 检测局域网IP地址..."
LOCAL_IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | grep "192.168" | head -1 | awk '{print $2}' | cut -d'/' -f1)

if [ -z "$LOCAL_IP" ]; then
  echo "❌ 未检测到局域网IP地址"
  echo "💡 请确保你的设备连接到局域网"
  exit 1
fi

echo "✅ 检测到局域网IP: $LOCAL_IP"
echo ""

# 检查环境变量配置
echo "🔍 检查 .env.local 配置..."
if grep -q "NEXT_PUBLIC_BASE_URL" .env.local; then
  CONFIGURED_URL=$(grep "NEXT_PUBLIC_BASE_URL" .env.local | cut -d'=' -f2)
  echo "✅ 已配置 NEXT_PUBLIC_BASE_URL=$CONFIGURED_URL"

  # 验证配置是否匹配当前IP
  if [[ "$CONFIGURED_URL" != *"$LOCAL_IP"* ]] && [[ "$CONFIGURED_URL" == *"192.168"* ]]; then
    echo "⚠️  警告: 配置的IP ($CONFIGURED_URL) 与当前检测到的IP ($LOCAL_IP) 不匹配"
    echo "💡 是否需要更新配置? (y/n)"
    read -r UPDATE_CONFIG
    if [ "$UPDATE_CONFIG" = "y" ]; then
      sed -i "s|NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=http://$LOCAL_IP:3000|g" .env.local
      echo "✅ 已更新 NEXT_PUBLIC_BASE_URL=http://$LOCAL_IP:3000"
    fi
  fi
else
  echo "⚠️  未配置 NEXT_PUBLIC_BASE_URL"
  echo "💡 添加配置: NEXT_PUBLIC_BASE_URL=http://$LOCAL_IP:3000"
  echo "NEXT_PUBLIC_BASE_URL=http://$LOCAL_IP:3000" >> .env.local
  echo "✅ 配置已添加"
fi
echo ""

# 测试API端点
echo "🧪 测试API端点..."
BASE_URL="http://$LOCAL_IP:3000"

# 测试课堂check API (使用测试课堂码 ABC123)
echo "1️⃣  测试课堂验证 API..."
CHECK_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/classroom/ABC123/check")
HTTP_CODE=$(echo "$CHECK_RESPONSE" | tail -1)
RESPONSE_BODY=$(echo "$CHECK_RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 课堂验证API正常 (状态码: $HTTP_CODE)"
else
  echo "❌ 课堂验证API异常 (状态码: $HTTP_CODE)"
  echo "响应: $RESPONSE_BODY"
fi
echo ""

# 测试SSE连接 (超时5秒)
echo "2️⃣  测试SSE流式连接..."
echo "   尝试连接: $BASE_URL/api/classroom/ABC123/stream"
timeout 5s curl -N -s "$BASE_URL/api/classroom/ABC123/stream" | head -3 || true
echo ""
echo "✅ SSE连接测试完成"
echo ""

# 显示使用说明
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 手机扫码测试步骤:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🖥️  在电脑上访问:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "2. 📸 手机扫描页面上的二维码"
echo "   (确保手机和电脑在同一WiFi网络)"
echo ""
echo "3. ✅ 如果无法扫码,手机浏览器访问:"
echo "   http://$LOCAL_IP:3000"
echo "   并手动输入课堂码"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐛 调试技巧:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "• 检查防火墙是否允许3000端口"
echo "• 确保手机和电脑在同一局域网"
echo "• 如果仍然失败,查看浏览器控制台错误信息"
echo ""
echo "🎉 测试完成!"
