#!/bin/bash
# =============================================================================
# WSL2 Ubuntu环境 Docker Engine 安装脚本
# =============================================================================
# 用途：在WSL2的Ubuntu中直接安装Docker Engine
# 不需要Docker Desktop for Windows
# =============================================================================

set -e  # 遇到错误立即退出

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 WSL2 Docker Engine 安装程序"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ========================================
# Step 1: 检查系统
# ========================================
echo "📋 Step 1/8: 检查系统环境..."

# 检查是否在WSL2中
if ! grep -q "microsoft" /proc/version; then
    echo "⚠️  警告：可能不在WSL2环境中"
fi

# 检查Ubuntu版本
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "  系统：$NAME $VERSION"
else
    echo "  ⚠️  无法检测系统版本"
fi

echo "✅ 系统检查完成"
echo ""

# ========================================
# Step 2: 卸载旧版本Docker（如果存在）
# ========================================
echo "🗑️  Step 2/8: 卸载旧版本Docker（如果存在）..."

sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || echo "  没有发现旧版本"

echo "✅ 清理完成"
echo ""

# ========================================
# Step 3: 更新APT包索引
# ========================================
echo "📦 Step 3/8: 更新系统包..."

sudo apt-get update

echo "✅ 更新完成"
echo ""

# ========================================
# Step 4: 安装必要的依赖
# ========================================
echo "📦 Step 4/8: 安装依赖包..."

sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

echo "✅ 依赖安装完成"
echo ""

# ========================================
# Step 5: 添加Docker官方GPG密钥
# ========================================
echo "🔑 Step 5/8: 添加Docker官方GPG密钥..."

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "✅ GPG密钥添加完成"
echo ""

# ========================================
# Step 6: 添加Docker APT源
# ========================================
echo "📝 Step 6/8: 添加Docker APT源..."

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

echo "✅ APT源添加完成"
echo ""

# ========================================
# Step 7: 安装Docker Engine
# ========================================
echo "🐳 Step 7/8: 安装Docker Engine..."
echo "这可能需要几分钟..."

sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

echo "✅ Docker Engine安装完成"
echo ""

# ========================================
# Step 8: 配置Docker服务
# ========================================
echo "⚙️  Step 8/8: 配置Docker服务..."

# 将当前用户添加到docker组（避免每次都要sudo）
sudo usermod -aG docker $USER

# 在WSL2中启动Docker服务
# 注意：WSL2不使用systemd，需要手动启动
echo "启动Docker守护进程..."

# 检查Docker守护进程是否已运行
if ! sudo service docker status >/dev/null 2>&1; then
    sudo service docker start
else
    echo "  Docker服务已在运行"
fi

echo "✅ Docker配置完成"
echo ""

# ========================================
# 验证安装
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 安装完成！验证安装..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 显示Docker版本
echo "📌 Docker版本信息："
sudo docker --version
sudo docker compose version

echo ""

# 运行测试容器
echo "🧪 运行测试容器..."
sudo docker run --rm hello-world

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Docker安装成功！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  重要提示："
echo ""
echo "1️⃣  用户组配置："
echo "   你已被添加到docker组，但需要重新登录才能生效。"
echo "   两种方式："
echo "   方式A: 关闭WSL2终端，重新打开"
echo "   方式B: 执行 'newgrp docker' 立即生效"
echo ""
echo "2️⃣  WSL2中启动Docker服务："
echo "   WSL2不使用systemd，每次重启WSL2后需要手动启动Docker："
echo "   sudo service docker start"
echo ""
echo "   或者创建自动启动（可选）："
echo "   echo 'sudo service docker start' >> ~/.bashrc"
echo ""
echo "3️⃣  验证无需sudo："
echo "   执行 'newgrp docker' 或重新登录后，运行："
echo "   docker ps"
echo "   docker --version"
echo ""
echo "4️⃣  开始构建镜像："
echo "   cd /home/yejh0725/law-education-platform-z1"
echo "   ./scripts/build-and-export-image.sh v1.2.0"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
