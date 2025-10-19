/**
 * 苏格拉底提示词 v3.0 集成测试脚本
 *
 * 用途:验证新的v3提示词架构是否正确导入和工作
 *
 * 运行方式:
 * ```bash
 * npx ts-node scripts/test-prompt-v3.ts
 * ```
 */

import { FullPromptBuilder, type FullPromptContext } from '../src/domains/socratic-dialogue/services/FullPromptBuilder';
import {
  getDefaultSocraticPrompt,
  getCompactSocraticPrompt,
  createSocraticPrompt,
  recommendQuestionStrategy,
  evaluateQuestionQuality,
  type ISSUEPhase
} from '../src/domains/socratic-dialogue/prompts';

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('\n' + '='.repeat(60));
  log('cyan', `  ${title}`);
  console.log('='.repeat(60) + '\n');
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    testsPassed++;
    log('green', `✅ ${testName}`);
    if (details) {
      console.log(`   ${details}`);
    }
  } else {
    testsFailed++;
    log('red', `❌ ${testName}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }
}

// ==============================================
// 测试开始
// ==============================================

header('🧪 苏格拉底提示词 v3.0 集成测试');

// ==============================================
// 测试1: FullPromptBuilder基础功能
// ==============================================

header('测试1: FullPromptBuilder 基础功能');

try {
  const contexts: FullPromptContext[] = [
    {
      mode: 'exploration',
      difficulty: 'basic',
      topic: '合同法基础',
      issuePhase: 'initiate',
      includeDiagnostics: true
    },
    {
      mode: 'analysis',
      difficulty: 'intermediate',
      issuePhase: 'socratic',
      includeDiagnostics: false
    },
    {
      mode: 'synthesis',
      difficulty: 'advanced',
      issuePhase: 'execute',
      isInitialQuestion: true
    }
  ];

  contexts.forEach((context, index) => {
    try {
      const prompt = FullPromptBuilder.buildFullSystemPrompt(context);
      const tokenCount = FullPromptBuilder.estimateTokens(prompt);

      assert(
        prompt.length > 0,
        `构建提示词 #${index + 1} (${context.issuePhase || 'no phase'})`,
        `长度: ${prompt.length.toLocaleString()} 字符, Token: ${tokenCount.toLocaleString()}`
      );

      // 验证Token数在合理范围内
      assert(
        tokenCount < 50000,
        `Token数检查 #${index + 1}`,
        `${tokenCount.toLocaleString()} < 50,000 (合理范围)`
      );
    } catch (error) {
      assert(false, `构建提示词 #${index + 1}`, (error as Error).message);
    }
  });
} catch (error) {
  assert(false, 'FullPromptBuilder 基础功能', (error as Error).message);
}

// ==============================================
// 测试2: 直接导入提示词函数
// ==============================================

header('测试2: 提示词函数直接导入');

try {
  const defaultPrompt = getDefaultSocraticPrompt();
  assert(
    defaultPrompt.length > 0,
    'getDefaultSocraticPrompt()',
    `长度: ${defaultPrompt.length.toLocaleString()} 字符`
  );
} catch (error) {
  assert(false, 'getDefaultSocraticPrompt()', (error as Error).message);
}

try {
  const compactPrompt = getCompactSocraticPrompt();
  assert(
    compactPrompt.length > 0,
    'getCompactSocraticPrompt()',
    `长度: ${compactPrompt.length.toLocaleString()} 字符`
  );

  // 验证compact版本确实更短
  const defaultLength = getDefaultSocraticPrompt().length;
  assert(
    compactPrompt.length < defaultLength,
    'Compact版本确实更短',
    `${compactPrompt.length} < ${defaultLength}`
  );
} catch (error) {
  assert(false, 'getCompactSocraticPrompt()', (error as Error).message);
}

try {
  const customPrompt = createSocraticPrompt({ mode: 'full', includeWebSearch: true });
  assert(
    customPrompt.length > 0,
    'createSocraticPrompt()',
    `长度: ${customPrompt.length.toLocaleString()} 字符`
  );
} catch (error) {
  assert(false, 'createSocraticPrompt()', (error as Error).message);
}

// ==============================================
// 测试3: 核心组件内容验证
// ==============================================

header('测试3: 核心组件内容验证');

try {
  // 测试不包含ISSUE的默认提示词
  const promptWithoutISSUE = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic'
  });

  const checksWithoutISSUE = [
    { name: '价值层(存在意义)', pattern: /精神助产士|存在的(唯一)?意义/ },
    { name: '中国法学特色', pattern: /司法解释|案例指导|社会主义/ },
    { name: '三大武器', pattern: /助产术|反诘法|归谬法/ },
    { name: '锋利+幽默+严肃', pattern: /锋利|幽默|严肃/ },
    { name: '认知冲突', pattern: /认知冲突|矛盾/ },
    { name: '记忆锚点', pattern: /记忆锚点|终身记住/ },
    { name: '法条-案件绑定', pattern: /法条.*案件|案件.*法条/ },
  ];

  checksWithoutISSUE.forEach(check => {
    assert(
      check.pattern.test(promptWithoutISSUE),
      check.name,
      check.pattern.test(promptWithoutISSUE) ? '已包含' : '缺失'
    );
  });

  // 测试包含ISSUE的开场提示词
  const promptWithISSUE = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    issuePhase: 'initiate'
  });

  assert(
    /前2-3轮|ISSUE|识别核心矛盾/.test(promptWithISSUE),
    'ISSUE开场指导（仅initiate/structure阶段）',
    '已包含ISSUE开场指导'
  );

  // 测试非开场阶段不包含ISSUE
  const promptSocratic = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    issuePhase: 'socratic'
  });

  assert(
    !/前2-3轮.*ISSUE/.test(promptSocratic),
    'ISSUE不在socratic阶段注入（纯苏格拉底）',
    '正确，socratic阶段不包含ISSUE'
  );
} catch (error) {
  assert(false, '核心组件内容验证', (error as Error).message);
}

// ==============================================
// 测试4: ISSUE阶段策略推荐
// ==============================================

header('测试4: ISSUE阶段策略推荐');

const phases: ISSUEPhase[] = ['initiate', 'structure', 'socratic', 'unify', 'execute'];

phases.forEach(phase => {
  try {
    const strategy = recommendQuestionStrategy(phase);
    assert(
      strategy.length > 0,
      `推荐策略: ${phase}`,
      strategy
    );
  } catch (error) {
    assert(false, `推荐策略: ${phase}`, (error as Error).message);
  }
});

// ==============================================
// 测试5: 问题质量评估
// ==============================================

header('测试5: 问题质量评估');

const testQuestions = [
  {
    question: '这个案件中,甲公司为什么认为可以适用民法典第54条显失公平条款?',
    expectedScore: 75, // 锚定案件、引用法条、追问"为什么"
    name: '高质量问题'
  },
  {
    question: '你觉得合同法重要吗?',
    expectedScore: 0, // 抽象、没有案件、没有法条、没有认知冲突
    name: '低质量问题'
  },
  {
    question: '如果按你的说法,所有不公平的合同都能撤销,那菜市场大妈买菜后觉得贵了也能撤销吗?',
    expectedScore: 50, // 有归谬法、有认知冲突,但缺少具体案件和法条
    name: '中等质量问题'
  }
];

testQuestions.forEach(({ question, expectedScore, name }) => {
  try {
    const evaluation = evaluateQuestionQuality(question);
    assert(
      evaluation.score >= expectedScore - 25 && evaluation.score <= expectedScore + 25,
      name,
      `得分: ${evaluation.score}/100, 优势: ${evaluation.strengths.length}个, 改进点: ${evaluation.improvements.length}个`
    );
  } catch (error) {
    assert(false, name, (error as Error).message);
  }
});

// ==============================================
// 测试6: 【智能拼接】基于对话轮数的ISSUE注入
// ==============================================

header('测试6: 【智能拼接】基于对话轮数的ISSUE注入');

try {
  // 测试第1轮：应该包含ISSUE
  const round1Prompt = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    currentRound: 1
  });

  assert(
    /前2-3轮|ISSUE|识别核心矛盾/.test(round1Prompt),
    '第1轮自动包含ISSUE',
    '✅ 第1轮正确包含ISSUE开场指导'
  );

  // 测试第2轮：应该包含ISSUE
  const round2Prompt = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    currentRound: 2
  });

  assert(
    /前2-3轮|ISSUE|识别核心矛盾/.test(round2Prompt),
    '第2轮自动包含ISSUE',
    '✅ 第2轮正确包含ISSUE开场指导'
  );

  // 测试第3轮：应该不包含ISSUE
  const round3Prompt = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    currentRound: 3
  });

  assert(
    !/前2-3轮.*ISSUE/.test(round3Prompt),
    '第3轮自动去掉ISSUE',
    '✅ 第3轮正确去掉ISSUE，使用纯苏格拉底'
  );

  // 测试第5轮：应该不包含ISSUE
  const round5Prompt = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    currentRound: 5
  });

  assert(
    !/前2-3轮.*ISSUE/.test(round5Prompt),
    '第5轮自动去掉ISSUE',
    '✅ 第5轮正确去掉ISSUE，使用纯苏格拉底'
  );

  // 验证轮数优先级 > issuePhase
  const roundOverridesPhase = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    currentRound: 3,  // 第3轮，应该不包含ISSUE
    issuePhase: 'initiate'  // 但阶段是initiate
  });

  assert(
    !/前2-3轮.*ISSUE/.test(roundOverridesPhase),
    '轮数优先级高于阶段',
    '✅ currentRound优先于issuePhase'
  );

  log('green', '\n✅ 智能拼接逻辑全部正确！');
  console.log('   - 第1-2轮自动包含ISSUE');
  console.log('   - 第3轮及之后自动去掉ISSUE');
  console.log('   - currentRound优先级 > issuePhase');
} catch (error) {
  assert(false, '智能拼接测试', (error as Error).message);
}

// ==============================================
// 测试7: 不同ISSUE阶段的提示词差异（向后兼容）
// ==============================================

header('测试7: 不同ISSUE阶段的提示词差异（向后兼容）');

try {
  const initiatePrompt = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    issuePhase: 'initiate'
  });

  const socraticPrompt = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    issuePhase: 'socratic'
  });

  // Initiate阶段应该包含"选项式"引导
  assert(
    /选项式|选项/.test(initiatePrompt),
    'Initiate阶段包含选项式引导',
    '包含选项式问题策略'
  );

  // Socratic阶段应该包含"锋利追问"
  assert(
    /锋利追问|助产术|反诘法|归谬法/.test(socraticPrompt),
    'Socratic阶段包含锋利追问',
    '包含三大武器策略'
  );

  // 两个阶段的提示词应该有明显差异
  assert(
    initiatePrompt !== socraticPrompt,
    '不同阶段生成不同提示词',
    `Initiate: ${initiatePrompt.length}字符, Socratic: ${socraticPrompt.length}字符`
  );
} catch (error) {
  assert(false, '不同ISSUE阶段的提示词差异', (error as Error).message);
}

// ==============================================
// 测试8: Token估算准确性
// ==============================================

header('测试8: Token估算准确性');

try {
  const testTexts = [
    { text: '这是一个中文测试。', expectedTokens: 7 },
    { text: 'This is an English test.', expectedTokens: 8 },
    { text: '混合中英文mixed text测试', expectedTokens: 13 }
  ];

  testTexts.forEach(({ text, expectedTokens }) => {
    const estimated = FullPromptBuilder.estimateTokens(text);
    const error = Math.abs(estimated - expectedTokens) / expectedTokens;

    assert(
      error < 0.3, // 允许30%误差
      `Token估算: "${text.substring(0, 20)}..."`,
      `估算: ${estimated}, 预期: ${expectedTokens}, 误差: ${(error * 100).toFixed(1)}%`
    );
  });
} catch (error) {
  assert(false, 'Token估算准确性', (error as Error).message);
}

// ==============================================
// 测试9: 诊断信息生成
// ==============================================

header('测试9: 诊断信息生成');

try {
  const promptWithDiag = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    includeDiagnostics: true
  });

  const promptNoDiag = FullPromptBuilder.buildFullSystemPrompt({
    mode: 'exploration',
    difficulty: 'basic',
    includeDiagnostics: false
  });

  assert(
    /构建诊断信息|v3\.0优化效果/.test(promptWithDiag),
    '包含诊断信息时应生成诊断',
    '检测到诊断信息内容'
  );

  assert(
    !/构建诊断信息/.test(promptNoDiag),
    '不包含诊断信息时不应生成',
    '未检测到诊断信息内容'
  );

  // 包含诊断的版本应该更长
  assert(
    promptWithDiag.length > promptNoDiag.length,
    '诊断版本更长',
    `含诊断: ${promptWithDiag.length}, 不含: ${promptNoDiag.length}`
  );
} catch (error) {
  assert(false, '诊断信息生成', (error as Error).message);
}

// ==============================================
// 测试总结
// ==============================================

header('🎯 测试总结');

const totalTests = testsPassed + testsFailed;
const passRate = ((testsPassed / totalTests) * 100).toFixed(1);

console.log(`总测试数: ${totalTests}`);
log('green', `通过: ${testsPassed}`);
if (testsFailed > 0) {
  log('red', `失败: ${testsFailed}`);
}
log('cyan', `通过率: ${passRate}%`);

if (testsFailed === 0) {
  console.log('\n');
  log('green', '🎉 所有测试通过! v3提示词架构工作正常。');
  console.log('\n');
  process.exit(0);
} else {
  console.log('\n');
  log('red', '❌ 部分测试失败,请检查上述错误信息。');
  console.log('\n');
  process.exit(1);
}
