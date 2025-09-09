# 要件覆盖热力图模块

## 负责人：Claude实例C

### 开发重点
- Grid布局和颜色映射
- 覆盖度计算
- 点击交互和Tooltip
- 动画效果

### 不要修改
- `/app/api/` 目录下的任何文件
- `/lib/socratic/` 核心逻辑文件
- 其他模块的组件文件

### Mock数据
使用 `/mock/shared-data.json` 和 `/mock/heatmap-mock.json`

### 测试命令
```bash
npm run test:heatmap
```
