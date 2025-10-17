# 法学教育平台 - 完整部署指南

## 📋 目录
- [系统要求](#系统要求)
- [获取API密钥](#获取api密钥)
- [GitHub Actions构建](#github-actions构建)
- [服务器部署](#服务器部署)
- [功能验证](#功能验证)
- [故障排除](#故障排除)

## 💻 系统要求

### 最低配置
- **CPU**: 2核心
- **内存**: 2GB RAM
- **存储**: 10GB 可用空间
- **操作系统**: Linux (推荐 Ubuntu 20.04+)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

### 推荐配置
- **CPU**: 4核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间

## 🔑 获取API密钥

### 1. DeepSeek API密钥（必需）
1. 访问：https://platform.deepseek.com
2. 注册/登录账号
3. 进入 "API Keys" 页面
4. 创建新的API密钥
5. 复制密钥（格式：sk-xxxxx）

### 2. 302.ai API密钥（PPT功能）
1. 访问：https://302.ai
2. 注册账号并充值
3. 在控制台获取API密钥
4. 复制密钥

## 🚀 GitHub Actions构建

### 方法1：自动触发（推荐）
1. 推送代码到main分支
2. GitHub Actions会自动构建
3. 在Actions页面下载部署包

### 方法2：手动触发
1. 进入GitHub Actions页面
2. 选择 "Docker Build and Export" 工作流
3. 点击 "Run workflow"
4. 输入版本号（可选）
5. 等待构建完成
6. 下载生成的部署包

### 部署包内容
```
deployment-package/
├── IMAGE.tar.gz                    # Docker镜像文件
├── docker-compose.prod.yml         # Docker Compose配置
├── .env.production.example         # 环境变量模板
└── DEPLOY-GUIDE.md                # 部署指南
```

## 🖥️ 服务器部署

### 1. 准备服务器
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 创建应用目录
sudo mkdir -p /opt/law-education-platform
sudo chown $USER:$USER /opt/law-education-platform
cd /opt/law-education-platform
```

### 2. 上传部署包
```bash
# 方法1：使用scp（从本地上传）
scp -r deployment-package/ user@your-server:/opt/law-education-platform/

# 方法2：使用wget（如果部署包在网络上）
wget https://github.com/your-repo/actions/runs/ID/artifacts/NAME
```

### 3. 加载Docker镜像
```bash
cd /opt/law-education-platform/deployment-package/

# 加载镜像（这可能需要几分钟）
docker load < IMAGE.tar.gz

# 验证镜像加载成功
docker images | grep law-education-platform
```

### 4. 配置环境变量
```bash
# 复制模板文件
cp .env.production.example .env.production

# 编辑配置文件
nano .env.production
```

**必需的环境变量配置**：
```bash
# =============================================================================
# 核心配置（必需）
# =============================================================================

# DeepSeek AI服务（必需 - 容器启动必须）
DEEPSEEK_API_KEY=sk-your-actual-deepseek-api-key-here
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-your-actual-deepseek-api-key-here

# 302.ai PPT生成（重要 - PPT功能必需）
NEXT_PUBLIC_AI_302_API_KEY=your-302-ai-api-key-here

# =============================================================================
# 基础配置
# =============================================================================
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Socket.IO配置（可选）
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 5. 启动服务
```bash
# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看启动日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 6. 验证部署
```bash
# 检查健康状态
curl http://localhost:3000/api/health

# 检查Socket.IO服务
curl http://localhost:3001/socket.io/

# 检查容器状态
docker-compose -f docker-compose.prod.yml exec app pm2 status
```

## 🧪 功能验证

### 1. 登录功能验证
1. 访问：http://your-server:3000/login
2. 使用预置账号登录：
   - **用户名**: `teacher01` - `teacher05`
   - **密码**: `2025`
   - **管理员**: `teacher01`（其他为教师账号）

### 2. PPT功能验证
```bash
# 运行PPT功能测试
docker-compose -f docker-compose.prod.yml exec app node scripts/test-ppt-functionality.js
```

### 3. 数据库验证
```bash
# 检查数据库文件
docker-compose -f docker-compose.prod.yml exec app ls -la /app/data/

# 检查用户数据
docker-compose -f docker-compose.prod.yml exec app node -e "
const { userDb } = require('./lib/db/users');
const users = userDb.findAll();
console.log('用户列表:');
users.forEach(user => {
  console.log(\`- \${user.username} (\${user.display_name}) - \${user.role}\`);
});
"
```

## 🔧 故障排除

### 问题1：容器无法启动
**症状**：`docker-compose ps` 显示容器状态为 `restarting` 或 `exited`

**解决步骤**：
```bash
# 1. 查看详细日志
docker-compose -f docker-compose.prod.yml logs app

# 2. 检查环境变量
docker-compose -f docker-compose.prod.yml exec app printenv | grep -E "(DEEPSEEK|AI_302|NODE_ENV)"

# 3. 常见原因
#    - 缺少DEEPSEEK_API_KEY
#    - 缺少NEXT_PUBLIC_DEEPSEEK_API_KEY
#    - 数据目录权限问题
#    - 端口占用
```

### 问题2：登录失败
**症状**：登录页面返回错误或无响应

**解决步骤**：
```bash
# 1. 检查数据库初始化
docker-compose -f docker-compose.prod.yml exec app node scripts/init-database.js

# 2. 检查用户数据
docker-compose -f docker-compose.prod.yml exec app node -e "
const { userDb } = require('./lib/db/users');
const user = userDb.findByUsername('teacher01');
console.log('用户检查结果:', user ? '存在' : '不存在');
"

# 3. 重新初始化数据库（谨慎操作）
docker-compose -f docker-compose.prod.yml exec app node -e "
const { resetDatabase } = require('./lib/db/seed');
resetDatabase();
"
```

### 问题3：PPT功能异常
**症状**：PPT生成失败或返回错误

**解决步骤**：
```bash
# 1. 测试302.ai API连接
docker-compose -f docker-compose.prod.yml exec app node scripts/test-ppt-functionality.js

# 2. 检查API密钥
docker-compose -f docker-compose.prod.yml exec app printenv NEXT_PUBLIC_AI_302_API_KEY

# 3. 查看PPT服务日志
docker-compose -f docker-compose.prod.yml logs app | grep -i ppt
```

### 问题4：端口占用
**症状**：服务启动失败，提示端口已被占用

**解决步骤**：
```bash
# 1. 检查端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001

# 2. 停止占用端口的服务
sudo systemctl stop nginx  # 如果nginx占用80端口
sudo kill -9 <PID>         # 杀死占用进程

# 3. 或者修改docker-compose.yml中的端口映射
nano docker-compose.prod.yml
```

## 🔄 服务管理

### 常用命令
```bash
# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 进入容器
docker-compose -f docker-compose.prod.yml exec app sh

# 备份数据库
docker-compose -f docker-compose.prod.yml exec app cp /app/data/app.db ./backups/app-$(date +%Y%m%d-%H%M%S).db

# 更新镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### 日志管理
```bash
# 查看所有日志
docker-compose -f docker-compose.prod.yml logs

# 查看Next.js日志
docker-compose -f docker-compose.prod.yml logs app | grep nextjs

# 查看Socket.IO日志
docker-compose -f docker-compose.prod.yml logs app | grep socketio

# 查看最近的错误
docker-compose -f docker-compose.prod.yml logs --tail=100 app | grep -i error
```

## 📊 监控和维护

### 健康检查脚本
```bash
# 创建健康检查脚本
cat > /opt/law-education-platform/health-check.sh << 'EOF'
#!/bin/bash
echo "🔍 法学教育平台健康检查..."
echo ""

# 检查容器状态
echo "📦 容器状态："
cd /opt/law-education-platform/deployment-package/
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🌐 服务可用性："

# 检查Next.js
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "  ✅ Next.js服务正常"
else
    echo "  ❌ Next.js服务异常"
fi

# 检查Socket.IO
if curl -s http://localhost:3001/socket.io/ > /dev/null; then
    echo "  ✅ Socket.IO服务正常"
else
    echo "  ❌ Socket.IO服务异常"
fi

echo ""
echo "💾 数据库状态："
DB_SIZE=$(docker-compose -f docker-compose.prod.yml exec app ls -la /app/data/app.db 2>/dev/null | awk '{print $5}')
if [ -n "$DB_SIZE" ]; then
    echo "  ✅ 数据库文件存在 ($(echo "scale=1; $DB_SIZE/1024/1024" | bc)MB)"
else
    echo "  ❌ 数据库文件不存在"
fi

echo ""
echo "🔑 环境变量检查："
API_KEYS=$(docker-compose -f docker-compose.prod.yml exec app sh -c 'echo "$DEEPSEEK_API_KEY:$NEXT_PUBLIC_AI_302_API_KEY"' | tr ':' '\n')
echo "$API_KEYS" | while read -r key; do
    if [ -n "$key" ] && [ "$key" != "null" ]; then
        echo "  ✅ API密钥已配置"
    else
        echo "  ❌ API密钥缺失"
    fi
done
EOF

chmod +x /opt/law-education-platform/health-check.sh

# 运行健康检查
/opt/law-education-platform/health-check.sh
```

## 🆘 支持联系方式

如遇到无法解决的问题：

1. **检查日志**：首先查看容器日志
2. **验证配置**：确认环境变量配置正确
3. **网络检查**：确认服务器网络连接正常
4. **资源检查**：确认服务器资源充足

## 📝 版本更新

当需要更新到新版本时：

1. **停止旧服务**：
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **备份重要数据**：
   ```bash
   cp -r data/ backups/data-$(date +%Y%m%d)/
   ```

3. **下载新部署包**并按照相同步骤部署

4. **验证更新**：
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   curl http://localhost:3000/api/health
   ```

---

**部署完成后，您的法学教育平台将在以下地址可用：**
- 主应用：http://your-server:3000
- 登录页面：http://your-server:3000/login
- 管理后台：http://your-server:3000/admin/dashboard（需管理员账号）