# 🚀 墨匠工作规划 - Phase 3: 数据流转到七幕
**时间**: 2025-08-24  
**项目**: 法律教育平台 - 七幕教学法集成  
**架构师**: 墨匠

## ✅ Phase 2.6 完成汇报

### 🎯 用户需求达成
1. **✅ 上传按钮恢复**
   - 修复了 `disabled={processing || success}` 导致的按钮禁用问题
   - 现在成功上传后按钮显示"重新上传"，保持可用状态
   - 用户可以连续上传多个文件进行测试

2. **✅ 预览编辑一体化**
   - 移除了导出JSON功能，简化界面
   - 优化编辑/预览模式切换，按钮文案更直观
   - 添加了编辑模式提示卡片，提升用户体验

### 🛠️ 技术改进细节
```typescript
// 关键修复点
1. SimpleFileUploader.tsx:145 
   disabled={processing} // 移除success条件

2. ThreeElementsExtractor.tsx:126-139
   // 删除整个exportToJSON函数

3. 优化按钮文案：
   "选择文件" → "处理中..." → "重新上传"
   "编辑" → "编辑内容"
   "预览" → "保存预览"
```

## 🎯 Phase 3 战略规划

### 核心目标: 数据流转到七幕教学法

当前状态：
- ✅ **序幕（案例导入）**: 完成 - 文件上传+三要素提取
- 🔄 **第一幕（要素分析）**: 需要集成 - 数据传递逻辑
- ⏳ **后续六幕**: 等待数据流转完成

### 🏗️ 技术架构设计

#### 1. 全局状态管理 (30分钟)
```typescript
// 实现方案：React Context + useReducer
interface LegalCaseContext {
  currentCase: ExtractedElements | null;
  currentAct: number;
  actProgress: Record<number, boolean>;
  updateCase: (data: ExtractedElements) => void;
  proceedToNextAct: () => void;
}
```

#### 2. 数据标准化 (20分钟)
```typescript
// 统一数据结构，确保各幕之间兼容
interface StandardizedCase {
  basicInfo: BasicInfo;
  threeElements: ThreeElements;
  timeline: TimelineEvent[];
  evidence: Evidence[];
  metadata: ProcessingMetadata;
}
```

#### 3. 智能匹配引擎 (40分钟)
```typescript
// AI驱动的数据智能匹配和填充
class DataMatcher {
  matchToTimeline(facts: Facts): TimelineEvent[]
  matchToEvidence(evidence: Evidence): EvidenceItem[]
  matchToDispute(reasoning: Reasoning): DisputePoint[]
}
```

### 📋 Phase 3 实施计划

#### Step 1: 创建全局状态 (立即开始)
- [ ] 设计LegalCaseContext
- [ ] 实现Provider组件
- [ ] 在app层包装Context

#### Step 2: 修改页面架构 (并行进行)
- [ ] 重构page.tsx的状态管理
- [ ] 连接序幕到第一幕的数据传递
- [ ] 添加进度追踪逻辑

#### Step 3: 智能数据流转 (核心功能)
- [ ] 实现extractedData到各幕的智能映射
- [ ] 添加数据验证和错误处理
- [ ] 测试完整流程

### 🎨 用户体验设计

#### 流程优化
1. **无缝衔接**: 序幕完成后自动跳转到第一幕
2. **数据预填**: 各幕自动填入AI提取的相关数据
3. **进度可视**: 顶部进度条显示七幕完成状态
4. **智能提示**: 基于提取质量给出操作建议

#### 交互改进
```typescript
// 预期用户流程
序幕: 上传DOCX → AI提取 → "进入要素分析" 按钮
第一幕: 显示三要素 → 可编辑 → "进入事实梳理" 按钮
第二幕: 显示时间线 → 可调整 → "进入证据审查" 按钮
...
```

### 🔬 技术难点预判

#### 难点1: 数据格式转换
**问题**: AI提取的数据结构与七幕所需格式可能不匹配
**解决**: 创建数据适配器层，智能转换格式

#### 难点2: 状态持久化
**问题**: 用户编辑后的数据需要在各幕间保持
**解决**: 使用localStorage + Context双重保障

#### 难点3: 性能优化
**问题**: 大量数据在组件间传递可能影响性能
**解决**: 使用React.memo + useMemo优化渲染

### ⚡ 执行时间表

**总预计时间**: 90分钟
- **全局状态**: 30分钟
- **数据流转**: 40分钟  
- **测试优化**: 20分钟

**里程碑检查点**:
1. 30分钟后: Context创建完成，可传递基础数据
2. 60分钟后: 序幕→第一幕数据流转完成
3. 90分钟后: 完整七幕数据流转验证通过

---
**墨匠 - 让数据在七幕间智能流转** ✨  
*从判决书到教学案例，一站式技术实现*