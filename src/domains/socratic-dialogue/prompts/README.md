# 苏格拉底教学提示词系统

## 🎯 设计理念

### 问题解决
1. **提示词分离管理**: 将角色提示词从代码中分离，方便修改和维护
2. **角色身份统一**: 苏格拉底导师身份不因教学等级改变，保持一致性
3. **策略差异化**: 教学等级和模式体现在策略上，而非角色身份上
4. **配置化管理**: 所有提示词相关配置集中管理，易于扩展

### 核心原则
- **角色一致性**: 苏格拉底导师的身份和教学理念保持一致
- **策略差异化**: 通过教学策略体现不同等级和模式的差异
- **易于维护**: 提示词独立于业务逻辑，修改无需重新部署
- **模块化设计**: 不同部分的提示词职责清晰，便于复用

## 📁 文件结构

```
src/domains/socratic-dialogue/prompts/
├── socratic-role.ts          # 核心角色提示词配置
├── index.ts                  # 统一导出和工具函数
└── README.md                 # 使用文档（本文件）
```

## 🔧 核心配置

### `SOCRATIC_ROLE_CONFIG`
包含苏格拉底导师的完整角色定义：

```typescript
export const SOCRATIC_ROLE_CONFIG = {
  baseRole: "苏格拉底导师的基础身份设定",
  teachingPrinciples: ["核心教学原则数组"],
  methodology: "五层递进教学法详述",
  requirements: ["基础要求数组"],
  availableTools: ["可用教学工具数组"]
}
```

### `TEACHING_MODE_STRATEGIES`
四种教学模式的策略配置：

- **EXPLORATION**: 探索模式 - 开放性问题，激发好奇心
- **ANALYSIS**: 分析模式 - 具体性问题，培养分析能力
- **SYNTHESIS**: 综合模式 - 整合性问题，建立系统思维
- **EVALUATION**: 评估模式 - 评价性问题，培养批判思维

### `DIFFICULTY_STRATEGIES`
三个难度等级的教学策略：

- **EASY**: 基础水平 - 简单直接，重点基础概念
- **MEDIUM**: 中等水平 - 适度复杂，涉及多概念关联
- **HARD**: 高级水平 - 高度复杂，深层法理思考

## 🚀 使用方法

### 1. 基础使用
```typescript
import { buildSocraticRolePrompt } from './prompts/socratic-role';

// 生成基础提示词
const prompt = buildSocraticRolePrompt('EXPLORATION', 'MEDIUM', 1000);
```

### 2. 在服务中使用
```typescript
// 在 EnhancedSocraticServiceV2.ts 中
private buildRolePrompt(level: DialogueLevel, mode: SocraticMode): string {
  const { buildSocraticRolePrompt } = require('../prompts/socratic-role');

  return buildSocraticRolePrompt(
    modeMap[mode],
    difficultyMap[level],
    this.config.maxQuestionLength
  );
}
```

### 3. 快速创建标准提示词
```typescript
import { createStandardSocraticPrompt } from './prompts';

// 使用默认配置
const prompt = createStandardSocraticPrompt();

// 自定义配置
const customPrompt = createStandardSocraticPrompt({
  mode: 'ANALYSIS',
  difficulty: 'HARD',
  maxLength: 1500
});
```

## 📝 提示词结构

### 完整提示词组成
1. **基础角色设定** - 苏格拉底导师身份和理念
2. **核心教学原则** - 7条基本原则
3. **教学方法论** - 五层递进教学法
4. **当前教学策略** - 根据模式和难度动态生成
5. **基础要求** - 问题格式和语言要求
6. **可用工具** - 教学资源和工具列表

### 动态策略说明
```
当前教学策略：分析模式 - 中等水平

引导学生深入分析具体法律条文和案例细节，培养细致的分析能力

问题特点：具体性、针对性问题为主
语言风格：用词适中，适当使用法律术语
重点关注：法律关系分析、简单推理应用、多角度思考
```

## 🔄 与业务代码的集成

### 原有问题
```typescript
// ❌ 之前：提示词硬编码在服务中
private buildRolePrompt(level, mode): string {
  const baseRole = "硬编码的角色设定...";
  const levelGuidance = { ... }; // 分散的配置
  return `${baseRole}\n${levelGuidance[level]}...`;
}
```

### 现在的方案
```typescript
// ✅ 现在：统一的提示词配置
private buildRolePrompt(level, mode): string {
  const { buildSocraticRolePrompt } = require('../prompts/socratic-role');
  return buildSocraticRolePrompt(modeMap[mode], difficultyMap[level], maxLength);
}
```

## 🎨 自定义和扩展

### 修改角色设定
直接编辑 `socratic-role.ts` 中的 `SOCRATIC_ROLE_CONFIG`:

```typescript
export const SOCRATIC_ROLE_CONFIG = {
  baseRole: `你是一位具有深厚法学功底的苏格拉底式导师...

  // 在这里修改角色设定
  你深受苏力教授"法律的生命不在逻辑，而在经验"理念的影响...`,

  teachingPrinciples: [
    "永远不直接给出答案，而是通过精心设计的问题引导学生思考",
    // 在这里添加或修改教学原则
  ]
}
```

### 添加新的教学模式
```typescript
export const TEACHING_MODE_STRATEGIES = {
  // 现有模式...

  // 添加新模式
  CREATIVITY: {
    name: "创新模式",
    description: "鼓励学生创造性思维，提出创新性法律解决方案",
    questionStyle: "创新性、假设性问题为主",
    example: "如果让你重新设计这个法律制度，你会怎么做？"
  }
};
```

### 添加新的难度等级
```typescript
export const DIFFICULTY_STRATEGIES = {
  // 现有等级...

  // 添加新等级
  EXPERT: {
    name: "专家水平",
    questionComplexity: "极度复杂，涉及跨学科的综合性思考",
    languageStyle: "使用高级法律术语，期待专业水准的回答",
    focusAreas: ["前沿法理研究", "跨学科综合分析", "法律创新思维"]
  }
};
```

## 🔍 调试和测试

### 查看生成的提示词
```typescript
import { buildSocraticRolePrompt } from './prompts/socratic-role';

// 生成并打印提示词
const prompt = buildSocraticRolePrompt('ANALYSIS', 'HARD', 1000);
console.log('生成的提示词：\n', prompt);
```

### 测试不同配置
```typescript
// 测试所有模式和难度组合
const modes = ['EXPLORATION', 'ANALYSIS', 'SYNTHESIS', 'EVALUATION'];
const difficulties = ['EASY', 'MEDIUM', 'HARD'];

modes.forEach(mode => {
  difficulties.forEach(difficulty => {
    const prompt = buildSocraticRolePrompt(mode, difficulty, 1000);
    console.log(`${mode} + ${difficulty}:`, prompt.length, '字符');
  });
});
```

## ✅ 优化效果

### Before vs After

**之前的问题**:
- ❌ 提示词硬编码，修改需要改代码
- ❌ 系统提示词和角色提示词重复
- ❌ 教学等级改变角色身份，逻辑混乱
- ❌ 配置分散，难以维护

**现在的优势**:
- ✅ 提示词配置化，修改无需改代码
- ✅ 角色身份统一，策略差异化
- ✅ 逻辑清晰，职责分明
- ✅ 集中管理，易于扩展

**实际效果**:
- 📝 修改提示词：从改代码+重新部署 → 改配置文件
- 🎯 角色一致性：苏格拉底导师身份始终一致
- 🔧 策略灵活性：12种组合（4模式 × 3难度）灵活配置
- 🚀 开发效率：新增模式/难度只需添加配置

这样的设计让苏格拉底教学系统更加灵活、易维护，同时保持了教学的专业性和一致性！