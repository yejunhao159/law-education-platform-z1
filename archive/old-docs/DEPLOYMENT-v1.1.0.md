# 🚀 v1.1.0 服务器部署指南

## 📋 部署前准备

### 1. 更新 docker-compose.prod.yml

在服务器上执行以下命令更新配置：

```bash
cd /path/to/law-education-platform-z1

# 备份当前配置
cp docker-compose.prod.yml docker-compose.prod.yml.backup

# 更新配置（添加Socket.IO端口）
cat > docker-compose.prod.yml << 'EOF'
# =============================================================================
# Docker Compose 配置 - 生产环境
# =============================================================================
# 用途：企业服务器生产部署
# 使用方法：
#   首次部署：docker-compose -f docker-compose.prod.yml up -d
#   更新版本：docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d
#   停止服务：docker-compose -f docker-compose.prod.yml down
#   查看日志：docker-compose -f docker-compose.prod.yml logs -f
# =============================================================================

services:
  # 主应用服务
  app:
    # 使用 GitHub Container Registry 的镜像
    image: ghcr.io/yejunhao159/law-education-platform-z1:v1.1.0
    container_name: law-edu-app-prod

    # 端口映射
    ports:
      - "3000:3000"  # Next.js应用
      - "3001:3001"  # Socket.IO服务器（新增）

    # 环境变量（从 .env.production 文件加载）
    env_file:
      - .env.production

    # 环境变量（生产环境配置）
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0

    # 数据卷挂载
    volumes:
      # 日志持久化
      - ./logs:/app/logs
      # 数据库持久化
      - ./data:/app/data

    # 健康检查
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # 重启策略
    restart: always

    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

    # 日志配置
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "10"

# 网络配置
networks:
  default:
    name: law-edu-prod-network
    driver: bridge
EOF
```

### 2. 更新 .env.production 配置

```bash
# 检查是否存在.env.production
if [ -f .env.production ]; then
  echo "✅ .env.production 已存在"

  # 检查是否已有NEXT_PUBLIC_SOCKET_URL配置
  if grep -q "NEXT_PUBLIC_SOCKET_URL" .env.production; then
    echo "✅ Socket.IO配置已存在"
  else
    echo "⚠️  添加Socket.IO配置"
    echo "" >> .env.production
    echo "# Socket.IO配置" >> .env.production
    echo "NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001" >> .env.production
  fi
else
  echo "❌ .env.production 不存在，创建示例文件"
  cat > .env.production << 'ENVEOF'
# API配置
DEEPSEEK_API_KEY=your_api_key_here

# Socket.IO配置
NEXT_PUBLIC_SOCKET_URL=http://115.29.191.180:3001

# 数据库配置（如果需要）
# DATABASE_URL=...

# 其他配置
NODE_ENV=production
ENVEOF
fi
```

### 3. 确保网络存在

```bash
# 检查网络是否存在
if ! docker network ls | grep -q law-edu-prod-network; then
  echo "创建Docker网络..."
  docker network create law-edu-prod-network
else
  echo "✅ Docker网络已存在"
fi
```

## 🚀 部署命令

### 方案1：完整部署脚本（推荐）

复制以下完整脚本到服务器并执行：

```bash
#!/bin/bash
# =============================================================================
# v1.1.0 部署脚本
# =============================================================================

set -e  # 遇到错误立即退出

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 开始部署 v1.1.0 - Socket.IO实时通信版本              ║"
echo "╚════════════════════════════════════════════════════════════╝"

# 1. 停止旧容器
echo ""
echo "📥 [1/6] 停止旧容器..."
docker-compose -f docker-compose.prod.yml down || true

# 2. 拉取新镜像
echo ""
echo "📦 [2/6] 拉取新镜像 v1.1.0..."
docker pull ghcr.io/yejunhao159/law-education-platform-z1:v1.1.0

# 3. 清理未使用的镜像（可选）
echo ""
echo "🧹 [3/6] 清理未使用的镜像..."
docker image prune -f || true

# 4. 确保网络存在
echo ""
echo "🔗 [4/6] 检查Docker网络..."
if ! docker network ls | grep -q law-edu-prod-network; then
  docker network create law-edu-prod-network
  echo "✅ 已创建Docker网络"
else
  echo "✅ Docker网络已存在"
fi

# 5. 启动新容器
echo ""
echo "🚀 [5/6] 启动新容器..."
docker-compose -f docker-compose.prod.yml up -d

# 6. 等待服务启动
echo ""
echo "⏳ [6/6] 等待服务启动..."
sleep 15

# 健康检查
echo ""
echo "🏥 执行健康检查..."
max_attempts=20
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker exec law-edu-app-prod node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" 2>/dev/null; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  ✅ 部署成功！服务运行正常                                ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 容器状态："
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    echo "🔗 访问地址："
    echo "   主应用：http://115.29.191.180:3000"
    echo "   Socket.IO：ws://115.29.191.180:3001"
    echo ""
    echo "📝 查看日志："
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    exit 0
  fi

  attempt=$((attempt + 1))
  echo -n "."
  sleep 3
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  警告：健康检查超时                                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 请检查日志："
echo "   docker-compose -f docker-compose.prod.yml logs -f"
exit 1
```

### 方案2：手动分步执行

如果你想逐步执行，可以使用以下命令：

```bash
# 进入项目目录
cd /path/to/law-education-platform-z1

# 1. 停止旧容器
docker-compose -f docker-compose.prod.yml down

# 2. 拉取新镜像
docker pull ghcr.io/yejunhao159/law-education-platform-z1:v1.1.0

# 3. 确保网络存在
docker network create law-edu-prod-network 2>/dev/null || true

# 4. 启动新容器
docker-compose -f docker-compose.prod.yml up -d

# 5. 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

## ✅ 部署后验证

### 1. 检查容器状态

```bash
# 查看容器运行状态
docker-compose -f docker-compose.prod.yml ps

# 预期输出：
# NAME                  IMAGE                                                    STATUS
# law-edu-app-prod      ghcr.io/yejunhao159/law-education-platform-z1:v1.1.0     Up X minutes (healthy)
```

### 2. 检查端口监听

```bash
# 检查端口3000和3001是否正常监听
docker exec law-edu-app-prod netstat -tunlp | grep -E "3000|3001"

# 预期输出：
# tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      1/node
# tcp        0      0 0.0.0.0:3001            0.0.0.0:*               LISTEN      X/node
```

### 3. 检查PM2进程

```bash
# 查看PM2管理的进程
docker exec law-edu-app-prod pm2 list

# 预期输出：
# ┌─────┬──────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ status  │ restart │ uptime   │
# ├─────┼──────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ nextjs-app       │ online  │ 0       │ Xs       │
# │ 1   │ socketio-server  │ online  │ 0       │ Xs       │
# └─────┴──────────────────┴─────────┴─────────┴──────────┘
```

### 4. 测试API健康检查

```bash
# 测试Next.js健康检查
curl http://115.29.191.180:3000/api/health

# 预期输出：
# {"status":"ok"}
```

### 5. 测试Socket.IO连接

```bash
# 使用curl测试Socket.IO端点（会返回Socket.IO握手信息）
curl http://115.29.191.180:3001/socket.io/

# 预期输出类似：
# {"code":0,"message":"Transport unknown"}  # 这是正常的，因为curl不支持WebSocket
```

### 6. 查看完整日志

```bash
# 查看所有日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看Socket.IO日志
docker exec law-edu-app-prod pm2 logs socketio-server --lines 50

# 查看Next.js日志
docker exec law-edu-app-prod pm2 logs nextjs-app --lines 50
```

## 🧪 功能测试

### 1. 浏览器访问测试

1. 打开浏览器访问：`http://115.29.191.180:3000`
2. 进入苏格拉底课堂（Socratic Classroom）
3. 创建新课堂（获得课堂代码）

### 2. 教师端测试

1. 作为教师，发布一个问题
2. 检查控制台是否显示Socket.IO连接成功
3. 观察日志：`docker exec law-edu-app-prod pm2 logs socketio-server --lines 20`

### 3. 学生端测试

1. 使用另一个设备/浏览器（手机最佳）
2. 输入课堂代码加入课堂
3. **关键测试**：在输入框中输入答案，验证**不会出现页面刷新/输入中断**
4. 提交答案后，教师端应立即（<1秒）收到答案

### 4. 实时性验证

- 教师发布问题 → 学生端立即显示（延迟<100ms）
- 学生提交答案 → 教师端立即显示（延迟<100ms）
- 多个学生同时作答 → 所有答案实时更新

## 🔥 防火墙配置

如果无法访问，请检查防火墙：

```bash
# CentOS/RHEL
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload

# Ubuntu/Debian
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw reload

# 直接使用iptables
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
iptables-save
```

## 🚨 故障排查

### 问题1：容器无法启动

```bash
# 查看详细日志
docker-compose -f docker-compose.prod.yml logs

# 检查镜像是否拉取成功
docker images | grep law-education-platform-z1

# 重新拉取镜像
docker pull ghcr.io/yejunhao159/law-education-platform-z1:v1.1.0
```

### 问题2：Socket.IO连接失败

```bash
# 检查端口是否正确暴露
docker port law-edu-app-prod

# 检查环境变量
docker exec law-edu-app-prod env | grep SOCKET

# 检查Socket.IO进程
docker exec law-edu-app-prod pm2 list
```

### 问题3：健康检查失败

```bash
# 进入容器排查
docker exec -it law-edu-app-prod sh

# 容器内测试
curl http://localhost:3000/api/health
netstat -tunlp

# 查看PM2日志
pm2 logs --lines 100
```

### 问题4：内存不足

```bash
# 检查容器资源使用
docker stats law-edu-app-prod

# 如果内存不足，调整docker-compose.prod.yml中的资源限制
# 将memory从2G降低到1G
```

## 📊 监控命令

```bash
# 实时监控容器资源
docker stats law-edu-app-prod

# 查看PM2监控
docker exec law-edu-app-prod pm2 monit

# 查看实时日志
docker-compose -f docker-compose.prod.yml logs -f --tail=50
```

## 🔄 回滚到旧版本

如果出现问题需要回滚：

```bash
# 停止当前容器
docker-compose -f docker-compose.prod.yml down

# 修改镜像版本为v1.0.1
sed -i 's/v1.1.0/v1.0.1/g' docker-compose.prod.yml

# 启动旧版本
docker-compose -f docker-compose.prod.yml up -d
```

## 📋 部署检查清单

- [ ] docker-compose.prod.yml 已更新（添加3001端口）
- [ ] .env.production 包含 NEXT_PUBLIC_SOCKET_URL
- [ ] Docker网络 law-edu-prod-network 已创建
- [ ] 镜像 v1.1.0 已成功拉取
- [ ] 容器已启动并通过健康检查
- [ ] 端口3000和3001正常监听
- [ ] PM2显示两个进程都在运行
- [ ] 防火墙已开放3000和3001端口
- [ ] 浏览器可以访问应用
- [ ] Socket.IO实时通信正常工作
- [ ] 学生输入不会被中断

## 🎯 新功能说明

### v1.1.0 主要变更

1. **Socket.IO实时通信**
   - 端口：3001
   - WebSocket优先，Polling降级
   - 修复移动端输入中断bug

2. **PM2进程管理**
   - 双进程：Next.js (3000) + Socket.IO (3001)
   - 自动重启
   - 日志管理

3. **性能提升**
   - 答案延迟：3秒 → <100ms
   - 移除SSE轮询
   - 实时推送架构

---

**部署完成后，请测试苏格拉底课堂的实时互动功能！** 🎓
