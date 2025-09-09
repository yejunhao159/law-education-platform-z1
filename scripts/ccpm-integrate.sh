#!/bin/bash

# CCPM 集成测试脚本

echo "🔄 开始集成测试..."

# 检查各模块是否就绪
check_module() {
  local module=$1
  local path=$2
  if [ -f "$path" ]; then
    echo "✅ $module 模块就绪"
    return 0
  else
    echo "❌ $module 模块未就绪: 缺少 $path"
    return 1
  fi
}

# 检查模块
check_module "Editor" "components/socratic/editor/IRACComposer.tsx"
check_module "API" "app/api/socratic/session/route.ts"
check_module "Heatmap" "components/socratic/visualization/ElementHeatmap.tsx"

# 运行集成测试
echo "🧪 运行集成测试..."
npm run test:integration

echo "✅ 集成测试完成！"
