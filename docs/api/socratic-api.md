# 苏格拉底式问答 API 文档

## 概述

苏格拉底式问答API提供了一个基于AI的智能法律教学对话系统，通过引导式提问帮助学生深入理解法律原理。

### 基础信息

- **基础URL**: `/api/socratic`
- **协议**: HTTPS
- **认证**: 可选（支持API Key）
- **内容类型**: `application/json`
- **响应格式**: JSON 或 Server-Sent Events (SSE)

## API 端点

### 1. 创建对话 POST /api/socratic

发起一个新的苏格拉底式对话或继续现有对话。

#### 请求

```http
POST /api/socratic
Content-Type: application/json
```

#### 请求体

```json
{
  "messages": [
    {
      "role": "user",
      "content": "合同无效的法律后果是什么？"
    }
  ],
  "caseInfo": {
    "title": "买卖合同纠纷",
    "description": "甲方与乙方签订房屋买卖合同...",
    "type": "contract",
    "difficulty": "intermediate"
  },
  "currentLevel": 1,
  "mode": "auto",
  "sessionId": "session-123456",
  "difficulty": "normal",
  "streaming": false
}
```

#### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messages | Array | 是 | 对话历史消息数组 |
| messages[].role | String | 是 | 消息角色：`user`、`assistant`、`system` |
| messages[].content | String | 是 | 消息内容（最大5000字符） |
| caseInfo | Object | 否 | 案例信息上下文 |
| caseInfo.title | String | 否 | 案例标题 |
| caseInfo.description | String | 否 | 案例描述 |
| caseInfo.type | String | 否 | 案例类型：`contract`、`tort`、`criminal`、`civil` |
| caseInfo.difficulty | String | 否 | 难度等级：`beginner`、`intermediate`、`advanced` |
| currentLevel | Integer | 否 | 当前对话层级（1-5），默认为1 |
| mode | String | 否 | 对话模式：`auto`（自动）、`guided`（引导）、`exam`（考试） |
| sessionId | String | 否 | 会话ID，用于保持对话连续性 |
| difficulty | String | 否 | 问题难度：`easy`、`normal`、`hard` |
| streaming | Boolean | 否 | 是否使用流式响应，默认false |

#### 对话层级说明

1. **观察层（Level 1）**: 识别基本信息，描述表面现象
2. **事实层（Level 2）**: 梳理时间线，理清事实细节
3. **分析层（Level 3）**: 法律关系分析，因果关系探讨
4. **应用层（Level 4）**: 法条适用，法律推理
5. **价值层（Level 5）**: 公平正义探讨，社会影响分析

#### 响应

##### 成功响应 (200 OK)

**非流式响应：**
```json
{
  "success": true,
  "data": {
    "content": "让我们深入思考一下：当合同被认定为无效时，双方当事人的权利义务关系会发生什么变化？你认为已经履行的部分应该如何处理？",
    "level": 3,
    "metadata": {
      "questionType": "analytical",
      "suggestedFollowUp": [
        "返还原则的适用",
        "不当得利的认定",
        "损害赔偿的范围"
      ],
      "keyPoints": ["恢复原状", "返还财产", "赔偿损失"],
      "relatedLaws": ["《民法典》第157条"]
    },
    "sessionInfo": {
      "sessionId": "session-123456",
      "messageCount": 5,
      "currentLevel": 3,
      "progress": 0.6
    }
  },
  "timestamp": 1704067200000,
  "duration": 1234
}
```

**流式响应（SSE）：**
```
data: {"type":"chunk","content":"让我们","index":0,"total":20}

data: {"type":"chunk","content":"深入思考","index":1,"total":20}

data: {"type":"done","fullContent":"让我们深入思考...","metadata":{...}}

data: [DONE]
```

##### 错误响应

**400 Bad Request - 输入验证失败**
```json
{
  "success": false,
  "error": {
    "message": "输入验证失败",
    "type": "invalid_input",
    "details": {
      "field": "messages[0].content",
      "reason": "输入可能包含注入攻击"
    }
  }
}
```

**429 Too Many Requests - 速率限制**
```json
{
  "success": false,
  "error": {
    "message": "请求过于频繁，请稍后重试",
    "type": "rate_limit_exceeded",
    "retryAfter": 60
  }
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": {
    "message": "服务器内部错误",
    "type": "internal_error",
    "requestId": "req-1704067200000-abc123"
  }
}
```

**503 Service Unavailable**
```json
{
  "success": false,
  "error": {
    "message": "服务暂时不可用，请稍后重试",
    "type": "service_unavailable"
  }
}
```

### 2. 课堂管理 API

#### 创建课堂 POST /api/classroom

创建一个新的教学课堂会话。

```http
POST /api/classroom
Content-Type: application/json
```

**请求体：**
```json
{
  "teacherId": "teacher-001",
  "config": {
    "maxStudents": 50,
    "duration": 3600,
    "mode": "interactive",
    "allowVoting": true
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "classroomCode": "ABC123",
    "sessionId": "classroom-session-456",
    "expiresAt": 1704070800000,
    "joinUrl": "https://example.com/join/ABC123"
  }
}
```

#### 加入课堂 POST /api/classroom/join

学生加入现有课堂。

```http
POST /api/classroom/join
Content-Type: application/json
```

**请求体：**
```json
{
  "classroomCode": "ABC123",
  "studentInfo": {
    "name": "张三",
    "studentId": "2024001"
  }
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "sessionId": "student-session-789",
    "classroomInfo": {
      "teacherName": "李老师",
      "currentTopic": "合同法基础",
      "studentCount": 25
    }
  }
}
```

## 安全机制

### 输入验证

所有输入都经过严格的安全验证：

1. **Prompt注入防护**: 检测并阻止恶意提示词注入
2. **XSS防护**: 自动清理HTML标签和危险脚本
3. **SQL注入防护**: 参数化查询和输入过滤
4. **长度限制**: 
   - 单条消息最大5000字符
   - 请求体最大50KB
   - 会话历史最多保留50条消息

### 速率限制

- **每用户限制**: 60次/分钟
- **每IP限制**: 100次/分钟
- **每会话限制**: 200次/小时

### 认证（可选）

支持API Key认证：

```http
Authorization: Bearer YOUR_API_KEY
```

## 使用示例

### JavaScript/TypeScript

```typescript
// 基础对话示例
async function startSocraticDialogue() {
  const response = await fetch('/api/socratic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: '什么是合同的效力？'
        }
      ],
      currentLevel: 1,
      mode: 'auto'
    })
  });

  const data = await response.json();
  console.log('AI回复:', data.data.content);
}

// 流式响应示例
async function streamingSocraticDialogue() {
  const response = await fetch('/api/socratic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [...],
      streaming: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'chunk') {
          console.log('收到片段:', data.content);
        }
      }
    }
  }
}
```

### Python

```python
import requests
import json

# 基础对话示例
def socratic_dialogue():
    url = "https://api.example.com/api/socratic"
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "什么是不当得利？"
            }
        ],
        "currentLevel": 2,
        "mode": "guided"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"AI回复: {data['data']['content']}")
    else:
        print(f"错误: {response.json()['error']['message']}")

# 流式响应示例
def streaming_dialogue():
    import sseclient
    
    url = "https://api.example.com/api/socratic"
    payload = {
        "messages": [...],
        "streaming": True
    }
    
    response = requests.post(url, json=payload, stream=True)
    client = sseclient.SSEClient(response)
    
    for event in client.events():
        if event.data != '[DONE]':
            data = json.loads(event.data)
            if data['type'] == 'chunk':
                print(data['content'], end='', flush=True)
```

### cURL

```bash
# 基础请求
curl -X POST https://api.example.com/api/socratic \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "解释一下举证责任倒置"
      }
    ],
    "currentLevel": 3
  }'

# 带认证的请求
curl -X POST https://api.example.com/api/socratic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "messages": [...],
    "sessionId": "session-123"
  }'
```

## 错误处理最佳实践

1. **实现重试机制**: 对于503和429错误，实现指数退避重试
2. **会话管理**: 保存sessionId以维持对话连续性
3. **输入预验证**: 在客户端预先验证输入，减少无效请求
4. **错误日志**: 记录错误详情和requestId便于问题追踪
5. **降级处理**: AI服务不可用时，使用预设问题库

## WebSocket 实时通信

对于课堂互动场景，支持WebSocket连接：

```javascript
const ws = new WebSocket('wss://api.example.com/ws/classroom');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'join',
    classroomCode: 'ABC123',
    role: 'student'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'question':
      console.log('新问题:', data.content);
      break;
    case 'vote':
      console.log('投票:', data.voteData);
      break;
    case 'student_joined':
      console.log('学生加入:', data.studentName);
      break;
  }
};
```

## 性能指标

- **平均响应时间**: < 2秒（非流式）
- **流式首字节时间**: < 500ms
- **并发支持**: 1000个会话
- **可用性**: 99.9% SLA

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2025-01-01 | 初始版本发布 |
| v1.1.0 | 2025-01-15 | 添加流式响应支持 |
| v1.2.0 | 2025-02-01 | 增加课堂管理功能 |
| v1.3.0 | 2025-03-01 | 强化安全验证机制 |

## 支持与反馈

- **技术支持**: support@legaltech.edu
- **API状态**: https://status.legaltech.edu
- **开发者论坛**: https://forum.legaltech.edu
- **GitHub**: https://github.com/legaltech/socratic-api

## 许可证

本API遵循 MIT 许可证。详见 [LICENSE](../../LICENSE) 文件。