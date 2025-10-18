#!/bin/bash
# =============================================================================
# 部署就绪检查脚本
# =============================================================================
# 用途：检查是否具备生产环境部署条件
# 使用：./scripts/check-deployment-readiness.sh
# =============================================================================

set -e

echo "🔍 开始检查部署就绪状态..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# =============================================================================
# 检查函数
# =============================================================================

check_ok() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

# =============================================================================
# 1. 检查关键目录
# =============================================================================
echo "📁 检查关键目录..."

dirs=("app" "server" "lib" "components" "public" "scripts" "src")
for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        check_ok "$dir/ 目录存在"
    else
        check_fail "$dir/ 目录不存在"
    fi
done
echo ""

# =============================================================================
# 2. 检查关键文件
# =============================================================================
echo "📄 检查关键文件..."

files=(
    "Dockerfile"
    "package.json"
    "ecosystem.config.js"
    "docker-compose.production.yml"
    "nginx.conf"
    ".dockerignore"
    "scripts/generate-env.sh"
    "scripts/check-env.sh"
    "scripts/start.sh"
    "server/socket-server.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_ok "$file 存在"
    else
        check_fail "$file 不存在"
    fi
done
echo ""

# =============================================================================
# 3. 检查数据库迁移
# =============================================================================
echo "💾 检查数据库配置..."

if grep -q "pg" package.json; then
    check_ok "PostgreSQL 驱动已安装"
else
    check_fail "PostgreSQL 驱动未安装"
fi

if grep -q "better-sqlite3" package.json; then
    check_warn "检测到 better-sqlite3，建议移除"
else
    check_ok "未检测到 better-sqlite3"
fi

if [ -f "lib/db/index.ts" ]; then
    if grep -q "Pool.*pg" lib/db/index.ts; then
        check_ok "数据库已迁移到 PostgreSQL"
    else
        check_fail "数据库未迁移到 PostgreSQL"
    fi
fi
echo ""

# =============================================================================
# 4. 检查 Docker 配置
# =============================================================================
echo "🐳 检查 Docker 配置..."

# 检查 .dockerignore
if grep -q "^src" .dockerignore 2>/dev/null; then
    check_fail ".dockerignore 排除了 src 目录"
else
    check_ok ".dockerignore 未排除关键目录"
fi

if grep -q "^app" .dockerignore 2>/dev/null; then
    check_fail ".dockerignore 排除了 app 目录"
else
    check_ok ".dockerignore 未排除 app 目录"
fi

if grep -q "^server" .dockerignore 2>/dev/null; then
    check_fail ".dockerignore 排除了 server 目录"
else
    check_ok ".dockerignore 未排除 server 目录"
fi

echo ""

# =============================================================================
# 5. 检查 GitHub Actions
# =============================================================================
echo "🤖 检查 CI/CD 配置..."

if [ -f ".github/workflows/docker-build-push.yml" ]; then
    check_ok "GitHub Actions 工作流已配置"

    if grep -q "DEEPSEEK_API_KEY" .github/workflows/docker-build-push.yml; then
        check_ok "工作流包含 DEEPSEEK_API_KEY"
    else
        check_warn "工作流缺少 DEEPSEEK_API_KEY"
    fi

    if grep -q "NEXT_PUBLIC_AI_302_API_KEY" .github/workflows/docker-build-push.yml; then
        check_ok "工作流包含 NEXT_PUBLIC_AI_302_API_KEY"
    else
        check_warn "工作流缺少 NEXT_PUBLIC_AI_302_API_KEY"
    fi
else
    check_warn "GitHub Actions 工作流未配置"
fi

echo ""

# =============================================================================
# 6. 检查环境变量配置
# =============================================================================
echo "🔑 检查环境变量配置..."

if [ -f ".env.production.example" ]; then
    check_ok ".env.production.example 已创建"
else
    check_warn ".env.production.example 未创建"
fi

if [ -f "scripts/generate-env.sh" ]; then
    if grep -q "DEEPSEEK_API_KEY" scripts/generate-env.sh; then
        check_ok "generate-env.sh 包含 DEEPSEEK_API_KEY 检查"
    fi

    if grep -q "NEXT_PUBLIC_AI_302_API_KEY" scripts/generate-env.sh; then
        check_ok "generate-env.sh 包含 NEXT_PUBLIC_AI_302_API_KEY 检查"
    fi
fi

echo ""

# =============================================================================
# 7. 检查 Git 状态
# =============================================================================
echo "📦 检查 Git 状态..."

if git rev-parse --git-dir > /dev/null 2>&1; then
    check_ok "Git 仓库已初始化"

    # 检查是否有未提交的改动
    if git diff-index --quiet HEAD -- 2>/dev/null; then
        check_ok "没有未提交的改动"
    else
        check_warn "存在未提交的改动"
    fi

    # 检查当前分支
    branch=$(git rev-parse --abbrev-ref HEAD)
    echo "   当前分支: $branch"

    # 检查是否有远程仓库
    if git remote -v | grep -q "origin"; then
        check_ok "已配置远程仓库"
    else
        check_warn "未配置远程仓库"
    fi
else
    check_fail "Git 仓库未初始化"
fi

echo ""

# =============================================================================
# 8. 检查 API 密钥使用
# =============================================================================
echo "🔐 检查 API 密钥使用..."

# 检查 PPT 生成功能
if [ -f "app/teaching/ppt/generate/page.tsx" ]; then
    if grep -q "process.env.NEXT_PUBLIC_AI_302_API_KEY" app/teaching/ppt/generate/page.tsx 2>/dev/null; then
        check_warn "PPT 生成使用客户端环境变量（需要在构建时传入）"
        echo "   建议：使用 GitHub Actions 构建，或创建 API 路由代理"
    fi
else
    check_ok "PPT 功能未使用或已优化"
fi

echo ""

# =============================================================================
# 9. 检查 Nginx 配置
# =============================================================================
echo "🌐 检查 Nginx 配置..."

if [ -f "nginx.conf" ]; then
    check_ok "nginx.conf 已创建"

    if grep -q "upstream nextjs_backend" nginx.conf 2>/dev/null; then
        check_ok "配置了 Next.js 上游服务器"
    fi

    if grep -q "upstream socketio_backend" nginx.conf 2>/dev/null; then
        check_ok "配置了 Socket.IO 上游服务器"
    fi

    if grep -q "your-domain.com" nginx.conf 2>/dev/null; then
        check_warn "需要修改 nginx.conf 中的域名"
    fi
else
    check_warn "nginx.conf 未创建"
fi

echo ""

# =============================================================================
# 总结
# =============================================================================
echo "========================================="
echo "📊 检查完成！"
echo "========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过！可以开始部署。${NC}"
    echo ""
    echo "下一步："
    echo "  1. 阅读 PRODUCTION_DEPLOY.md"
    echo "  2. 配置 GitHub Secrets"
    echo "  3. 推送代码触发 GitHub Actions"
    echo "  4. 在服务器上部署"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  有 $WARNINGS 个警告，建议修复后再部署。${NC}"
    echo ""
    echo "检查上述警告项，确认无问题后可以继续部署。"
    exit 0
else
    echo -e "${RED}❌ 有 $ERRORS 个错误和 $WARNINGS 个警告，必须修复后才能部署！${NC}"
    echo ""
    echo "请修复上述错误项。"
    exit 1
fi
