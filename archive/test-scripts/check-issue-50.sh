#!/bin/bash

echo "📋 检查 Issue #50 的修复状态"
echo ""

# 1. 检查WebSocket连接修复
echo "1️⃣ 检查WebSocket连接代码..."
if grep -q "process.env.NEXT_PUBLIC_SOCKET_URL" app/classroom/*/student/page.tsx 2>/dev/null; then
    echo "  ✅ WebSocket环境变量已配置"
else
    echo "  ❌ WebSocket仍使用硬编码端口3001"
    grep -n "3001" app/classroom/*/student/page.tsx 2>/dev/null | head -3
fi

echo ""

# 2. 检查API路由WebSocket配置
echo "2️⃣ 检查API路由WebSocket配置..."
if grep -q "process.env.NEXT_PUBLIC_SOCKET_URL" app/api/classroom/*/question/route.ts 2>/dev/null; then
    echo "  ✅ API路由WebSocket已配置环境变量"
else
    echo "  ❌ API路由WebSocket可能仍有硬编码"
fi

echo ""

# 3. 检查环境变量
echo "3️⃣ 检查环境变量配置..."
if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_SOCKET_URL" .env.local; then
        echo "  ✅ .env.local 包含 NEXT_PUBLIC_SOCKET_URL"
        grep "NEXT_PUBLIC_SOCKET_URL" .env.local
    else
        echo "  ⚠️ .env.local 缺少 NEXT_PUBLIC_SOCKET_URL"
    fi
else
    echo "  ⚠️ .env.local 文件不存在"
fi

if [ -f ".env.production" ]; then
    if grep -q "NEXT_PUBLIC_SOCKET_URL" .env.production; then
        echo "  ✅ .env.production 包含 NEXT_PUBLIC_SOCKET_URL"
        grep "NEXT_PUBLIC_SOCKET_URL" .env.production
    else
        echo "  ⚠️ .env.production 缺少 NEXT_PUBLIC_SOCKET_URL"
    fi
else
    echo "  ⚠️ .env.production 文件不存在"
fi

echo ""

# 4. 检查依赖
echo "4️⃣ 检查关键依赖..."
if grep -q '"negotiator"' package.json; then
    echo "  ✅ package.json 包含 negotiator"
else
    echo "  ⚠️ package.json 可能缺少 negotiator"
fi

if [ -d "node_modules/negotiator" ]; then
    echo "  ✅ negotiator 已安装"
else
    echo "  ❌ negotiator 未安装"
fi

echo ""

# 5. 检查Docker配置
echo "5️⃣ 检查Docker配置..."
if [ -f "docker-compose.prod.yml" ]; then
    echo "  ✅ docker-compose.prod.yml 存在"
    if grep -q "3001:3001" docker-compose.prod.yml; then
        echo "  ✅ Socket.IO端口3001已映射"
    else
        echo "  ❌ Socket.IO端口3001未映射"
    fi
else
    echo "  ⚠️ docker-compose.prod.yml 不存在"
fi

echo ""
echo "📊 总结："
echo "  Issue #50 主要关注生产环境Socket.IO和AI超时问题"
echo "  建议检查上述标记为 ❌ 或 ⚠️ 的项目"
