/**
 * DeepSeek API测试脚本
 * 测试与DeepSeek的连接和三要素提取功能
 */

import { DeepSeekLegalAgent } from '../lib/ai-legal-agent-deepseek';
import { LegalParser } from '../lib/legal-parser';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

// 测试用的判决书样本
const sampleJudgment = `
北京市海淀区人民法院
民事判决书
（2023）京0108民初12345号

原告：张某，男，1980年1月1日出生，汉族，住北京市海淀区。
被告：李某，男，1975年5月15日出生，汉族，住北京市朝阳区。

原告张某诉称：2023年1月15日，原告与被告签订《房屋买卖合同》，约定被告将其所有的位于北京市海淀区某小区的房屋以200万元的价格出售给原告。原告依约支付了首付款50万元。然而，由于房价上涨，被告拒绝继续履行合同，不配合办理房屋过户手续。原告认为，被告的行为构成违约，请求法院判令被告继续履行合同，配合办理房屋过户手续。

被告李某辩称：签订合同后，房价确实大幅上涨，现市场价已达280万元。这种情况属于情势变更，继续履行合同对被告明显不公平，请求法院驳回原告的诉讼请求。

经审理查明：2023年1月15日，原被告双方签订《房屋买卖合同》，约定房屋总价200万元。原告于2023年2月1日支付首付款50万元。2023年3月起，该地区房价开始上涨。2023年4月20日，被告明确表示拒绝配合办理过户手续。

本院认为：原被告签订的《房屋买卖合同》系双方真实意思表示，内容不违反法律、行政法规的强制性规定，应属有效。房价的正常市场波动不构成情势变更，被告应当按照合同约定履行义务。

综上所述，依照《中华人民共和国民法典》第五百零九条、第五百七十七条之规定，判决如下：
被告李某于本判决生效之日起十日内配合原告张某办理涉案房屋的过户登记手续。

如不服本判决，可在判决书送达之日起十五日内向本院递交上诉状。

审判长：王法官
审判员：赵法官
审判员：刘法官

2023年7月15日
书记员：陈某
`;

async function testDeepSeekAPI() {
  console.log('🚀 开始测试DeepSeek API...\n');
  console.log('============================================');
  
  try {
    // Step 1: 测试规则引擎
    console.log('📝 Step 1: 测试规则引擎提取...');
    const ruleResult = LegalParser.parse(sampleJudgment);
    console.log('✅ 规则引擎提取成功');
    console.log('  - 案号:', ruleResult.caseNumber);
    console.log('  - 法院:', ruleResult.court);
    console.log('  - 当事人:', ruleResult.parties);
    console.log('');
    
    // Step 2: 测试DeepSeek AI
    console.log('🤖 Step 2: 测试DeepSeek AI提取...');
    console.log('  使用API Key:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
    
    const aiAgent = new DeepSeekLegalAgent();
    const startTime = Date.now();
    
    const aiResult = await aiAgent.extractThreeElements(sampleJudgment);
    const processingTime = Date.now() - startTime;
    
    console.log('✅ DeepSeek AI提取成功');
    console.log(`  - 处理时间: ${processingTime}ms`);
    console.log(`  - 置信度: ${aiResult.metadata.confidence}%`);
    console.log(`  - AI模型: ${aiResult.metadata.aiModel}`);
    console.log('');
    
    // Step 3: 显示AI提取结果
    console.log('📊 AI提取结果:');
    console.log('\n🔍 案件事实:');
    console.log('  摘要:', aiResult.facts.summary.substring(0, 100) + '...');
    console.log('  时间线事件数:', aiResult.facts.timeline.length);
    console.log('  关键事实数:', aiResult.facts.keyFacts.length);
    if (aiResult.facts.keyFacts.length > 0) {
      console.log('  关键事实示例:', aiResult.facts.keyFacts[0]);
    }
    
    console.log('\n⚖️ 证据分析:');
    console.log('  摘要:', aiResult.evidence.summary.substring(0, 100) + '...');
    console.log('  证据数量:', aiResult.evidence.items.length);
    console.log('  证据链强度:', aiResult.evidence.chainAnalysis.strength);
    if (aiResult.evidence.items.length > 0) {
      const firstEvidence = aiResult.evidence.items[0];
      console.log('  证据示例:', {
        name: firstEvidence.name,
        type: firstEvidence.type,
        credibility: firstEvidence.credibilityScore
      });
    }
    
    console.log('\n🧠 裁判理由:');
    console.log('  摘要:', aiResult.reasoning.summary.substring(0, 100) + '...');
    console.log('  法律依据数:', aiResult.reasoning.legalBasis.length);
    console.log('  逻辑链数:', aiResult.reasoning.logicChain.length);
    console.log('  核心论点数:', aiResult.reasoning.keyArguments.length);
    if (aiResult.reasoning.keyArguments.length > 0) {
      console.log('  核心论点示例:', aiResult.reasoning.keyArguments[0]);
    }
    
    console.log('\n============================================');
    console.log('🎉 DeepSeek API测试成功！');
    console.log('');
    console.log('💡 建议:');
    console.log('1. API连接正常，可以开始批量测试');
    console.log('2. 当前置信度为', aiResult.metadata.confidence + '%');
    if (aiResult.metadata.confidence < 80) {
      console.log('3. 置信度偏低，建议优化提示词或提供更多上下文');
    } else {
      console.log('3. 置信度良好，提取质量较高');
    }
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n可能的原因:');
    console.error('1. API Key未正确配置');
    console.error('2. 网络连接问题');
    console.error('3. API额度不足');
    console.error('\n请检查 .env.local 文件中的配置:');
    console.error('DEEPSEEK_API_KEY=sk-xxx');
  }
}

// 运行测试
console.log('🔧 DeepSeek API集成测试工具');
console.log('📘 Based on Andrew Ng\'s Data-Centric AI approach');
console.log('');

testDeepSeekAPI().catch(console.error);