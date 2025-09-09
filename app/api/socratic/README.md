# SSE实时交互流模块

## 负责人：Claude实例B

### 开发重点
- SSE事件流实现
- 状态机编排
- 评分和挑战服务集成
- 错误处理

### 不要修改
- `/components/` 目录下的任何文件
- 前端路由和页面文件

### Mock数据
使用 `/mock/shared-data.json` 和 `/mock/api-mock.json`

### 测试命令
```bash
# 测试SSE
curl -N http://localhost:3000/api/socratic/session
```
