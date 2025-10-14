# 法律教学平台 - 数据存储报告

## 📊 数据存储架构

### 1. **数据库 (SQLite)** - `./data/app.db`

**存储内容：** 用户认证和系统日志

**数据表结构：**
- `users` - 用户信息（老师账号）
- `login_logs` - 登录日志
- `activity_stats` - 活动统计（预留）

**当前数据量：**
- 用户数：5个老师账号
- 登录记录：5条
- 活动统计：0条
- 数据库大小：40 KB

**访问方式：**
```bash
node check-db-data.js
```

---

### 2. **浏览器 localStorage** - 教学数据主存储

**存储内容：** 四幕教学的核心数据

**存储键：** `teaching-store`

**数据结构：**
```typescript
{
  currentAct: 'upload' | 'analysis' | 'socratic' | 'summary',

  // 第一幕：案例导入
  uploadData: {
    extractedElements: Record<string, unknown>,
    confidence: number
  },

  // 第二幕：深度分析
  analysisData: {
    result: {
      factAnalysis: {
        keyFacts: string[],
        disputedPoints: string[],
        timeline: Array<{date, event, importance}>
      },
      evidenceAnalysis: {
        strengths: string[],
        weaknesses: string[],
        recommendations: string[]
      },
      legalAnalysis: {
        applicableLaws: string[],
        precedents: string[],
        risks: string[]
      }
    }
  },

  // 第三幕：苏格拉底讨论
  socraticData: {
    isActive: boolean,
    level: 1 | 2 | 3,
    teachingModeEnabled: boolean,
    completedNodes: string[]
  },

  // 第四幕：总结提升 ⭐
  summaryData: {
    // 学习报告
    report: {
      summary: string,
      keyLearnings: string[],
      skillsAssessed: Array<{skill, level, evidence}>,
      recommendations: string[],
      nextSteps: string[],
      generatedAt: string
    },

    // 案件学习报告（MVP版）
    caseLearningReport: {
      caseOverview: {
        title: string,
        oneLineSummary: string,
        keyDispute: string,
        judgmentResult: string
      },
      learningPoints: {
        factualInsights: string[],  // 最多3条
        legalPrinciples: string[],  // 最多3条
        evidenceHandling: string[]  // 最多3条
      },
      socraticHighlights: {
        keyQuestions: string[],     // 最多3条
        studentInsights: string[],  // 最多3条
        criticalThinking: string[]  // 最多3条
      },
      practicalTakeaways: {
        similarCases: string,
        cautionPoints: string[],    // 最多3条
        checkList: string[]         // 最多3条
      },
      metadata: {
        studyDuration: number,      // 分钟
        completionDate: string,
        difficultyLevel: '简单' | '中等' | '困难'
      }
    }
  }
}
```

**访问方式：**
1. 打开浏览器（访问 http://localhost:3000）
2. 打开开发者工具（F12）
3. 切换到 Console 标签
4. 复制 `check-teaching-data.js` 的内容并执行

---

## 📈 第四幕数据统计

### 数据点类型

**LearningReport（学习报告）包含：**
- 1个总结摘要
- N个关键学习点（keyLearnings）
- N个技能评估（skillsAssessed）
- N个推荐建议（recommendations）
- N个下一步行动（nextSteps）

**CaseLearningReport（案件学习报告）包含：**
- 案例概览（4个字段）
- 学习要点（3类，每类最多3条）
- 苏格拉底精华（3类，每类最多3条）
- 实践要点（3类）
- 元数据（3个字段）

**理论最大数据点：**
- 如果每个数组字段都填满3条
- 案件学习报告约：30+ 数据点
- 学习报告：视生成内容而定（通常10-20个数据点）

---

## 🎯 实际数据量查看方法

### 方法1：浏览器控制台（推荐）

```javascript
// 1. 访问 http://localhost:3000
// 2. 完成一次完整的四幕教学流程
// 3. F12 打开控制台，执行：

const data = JSON.parse(localStorage.getItem('teaching-store')).state;
console.log('第四幕数据:', data.summaryData);
```

### 方法2：使用检查脚本

```bash
# 在浏览器控制台执行 check-teaching-data.js 的内容
# 会输出详细的数据统计报告
```

### 方法3：查看网络请求

```bash
# 开发者工具 -> Network 标签
# 查找 /api/teaching-acts/summary 相关请求
# 可以看到实际生成和返回的数据
```

---

## 📊 数据持久化策略

### localStorage 配置

**持久化中间件：** Zustand Persist

**持久化内容：**
- ✅ currentAct（当前幕）
- ✅ progress（进度信息）
- ✅ uploadData（第一幕数据）
- ✅ analysisData.result（第二幕结果）
- ✅ socraticData（第三幕数据）
- ❌ summaryData（**第四幕数据不持久化**）

**不持久化的原因：**
- 总结报告每次可能不同
- 避免缓存导致的数据陈旧问题
- 减少 localStorage 占用

**影响：**
- 刷新页面后，需要重新生成第四幕报告
- 历史会话数据在 localStorage 中保留（除第四幕）

---

## 🔍 数据流向图

```
用户上传判决书
    ↓
第一幕：提取案例元素 → uploadData (localStorage)
    ↓
第二幕：AI深度分析 → analysisData (localStorage)
    ↓
第三幕：苏格拉底讨论 → socraticData (localStorage)
    ↓
第四幕：生成总结报告 → summaryData (内存，不持久化)
    ↓
用户查看/导出报告
```

---

## 💾 数据导出功能

### 当前支持

- ✅ 可在第四幕界面查看完整报告
- ✅ 可通过浏览器控制台导出 JSON 数据
- ❌ 暂不支持 PDF/Word 导出（待开发）

### 导出示例

```javascript
// 浏览器控制台
const teachingData = JSON.parse(localStorage.getItem('teaching-store')).state;
const reportData = teachingData.summaryData;

// 导出为 JSON 文件
const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'learning-report.json';
a.click();
```

---

## 🎯 获取真实数据统计

### 步骤

1. **启动开发服务器**
   ```bash
   npm run dev
   ```

2. **登录系统**
   - 访问 http://localhost:3000
   - 使用测试账号：teacher01 / password123

3. **完成四幕流程**
   - 上传判决书 PDF
   - 等待深度分析完成
   - 进行苏格拉底讨论
   - 进入总结提升页面

4. **查看数据**
   - F12 打开控制台
   - 运行 `check-teaching-data.js` 脚本内容
   - 查看完整统计报告

---

## 📌 注意事项

1. **数据隔离**
   - 每个浏览器独立存储
   - 不同用户账号共享同一个 localStorage（同一浏览器）

2. **数据大小限制**
   - localStorage 通常限制 5-10MB
   - 当前设计的数据量远小于限制

3. **清除数据**
   ```javascript
   // 清除教学数据
   localStorage.removeItem('teaching-store');

   // 或使用应用内的重置功能
   // （待开发）
   ```

4. **备份建议**
   - 定期导出重要数据
   - 重要会话建议截图保存

---

## 🚀 后续优化建议

1. **数据库扩展**
   - 添加 `teaching_sessions` 表
   - 持久化完整的四幕数据到数据库
   - 支持多会话管理

2. **导出功能**
   - 支持 PDF 导出（带格式）
   - 支持 Word 导出
   - 支持批量导出

3. **数据分析**
   - 教学效果统计
   - 学生学习轨迹分析
   - 知识点掌握度热图

4. **云端同步**
   - 支持跨设备访问
   - 数据备份到云端
   - 协作学习功能

---

## 📞 技术支持

如需查看实际数据量，请：
1. 完成一次完整的四幕教学流程
2. 使用提供的检查脚本查看详细统计
3. 如有问题，提供控制台截图

---

**最后更新：** 2025-10-14
**文档版本：** 1.0.0
