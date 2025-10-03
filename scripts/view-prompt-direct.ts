/**
 * 直接查看Socratic提示词（不需要服务器运行）
 * 用法: npx tsx scripts/view-prompt-direct.ts [mode] [difficulty] [topic]
 *
 * 示例:
 * npx tsx scripts/view-prompt-direct.ts exploration intermediate "合同效力分析"
 * npx tsx scripts/view-prompt-direct.ts analysis advanced "侵权责任认定"
 */

import * as fs from 'fs';
import * as path from 'path';
import { FullPromptBuilder, type FullPromptContext } from '../src/domains/socratic-dialogue/services/FullPromptBuilder';

function main() {
  const mode = (process.argv[2] || 'exploration') as 'exploration' | 'analysis' | 'synthesis' | 'evaluation';
  const difficulty = (process.argv[3] || 'intermediate') as 'basic' | 'intermediate' | 'advanced';
  const topic = process.argv[4] || '合同效力分析';
  const issuePhase = process.argv[5] as 'initiate' | 'structure' | 'socratic' | 'unify' | 'execute' | undefined;

  console.log('================================================================================');
  console.log('🔍 Socratic 提示词查看器（直接模式）');
  console.log('================================================================================\n');
  console.log('📝 配置参数:');
  console.log(`  - 教学模式: ${mode}`);
  console.log(`  - 难度级别: ${difficulty}`);
  console.log(`  - 讨论主题: ${topic}`);
  console.log(`  - ISSUE阶段: ${issuePhase || '未指定'}`);
  console.log('\n' + '='.repeat(80) + '\n');

  const context: FullPromptContext = {
    mode,
    difficulty,
    topic,
    issuePhase,
    includeDiagnostics: true
  };

  const systemPrompt = FullPromptBuilder.buildFullSystemPrompt(context);

  console.log('📊 提示词统计:');
  console.log(`  - 总长度: ${systemPrompt.length} chars`);
  console.log(`  - 预估Token数: ~${Math.ceil(systemPrompt.length / 2.3)} tokens`);
  console.log(`  - 包含诊断信息: 是`);
  console.log('\n' + '='.repeat(80) + '\n');

  console.log('📄 完整提示词内容:\n');
  console.log(systemPrompt);

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ 提示词查看完成');
  console.log('='.repeat(80));

  // 保存到文件
  const outputFilename = `socratic-prompt-${mode}-${difficulty}${issuePhase ? `-${issuePhase}` : ''}.txt`;
  const outputPath = path.join(__dirname, '..', outputFilename);
  fs.writeFileSync(outputPath, systemPrompt, 'utf8');
  console.log(`\n💾 已保存到文件: ${outputPath}`);

  // 同时保存一个包含上下文信息的JSON
  const metadataPath = path.join(__dirname, '..', `${path.basename(outputFilename, '.txt')}-metadata.json`);
  fs.writeFileSync(metadataPath, JSON.stringify({
    context,
    stats: {
      length: systemPrompt.length,
      estimatedTokens: Math.ceil(systemPrompt.length / 2.3),
      sections: 8
    },
    generatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  console.log(`📋 元数据已保存: ${metadataPath}\n`);
}

main();
