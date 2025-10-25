#!/bin/bash

# 数据库系统完整测试套件
# 运行所有测试并生成报告

echo "========================================="
echo "🚀 数据库系统完整测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 运行单个测试
run_test() {
  local test_name=$1
  local test_command=$2

  echo -e "${CYAN}▶ 运行: ${test_name}${NC}"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if eval $test_command > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 通过: ${test_name}${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ 失败: ${test_name}${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  echo ""
}

# 步骤1: 检查表结构
echo -e "${CYAN}========== 步骤1: 表结构检查 ==========${NC}"
run_test "表结构验证" "npm run db:check"

# 步骤2: 数据库CRUD测试
echo -e "${CYAN}========== 步骤2: Repository层测试 ==========${NC}"
run_test "Repository CRUD操作" "npm run db:test"

# 步骤3: API端点测试
echo -e "${CYAN}========== 步骤3: API端点测试 ==========${NC}"
run_test "API端点完整测试" "npm run db:test-api"

# 汇总结果
echo ""
echo "========================================="
echo "📊 测试结果汇总"
echo "========================================="
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e ""
  echo -e "${GREEN}✅ 所有测试通过！可以安全部署到生产环境。${NC}"
  echo ""
  exit 0
else
  echo -e ""
  echo -e "${RED}❌ 部分测试失败，请检查日志。${NC}"
  echo ""
  exit 1
fi
