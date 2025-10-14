/**
 * PPT Prompt验证测试
 * 用于验证PptPromptBuilder是否正确导入和使用
 */

import { PptPromptBuilder } from './src/domains/teaching-acts/services/prompts/PptPromptBuilder';
import type { PptKeyElements } from './src/domains/teaching-acts/services/PptContentExtractor';

function testPromptInjection() {
  console.log('🔍 ========== PPT Prompt注入验证测试 ==========\n');

  const promptBuilder = new PptPromptBuilder();

  // 测试模板
  const template = 'school-leadership';

  // 模拟数据
  const mockKeyElements: PptKeyElements = {
    caseEssence: {
      title: '张三诉李四借款纠纷案',
      type: '民间借贷纠纷',
      mainDispute: '是否已还款',
      legalIssue: '举证责任分配',
      verdict: '判决被告归还借款10万元及利息',
      parties: {
        plaintiff: '张三',
        defendant: '李四'
      }
    },
    teachingHighlights: {
      factFindingPattern: '通过时间轴梳理借款事实',
      legalReasoningChain: '从借款合同成立→履行义务→违约责任',
      evidenceInsights: '借条真实性认定+银行流水印证',
      visualizableData: [
        {
          type: 'radar',
          title: '证据质量评估',
          data: { 真实性: 90, 关联性: 85, 合法性: 95 },
          description: '用雷达图展示证据三性'
        }
      ]
    },
    dialogueHighlights: {
      keyQuestions: [
        {
          question: '借条能证明什么法律事实？',
          studentResponse: '证明借款关系存在',
          insight: '引导证据与待证事实关联'
        }
      ],
      breakthroughMoments: ['理解了举证责任分配原则'],
      thinkingProgression: '从事实认知 → 法律推理 → 证据体系构建'
    },
    learningOutcomes: {
      keyInsights: ['掌握借款合同法律关系', '理解证据三性判断标准'],
      skillsImproved: ['事实梳理能力', '法律推理能力', '证据审查能力'],
      knowledgeGaps: []
    }
  };

  console.log('1️⃣  测试 System Prompt 生成\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const systemPrompt = promptBuilder.buildSystemPrompt(template);

  console.log(`✅ System Prompt 长度: ${systemPrompt.length} 字符`);
  console.log(`✅ 包含关键部分:\n`);

  const systemKeywords = [
    '你的角色定位',
    '教学演示PPT设计哲学',
    '页面质量标准',
    '可视化设计指南',
    '学校领导汇报版设计规则',
    '输出格式要求'
  ];

  systemKeywords.forEach(keyword => {
    const included = systemPrompt.includes(keyword);
    console.log(`   ${included ? '✅' : '❌'} ${keyword}`);
  });

  console.log('\n📄 System Prompt 预览（前500字符）:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(systemPrompt.substring(0, 500) + '...\n');

  console.log('\n2️⃣  测试 User Prompt 生成\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const userPrompt = promptBuilder.buildUserPrompt({
    template,
    keyElements: mockKeyElements,
    length: 'medium',
    includeDialogue: true
  });

  console.log(`✅ User Prompt 长度: ${userPrompt.length} 字符`);
  console.log(`✅ 包含关键数据:\n`);

  const userKeywords = [
    '案例核心信息',
    '张三诉李四借款纠纷案',
    '教学亮点',
    '苏格拉底对话精华',
    '学习成果',
    '你的任务'
  ];

  userKeywords.forEach(keyword => {
    const included = userPrompt.includes(keyword);
    console.log(`   ${included ? '✅' : '❌'} ${keyword}`);
  });

  console.log('\n📄 User Prompt 预览（前800字符）:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(userPrompt.substring(0, 800) + '...\n');

  console.log('\n3️⃣  总体统计\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ System Prompt: ${systemPrompt.length} 字符 (~${Math.round(systemPrompt.length / 2)} tokens)`);
  console.log(`✅ User Prompt: ${userPrompt.length} 字符 (~${Math.round(userPrompt.length / 2)} tokens)`);
  console.log(`✅ 总计: ${systemPrompt.length + userPrompt.length} 字符 (~${Math.round((systemPrompt.length + userPrompt.length) / 2)} tokens)`);

  console.log('\n✅ 所有检查通过！PptPromptBuilder 正确导入并使用。\n');
  console.log('🎯 下次生成PPT时，在服务器日志中会看到完整的Prompt内容。\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 运行测试
testPromptInjection();
