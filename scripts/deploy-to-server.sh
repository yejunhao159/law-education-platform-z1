#!/bin/bash

# =============================================================================
# 服务器部署脚本 - 阿里云镜像版本
# =============================================================================
# 用途：快速拉取最新镜像并重启服务
# 使用方法：./scripts/deploy-to-server.sh
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}法学教育平台 - 部署脚本${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# 检查 .env.production 是否存在
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ 错误：.env.production 文件不存在！${NC}"
    echo -e "${YELLOW}请先创建 .env.production 文件并配置必要的环境变量${NC}"
    exit 1
fi

# 检查必要的环境变量
echo -e "${YELLOW}📋 检查环境变量配置...${NC}"
source .env.production

if [ -z "$DEEPSEEK_API_KEY" ]; then
    echo -e "${RED}❌ 缺少 DEEPSEEK_API_KEY${NC}"
    exit 1
fi

if [ -z "$AI_302_API_KEY" ]; then
    echo -e "${RED}❌ 缺少 AI_302_API_KEY${NC}"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ 缺少 DB_PASSWORD${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境变量检查通过${NC}"
echo ""

# 拉取最新镜像
echo -e "${YELLOW}📥 拉取最新镜像...${NC}"
docker pull registry.cn-shenzhen.aliyuncs.com/yejunhao/legal-education:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 镜像拉取失败！${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 镜像拉取成功${NC}"
echo ""

# 停止旧容器
echo -e "${YELLOW}⏸️  停止旧容器...${NC}"
docker-compose -f docker-compose.production.yml down

echo -e "${GREEN}✅ 旧容器已停止${NC}"
echo ""

# 启动新容器
echo -e "${YELLOW}🚀 启动新容器...${NC}"
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 容器启动失败！${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 容器启动成功${NC}"
echo ""

# 等待几秒让容器初始化
echo -e "${YELLOW}⏳ 等待容器初始化（5秒）...${NC}"
sleep 5

# 检查容器状态
echo -e "${YELLOW}🔍 检查容器状态...${NC}"
docker-compose -f docker-compose.production.yml ps

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# 显示日志
echo -e "${YELLOW}📝 最近的日志（按 Ctrl+C 退出）:${NC}"
echo ""
docker logs law-edu-app --tail 50 -f
