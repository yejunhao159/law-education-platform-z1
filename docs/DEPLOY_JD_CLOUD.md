# 京东云服务器部署指南

## 📋 部署前准备

### 1. 服务器环境要求
- **操作系统**: Ubuntu 20.04+ / CentOS 7+
- **Node.js**: v18.17+ (推荐v20 LTS)
- **内存**: 至少2GB
- **磁盘**: 至少10GB可用空间
- **端口**: 需要开放3000端口（或自定义端口）

### 2. 本地准备
确保项目可以正常构建：
```bash
# 测试构建
npm run build

# 测试本地启动
npm run start
```

---

## 🚀 部署步骤

### Step 1: 准备服务器环境

#### 1.1 登录京东云服务器
```bash
ssh root@your-jd-cloud-ip
```

#### 1.2 安装Node.js (如果未安装)
```bash
# 使用nvm安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证
node -v  # 应该显示 v20.x.x
npm -v
```

#### 1.3 安装PM2（进程管理器）
```bash
npm install -g pm2
```

---

### Step 2: 上传项目代码

#### 方式A: 使用Git（推荐）
```bash
# 在服务器上
cd /var/www  # 或你的项目目录
git clone https://github.com/yejunhao159/law-education-platform-z1.git
cd law-education-platform-z1
```

#### 方式B: 本地打包上传
```bash
# 在本地
npm run build
tar -czf law-platform.tar.gz .next package.json package-lock.json public components app lib src

# 上传到服务器
scp law-platform.tar.gz root@your-jd-cloud-ip:/var/www/

# 在服务器上解压
ssh root@your-jd-cloud-ip
cd /var/www
mkdir law-education-platform
tar -xzf law-platform.tar.gz -C law-education-platform
cd law-education-platform
```

---

### Step 3: 配置环境变量

#### 3.1 创建生产环境配置
```bash
# 在服务器上
cd /var/www/law-education-platform-z1
nano .env.production
```

#### 3.2 填入配置内容
```env
# API Keys
DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345
NEXT_PUBLIC_DEEPSEEK_API_KEY=sk-6b081a93258346379182141661293345
DEEPSEEK_API_URL=https://api.deepseek.com/v1
NEXT_PUBLIC_DEEPSEEK_API_URL=https://api.deepseek.com/v1

# 生产环境配置
NODE_ENV=production
PORT=3000
```

---

### Step 4: 安装依赖并构建

```bash
# 安装生产依赖
npm install --production

# 如果需要重新构建
npm run build
```

---

### Step 5: 启动应用

#### 方式A: 使用PM2（推荐）
```bash
# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'law-education-platform',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    watch: false
  }]
}
EOF

# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs law-education-platform
```

#### 方式B: 直接启动（测试用）
```bash
PORT=3000 npm run start
```

---

### Step 6: 配置防火墙和域名（可选）

#### 6.1 开放端口（京东云控制台）
1. 登录京东云控制台
2. 进入云主机 → 安全组
3. 添加入站规则：
   - 端口: 3000
   - 协议: TCP
   - 来源: 0.0.0.0/0

#### 6.2 配置Nginx反向代理（推荐）
```bash
# 安装Nginx
sudo apt update
sudo apt install nginx

# 配置
sudo nano /etc/nginx/sites-available/law-platform

# 填入配置
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名或IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE支持（重要！）
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;
    }
}

# 启用配置
sudo ln -s /etc/nginx/sites-available/law-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## ✅ 测试验证

### 1. 健康检查
```bash
# 测试服务是否运行
curl http://localhost:3000

# 测试SSE流
curl http://localhost:3000/api/classroom/test123/stream

# 应该看到心跳消息
```

### 2. 测试课堂功能
```bash
# 发布问题
curl -X POST http://localhost:3000/api/classroom/test123/question \
  -H "Content-Type: application/json" \
  -d '{"content":"测试问题","type":"text"}'

# 查看问题
curl http://localhost:3000/api/classroom/test123/question
```

### 3. 浏览器测试
访问: `http://your-jd-cloud-ip:3000`

---

## 📊 监控和维护

### PM2常用命令
```bash
# 查看状态
pm2 status
pm2 monit                    # 实时监控

# 查看日志
pm2 logs law-education-platform
pm2 logs --lines 100         # 查看最近100行

# 重启/停止
pm2 restart law-education-platform
pm2 stop law-education-platform
pm2 delete law-education-platform

# 更新代码后
git pull
npm install --production
npm run build
pm2 restart law-education-platform
```

### 日志位置
- PM2日志: `./logs/out.log` 和 `./logs/err.log`
- Nginx日志: `/var/log/nginx/access.log` 和 `/var/log/nginx/error.log`

---

## 🔧 常见问题

### 问题1: 端口占用
```bash
# 查看3000端口占用
sudo lsof -i :3000
# 杀掉进程
sudo kill -9 <PID>
```

### 问题2: 内存不足
```bash
# 查看内存
free -h

# 如果内存不足，添加swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 问题3: SSE连接超时
- 确保Nginx配置了 `proxy_buffering off`
- 检查防火墙是否允许长连接

### 问题4: 环境变量未生效
```bash
# 检查PM2环境变量
pm2 env 0

# 重新加载
pm2 restart law-education-platform --update-env
```

---

## 🎯 性能优化建议

### 1. 启用Gzip压缩（Nginx）
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

### 2. 配置静态资源缓存
```nginx
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 内存优化
```bash
# 调整Node.js内存限制（如果需要）
pm2 start ecosystem.config.js --node-args="--max-old-space-size=2048"
```

---

## 📞 部署后检查清单

- [ ] 服务正常运行（`pm2 status`）
- [ ] 网页可以访问（http://ip:3000）
- [ ] 课堂SSE流正常（curl测试通过）
- [ ] 环境变量加载正确
- [ ] PM2已配置开机自启
- [ ] 防火墙端口已开放
- [ ] 日志目录可写入
- [ ] 数据持久化正常（课堂问答功能）

---

## 🚨 注意事项

1. **单实例部署**：当前方案使用内存存储，只支持单实例部署
2. **数据持久化**：服务重启后课堂数据会丢失（演示阶段可接受）
3. **SSL证书**：生产环境建议配置HTTPS（可用Let's Encrypt免费证书）
4. **备份策略**：定期备份代码和配置文件

---

生成时间: 2025-10-03
维护者: yejunhao159
