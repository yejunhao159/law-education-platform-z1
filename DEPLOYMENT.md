# 部署指南 - Vercel

## 🚨 部署失败原因

Vercel 部署失败通常是因为：
1. **缺少环境变量** - 最常见原因
2. Node.js 版本不兼容
3. 构建内存限制

## ✅ 解决方案

### 1. 配置环境变量（必须）

在 Vercel 项目设置中添加以下环境变量：

```
DEEPSEEK_API_KEY = sk-6b081a93258346379182141661293345
NEXT_PUBLIC_DEEPSEEK_API_KEY = sk-6b081a93258346379182141661293345
DEEPSEEK_API_URL = https://api.deepseek.com/v1/chat/completions
NEXT_PUBLIC_DEEPSEEK_API_URL = https://api.deepseek.com/v1
```

**步骤：**
1. 访问 https://vercel.com/dashboard
2. 找到你的项目
3. 进入 Settings → Environment Variables
4. 添加上述变量
5. 点击 "Redeploy"

### 2. 配置 Node.js 版本

创建 `.nvmrc` 文件（如果需要）：
```
18.17.0
```

### 3. 构建命令配置

确保 Vercel 使用正确的构建命令：
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. 如果还是失败

检查 Vercel 的构建日志：
1. 在 Vercel Dashboard 找到失败的部署
2. 点击查看 "Build Logs"
3. 查找具体错误信息

## 🔧 本地测试部署

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 本地测试
vercel dev

# 3. 部署到 Vercel
vercel --prod
```

## 📝 注意事项

- 确保 `.env.local` 不要提交到 Git（已在 .gitignore 中）
- 生产环境的 API 密钥应该通过 Vercel 环境变量配置
- 如果使用 Redis，需要配置 Redis 连接信息

## 🆘 常见问题

**Q: Module not found 错误**
A: 检查 package.json 中的依赖是否都已安装

**Q: Memory limit exceeded**
A: 在 vercel.json 中增加内存限制

**Q: API 调用失败**
A: 确认环境变量已正确配置