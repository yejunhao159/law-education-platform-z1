#!/bin/bash

# 🔍 课堂消息同步诊断脚本
# 用于验证教师端 → 学生端消息同步是否正常

echo "=========================================="
echo "🔍 课堂消息同步诊断工具"
echo "=========================================="
echo ""

# 1. 检测局域网IP
echo "📍 步骤1: 检测网络配置"
echo "------------------------------------------"
LOCAL_IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | grep "192.168" | awk '{print $2}' | cut -d'/' -f1 | head -n1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ 未检测到局域网IP地址"
    exit 1
fi

echo "✅ 检测到局域网IP: $LOCAL_IP"
BASE_URL="http://$LOCAL_IP:3000"
echo "   使用的BASE_URL: $BASE_URL"
echo ""

# 2. 定义测试课堂代码
CLASSROOM_CODE="TEST99"
echo "📝 步骤2: 使用测试课堂代码"
echo "------------------------------------------"
echo "   课堂代码: $CLASSROOM_CODE"
echo ""

# 3. 测试教师端发布问题API
echo "📤 步骤3: 测试教师端发布问题"
echo "------------------------------------------"
PUBLISH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classroom/$CLASSROOM_CODE/question" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "这是一个测试问题：合同是否有效？",
    "type": "text",
    "options": []
  }')

echo "   发布响应: $PUBLISH_RESPONSE"

if echo "$PUBLISH_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ 问题发布成功"
else
    echo "   ❌ 问题发布失败"
    exit 1
fi
echo ""

# 4. 测试获取问题API（验证storage是否保存）
echo "🔍 步骤4: 验证问题是否已保存"
echo "------------------------------------------"
GET_RESPONSE=$(curl -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/question")
echo "   获取响应: $GET_RESPONSE"

if echo "$GET_RESPONSE" | grep -q '"success":true'; then
    if echo "$GET_RESPONSE" | grep -q '"question"'; then
        echo "   ✅ 问题已保存在storage中"
    else
        echo "   ⚠️  API成功但没有问题数据"
    fi
else
    echo "   ❌ 获取问题失败"
fi
echo ""

# 5. 测试SSE连接（模拟学生端）
echo "📡 步骤5: 测试SSE流式连接（10秒）"
echo "------------------------------------------"
echo "   连接到: $BASE_URL/api/classroom/$CLASSROOM_CODE/stream"
echo ""

# 使用timeout限制时间，捕获SSE输出
SSE_OUTPUT=$(timeout 10s curl -N -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/stream" 2>&1 | head -20)

echo "   SSE输出（前20行）:"
echo "$SSE_OUTPUT" | sed 's/^/   /'
echo ""

# 6. 分析SSE输出
echo "📊 步骤6: 分析SSE输出"
echo "------------------------------------------"

if echo "$SSE_OUTPUT" | grep -q "data:"; then
    echo "   ✅ SSE连接成功，收到数据流"

    if echo "$SSE_OUTPUT" | grep -q '"type":"connected"'; then
        echo "   ✅ 收到连接确认消息"
    fi

    if echo "$SSE_OUTPUT" | grep -q '"type":"question"'; then
        echo "   ✅ 收到问题推送消息"
        echo "   🎉 消息同步成功！"
    else
        echo "   ⚠️  只收到心跳，没有收到问题"
        echo "   ❌ 消息同步失败 - 问题未推送到SSE"
    fi

    if echo "$SSE_OUTPUT" | grep -q '"type":"heartbeat"'; then
        echo "   ✅ 收到心跳包（连接保持正常）"
    fi
else
    echo "   ❌ SSE连接失败，未收到任何数据"
fi
echo ""

# 7. 测试CORS配置
echo "🌐 步骤7: 测试CORS配置"
echo "------------------------------------------"
CORS_CHECK=$(curl -s -I -X OPTIONS "$BASE_URL/api/classroom/$CLASSROOM_CODE/stream" | grep -i "access-control")

if [ -n "$CORS_CHECK" ]; then
    echo "   ✅ CORS头存在:"
    echo "$CORS_CHECK" | sed 's/^/   /'
else
    echo "   ❌ 缺少CORS头"
fi
echo ""

# 8. 最终诊断报告
echo "=========================================="
echo "📋 诊断报告总结"
echo "=========================================="
echo ""

# 检查关键指标
ISSUE_COUNT=0

if ! echo "$PUBLISH_RESPONSE" | grep -q '"success":true'; then
    echo "❌ 问题1: 教师端发布问题失败"
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
fi

if ! echo "$GET_RESPONSE" | grep -q '"question"'; then
    echo "❌ 问题2: 问题未正确保存到storage"
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
fi

if ! echo "$SSE_OUTPUT" | grep -q "data:"; then
    echo "❌ 问题3: SSE连接失败"
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
fi

if ! echo "$SSE_OUTPUT" | grep -q '"type":"question"'; then
    echo "❌ 问题4: SSE未推送问题（核心问题！）"
    ISSUE_COUNT=$((ISSUE_COUNT + 1))
fi

if [ $ISSUE_COUNT -eq 0 ]; then
    echo "🎉 所有测试通过！消息同步正常工作"
else
    echo "⚠️  发现 $ISSUE_COUNT 个问题"
    echo ""
    echo "💡 可能的原因分析:"
    echo ""

    if ! echo "$GET_RESPONSE" | grep -q '"question"' && echo "$PUBLISH_RESPONSE" | grep -q '"success":true'; then
        echo "   🔴 高优先级：storage不共享问题"
        echo "      原因：Next.js Serverless函数隔离"
        echo "      解决：使用Vercel KV或Redis替代内存storage"
        echo ""
    fi

    if ! echo "$SSE_OUTPUT" | grep -q '"type":"question"' && echo "$GET_RESPONSE" | grep -q '"question"'; then
        echo "   🟡 中优先级：SSE轮询逻辑问题"
        echo "      原因：stream/route.ts中的getQuestion逻辑可能有问题"
        echo "      解决：检查stream/route.ts的storage.getQuestion(code)调用"
        echo ""
    fi

    if ! echo "$SSE_OUTPUT" | grep -q "data:"; then
        echo "   🟡 中优先级：SSE连接建立失败"
        echo "      原因：CORS或网络问题"
        echo "      解决：检查CORS配置和防火墙设置"
        echo ""
    fi
fi

echo ""
echo "=========================================="
echo "✅ 诊断完成"
echo "=========================================="
