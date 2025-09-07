# 📚 GitHub开发完整流程指南

## 目录
1. [基础概念](#基础概念)
2. [初始设置](#初始设置)
3. [日常开发流程](#日常开发流程)
4. [分支管理策略](#分支管理策略)
5. [协作开发流程](#协作开发流程)
6. [最佳实践](#最佳实践)
7. [常见问题解决](#常见问题解决)

---

## 🎯 基础概念

### Git vs GitHub
- **Git**: 分布式版本控制系统（本地）
- **GitHub**: 基于Git的代码托管平台（远程）

### 核心术语
- **Repository（仓库）**: 项目的容器
- **Branch（分支）**: 独立的开发线
- **Commit（提交）**: 保存的更改记录
- **Push（推送）**: 上传到远程
- **Pull（拉取）**: 从远程下载
- **Merge（合并）**: 合并分支
- **Pull Request（PR）**: 合并请求

---

## 🚀 初始设置

### 1. 安装Git
```bash
# Ubuntu/Debian
sudo apt-get install git

# MacOS
brew install git

# Windows
# 下载 Git for Windows
```

### 2. 配置Git身份
```bash
# 设置用户名（必须）
git config --global user.name "Your Name"

# 设置邮箱（必须）
git config --global user.email "your.email@example.com"

# 查看配置
git config --list
```

### 3. 生成SSH密钥（推荐）
```bash
# 生成SSH密钥
ssh-keygen -t ed25519 -C "your.email@example.com"

# 复制公钥
cat ~/.ssh/id_ed25519.pub
# 将输出的内容添加到GitHub Settings → SSH Keys
```

### 4. 创建/克隆仓库

#### 方式一：从零开始
```bash
# 本地创建新项目
mkdir my-project
cd my-project
git init

# 创建README文件
echo "# My Project" > README.md
git add README.md
git commit -m "Initial commit"

# 连接远程仓库
git remote add origin https://github.com/username/my-project.git
git branch -M main
git push -u origin main
```

#### 方式二：克隆现有项目
```bash
# HTTPS方式
git clone https://github.com/username/project.git

# SSH方式（推荐）
git clone git@github.com:username/project.git
```

---

## 💻 日常开发流程

### 标准工作流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建功能分支
git checkout -b feature/add-login

# 3. 进行开发...
# 编写代码，修改文件

# 4. 查看更改状态
git status

# 5. 查看具体更改
git diff

# 6. 添加更改到暂存区
git add .                    # 添加所有更改
git add src/components/Login.tsx  # 添加特定文件

# 7. 提交更改
git commit -m "feat: implement user login functionality"

# 8. 推送到远程
git push origin feature/add-login

# 9. 创建Pull Request（在GitHub网页上）
# 或使用GitHub CLI
gh pr create --title "Add login feature" --body "Description here"

# 10. 合并后删除本地分支
git checkout main
git pull origin main
git branch -d feature/add-login
```

### 提交消息规范（Conventional Commits）

```bash
# 格式：<type>(<scope>): <subject>

# 类型说明：
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构
perf:     性能优化
test:     测试相关
chore:    构建/辅助工具

# 示例：
git commit -m "feat: add user authentication"
git commit -m "fix: resolve login timeout issue"
git commit -m "docs: update API documentation"
git commit -m "style: format code with prettier"
git commit -m "refactor: simplify database queries"
git commit -m "perf: optimize image loading"
git commit -m "test: add unit tests for auth service"
git commit -m "chore: update dependencies"
```

---

## 🌳 分支管理策略

### Git Flow模型

```bash
# 主要分支
main/master     # 生产环境代码
develop         # 开发环境代码

# 支持分支
feature/*       # 功能开发
release/*       # 发布准备
hotfix/*        # 紧急修复

# 示例流程
# 1. 从develop创建功能分支
git checkout develop
git checkout -b feature/payment

# 2. 开发完成后合并回develop
git checkout develop
git merge feature/payment

# 3. 准备发布
git checkout -b release/v1.0.0 develop

# 4. 发布到main
git checkout main
git merge release/v1.0.0
git tag v1.0.0

# 5. 紧急修复
git checkout -b hotfix/fix-payment main
# 修复后合并到main和develop
git checkout main
git merge hotfix/fix-payment
git checkout develop
git merge hotfix/fix-payment
```

### GitHub Flow（简化版）

```bash
# 1. main分支始终可部署
# 2. 从main创建功能分支
git checkout -b feature/new-feature

# 3. 定期推送
git push origin feature/new-feature

# 4. 创建PR并review
# 5. 合并到main
# 6. 立即部署
```

---

## 👥 协作开发流程

### Fork工作流（开源项目）

```bash
# 1. Fork原项目（在GitHub网页操作）

# 2. 克隆你的fork
git clone git@github.com:your-username/project.git

# 3. 添加上游仓库
git remote add upstream git@github.com:original-owner/project.git

# 4. 保持同步
git fetch upstream
git checkout main
git merge upstream/main

# 5. 创建功能分支
git checkout -b fix/bug-123

# 6. 提交并推送到你的fork
git push origin fix/bug-123

# 7. 创建Pull Request到原项目
```

### 代码审查（Code Review）

```bash
# 获取他人的PR进行本地测试
git fetch origin pull/123/head:pr-123
git checkout pr-123

# 测试完成后切回主分支
git checkout main

# 使用GitHub CLI审查
gh pr review 123 --approve
gh pr review 123 --request-changes
gh pr review 123 --comment -b "Looks good!"
```

---

## ✨ 最佳实践

### 1. 频繁提交，小步迭代
```bash
# ❌ 不好的做法
git commit -m "完成所有功能"  # 太大的提交

# ✅ 好的做法
git commit -m "feat: add user model"
git commit -m "feat: add user controller"
git commit -m "feat: add user routes"
```

### 2. 保持分支最新
```bash
# 定期同步main分支
git checkout main
git pull origin main

# rebase功能分支（保持历史整洁）
git checkout feature/my-feature
git rebase main
```

### 3. 使用.gitignore
```bash
# 创建.gitignore文件
cat > .gitignore << EOF
# 依赖
node_modules/
vendor/

# 构建产物
dist/
build/

# 环境变量
.env
.env.local

# IDE配置
.vscode/
.idea/

# 系统文件
.DS_Store
Thumbs.db
EOF

git add .gitignore
git commit -m "chore: add gitignore"
```

### 4. 使用别名提高效率
```bash
# 设置常用别名
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.lg "log --oneline --graph --all"

# 使用别名
git st  # 等同于 git status
git co main  # 等同于 git checkout main
git lg  # 美化的日志
```

---

## 🔧 常见问题解决

### 1. 撤销操作

```bash
# 撤销工作区的修改（未add）
git checkout -- file.txt
git restore file.txt  # Git 2.23+

# 撤销暂存区的修改（已add）
git reset HEAD file.txt
git restore --staged file.txt  # Git 2.23+

# 撤销最后一次提交（已commit）
git reset --soft HEAD~1  # 保留更改
git reset --hard HEAD~1  # 丢弃更改

# 修改最后一次提交信息
git commit --amend -m "新的提交信息"
```

### 2. 解决合并冲突

```bash
# 合并时发生冲突
git merge feature-branch
# CONFLICT (content): Merge conflict in file.txt

# 手动编辑冲突文件，解决冲突
vim file.txt

# 标记为已解决
git add file.txt
git commit -m "resolve: merge conflict in file.txt"
```

### 3. 暂存当前工作

```bash
# 暂存当前更改
git stash save "work in progress"

# 切换分支处理其他事情
git checkout other-branch

# 恢复暂存的更改
git checkout original-branch
git stash pop

# 查看所有暂存
git stash list

# 应用特定暂存
git stash apply stash@{1}
```

### 4. 查看历史

```bash
# 查看提交历史
git log --oneline -10  # 最近10条
git log --graph --all  # 图形化显示所有分支
git log --author="John"  # 特定作者
git log --since="2024-01-01"  # 特定时间后
git log --grep="fix"  # 搜索提交信息

# 查看文件历史
git log -p file.txt  # 显示文件的更改历史
git blame file.txt  # 查看每行的最后修改者
```

### 5. 清理和优化

```bash
# 清理未跟踪的文件
git clean -n  # 预览将删除的文件
git clean -f  # 执行删除
git clean -fd  # 包括目录

# 优化仓库
git gc  # 垃圾回收
git prune  # 删除无用对象
```

---

## 🚨 紧急情况处理

### 误删除文件恢复
```bash
# 从最近提交恢复
git checkout HEAD -- deleted-file.txt

# 从特定提交恢复
git checkout abc1234 -- deleted-file.txt
```

### 误推送敏感信息
```bash
# 从历史中完全删除文件
git filter-branch --tree-filter 'rm -f passwords.txt' HEAD

# 或使用BFG Repo-Cleaner（更快）
bfg --delete-files passwords.txt
git push --force
```

### 重置到特定版本
```bash
# 查找目标提交
git log --oneline

# 硬重置（谨慎使用）
git reset --hard abc1234
git push --force  # 需要强制推送
```

---

## 📋 完整示例：一天的工作流程

```bash
# 早上开始工作
cd ~/projects/my-app
git checkout main
git pull origin main

# 开始新功能
git checkout -b feature/user-profile

# 编码...（第一部分）
git add src/components/UserProfile.tsx
git commit -m "feat: add UserProfile component structure"

# 编码...（第二部分）
git add src/styles/UserProfile.css
git commit -m "style: add UserProfile styling"

# 午休前推送
git push origin feature/user-profile

# 下午继续
git add src/api/userAPI.ts
git commit -m "feat: add user API integration"

# 发现之前的提交有错
git commit --amend -m "feat: add user API integration with error handling"

# 完成功能
git add .
git commit -m "test: add UserProfile tests"

# 最终推送
git push origin feature/user-profile --force-with-lease

# 创建Pull Request
gh pr create --title "Feature: User Profile" \
  --body "## Description
  Implements user profile functionality
  
  ## Changes
  - Added UserProfile component
  - Added API integration
  - Added tests
  
  ## Screenshots
  [Add screenshots here]"

# 等待代码审查...
# 审查通过后合并

# 清理
git checkout main
git pull origin main
git branch -d feature/user-profile
```

---

## 🎓 进阶技巧

### 1. Interactive Rebase（交互式变基）
```bash
# 整理最近3个提交
git rebase -i HEAD~3

# 在编辑器中：
# pick -> 保留提交
# reword -> 修改提交信息
# squash -> 合并到上一个提交
# drop -> 删除提交
```

### 2. Cherry-pick（挑选提交）
```bash
# 将其他分支的特定提交应用到当前分支
git cherry-pick abc1234
```

### 3. Bisect（二分查找bug）
```bash
# 开始二分查找
git bisect start
git bisect bad  # 当前版本有bug
git bisect good v1.0  # v1.0版本是好的

# Git会自动切换版本，你测试后标记
git bisect good  # 或 git bisect bad

# 找到问题提交后
git bisect reset
```

---

## 📚 学习资源

1. **官方文档**: https://git-scm.com/doc
2. **GitHub Docs**: https://docs.github.com
3. **交互式教程**: https://learngitbranching.js.org
4. **Pro Git Book**: https://git-scm.com/book

---

## 💡 记住这些就够了

日常80%的工作只需要这些命令：

```bash
git clone    # 克隆项目
git status   # 查看状态
git add      # 添加更改
git commit   # 提交更改
git push     # 推送远程
git pull     # 拉取更新
git checkout # 切换分支
git merge    # 合并分支
```

掌握这些，你就能顺利进行GitHub开发了！加油！🚀