/**
 * DeeChat Context Manager - 法学教育平台本地集成版本
 * 专为法学教育场景优化的AI上下文格式化器和消息数组生成器
 */

// 核心功能导出
export { ContextFormatter } from "./core/ContextFormatter";
export { TemplateManager, templateManager } from "./core/TemplateManager";

// 模板导出
export { StandardTemplate, type StandardInput } from "./templates/StandardTemplate";
export { SocraticDialogueTemplate, type SocraticInput } from "./templates/SocraticDialogueTemplate";
export { LegalAnalysisTemplate, type LegalAnalysisInput } from "./templates/LegalAnalysisTemplate";

// 类型导出
export type {
  ContextData,
  AIMessage,
  AIRole,
  LegalEducationContextData,
  SocraticDialogueContext,
  LegalAnalysisContext,
  SocraticMessage,
  ContextTemplate,
  LegalEducationTemplate,
  TemplateManager as ITemplateManager,
  FormatterOptions,
  ContextBuildResult
} from "./types";

// 便捷函数
import { ContextFormatter } from "./core/ContextFormatter";
import { templateManager } from "./core/TemplateManager";
import { StandardTemplate } from "./templates/StandardTemplate";
import { SocraticDialogueTemplate } from "./templates/SocraticDialogueTemplate";
import { LegalAnalysisTemplate } from "./templates/LegalAnalysisTemplate";

// 自动注册默认模板
function initializeDefaultTemplates() {
  try {
    // 注册标准模板
    templateManager.register(new StandardTemplate());
    console.log('✅ 标准模板已注册');

    // 注册苏格拉底对话模板
    templateManager.register(new SocraticDialogueTemplate());
    console.log('✅ 苏格拉底对话模板已注册');

    // 注册法律分析模板
    templateManager.register(new LegalAnalysisTemplate());
    console.log('✅ 法律分析模板已注册');

    console.log('🎉 DeeChat Context Manager 本地集成完成');
  } catch (error) {
    console.error('❌ 模板注册失败:', error);
  }
}

// 立即初始化模板
initializeDefaultTemplates();

// 便捷函数：使用标准模板格式化上下文
export function formatContext(contextData: any, options?: any): string {
  return ContextFormatter.format(contextData, options);
}

// 便捷函数：从模板构建消息数组
export function buildMessages<T>(templateId: string, input: T, options?: any) {
  return ContextFormatter.fromTemplateAsMessages(templateId, input, options);
}

// 便捷函数：构建苏格拉底对话上下文
export function buildSocraticContext(input: {
  caseText: string;
  studentLevel: 'beginner' | 'intermediate' | 'advanced';
  currentTopic: string;
  dialogueHistory?: any[];
  focusAreas?: string[];
}) {
  return ContextFormatter.buildSocraticContext(input);
}

// 便捷函数：构建法律分析上下文
export function buildLegalAnalysisContext(input: {
  documentText: string;
  analysisType: 'facts' | 'evidence' | 'reasoning' | 'timeline' | 'claims';
  depth: 'basic' | 'detailed' | 'comprehensive';
  priorAnalysis?: any;
}) {
  return ContextFormatter.buildLegalAnalysisContext(input);
}

// 便捷函数：获取可用模板列表
export function getAvailableTemplates() {
  return templateManager.list();
}

// 便捷函数：按场景推荐模板
export function recommendTemplate(scenario: string) {
  return templateManager.findByScenario(scenario);
}

// 便捷函数：智能模板推荐
export function smartRecommendTemplate(context: {
  scenario?: string;
  mode?: string;
  documentType?: string;
  educationLevel?: string;
  complexity?: 'low' | 'medium' | 'high';
}) {
  return templateManager.recommend(context);
}

// 便捷函数：获取使用统计
export function getUsageStats() {
  return ContextFormatter.getUsageStats();
}

// 便捷函数：批量构建上下文
export function batchBuildContexts<T>(templateId: string, inputs: T[], options?: any) {
  return ContextFormatter.batchBuild(templateId, inputs, options);
}

// 便捷函数：获取模板健康状态
export function validateTemplates() {
  return templateManager.validateTemplates();
}

// 便捷函数：生成使用报告
export function generateUsageReport() {
  return templateManager.generateUsageReport();
}

// 高级API：自定义模板注册
export function registerCustomTemplate<T>(template: any) {
  templateManager.register(template);
  console.log(`✅ 自定义模板 '${template.id}' 已注册`);
}

// 高级API：导出模板配置
export function exportTemplateConfig() {
  return templateManager.exportConfig();
}

// 高级API：重置使用统计
export function resetUsageStats() {
  templateManager.resetUsageStats();
}

// 工具函数：检查依赖
export function checkDependencies() {
  const dependencies = {
    tokenCalculator: false,
    templates: false
  };

  try {
    // 检查token计算器
    const tokenCalc = require('../token-calculator');
    dependencies.tokenCalculator = typeof tokenCalc.countTokens === 'function';
  } catch (error) {
    console.warn('Token calculator 依赖未找到，某些功能可能受限');
  }

  // 检查模板
  dependencies.templates = templateManager.list().length > 0;

  return dependencies;
}

// 工具函数：获取版本信息
export function getVersion() {
  return {
    version: '1.0.0-legal-education',
    description: 'Context Manager optimized for legal education platform',
    templates: templateManager.list().length,
    lastUpdated: new Date().toISOString()
  };
}

// 调试函数：获取调试信息
export function getDebugInfo() {
  const validation = validateTemplates();
  const usage = getUsageStats();
  const dependencies = checkDependencies();

  return {
    version: getVersion(),
    templates: {
      total: templateManager.list().length,
      valid: validation.valid.length,
      invalid: validation.invalid.length,
      scenarios: templateManager.getAvailableScenarios(),
      modes: templateManager.getAvailableModes()
    },
    usage,
    dependencies,
    recommendations: [
      dependencies.tokenCalculator ? '✅ Token计算器已就绪' : '⚠️ 建议配置Token计算器以获得更好的性能',
      validation.invalid.length === 0 ? '✅ 所有模板验证通过' : `⚠️ 发现${validation.invalid.length}个无效模板`,
      usage.totalTemplates > 0 ? '✅ 模板系统已初始化' : '⚠️ 没有可用模板'
    ]
  };
}

// 快速开始指南
export const QUICK_START = {
  basic: 'formatContext({ role: "法学教授", current: "请分析这个案例" })',
  socratic: 'buildSocraticContext({ caseText: "...", studentLevel: "intermediate", currentTopic: "合同履行" })',
  analysis: 'buildLegalAnalysisContext({ documentText: "...", analysisType: "facts", depth: "detailed" })',
  custom: 'buildMessages("your-template-id", yourInput)'
};

// 默认导出主类
export default ContextFormatter;

// 导出常量
export const TEMPLATE_IDS = {
  STANDARD: 'standard',
  SOCRATIC: 'socratic-dialogue',
  LEGAL_ANALYSIS: 'legal-analysis'
} as const;

export const ANALYSIS_TYPES = {
  FACTS: 'facts',
  EVIDENCE: 'evidence',
  REASONING: 'reasoning',
  TIMELINE: 'timeline',
  CLAIMS: 'claims'
} as const;

export const EDUCATION_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
} as const;

export const TEACHING_MODES = {
  SOCRATIC: 'socratic',
  ANALYSIS: 'analysis',
  EXTRACTION: 'extraction',
  TIMELINE: 'timeline',
  SUMMARY: 'summary'
} as const;