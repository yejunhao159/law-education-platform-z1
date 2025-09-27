#!/usr/bin/env npx tsx

/**
 * 测试新旧提取服务迁移
 * 验证适配器和版本控制是否正常工作
 */

import chalk from 'chalk';
import { ExtractionAdapter } from '../src/adapters/extraction-adapter';

// 测试数据
const testExtractedData = {
  basicInfo: {
    caseNumber: '(2024)京01民初123号',
    court: '北京市第一中级人民法院',
    date: '2024-03-15'
  },
  parties: [
    { role: 'plaintiff', name: '张三' },
    { role: 'defendant', name: '李四' }
  ],
  dates: ['2024-03-15', '2023-12-01'],
  facts: {
    summary: '本案为民间借贷纠纷',
    keyPoints: ['原告于2023年12月1日向被告出借100万元', '被告未按约定还款'],
    undisputedFacts: ['借款事实存在']
  },
  timeline: [
    { date: '2023-12-01', event: '签订借款合同' },
    { date: '2024-01-15', event: '还款期限届满' }
  ],
  disputes: [
    { id: 'd1', description: '利息计算标准', severity: 'high' }
  ],
  evidence: [
    { id: 'e1', type: 'documentary', content: '借款合同', accepted: true }
  ],
  legalProvisions: ['《民法典》第667条'],
  analysis: {
    legalReasoning: '根据合同约定和法律规定',
    keyPoints: ['借款合同有效', '被告构成违约'],
    conclusion: '被告应返还借款并支付利息'
  },
  metadata: {
    confidence: 0.85,
    processingTime: 1200,
    method: 'hybrid'
  }
};

const testThreeElementsData = {
  basicInfo: {
    caseNumber: '(2024)京01民初456号',
    court: '北京市第一中级人民法院',
    date: '2024-03-20',
    parties: {
      plaintiff: '王五',
      defendant: '赵六'
    }
  },
  threeElements: {
    facts: {
      summary: '本案为买卖合同纠纷',
      timeline: [{ date: '2024-01-01', event: '签订合同' }],
      keyFacts: ['原告向被告购买设备'],
      disputedFacts: ['设备质量问题'],
      undisputedFacts: ['合同成立']
    },
    evidence: {
      summary: '共3项证据',
      items: [
        { id: 'ev1', type: 'contract', content: '买卖合同' }
      ]
    },
    reasoning: {
      summary: '法院认为',
      legalBasis: ['《民法典》第595条'],
      logicChain: ['合同成立', '被告违约'],
      keyArguments: ['质量不符合约定'],
      judgment: '被告赔偿损失'
    }
  },
  metadata: {
    confidence: 80,
    processingTime: 1000,
    aiModel: 'deepseek-chat'
  }
};

console.log(chalk.cyan('\n════════════════════════════════════════════════'));
console.log(chalk.cyan('     提取服务迁移测试'));
console.log(chalk.cyan('════════════════════════════════════════════════\n'));

// 测试1：ExtractedData → ThreeElements
console.log(chalk.yellow('📋 测试1: ExtractedData → ThreeElements 转换'));
try {
  const threeElements = ExtractionAdapter.toThreeElements(testExtractedData);

  console.log(chalk.green('✅ 转换成功'));
  console.log('  案号:', threeElements.basicInfo.caseNumber);
  console.log('  原告:', threeElements.basicInfo.parties.plaintiff);
  console.log('  被告:', threeElements.basicInfo.parties.defendant);
  console.log('  事实摘要:', threeElements.threeElements.facts.summary);
  console.log('  证据数量:', threeElements.threeElements.evidence.items.length);
  console.log('  置信度:', threeElements.metadata.confidence);
} catch (error) {
  console.log(chalk.red('❌ 转换失败:', error));
}

// 测试2：ThreeElements → ExtractedData
console.log(chalk.yellow('\n📋 测试2: ThreeElements → ExtractedData 转换'));
try {
  const extractedData = ExtractionAdapter.toExtractedData(testThreeElementsData);

  console.log(chalk.green('✅ 转换成功'));
  console.log('  案号:', extractedData.basicInfo?.caseNumber);
  console.log('  当事人数量:', extractedData.parties?.length);
  console.log('  时间轴事件:', extractedData.timeline?.length);
  console.log('  争议数量:', extractedData.disputes?.length);
  console.log('  法条数量:', extractedData.legalProvisions?.length);
} catch (error) {
  console.log(chalk.red('❌ 转换失败:', error));
}

// 测试3：格式自动检测
console.log(chalk.yellow('\n📋 测试3: 数据格式自动检测'));
const format1 = ExtractionAdapter.detectFormat(testExtractedData);
const format2 = ExtractionAdapter.detectFormat(testThreeElementsData);

console.log('  ExtractedData格式检测:',
  format1 === 'extracted-data' ? chalk.green('✅ 正确') : chalk.red('❌ 错误'));
console.log('  ThreeElements格式检测:',
  format2 === 'three-elements' ? chalk.green('✅ 正确') : chalk.red('❌ 错误'));

// 测试4：双向转换一致性
console.log(chalk.yellow('\n📋 测试4: 双向转换一致性'));
try {
  const converted = ExtractionAdapter.toThreeElements(testExtractedData);
  const reconverted = ExtractionAdapter.toExtractedData(converted);

  const isConsistent =
    reconverted.basicInfo?.caseNumber === testExtractedData.basicInfo.caseNumber &&
    reconverted.parties?.length === testExtractedData.parties.length;

  console.log(isConsistent ? chalk.green('✅ 双向转换一致') : chalk.red('❌ 数据丢失'));
} catch (error) {
  console.log(chalk.red('❌ 一致性测试失败:', error));
}

// 测试5：请求格式规范化
console.log(chalk.yellow('\n📋 测试5: 请求格式规范化'));
const testRequests = [
  { text: '判决书内容', useAI: true },
  { content: '判决书内容', format: 'three-elements' },
  { text: '判决书内容' }
];

testRequests.forEach((req, i) => {
  const normalized = ExtractionAdapter.normalizeRequest(req);
  console.log(`  请求${i + 1}:`, normalized.options.enableAI ? '启用AI' : '禁用AI',
    `| 格式: ${normalized.options.outputFormat || 'default'}`);
});

// 测试6：API版本切换（模拟）
console.log(chalk.yellow('\n📋 测试6: API版本切换策略'));
console.log('  V1版本: 使用旧服务（LegalParser + LegalAIAgent）');
console.log('  V2版本: 使用新服务（LegalExtractionApplicationService）');
console.log('  Auto版本: 根据置信度自动选择');

// 性能对比
console.log(chalk.yellow('\n📊 性能对比预估'));
console.log('┌─────────────┬──────────┬──────────┬──────────┐');
console.log('│ 指标        │ 旧版API  │ 新版API  │ 优势     │');
console.log('├─────────────┼──────────┼──────────┼──────────┤');
console.log('│ 响应时间    │ ~2000ms  │ ~1500ms  │ 新版 ↑   │');
console.log('│ 准确率      │ 85%      │ 90%      │ 新版 ↑   │');
console.log('│ 缓存支持    │ ❌       │ ✅       │ 新版 ↑   │');
console.log('│ 法条增强    │ ❌       │ ✅       │ 新版 ↑   │');
console.log('│ 前端兼容    │ ✅       │ ⚠️       │ 旧版 ↑   │');
console.log('└─────────────┴──────────┴──────────┴──────────┘');

console.log(chalk.cyan('\n════════════════════════════════════════════════'));
console.log(chalk.green('✅ 迁移测试完成'));
console.log(chalk.cyan('════════════════════════════════════════════════\n'));

console.log(chalk.gray('建议:'));
console.log(chalk.gray('1. 先在开发环境使用 X-API-Version: auto 测试'));
console.log(chalk.gray('2. 监控新旧版本的成功率和性能'));
console.log(chalk.gray('3. 逐步将前端迁移到 V2 版本'));
console.log(chalk.gray('4. 最终废弃 V1 版本\n'));