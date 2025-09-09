#!/bin/bash

# CCPM (Claude Concurrent Project Management) 初始化脚本
# 用于设置并行开发环境

echo "🚀 CCPM 环境初始化开始..."

# 创建模块目录结构
echo "📁 创建模块目录..."
mkdir -p components/socratic/{editor,visualization,session}
mkdir -p app/api/socratic/session
mkdir -p mock
mkdir -p lib/socratic/contracts

# 创建共享契约文件
echo "📝 创建接口契约..."
cat > lib/socratic/contracts/index.ts << 'EOF'
// CCPM 模块间接口契约
// 所有Claude实例都应遵守这些契约

import { Turn, RubricScore, Challenge, ElementCoverage, Fact, Law } from '../types';

// ==================== 模块A: IRAC编辑器 ====================
export interface EditorModuleContract {
  // 输入
  input: {
    facts: Fact[];
    laws: Law[];
    issueId: string;
    sessionId?: string;
  };
  
  // 输出
  output: {
    onTurnSubmit: (turn: Turn) => void;
    onStanceChange: (stance: 'pro' | 'con') => void;
    onTimeout?: () => void;
  };
  
  // 内部状态
  state: {
    currentTurn: Partial<Turn>;
    timeRemaining: number;
    validationErrors: string[];
  };
}

// ==================== 模块B: SSE交互流 ====================
export interface APIModuleContract {
  // 输入
  input: {
    endpoint: '/api/socratic/session';
    method: 'POST';
    body: {
      caseId: string;
      issueId: string;
      sessionId: string;
      turn: Turn;
    };
  };
  
  // 输出 (SSE Events)
  output: {
    events: Array<
      | { type: 'coach'; tips: string[] }
      | { type: 'score'; rubric: RubricScore }
      | { type: 'challenge'; challenge: Challenge }
      | { type: 'element_check'; covered: string[]; missing: string[] }
      | { type: 'end'; reason?: string }
    >;
  };
  
  // 错误处理
  errors: {
    INVALID_TURN: 'Turn validation failed';
    SESSION_EXPIRED: 'Session has expired';
    RATE_LIMIT: 'Too many requests';
  };
}

// ==================== 模块C: 要件热力图 ====================
export interface HeatmapModuleContract {
  // 输入
  input: {
    elements: string[];
    coverage: ElementCoverage[];
    currentFocus?: string;
  };
  
  // 输出
  output: {
    onElementClick: (elementId: string) => void;
    onRequestGuidance: (elementId: string) => string;
  };
  
  // 视觉状态
  visual: {
    colors: {
      covered: '#10b981';    // green-500
      partial: '#f59e0b';    // amber-500
      missing: '#ef4444';    // red-500
      focused: '#3b82f6';    // blue-500
    };
  };
}

// ==================== 集成契约 ====================
export interface IntegrationContract {
  // 数据流: Editor -> API
  editorToAPI: {
    trigger: 'onTurnSubmit';
    payload: Turn;
    response: 'SSE stream';
  };
  
  // 数据流: API -> Heatmap
  apiToHeatmap: {
    trigger: 'element_check event';
    payload: { covered: string[]; missing: string[] };
    response: 'visual update';
  };
  
  // 数据流: Heatmap -> Editor
  heatmapToEditor: {
    trigger: 'onElementClick';
    payload: { elementId: string; guidingQuestion: string };
    response: 'focus on element in editor';
  };
}

// ==================== Mock数据接口 ====================
export interface MockDataContract {
  facts: Fact[];
  laws: Law[];
  elements: string[];
  sampleTurns: Turn[];
  sampleScores: RubricScore[];
  sampleChallenges: Challenge[];
}
EOF

# 创建Mock数据文件
echo "🎭 创建Mock数据..."
cat > mock/shared-data.json << 'EOF'
{
  "facts": [
    {
      "id": "F1",
      "content": "2023年6月15日，原告张某与被告李某签订《房屋买卖合同》，约定房屋总价300万元",
      "category": "key",
      "relatedParties": ["张某", "李某"]
    },
    {
      "id": "F2",
      "content": "合同约定被告应于2023年7月15日前支付首付款90万元",
      "category": "key",
      "relatedParties": ["李某"]
    },
    {
      "id": "F3",
      "content": "被告李某直至2023年8月30日仍未支付任何款项",
      "category": "disputed",
      "relatedParties": ["李某"]
    },
    {
      "id": "F4",
      "content": "原告多次催告无果，于2023年9月1日向被告发出解除合同通知",
      "category": "evidence",
      "relatedParties": ["张某", "李某"]
    }
  ],
  "laws": [
    {
      "id": "L1",
      "title": "民法典第563条",
      "content": "有下列情形之一的，当事人可以解除合同：（一）因不可抗力致使不能实现合同目的；（二）在履行期限届满前，当事人一方明确表示或者以自己的行为表明不履行主要债务...",
      "type": "statute",
      "elements": ["履行期限届满", "不履行主要债务", "催告", "合理期限"]
    },
    {
      "id": "L2",
      "title": "民法典第577条",
      "content": "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
      "type": "statute",
      "elements": ["不履行义务", "违约责任", "赔偿损失"]
    },
    {
      "id": "L3",
      "title": "最高法买卖合同司法解释第24条",
      "content": "买卖合同对付款期限作出的变更，不影响当事人关于逾期付款违约金的约定...",
      "type": "regulation",
      "elements": ["付款期限", "违约金"]
    }
  ],
  "elements": [
    "合同成立生效",
    "付款义务",
    "履行期限届满",
    "违约行为",
    "催告程序",
    "合理期限",
    "解除权行使",
    "损害赔偿"
  ],
  "issues": [
    {
      "id": "issue1",
      "title": "被告未按期支付购房款是否构成根本违约",
      "description": "被告李某未按合同约定支付首付款，是否构成根本违约，原告是否有权解除合同",
      "elements": ["付款义务", "履行期限届满", "违约行为", "解除权行使"],
      "relatedLaws": ["L1", "L2"],
      "difficulty": "medium"
    }
  ],
  "sampleTurns": [
    {
      "issueId": "issue1",
      "stance": "pro",
      "issue": "被告未按期支付首付款是否构成根本违约",
      "rule": "根据民法典第563条，在履行期限届满前，当事人一方明确表示或者以自己的行为表明不履行主要债务的，另一方可以解除合同",
      "application": "本案中，被告应于7月15日支付首付款90万元，这是合同的主要债务。被告直至8月30日仍未支付，已经超过履行期限45天，其行为表明不履行主要债务。原告经多次催告无果，有权解除合同。",
      "conclusion": "因此，被告的行为构成根本违约，原告有权解除合同",
      "citedFacts": ["F2", "F3", "F4"],
      "citedLaws": ["L1"],
      "timestamp": "2024-01-09T10:00:00Z",
      "duration": 85
    }
  ],
  "sampleScores": [
    {
      "total": 78,
      "dims": {
        "relevance": { "score": 90, "weight": 0.2, "feedback": "论述紧扣争议焦点" },
        "rule": { "score": 85, "weight": 0.2, "feedback": "法条引用准确" },
        "application": { "score": 70, "weight": 0.3, "feedback": "要件分析较为完整，但'合理期限'未充分论证" },
        "citation": { "score": 80, "weight": 0.2, "feedback": "事实引用充分" },
        "conclusion": { "score": 75, "weight": 0.1, "feedback": "结论明确" }
      },
      "gaps": ["合理期限的认定"],
      "actionable": [
        "补充论证催告后的合理期限问题",
        "明确指出90万首付款占总价款的比例(30%)以说明其重要性",
        "可以引用相关判例加强论证"
      ],
      "mustFix": null,
      "overallLevel": "good"
    }
  ],
  "sampleChallenges": [
    {
      "kind": "counter",
      "prompt": "你提到被告逾期45天构成根本违约，但是否考虑过被告可能存在的抗辩理由？比如不可抗力或者原告自身是否完全履行了合同义务？",
      "targetElement": "违约行为",
      "suggestedResponse": "考虑可能的抗辩事由并逐一排除"
    },
    {
      "kind": "hypothetical",
      "prompt": "假设被告在8月1日支付了30万元部分款项，这是否会影响你对根本违约的判断？",
      "targetElement": "付款义务",
      "suggestedResponse": "分析部分履行对合同解除权的影响"
    }
  ]
}
EOF

# 创建模块专用Mock文件
echo "📦 创建模块Mock文件..."

# Editor模块Mock
cat > mock/editor-mock.json << 'EOF'
{
  "config": {
    "roundDuration": 90,
    "minFactCitations": 1,
    "minLawCitations": 1,
    "enableTimer": true,
    "templates": [
      "就【争点】而言，依据【法条】，因【关键事实】，故【结论】。",
      "根据【法条】的规定，【要件1】和【要件2】均已满足，因此【结论】。",
      "虽然【反方观点】，但是【关键事实】表明【我方观点】更为合理。"
    ]
  }
}
EOF

# API模块Mock
cat > mock/api-mock.json << 'EOF'
{
  "endpoints": {
    "session": "POST /api/socratic/session",
    "history": "GET /api/socratic/history/:userId",
    "export": "GET /api/socratic/export/:sessionId"
  },
  "sseEvents": [
    "data: {\"type\":\"coach\",\"tips\":[\"请注意引用具体法条\"]}\n\n",
    "data: {\"type\":\"score\",\"rubric\":{\"total\":75}}\n\n",
    "data: {\"type\":\"challenge\",\"challenge\":{\"kind\":\"counter\"}}\n\n",
    "data: {\"type\":\"end\"}\n\n"
  ]
}
EOF

# Heatmap模块Mock
cat > mock/heatmap-mock.json << 'EOF'
{
  "coverage": [
    {"elementId": "合同成立生效", "covered": true, "coveredBy": ["turn1"]},
    {"elementId": "付款义务", "covered": true, "coveredBy": ["turn1", "turn2"]},
    {"elementId": "履行期限届满", "covered": true, "coveredBy": ["turn1"]},
    {"elementId": "违约行为", "covered": false, "guidingQuestion": "被告的行为如何构成违约？"},
    {"elementId": "催告程序", "covered": false, "guidingQuestion": "原告是否履行了必要的催告程序？"}
  ]
}
EOF

# 创建模块README
echo "📚 创建模块文档..."

# Editor模块README
cat > components/socratic/editor/README.md << 'EOF'
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
EOF

# API模块README
cat > app/api/socratic/README.md << 'EOF'
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
EOF

# Heatmap模块README
cat > components/socratic/visualization/README.md << 'EOF'
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
EOF

# 创建集成测试脚本
echo "🧪 创建集成测试..."
cat > scripts/ccpm-integrate.sh << 'EOF'
#!/bin/bash

# CCPM 集成测试脚本

echo "🔄 开始集成测试..."

# 检查各模块是否就绪
check_module() {
  local module=$1
  local path=$2
  if [ -f "$path" ]; then
    echo "✅ $module 模块就绪"
    return 0
  else
    echo "❌ $module 模块未就绪: 缺少 $path"
    return 1
  fi
}

# 检查模块
check_module "Editor" "components/socratic/editor/IRACComposer.tsx"
check_module "API" "app/api/socratic/session/route.ts"
check_module "Heatmap" "components/socratic/visualization/ElementHeatmap.tsx"

# 运行集成测试
echo "🧪 运行集成测试..."
npm run test:integration

echo "✅ 集成测试完成！"
EOF

chmod +x scripts/ccpm-integrate.sh

# 创建Git hooks
echo "🔗 设置Git hooks..."
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# 防止跨模块修改

# 获取修改的文件
files=$(git diff --cached --name-only)

# 检查是否有跨模块修改
check_boundary() {
  local branch=$(git branch --show-current)
  
  case $branch in
    feat/ccpm-editor)
      echo "$files" | grep -E "^(app/api/|components/socratic/visualization/)" && {
        echo "❌ 错误：Editor分支不能修改API或Heatmap模块"
        exit 1
      }
      ;;
    feat/ccpm-api)
      echo "$files" | grep -E "^(components/)" && {
        echo "❌ 错误：API分支不能修改组件"
        exit 1
      }
      ;;
    feat/ccpm-heatmap)
      echo "$files" | grep -E "^(app/api/|components/socratic/editor/)" && {
        echo "❌ 错误：Heatmap分支不能修改API或Editor模块"
        exit 1
      }
      ;;
  esac
}

check_boundary
EOF

chmod +x .git/hooks/pre-commit

echo "✅ CCPM 环境初始化完成！"
echo ""
echo "📋 下一步操作："
echo "1. 打开3个新的Claude窗口"
echo "2. 每个窗口分别负责一个模块："
echo "   - 窗口A: components/socratic/editor/"
echo "   - 窗口B: app/api/socratic/"
echo "   - 窗口C: components/socratic/visualization/"
echo "3. 参考各模块的README.md开始开发"
echo "4. 使用 scripts/ccpm-integrate.sh 进行集成测试"
echo ""
echo "🚀 Happy Parallel Coding!"
EOF

chmod +x scripts/ccpm-init.sh