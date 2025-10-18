#!/bin/bash

# =============================================================================
# 测试 tiktoken WebAssembly 修复
# =============================================================================

set -e  # 遇到错误立即退出

echo "🚀 开始测试 tiktoken 修复..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: 构建 Docker 镜像
echo "📦 Step 1: 构建 Docker 镜像..."
docker build -t law-education-platform:fix-tiktoken .
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker 镜像构建成功${NC}"
else
    echo -e "${RED}❌ Docker 镜像构建失败${NC}"
    exit 1
fi
echo ""

# Step 2: 停止并删除旧容器（如果存在）
echo "🧹 Step 2: 清理旧容器..."
docker stop law-edu-test 2>/dev/null || true
docker rm law-edu-test 2>/dev/null || true
echo -e "${GREEN}✅ 旧容器已清理${NC}"
echo ""

# Step 3: 启动新容器
echo "🚀 Step 3: 启动测试容器..."
docker run -d \
  --name law-edu-test \
  -p 3001:3000 \
  --env-file .env.production \
  law-education-platform:fix-tiktoken

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 容器启动成功 (端口 3001)${NC}"
else
    echo -e "${RED}❌ 容器启动失败${NC}"
    exit 1
fi
echo ""

# Step 4: 等待服务启动
echo "⏳ Step 4: 等待服务启动 (30秒)..."
sleep 30
echo ""

# Step 5: 检查容器状态
echo "🔍 Step 5: 检查容器状态..."
docker ps | grep law-edu-test
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 容器运行正常${NC}"
else
    echo -e "${RED}❌ 容器未运行${NC}"
    echo "查看日志:"
    docker logs law-edu-test
    exit 1
fi
echo ""

# Step 6: 测试健康检查
echo "🏥 Step 6: 测试健康检查..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health || echo "FAILED")
if [[ "$HEALTH_RESPONSE" == *"ok"* ]]; then
    echo -e "${GREEN}✅ 健康检查通过${NC}"
    echo "响应: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ 健康检查失败${NC}"
    echo "响应: $HEALTH_RESPONSE"
fi
echo ""

# Step 7: 测试 AI 功能（法律智能提取）
echo "🤖 Step 7: 测试 AI 功能（tiktoken依赖测试）..."
AI_RESPONSE=$(curl -s -X POST http://localhost:3001/api/legal-intelligence/extract \
  -H "Content-Type: application/json" \
  -d '{
    "documentText": "原告张三诉称：被告李四于2023年1月15日借款人民币10万元，约定2023年3月15日归还，但至今未还。请求法院判令被告归还借款本金10万元及利息。",
    "extractionOptions": {
      "extractBasicInfo": true,
      "extractParties": true,
      "extractTimeline": true
    }
  }' 2>&1)

echo "AI API 响应:"
echo "$AI_RESPONSE"
echo ""

if [[ "$AI_RESPONSE" == *"Missing tiktoken_bg.wasm"* ]]; then
    echo -e "${RED}❌ tiktoken WebAssembly 文件仍然缺失${NC}"
    echo "查看容器日志:"
    docker logs law-edu-test --tail 50
    exit 1
elif [[ "$AI_RESPONSE" == *"error"* ]] && [[ "$AI_RESPONSE" != *"success"* ]]; then
    echo -e "${YELLOW}⚠️  API 返回错误，但不是 tiktoken 问题${NC}"
    echo "可能是其他配置问题（如 API Key）"
else
    echo -e "${GREEN}✅ AI 功能正常，tiktoken 问题已修复${NC}"
fi
echo ""

# Step 8: 显示容器日志（最后50行）
echo "📋 Step 8: 容器日志（最后50行）..."
docker logs law-edu-test --tail 50
echo ""

# 总结
echo "=============================================="
echo "🎉 测试完成！"
echo "=============================================="
echo ""
echo "容器信息:"
echo "  - 容器名称: law-edu-test"
echo "  - 访问地址: http://localhost:3001"
echo ""
echo "后续操作:"
echo "  - 查看实时日志: docker logs -f law-edu-test"
echo "  - 停止容器: docker stop law-edu-test"
echo "  - 删除容器: docker rm law-edu-test"
echo "  - 推送镜像: docker tag law-education-platform:fix-tiktoken ghcr.io/yejunhao159/law-education-platform-z1:latest"
echo "             docker push ghcr.io/yejunhao159/law-education-platform-z1:latest"
echo ""
