/**
 * 批量测试脚本 - 用于测试200份判决书的三要素提取
 * Based on Andrew Ng's Data-Centric AI approach
 * 
 * 使用方法：
 * 1. 将判决书文件放在 test-documents/ 目录下
 * 2. 运行: npm run test:batch
 * 3. 查看结果在 test-results/ 目录
 */

import fs from 'fs/promises';
import path from 'path';
import { LegalParser } from '../lib/legal-parser';
import { LegalAIAgent } from '../lib/ai-legal-agent';

// 配置
const CONFIG = {
  inputDir: './test-documents',        // 判决书输入目录
  outputDir: './test-results',         // 测试结果输出目录
  maxConcurrent: 5,                    // 最大并发处理数
  useAI: true,                          // 是否使用AI增强
  saveDetails: true,                    // 是否保存详细结果
  generateReport: true,                 // 是否生成汇总报告
};

// 测试结果接口
interface TestResult {
  fileName: string;
  success: boolean;
  processingTime: number;
  ruleBasedResult: {
    hasBasicInfo: boolean;
    hasFacts: boolean;
    hasLaw: boolean;
    hasReasoning: boolean;
    score: number;
  };
  aiResult?: {
    confidence: number;
    hasDetailedFacts: boolean;
    hasEvidenceAnalysis: boolean;
    hasLogicChain: boolean;
    score: number;
  };
  errors?: string[];
}

// 测试统计
interface TestStatistics {
  total: number;
  successful: number;
  failed: number;
  averageProcessingTime: number;
  averageRuleScore: number;
  averageAIScore: number;
  averageConfidence: number;
  fileTypes: Record<string, number>;
  errorTypes: Record<string, number>;
}

/**
 * 主测试函数
 */
async function runBatchTest() {
  console.log('🚀 开始批量测试判决书三要素提取...\n');
  
  // 确保目录存在
  await ensureDirectories();
  
  // 获取所有待测试文件
  const files = await getTestFiles();
  console.log(`📁 找到 ${files.length} 个判决书文件\n`);
  
  if (files.length === 0) {
    console.log('❌ 没有找到测试文件，请将判决书放在 test-documents/ 目录下');
    return;
  }
  
  // 批量处理文件
  const results: TestResult[] = [];
  const batches = createBatches(files, CONFIG.maxConcurrent);
  
  for (let i = 0; i < batches.length; i++) {
    console.log(`📊 处理批次 ${i + 1}/${batches.length} (每批 ${CONFIG.maxConcurrent} 个文件)`);
    
    const batchResults = await Promise.all(
      batches[i].map(file => processFile(file))
    );
    
    results.push(...batchResults);
    
    // 显示进度
    const progress = Math.round((results.length / files.length) * 100);
    console.log(`   进度: ${progress}% (${results.length}/${files.length})\n`);
  }
  
  // 生成统计报告
  const statistics = calculateStatistics(results);
  
  // 保存结果
  await saveResults(results, statistics);
  
  // 显示汇总
  displaySummary(statistics);
}

/**
 * 处理单个文件
 */
async function processFile(filePath: string): Promise<TestResult> {
  const fileName = path.basename(filePath);
  const startTime = Date.now();
  const result: TestResult = {
    fileName,
    success: false,
    processingTime: 0,
    ruleBasedResult: {
      hasBasicInfo: false,
      hasFacts: false,
      hasLaw: false,
      hasReasoning: false,
      score: 0,
    },
  };
  
  try {
    // 读取文件内容
    const content = await readFileContent(filePath);
    
    // 规则引擎提取
    const ruleResult = LegalParser.parse(content);
    
    // 评估规则引擎结果
    result.ruleBasedResult = {
      hasBasicInfo: !!(ruleResult.caseNumber || ruleResult.court),
      hasFacts: !!ruleResult.threeElements.facts.content,
      hasLaw: !!ruleResult.threeElements.law.content,
      hasReasoning: !!ruleResult.threeElements.reasoning.content,
      score: 0,
    };
    
    // 计算规则引擎分数
    result.ruleBasedResult.score = 
      (result.ruleBasedResult.hasBasicInfo ? 25 : 0) +
      (result.ruleBasedResult.hasFacts ? 25 : 0) +
      (result.ruleBasedResult.hasLaw ? 25 : 0) +
      (result.ruleBasedResult.hasReasoning ? 25 : 0);
    
    // AI增强提取（如果启用）
    if (CONFIG.useAI) {
      try {
        const aiAgent = new LegalAIAgent();
        const aiExtraction = await aiAgent.extractThreeElements(content);
        
        result.aiResult = {
          confidence: aiExtraction.metadata.confidence,
          hasDetailedFacts: !!aiExtraction.facts.timeline.length,
          hasEvidenceAnalysis: !!aiExtraction.evidence.items.length,
          hasLogicChain: !!aiExtraction.reasoning.logicChain.length,
          score: 0,
        };
        
        // 计算AI分数
        result.aiResult.score = 
          (result.aiResult.hasDetailedFacts ? 35 : 0) +
          (result.aiResult.hasEvidenceAnalysis ? 35 : 0) +
          (result.aiResult.hasLogicChain ? 30 : 0);
        
      } catch (aiError: any) {
        console.warn(`   ⚠️ AI分析失败 (${fileName}): ${aiError.message}`);
      }
    }
    
    result.success = true;
    result.processingTime = Date.now() - startTime;
    
    // 保存详细结果（如果启用）
    if (CONFIG.saveDetails) {
      await saveDetailedResult(fileName, ruleResult, result.aiResult);
    }
    
  } catch (error: any) {
    result.errors = [error.message];
    console.error(`   ❌ 处理失败 (${fileName}): ${error.message}`);
  }
  
  return result;
}

/**
 * 读取文件内容（支持多种格式）
 */
async function readFileContent(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.txt':
    case '.md':
      return await fs.readFile(filePath, 'utf-8');
    
    case '.pdf':
      // 这里需要实现PDF解析
      console.warn('PDF解析需要额外配置');
      return '';
    
    case '.docx':
      // 这里需要实现DOCX解析
      console.warn('DOCX解析需要额外配置');
      return '';
    
    default:
      throw new Error(`不支持的文件格式: ${ext}`);
  }
}

/**
 * 创建批次
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * 计算统计数据
 */
function calculateStatistics(results: TestResult[]): TestStatistics {
  const stats: TestStatistics = {
    total: results.length,
    successful: 0,
    failed: 0,
    averageProcessingTime: 0,
    averageRuleScore: 0,
    averageAIScore: 0,
    averageConfidence: 0,
    fileTypes: {},
    errorTypes: {},
  };
  
  let totalTime = 0;
  let totalRuleScore = 0;
  let totalAIScore = 0;
  let totalConfidence = 0;
  let aiCount = 0;
  
  for (const result of results) {
    if (result.success) {
      stats.successful++;
      totalTime += result.processingTime;
      totalRuleScore += result.ruleBasedResult.score;
      
      if (result.aiResult) {
        totalAIScore += result.aiResult.score;
        totalConfidence += result.aiResult.confidence;
        aiCount++;
      }
    } else {
      stats.failed++;
      if (result.errors) {
        for (const error of result.errors) {
          stats.errorTypes[error] = (stats.errorTypes[error] || 0) + 1;
        }
      }
    }
    
    // 文件类型统计
    const ext = path.extname(result.fileName).toLowerCase();
    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
  }
  
  // 计算平均值
  if (stats.successful > 0) {
    stats.averageProcessingTime = Math.round(totalTime / stats.successful);
    stats.averageRuleScore = Math.round(totalRuleScore / stats.successful);
  }
  
  if (aiCount > 0) {
    stats.averageAIScore = Math.round(totalAIScore / aiCount);
    stats.averageConfidence = Math.round(totalConfidence / aiCount);
  }
  
  return stats;
}

/**
 * 保存结果
 */
async function saveResults(results: TestResult[], statistics: TestStatistics) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // 保存详细结果
  await fs.writeFile(
    path.join(CONFIG.outputDir, `results-${timestamp}.json`),
    JSON.stringify(results, null, 2)
  );
  
  // 保存统计报告
  if (CONFIG.generateReport) {
    const report = generateReport(statistics, results);
    await fs.writeFile(
      path.join(CONFIG.outputDir, `report-${timestamp}.md`),
      report
    );
  }
}

/**
 * 生成测试报告
 */
function generateReport(stats: TestStatistics, results: TestResult[]): string {
  const report = `# 判决书三要素提取测试报告

## 📊 测试概况
- **测试时间**: ${new Date().toLocaleString('zh-CN')}
- **测试文件数**: ${stats.total}
- **成功率**: ${((stats.successful / stats.total) * 100).toFixed(2)}%
- **平均处理时间**: ${stats.averageProcessingTime}ms

## 🎯 提取质量评分

### 规则引擎性能
- **平均得分**: ${stats.averageRuleScore}/100
- **基本信息提取率**: ${calculateRate(results, r => r.ruleBasedResult.hasBasicInfo)}%
- **事实提取率**: ${calculateRate(results, r => r.ruleBasedResult.hasFacts)}%
- **法律依据提取率**: ${calculateRate(results, r => r.ruleBasedResult.hasLaw)}%
- **裁判理由提取率**: ${calculateRate(results, r => r.ruleBasedResult.hasReasoning)}%

### AI增强性能
- **平均得分**: ${stats.averageAIScore}/100
- **平均置信度**: ${stats.averageConfidence}%
- **详细事实提取率**: ${calculateRate(results, r => r.aiResult?.hasDetailedFacts)}%
- **证据分析率**: ${calculateRate(results, r => r.aiResult?.hasEvidenceAnalysis)}%
- **逻辑链提取率**: ${calculateRate(results, r => r.aiResult?.hasLogicChain)}%

## 📁 文件类型分布
${Object.entries(stats.fileTypes)
  .map(([type, count]) => `- ${type}: ${count} (${((count / stats.total) * 100).toFixed(1)}%)`)
  .join('\n')}

## ❌ 错误分析
${stats.failed > 0 ? 
  Object.entries(stats.errorTypes)
    .map(([error, count]) => `- ${error}: ${count}次`)
    .join('\n') : 
  '无错误'}

## 💡 建议
${generateRecommendations(stats)}

---
*基于Andrew Ng的数据中心AI方法论生成*
`;
  
  return report;
}

/**
 * 计算比率
 */
function calculateRate(results: TestResult[], predicate: (r: TestResult) => boolean | undefined): string {
  const matches = results.filter(r => r.success && predicate(r)).length;
  const total = results.filter(r => r.success).length;
  return total > 0 ? ((matches / total) * 100).toFixed(1) : '0';
}

/**
 * 生成建议
 */
function generateRecommendations(stats: TestStatistics): string {
  const recommendations: string[] = [];
  
  if (stats.averageRuleScore < 70) {
    recommendations.push('1. 规则引擎提取率偏低，建议优化正则表达式模式');
  }
  
  if (stats.averageAIScore < 70) {
    recommendations.push('2. AI提取质量有待提升，建议收集更多标注数据进行优化');
  }
  
  if (stats.averageConfidence < 80) {
    recommendations.push('3. AI置信度偏低，建议改进提示词模板');
  }
  
  if (stats.averageProcessingTime > 5000) {
    recommendations.push('4. 处理速度较慢，建议优化并发处理策略');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✨ 系统表现良好，继续保持！');
  }
  
  return recommendations.join('\n');
}

/**
 * 显示汇总信息
 */
function displaySummary(stats: TestStatistics) {
  console.log('\n' + '='.repeat(60));
  console.log('📈 测试完成 - 汇总报告');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${stats.successful}/${stats.total}`);
  console.log(`❌ 失败: ${stats.failed}/${stats.total}`);
  console.log(`⏱️  平均处理时间: ${stats.averageProcessingTime}ms`);
  console.log(`📊 规则引擎平均分: ${stats.averageRuleScore}/100`);
  
  if (CONFIG.useAI) {
    console.log(`🤖 AI增强平均分: ${stats.averageAIScore}/100`);
    console.log(`🎯 AI平均置信度: ${stats.averageConfidence}%`);
  }
  
  console.log('\n💾 结果已保存到 test-results/ 目录');
  console.log('📝 查看详细报告: test-results/report-*.md');
}

/**
 * 确保必要的目录存在
 */
async function ensureDirectories() {
  try {
    await fs.mkdir(CONFIG.inputDir, { recursive: true });
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
  } catch (error) {
    console.error('创建目录失败:', error);
  }
}

/**
 * 获取测试文件列表
 */
async function getTestFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(CONFIG.inputDir);
    return files
      .filter(file => /\.(txt|md|pdf|docx)$/i.test(file))
      .map(file => path.join(CONFIG.inputDir, file));
  } catch (error) {
    console.error('读取测试文件失败:', error);
    return [];
  }
}

/**
 * 保存详细结果
 */
async function saveDetailedResult(fileName: string, ruleResult: any, aiResult: any) {
  const detailDir = path.join(CONFIG.outputDir, 'details');
  await fs.mkdir(detailDir, { recursive: true });
  
  const baseName = path.basename(fileName, path.extname(fileName));
  await fs.writeFile(
    path.join(detailDir, `${baseName}-analysis.json`),
    JSON.stringify({ ruleResult, aiResult }, null, 2)
  );
}

// 运行测试
if (require.main === module) {
  runBatchTest().catch(console.error);
}

export { runBatchTest, TestResult, TestStatistics };