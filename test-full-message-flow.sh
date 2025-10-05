#!/bin/bash

# 🔄 完整消息流测试脚本
# 测试：教师端 ⇄ 学生端 双向通信

echo "=========================================="
echo "🔄 完整消息流测试"
echo "=========================================="
echo ""

# 检测局域网IP
LOCAL_IP=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | grep "192.168" | awk '{print $2}' | cut -d'/' -f1 | head -n1)
BASE_URL="http://$LOCAL_IP:3000"
CLASSROOM_CODE="FLOW01"

echo "📍 测试环境:"
echo "   局域网IP: $LOCAL_IP"
echo "   BASE_URL: $BASE_URL"
echo "   课堂代码: $CLASSROOM_CODE"
echo ""

# ============================================
# 第一步：教师端发布问题
# ============================================
echo "============================================"
echo "📤 步骤1: 教师端发布问题"
echo "============================================"

QUESTION_CONTENT="请分析本案中的合同效力问题，并说明理由。"
echo "发布问题: $QUESTION_CONTENT"
echo ""

PUBLISH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classroom/$CLASSROOM_CODE/question" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"$QUESTION_CONTENT\",
    \"type\": \"text\",
    \"options\": []
  }")

echo "📝 发布响应:"
echo "$PUBLISH_RESPONSE"
echo ""

# 提取问题ID（使用grep和sed，不依赖jq）
QUESTION_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//; s/"//')

if [ -z "$QUESTION_ID" ] || [ "$QUESTION_ID" = "null" ]; then
    echo "❌ 问题发布失败，无法获取问题ID"
    exit 1
fi

echo "✅ 问题发布成功，问题ID: $QUESTION_ID"
echo ""

# ============================================
# 第二步：模拟学生端连接SSE（后台进程）
# ============================================
echo "============================================"
echo "📡 步骤2: 模拟学生端连接SSE"
echo "============================================"

# 创建临时文件存储SSE输出
SSE_LOG="/tmp/sse_test_$CLASSROOM_CODE.log"
> "$SSE_LOG"

# 后台启动SSE连接，持续10秒
echo "启动SSE连接（后台运行10秒）..."
timeout 10s curl -N -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/stream" > "$SSE_LOG" 2>&1 &
SSE_PID=$!

echo "SSE进程ID: $SSE_PID"
echo "等待3秒接收问题..."
sleep 3

# 检查SSE是否收到问题
echo ""
echo "📨 SSE接收到的数据:"
cat "$SSE_LOG" | head -10
echo ""

if grep -q "\"type\":\"question\"" "$SSE_LOG"; then
    echo "✅ 学生端成功接收到问题"
else
    echo "❌ 学生端未接收到问题"
    kill $SSE_PID 2>/dev/null
    exit 1
fi

# ============================================
# 第三步：模拟学生端提交答案
# ============================================
echo ""
echo "============================================"
echo "📥 步骤3: 学生端提交答案"
echo "============================================"

STUDENT_ANSWER="本案中的合同有效。理由如下：1. 双方具有完全民事行为能力；2. 意思表示真实；3. 不违反法律强制性规定。"
echo "学生答案: $STUDENT_ANSWER"
echo ""

ANSWER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/classroom/$CLASSROOM_CODE/answer" \
  -H "Content-Type: application/json" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"answer\": \"$STUDENT_ANSWER\",
    \"timestamp\": \"$(date -Iseconds)\"
  }")

echo "📝 提交响应:"
echo "$ANSWER_RESPONSE"
echo ""

if echo "$ANSWER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 答案提交成功"
else
    echo "❌ 答案提交失败"
    kill $SSE_PID 2>/dev/null
    exit 1
fi

# ============================================
# 第四步：教师端查询学生答案
# ============================================
echo ""
echo "============================================"
echo "📤 步骤4: 教师端查询学生答案"
echo "============================================"

sleep 1  # 等待1秒确保答案已保存

ANSWERS_RESPONSE=$(curl -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/answers")

echo "📝 查询响应:"
echo "$ANSWERS_RESPONSE"
echo ""

# 验证答案是否包含学生提交的内容
if echo "$ANSWERS_RESPONSE" | grep -q "本案中的合同有效"; then
    echo "✅ 教师端成功收到学生答案"

    # 提取答案数量（使用grep和sed）
    ANSWER_COUNT=$(echo "$ANSWERS_RESPONSE" | grep -o '"count":[0-9]*' | sed 's/"count"://')
    echo "   答案数量: $ANSWER_COUNT"
else
    echo "❌ 教师端未收到学生答案"
    kill $SSE_PID 2>/dev/null
    exit 1
fi

# ============================================
# 第五步：再次提交答案测试（模拟多学生）
# ============================================
echo ""
echo "============================================"
echo "👥 步骤5: 模拟第二个学生提交答案"
echo "============================================"

STUDENT2_ANSWER="我认为合同无效，因为存在重大误解。"
echo "学生2答案: $STUDENT2_ANSWER"
echo ""

curl -s -X POST "$BASE_URL/api/classroom/$CLASSROOM_CODE/answer" \
  -H "Content-Type: application/json" \
  -d "{
    \"questionId\": \"$QUESTION_ID\",
    \"answer\": \"$STUDENT2_ANSWER\",
    \"timestamp\": \"$(date -Iseconds)\",
    \"studentId\": \"student-002\"
  }" > /dev/null

sleep 1

# 再次查询答案
FINAL_ANSWERS=$(curl -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/answers")
FINAL_COUNT=$(echo "$FINAL_ANSWERS" | grep -o '"count":[0-9]*' | sed 's/"count"://')

echo "📊 最终答案统计:"
echo "   答案总数: $FINAL_COUNT"
echo ""

if [ "$FINAL_COUNT" -ge 2 ]; then
    echo "✅ 多学生答案收集成功"
else
    echo "⚠️  只收到部分答案"
fi

# 停止SSE进程
kill $SSE_PID 2>/dev/null

# ============================================
# 测试总结
# ============================================
echo ""
echo "=========================================="
echo "📊 测试总结报告"
echo "=========================================="
echo ""

# 统计结果
SUCCESS_COUNT=0
TOTAL_TESTS=5

# 1. 问题发布
if [ -n "$QUESTION_ID" ] && [ "$QUESTION_ID" != "null" ]; then
    echo "✅ 1. 教师端发布问题 - 成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 1. 教师端发布问题 - 失败"
fi

# 2. SSE接收
if grep -q "\"type\":\"question\"" "$SSE_LOG"; then
    echo "✅ 2. 学生端接收问题(SSE) - 成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 2. 学生端接收问题(SSE) - 失败"
fi

# 3. 答案提交
if echo "$ANSWER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ 3. 学生端提交答案 - 成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 3. 学生端提交答案 - 失败"
fi

# 4. 答案查询
if echo "$ANSWERS_RESPONSE" | grep -q "本案中的合同有效"; then
    echo "✅ 4. 教师端接收答案 - 成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 4. 教师端接收答案 - 失败"
fi

# 5. 多学生支持
if [ "$FINAL_COUNT" -ge 2 ]; then
    echo "✅ 5. 多学生并发支持 - 成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 5. 多学生并发支持 - 失败"
fi

echo ""
echo "----------------------------------------"
echo "测试通过率: $SUCCESS_COUNT/$TOTAL_TESTS"
echo "----------------------------------------"

if [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
    echo ""
    echo "🎉 所有测试通过！完整消息流正常工作！"
    echo ""
    echo "✨ 现在可以进行手机端真机测试："
    echo "   1. 手机连接同一WiFi"
    echo "   2. 手机浏览器访问: $BASE_URL/classroom/$CLASSROOM_CODE/join"
    echo "   3. 教师端发布问题"
    echo "   4. 手机端应能立即收到并回答"
    echo ""
else
    echo ""
    echo "⚠️  部分测试失败，请检查日志"
fi

# 清理临时文件
rm -f "$SSE_LOG"

echo "=========================================="
echo "✅ 测试完成"
echo "=========================================="
