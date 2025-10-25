#!/bin/bash
# 检查文件使用情况和集成状态

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 快照系统文件使用情况分析"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 定义颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查文件是否被引用
check_file_usage() {
    local file=$1
    local name=$(basename "$file" .ts)
    name=$(basename "$name" .tsx)

    # 在 src/ app/ lib/ 中搜索导入
    local count=$(grep -r "from.*$name" --include="*.ts" --include="*.tsx" src/ app/ lib/ 2>/dev/null | grep -v "node_modules" | grep -v "$file" | wc -l)

    if [ $count -gt 0 ]; then
        echo -e "${GREEN}✅ $file${NC} - 被引用 $count 次"
        return 0
    else
        echo -e "${YELLOW}⚠️  $file${NC} - 未找到引用"
        return 1
    fi
}

# 1. 检查核心实现文件
echo "📦 核心实现文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file_usage "src/domains/teaching-acts/utils/SnapshotWriter.ts"
check_file_usage "src/domains/teaching-acts/utils/DialogueWriter.ts"
check_file_usage "src/domains/teaching-acts/utils/SnapshotValidator.ts"
check_file_usage "src/domains/teaching-acts/repositories/PostgreSQLTeachingSessionRepository.ts"
check_file_usage "src/domains/teaching-acts/schemas/SnapshotSchemas.ts"
check_file_usage "src/domains/teaching-acts/stores/useTeachingStore.ts"
echo ""

# 2. 检查前端组件
echo "🎨 前端组件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file_usage "src/domains/teaching-acts/components/ReadOnlyModeMixin.tsx"
check_file_usage "src/domains/teaching-acts/components/PresentationViewer.tsx"
check_file_usage "src/domains/teaching-acts/components/DialogueReplay.tsx"
check_file_usage "src/domains/teaching-acts/components/VersionManager.tsx"
echo ""

# 3. 检查追踪工具
echo "📊 追踪工具 (T079)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file_usage "lib/tracing/snapshot-tracer.ts"
echo ""

# 4. 检查示例文件（这些文件预期不会被引用）
echo "📝 示例文件 (仅供参考，不应被直接引用)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}ℹ️  src/domains/teaching-acts/examples/Act1PageExample.tsx${NC} - 集成示例"
echo -e "${BLUE}ℹ️  src/domains/teaching-acts/examples/Act2PageExample.tsx${NC} - 集成示例"
echo -e "${BLUE}ℹ️  src/domains/teaching-acts/examples/Act4PageExample.tsx${NC} - 集成示例"
echo -e "${BLUE}ℹ️  src/domains/teaching-acts/examples/SSEIntegrationExample.ts${NC} - 集成示例"
echo ""

# 5. 检查可能的未使用文件
echo "🔎 检查可能未使用的文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 SnapshotConverterV2
if [ -f "src/domains/teaching-acts/utils/SnapshotConverterV2.ts" ]; then
    check_file_usage "src/domains/teaching-acts/utils/SnapshotConverterV2.ts"
fi

# 检查旧的服务文件
for service_file in src/domains/teaching-acts/services/*.ts; do
    if [ -f "$service_file" ]; then
        check_file_usage "$service_file"
    fi
done
echo ""

# 6. 验证关键集成点
echo "🔗 关键集成点验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 SnapshotWriter 是否在 ingest route 中使用
if grep -q "SnapshotWriter\|snapshotWriter" app/api/teaching-sessions/ingest/route.ts 2>/dev/null; then
    echo -e "${GREEN}✅ SnapshotWriter 已集成到 /ingest API${NC}"
else
    echo -e "${RED}❌ SnapshotWriter 未在 /ingest API 中使用${NC}"
fi

# 检查 DialogueWriter 导出
if grep -q "export.*dialogueWriter" src/domains/teaching-acts/utils/DialogueWriter.ts 2>/dev/null; then
    echo -e "${GREEN}✅ DialogueWriter 已正确导出单例${NC}"
else
    echo -e "${YELLOW}⚠️  DialogueWriter 可能未导出单例${NC}"
fi

# 检查 OpenTelemetry 集成
if grep -q "traceSnapshotOperation" src/domains/teaching-acts/utils/SnapshotWriter.ts 2>/dev/null; then
    echo -e "${GREEN}✅ OpenTelemetry 已集成到 SnapshotWriter (T079)${NC}"
else
    echo -e "${RED}❌ OpenTelemetry 未集成到 SnapshotWriter${NC}"
fi

# 检查 useTeachingStore 的快照方法
if grep -q "loadClassroomSnapshot" src/domains/teaching-acts/stores/useTeachingStore.ts 2>/dev/null; then
    echo -e "${GREEN}✅ useTeachingStore 包含 loadClassroomSnapshot 方法${NC}"
else
    echo -e "${RED}❌ useTeachingStore 缺少 loadClassroomSnapshot 方法${NC}"
fi

# 检查 Schema 验证集成
if grep -q "validateSnapshotIntegrity" src/domains/teaching-acts/stores/useTeachingStore.ts 2>/dev/null; then
    echo -e "${GREEN}✅ Schema 验证已集成到 Store (T050)${NC}"
else
    echo -e "${YELLOW}⚠️  Schema 验证可能未集成${NC}"
fi

echo ""

# 7. 检查 API Routes 完整性
echo "🌐 API Routes 完整性"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

routes=(
    "app/api/teaching-sessions/ingest/route.ts"
    "app/api/teaching-sessions/[id]/snapshot/route.ts"
    "app/api/teaching-sessions/[id]/publish/route.ts"
    "app/api/teaching-sessions/[id]/versions/route.ts"
    "app/api/teaching-sessions/[id]/versions/[versionId]/route.ts"
    "app/api/teaching-sessions/[id]/dialogues/route.ts"
)

for route in "${routes[@]}"; do
    if [ -f "$route" ]; then
        echo -e "${GREEN}✅ $route${NC}"
    else
        echo -e "${RED}❌ $route - 缺失${NC}"
    fi
done

echo ""

# 8. 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 分析总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ 核心实现: SnapshotWriter, DialogueWriter, Repository"
echo "✅ 前端组件: ReadOnlyModeMixin, DialogueReplay, VersionManager"
echo "✅ 追踪集成: OpenTelemetry (T079)"
echo "ℹ️  示例文件: 位于 examples/ 目录，仅供参考"
echo ""
echo "建议操作:"
echo "  1. 示例文件 (examples/) 保留作为集成参考"
echo "  2. 检查未使用的旧服务文件是否可以删除"
echo "  3. 验证所有 API routes 是否正确导入核心模块"
echo ""
