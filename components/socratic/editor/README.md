# IRAC结构化编辑器模块

## 负责人：Claude实例A

### 开发重点
- IRAC四标签页切换
- 事实/法条Chips拖拽功能
- 引用验证闸门
- 90秒倒计时器

### 不要修改
- `/app/api/` 目录下的任何文件
- `/lib/socratic/evaluator.ts` 和 `challenger.ts`
- 其他模块的组件文件

### Mock数据
使用 `/mock/shared-data.json` 和 `/mock/editor-mock.json`

### 测试命令
```bash
npm run test:editor
```
