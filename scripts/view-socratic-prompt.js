/**
 * 查看完整的Socratic提示词结构
 * 用法: node view-socratic-prompt.js [mode] [difficulty]
 *
 * 示例:
 * node view-socratic-prompt.js exploration intermediate
 * node view-socratic-prompt.js analysis advanced
 */

const fs = require('fs');
const path = require('path');

// 导入FullPromptBuilder（需要先编译TypeScript或使用tsx）
async function viewPrompt() {
  const mode = process.argv[2] || 'exploration';
  const difficulty = process.argv[3] || 'intermediate';
  const topic = process.argv[4] || '合同效力分析';

  console.log('================================================================================');
  console.log('🔍 Socratic 提示词查看器');
  console.log('================================================================================\n');
  console.log(`📝 配置参数:`);
  console.log(`  - 教学模式: ${mode}`);
  console.log(`  - 难度级别: ${difficulty}`);
  console.log(`  - 讨论主题: ${topic}`);
  console.log('\n' + '='.repeat(80) + '\n');

  // 调用API获取完整提示词
  try {
    const response = await fetch('http://localhost:3000/api/socratic/view-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode,
        difficulty,
        topic,
        includeDiagnostics: true
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      console.log('📊 提示词统计:');
      console.log(`  - 总长度: ${result.data.systemPrompt.length} chars`);
      console.log(`  - 预估Token数: ~${Math.ceil(result.data.systemPrompt.length / 2.3)} tokens`);
      console.log('\n' + '='.repeat(80) + '\n');

      console.log('📄 完整提示词内容:\n');
      console.log(result.data.systemPrompt);

      console.log('\n\n' + '='.repeat(80));
      console.log('✅ 提示词查看完成');
      console.log('='.repeat(80));

      // 可选：保存到文件
      const outputPath = path.join(__dirname, `socratic-prompt-${mode}-${difficulty}.txt`);
      fs.writeFileSync(outputPath, result.data.systemPrompt, 'utf8');
      console.log(`\n💾 已保存到文件: ${outputPath}`);

    } else {
      console.error('❌ 获取失败:', result.error);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.log('\n💡 提示: 请确保开发服务器正在运行 (npm run dev)');
  }
}

viewPrompt();
