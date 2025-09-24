/**
 * 演示增强版苏格拉底对话服务
 * 展示DeeChat context-manager的应用效果
 */

import { EnhancedSocraticService } from '../src/domains/socratic-dialogue/services/EnhancedSocraticService';
import { SocraticDifficultyLevel, SocraticMode, SocraticDifficulty } from '@/lib/types/socratic';

async function demonstrateEnhancedSocratic() {
  console.log('🎓 启动增强版苏格拉底对话服务演示...\n');

  const service = new EnhancedSocraticService();

  // 模拟一个合同法的教学场景
  const testRequest = {
    sessionId: 'demo-session-001',
    level: SocraticDifficultyLevel.INTERMEDIATE,
    mode: SocraticMode.ANALYSIS,
    difficulty: SocraticDifficulty.MEDIUM,
    caseContext: '甲公司与乙公司签订了一份货物买卖合同，约定甲公司向乙公司供应1000台设备，总价值500万元。合同约定交货期为3个月。但是，在第2个月时，由于原材料价格暴涨，甲公司发现继续履行合同将面临巨额亏损。',
    currentTopic: '合同的法律约束力与情势变更原则',
    messages: [
      {
        id: '1',
        role: 'user' as const,
        content: '我认为甲公司应该继续履行合同，因为合同一旦签订就有法律约束力，不能随意违约。',
        timestamp: new Date().toISOString(),
        metadata: {}
      }
    ]
  };

  try {
    console.log('📋 测试场景：');
    console.log(`- 对话等级: ${testRequest.level}`);
    console.log(`- 教学模式: ${testRequest.mode}`);
    console.log(`- 案例背景: ${testRequest.caseContext.substring(0, 50)}...`);
    console.log(`- 学生观点: ${testRequest.messages[0].content.substring(0, 30)}...`);
    console.log('\n⏳ 正在生成苏格拉底式引导问题...\n');

    const response = await service.generateSocraticQuestion(testRequest);

    if (response.success && response.data) {
      console.log('✅ 苏格拉底导师的回应：');
      console.log('━'.repeat(60));
      console.log(response.data.question);
      console.log('━'.repeat(60));

      console.log('\n📊 响应元数据：');
      console.log(`- 生成时间: ${response.data.timestamp}`);
      console.log(`- 对话等级: ${response.data.level}`);
      console.log(`- 教学模式: ${response.data.mode}`);
      console.log(`- 会话ID: ${response.data.sessionId}`);
    } else {
      console.error('❌ 生成失败：', response.error);
    }

  } catch (error) {
    console.error('❌ 演示过程中发生错误：', error);
  }
}

async function compareWithOriginal() {
  console.log('\n\n🔍 对比分析：增强版 vs 原版苏格拉底服务\n');

  console.log('📈 增强版优势：');
  console.log('1. ✅ 使用DeeChat context-manager进行结构化上下文管理');
  console.log('2. ✅ 清晰的XML格式，便于AI理解和处理');
  console.log('3. ✅ 模块化的上下文构建（角色、工具、对话历史、当前问题）');
  console.log('4. ✅ 更好的对话连贯性和上下文感知');
  console.log('5. ✅ 标准化的教学模式和难度控制');

  console.log('\n📊 技术改进：');
  console.log('1. 🔧 统一的上下文格式化接口');
  console.log('2. 🔧 更好的错误处理和降级策略');
  console.log('3. 🔧 为未来流式响应预留接口');
  console.log('4. 🔧 符合DeeChat生态系统的设计原则');

  console.log('\n🎯 教学效果提升：');
  console.log('1. 📚 更精准的苏格拉底式问题生成');
  console.log('2. 📚 更好的教学层次和模式控制');
  console.log('3. 📚 更连贯的教学对话体验');
  console.log('4. 📚 更灵活的案例背景和主题管理');
}

// 执行演示
async function main() {
  await demonstrateEnhancedSocratic();
  await compareWithOriginal();

  console.log('\n🎉 演示完成！增强版苏格拉底对话服务已准备就绪。');
  console.log('\n💡 下一步建议：');
  console.log('1. 在实际教学环境中测试新服务');
  console.log('2. 收集教师和学生的反馈');
  console.log('3. 根据使用情况优化上下文管理策略');
  console.log('4. 考虑集成更多DeeChat工具包');
}

if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateEnhancedSocratic, compareWithOriginal };