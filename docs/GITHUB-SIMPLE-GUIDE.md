# 🚀 GitHub开发流程简化版（椰汁专用）

## 一、每天开始工作前（5秒钟）
```bash
git pull origin main  # 同步最新代码
```

## 二、开发新功能（标准流程）

### 1️⃣ 创建分支（隔离你的工作）
```bash
git checkout -b feature/你的功能名
# 例子：git checkout -b feature/add-login
```

### 2️⃣ 开发代码
- 编写你的代码
- 测试确保正常

### 3️⃣ 保存工作（三步走）
```bash
git add .                        # 第1步：添加所有更改
git commit -m "feat: 功能描述"   # 第2步：本地保存
git push origin feature/分支名    # 第3步：推送到GitHub
```

### 4️⃣ 合并到主线
- 去GitHub网站创建Pull Request
- 等待审核（如果有团队）
- 合并完成

### 5️⃣ 切回主分支
```bash
git checkout main
git pull origin main
git branch -d feature/分支名  # 删除本地分支
```

## 三、常用命令速查表

| 场景 | 命令 | 说明 |
|------|------|------|
| 查看状态 | `git status` | 看看有什么改动 |
| 查看历史 | `git log --oneline` | 查看提交记录 |
| 撤销修改 | `git checkout -- 文件名` | 恢复单个文件 |
| 暂存工作 | `git stash` | 临时保存未完成的工作 |
| 恢复暂存 | `git stash pop` | 恢复临时保存的工作 |

## 四、提交信息模板

```
feat: 新功能
fix: 修复bug
docs: 文档
test: 测试
chore: 日常维护
```

## 五、遇到问题怎么办？

### 冲突了？
```bash
# 1. 查看冲突文件
git status

# 2. 手动编辑解决冲突

# 3. 标记解决
git add .
git commit -m "resolve: 解决冲突"
```

### 提交错了？
```bash
# 撤销最后一次提交（保留修改）
git reset --soft HEAD~1

# 修改后重新提交
git commit -m "新的提交信息"
```

### 分支搞乱了？
```bash
# 直接切回main重新开始
git checkout main
git pull origin main
```

## 六、黄金法则 ⭐

1. **勤拉取**：每天开始前 `git pull`
2. **勤提交**：完成一个小功能就提交
3. **写清楚**：提交信息要让别人看懂
4. **用分支**：永远不要直接在main上改
5. **要备份**：重要代码及时push

## 七、一句话记住流程

> 拉取 → 分支 → 开发 → 提交 → 推送 → 合并 → 清理

记住这7个步骤，你就掌握了GitHub！

---
💡 提示：把这个文档放在手边，随时查看！