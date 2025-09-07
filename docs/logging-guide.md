# 📝 日志使用指南

## 1. 在 React 组件中使用

```typescript
import { uiLogger } from '@/lib/utils/logger';

export function MyComponent() {
  const handleClick = () => {
    uiLogger.info('按钮被点击');
    uiLogger.debug('当前状态', { userId: 123, action: 'click' });
  };

  useEffect(() => {
    uiLogger.time('组件加载');
    // ... 加载数据
    uiLogger.timeEnd('组件加载');
  }, []);

  return <button onClick={handleClick}>点击我</button>;
}
```

## 2. 在 API 路由中使用

```typescript
import { apiLogger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  apiLogger.group('处理 POST 请求');
  apiLogger.info('请求URL:', request.url);
  
  try {
    const body = await request.json();
    apiLogger.debug('请求数据:', body);
    
    // 处理逻辑
    const result = await processData(body);
    apiLogger.info('处理成功', result);
    
    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error('处理失败', error);
    return NextResponse.json({ error: '处理失败' }, { status: 500 });
  } finally {
    apiLogger.groupEnd();
  }
}
```

## 3. 在 Zustand Store 中使用

```typescript
import { storeLogger } from '@/lib/utils/logger';

export const useStore = create((set) => ({
  data: [],
  
  fetchData: async () => {
    storeLogger.info('开始获取数据');
    storeLogger.time('数据获取');
    
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      
      storeLogger.debug('获取到的数据', data);
      storeLogger.timeEnd('数据获取');
      
      set({ data });
    } catch (error) {
      storeLogger.error('获取数据失败', error);
    }
  }
}));
```

## 4. 在 AI 服务中使用

```typescript
import { aiLogger } from '@/lib/utils/logger';

export class AIService {
  async analyze(text: string) {
    aiLogger.group('AI 分析');
    aiLogger.info('开始分析文本', { length: text.length });
    
    try {
      aiLogger.time('AI 调用');
      const result = await callAIAPI(text);
      aiLogger.timeEnd('AI 调用');
      
      aiLogger.debug('AI 返回结果', result);
      return result;
    } catch (error) {
      aiLogger.error('AI 分析失败', error);
      throw error;
    } finally {
      aiLogger.groupEnd();
    }
  }
}
```

## 5. 查看日志的方法

### 浏览器控制台
1. 打开浏览器（Chrome/Firefox/Edge）
2. 按 `F12` 或右键选择"检查"
3. 切换到 "Console" 标签
4. 你会看到格式化的日志输出

### VS Code 终端
服务器端的日志会显示在运行 `npm run dev` 的终端中

### 日志级别过滤
在浏览器控制台中，你可以过滤日志级别：
- 点击控制台的过滤器图标
- 选择要显示的级别（Verbose, Info, Warnings, Errors）

## 6. 实用技巧

### 条件日志
```typescript
// 只在开发环境打印
if (process.env.NODE_ENV === 'development') {
  console.log('开发模式日志');
}
```

### 性能监控
```typescript
// 监控 API 调用时间
console.time('API调用');
const result = await fetch('/api/data');
console.timeEnd('API调用'); // 输出: API调用: 123.45ms
```

### 数据表格
```typescript
// 以表格形式显示数据
const users = [
  { id: 1, name: '张三', age: 25 },
  { id: 2, name: '李四', age: 30 }
];
console.table(users);
```

### 分组日志
```typescript
console.group('用户操作流程');
console.log('1. 用户登录');
console.log('2. 选择案例');
console.log('3. 开始分析');
console.groupEnd();
```

### 样式化日志
```typescript
console.log(
  '%c重要信息！',
  'color: red; font-size: 20px; font-weight: bold;'
);
```

## 7. 生产环境注意事项

在生产环境中，记得：
1. 移除或禁用敏感信息的日志
2. 使用日志级别控制（只保留 error 和 warn）
3. 考虑使用日志服务（如 Sentry、LogRocket）
4. 不要记录用户密码或敏感数据

## 8. 快速调试命令

```bash
# 查看所有日志
localStorage.setItem('DEBUG', '*');

# 只看 API 日志
localStorage.setItem('DEBUG', 'api:*');

# 清空控制台
console.clear();

# 保存日志到文件（Chrome DevTools）
# 右键控制台 -> Save as...
```

## 9. 常见问题

### Q: 日志没有显示？
A: 检查浏览器控制台的日志级别过滤器

### Q: 如何在手机上看日志？
A: 使用 Chrome Remote Debugging 或 Safari Web Inspector

### Q: 日志太多了怎么办？
A: 使用过滤器或调整日志级别

### Q: 如何持久化日志？
A: 可以将日志发送到后端 API 存储