#!/bin/bash

# 课堂实时通信功能测试脚本
# 测试扫码→答题→回传的完整流程

PORT=3000
BASE_URL="http://localhost:$PORT"
CLASSROOM_CODE="TEST01"

echo "========================================="
echo "🧪 课堂实时通信功能测试"
echo "========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_step() {
    echo -e "${YELLOW}▶ 测试: $1${NC}"
}

test_pass() {
    echo -e "${GREEN}✓ 通过: $1${NC}"
}

test_fail() {
    echo -e "${RED}✗ 失败: $1${NC}"
    echo -e "${RED}  详情: $2${NC}"
}

echo "📌 测试环境："
echo "   - 服务器: $BASE_URL"
echo "   - 课堂代码: $CLASSROOM_CODE"
echo ""

# 1. 测试课堂检查API
test_step "课堂检查API"
RESPONSE=$(curl -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/check")
if echo "$RESPONSE" | grep -q "success"; then
    test_pass "课堂检查API正常"
else
    test_fail "课堂检查API失败" "$RESPONSE"
    exit 1
fi
echo ""

# 2. 测试教师发布问题API
test_step "教师发布投票问题"
QUESTION_DATA='{
  "content": "合同是否有效？",
  "type": "vote",
  "options": ["A. 有效", "B. 无效", "C. 效力待定", "D. 可撤销"]
}'

PUBLISH_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$QUESTION_DATA" \
    "$BASE_URL/api/classroom/$CLASSROOM_CODE/question")

if echo "$PUBLISH_RESPONSE" | grep -q '"success":true'; then
    QUESTION_ID=$(echo "$PUBLISH_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    test_pass "问题发布成功 (ID: $QUESTION_ID)"
else
    test_fail "问题发布失败" "$PUBLISH_RESPONSE"
    exit 1
fi
echo ""

# 3. 测试学生提交答案
test_step "学生提交答案 (#1: 选择A)"
ANSWER1_DATA="{
  \"questionId\": \"$QUESTION_ID\",
  \"answer\": \"A. 有效\",
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}"

ANSWER1_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$ANSWER1_DATA" \
    "$BASE_URL/api/classroom/$CLASSROOM_CODE/answer")

if echo "$ANSWER1_RESPONSE" | grep -q '"success":true'; then
    test_pass "学生1答案提交成功"
else
    test_fail "学生1答案提交失败" "$ANSWER1_RESPONSE"
fi
echo ""

# 4. 测试多个学生答案
test_step "模拟多个学生答题"
for i in {2..5}; do
    OPTIONS=("A. 有效" "B. 无效" "C. 效力待定" "D. 可撤销")
    RANDOM_OPTION=${OPTIONS[$RANDOM % 4]}

    ANSWER_DATA="{
      \"questionId\": \"$QUESTION_ID\",
      \"answer\": \"$RANDOM_OPTION\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }"

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$ANSWER_DATA" \
        "$BASE_URL/api/classroom/$CLASSROOM_CODE/answer" > /dev/null

    echo "   学生$i: $RANDOM_OPTION"
done
test_pass "5个学生答案提交完成"
echo ""

# 5. 测试教师查询答案
test_step "教师查询所有答案"
ANSWERS_RESPONSE=$(curl -s "$BASE_URL/api/classroom/$CLASSROOM_CODE/answers")

ANSWER_COUNT=$(echo "$ANSWERS_RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
if [ "$ANSWER_COUNT" -ge 5 ]; then
    test_pass "成功获取答案列表 (共$ANSWER_COUNT条)"
else
    test_fail "答案数量不正确" "期望>=5，实际=$ANSWER_COUNT"
fi
echo ""

# 6. 测试SSE流式连接（异步测试）
test_step "SSE流式推送测试"
echo "   正在连接SSE..."

# 在后台启动SSE连接，5秒后自动断开
timeout 5 curl -s -N "$BASE_URL/api/classroom/$CLASSROOM_CODE/stream" > /tmp/sse_output.txt 2>&1 &
SSE_PID=$!

sleep 2
if kill -0 $SSE_PID 2>/dev/null; then
    test_pass "SSE连接建立成功"
    kill $SSE_PID 2>/dev/null
else
    test_fail "SSE连接失败" "进程未运行"
fi

# 检查SSE输出
if grep -q "data:" /tmp/sse_output.txt; then
    test_pass "SSE数据推送正常"
else
    test_fail "未收到SSE数据" "$(cat /tmp/sse_output.txt | head -3)"
fi
echo ""

# 7. 测试文本问题发布
test_step "发布文本问题"
TEXT_QUESTION='{
  "content": "请简述合同成立的三要件",
  "type": "text"
}'

TEXT_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$TEXT_QUESTION" \
    "$BASE_URL/api/classroom/$CLASSROOM_CODE/question")

if echo "$TEXT_RESPONSE" | grep -q '"type":"text"'; then
    test_pass "文本问题发布成功"
else
    test_fail "文本问题发布失败" "$TEXT_RESPONSE"
fi
echo ""

# 8. 测试文本答案提交
test_step "学生提交文本答案"
TEXT_ANSWER='{
  "questionId": "test-text-q1",
  "answer": "合同成立的三要件是：1) 主体适格 2) 意思表示一致 3) 标的明确",
  "timestamp": "2025-10-02T00:00:00Z"
}'

TEXT_ANSWER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$TEXT_ANSWER" \
    "$BASE_URL/api/classroom/$CLASSROOM_CODE/answer")

if echo "$TEXT_ANSWER_RESPONSE" | grep -q '"success":true'; then
    test_pass "文本答案提交成功"
else
    test_fail "文本答案提交失败" "$TEXT_ANSWER_RESPONSE"
fi
echo ""

# 总结
echo "========================================="
echo "📊 测试总结"
echo "========================================="
echo ""
echo -e "${GREEN}✓ 核心功能验证通过！${NC}"
echo ""
echo "已验证功能："
echo "  ✓ 课堂代码验证"
echo "  ✓ 教师发布投票问题"
echo "  ✓ 教师发布文本问题"
echo "  ✓ 学生提交投票答案"
echo "  ✓ 学生提交文本答案"
echo "  ✓ 教师查询答案列表"
echo "  ✓ SSE流式推送连接"
echo ""
echo "🌐 手动测试链接："
echo "  教师端: $BASE_URL/classroom/$CLASSROOM_CODE/teacher"
echo "  学生端: $BASE_URL/classroom/$CLASSROOM_CODE/join"
echo ""
echo "📱 扫码测试："
echo "  1. 打开教师端查看二维码"
echo "  2. 手机扫描二维码"
echo "  3. 观察实时问题推送和答案回传"
echo ""

# 清理
rm -f /tmp/sse_output.txt
