/**
 * 模板管理器 - 法学教育平台增强版
 * 管理所有模板的注册和使用，支持场景化查找和智能推荐
 */

import type { ContextTemplate, TemplateManager as ITemplateManager } from "../types";

export class TemplateManager implements ITemplateManager {
  private templates = new Map<string, ContextTemplate<any>>();
  private usageStats = new Map<string, number>();
  private scenarioMap = new Map<string, string[]>();
  private modeMap = new Map<string, string[]>();

  /**
   * 注册模板
   */
  register<T>(template: ContextTemplate<T>): void {
    this.templates.set(template.id, template);

    // 记录场景映射
    if (template.scenarios) {
      template.scenarios.forEach(scenario => {
        const templates = this.scenarioMap.get(scenario) || [];
        if (!templates.includes(template.id)) {
          templates.push(template.id);
          this.scenarioMap.set(scenario, templates);
        }
      });
    }

    // 记录教学模式映射
    if (template.supportedModes) {
      template.supportedModes.forEach(mode => {
        const templates = this.modeMap.get(mode) || [];
        if (!templates.includes(template.id)) {
          templates.push(template.id);
          this.modeMap.set(mode, templates);
        }
      });
    }

    console.log(`✅ Template '${template.id}' registered successfully`);
  }

  /**
   * 获取模板
   */
  get<T>(id: string): ContextTemplate<T> | undefined {
    const template = this.templates.get(id);

    if (template) {
      // 记录使用统计
      const currentCount = this.usageStats.get(id) || 0;
      this.usageStats.set(id, currentCount + 1);
    }

    return template;
  }

  /**
   * 列出所有模板
   */
  list(): Array<{ id: string; name: string; description: string; scenarios?: string[] }> {
    return Array.from(this.templates.values()).map((template) => {
      const result: { id: string; name: string; description: string; scenarios?: string[] } = {
        id: template.id,
        name: template.name,
        description: template.description,
      };

      // 只有当scenarios存在时才添加该属性
      if (template.scenarios) {
        result.scenarios = template.scenarios;
      }

      return result;
    });
  }

  /**
   * 检查模板是否存在
   */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * 移除模板
   */
  unregister(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    // 清理场景映射
    if (template.scenarios) {
      template.scenarios.forEach(scenario => {
        const templates = this.scenarioMap.get(scenario) || [];
        const index = templates.indexOf(id);
        if (index > -1) {
          templates.splice(index, 1);
          if (templates.length === 0) {
            this.scenarioMap.delete(scenario);
          } else {
            this.scenarioMap.set(scenario, templates);
          }
        }
      });
    }

    // 清理模式映射
    if (template.supportedModes) {
      template.supportedModes.forEach(mode => {
        const templates = this.modeMap.get(mode) || [];
        const index = templates.indexOf(id);
        if (index > -1) {
          templates.splice(index, 1);
          if (templates.length === 0) {
            this.modeMap.delete(mode);
          } else {
            this.modeMap.set(mode, templates);
          }
        }
      });
    }

    // 清理使用统计
    this.usageStats.delete(id);

    return this.templates.delete(id);
  }

  /**
   * 清空所有模板
   */
  clear(): void {
    this.templates.clear();
    this.usageStats.clear();
    this.scenarioMap.clear();
    this.modeMap.clear();
  }

  /**
   * 按场景查找模板
   */
  findByScenario(scenario: string): ContextTemplate<any>[] {
    const templateIds = this.scenarioMap.get(scenario) || [];
    return templateIds.map(id => this.templates.get(id)).filter(Boolean) as ContextTemplate<any>[];
  }

  /**
   * 按教学模式查找模板
   */
  findByMode(mode: string): ContextTemplate<any>[] {
    const templateIds = this.modeMap.get(mode) || [];
    return templateIds.map(id => this.templates.get(id)).filter(Boolean) as ContextTemplate<any>[];
  }

  /**
   * 智能推荐模板
   */
  recommend(context: {
    scenario?: string;
    mode?: string;
    documentType?: string;
    educationLevel?: string;
    complexity?: 'low' | 'medium' | 'high';
  }): Array<{ template: ContextTemplate<any>; score: number; reason: string }> {
    const candidates: Array<{ template: ContextTemplate<any>; score: number; reasons: string[] }> = [];

    // 获取所有模板
    for (const template of Array.from(this.templates.values())) {
      let score = 0;
      const reasons: string[] = [];

      // 场景匹配
      if (context.scenario && template.scenarios?.includes(context.scenario)) {
        score += 10;
        reasons.push(`支持${context.scenario}场景`);
      }

      // 教学模式匹配
      if (context.mode && template.supportedModes?.includes(context.mode)) {
        score += 8;
        reasons.push(`支持${context.mode}教学模式`);
      }

      // 使用频率加分
      const usageCount = this.usageStats.get(template.id) || 0;
      if (usageCount > 0) {
        score += Math.min(usageCount / 10, 5); // 最多加5分
        reasons.push(`经过${usageCount}次验证`);
      }

      // 模板复杂度匹配
      if (context.complexity) {
        const complexityScore = this.assessTemplateComplexity(template);
        const targetComplexity = { low: 1, medium: 2, high: 3 }[context.complexity];

        if (Math.abs(complexityScore - targetComplexity) <= 1) {
          score += 3;
          reasons.push(`复杂度匹配${context.complexity}`);
        }
      }

      // 只推荐有一定分数的模板
      if (score > 0) {
        candidates.push({
          template,
          score,
          reasons
        });
      }
    }

    // 按分数排序并返回前5个
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(candidate => ({
        template: candidate.template,
        score: candidate.score,
        reason: candidate.reasons.join(', ')
      }));
  }

  /**
   * 评估模板复杂度
   */
  private assessTemplateComplexity(template: ContextTemplate<any>): number {
    let complexity = 1; // 基础复杂度

    // 基于描述长度
    if (template.description.length > 100) {
      complexity += 1;
    }

    // 基于支持的场景数量
    if (template.scenarios && template.scenarios.length > 3) {
      complexity += 1;
    }

    // 基于支持的模式数量
    if (template.supportedModes && template.supportedModes.length > 2) {
      complexity += 1;
    }

    return Math.min(complexity, 3); // 最高3级复杂度
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): Map<string, number> {
    return new Map(this.usageStats);
  }

  /**
   * 获取最受欢迎的模板
   */
  getMostPopularTemplates(limit: number = 5): Array<{
    template: ContextTemplate<any>;
    usageCount: number;
  }> {
    return Array.from(this.templates.values())
      .map(template => ({
        template,
        usageCount: this.usageStats.get(template.id) || 0
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * 获取可用场景列表
   */
  getAvailableScenarios(): string[] {
    return Array.from(this.scenarioMap.keys());
  }

  /**
   * 获取可用教学模式列表
   */
  getAvailableModes(): string[] {
    return Array.from(this.modeMap.keys());
  }

  /**
   * 导出模板配置
   */
  exportConfig(): {
    templates: Array<{
      id: string;
      name: string;
      description: string;
      scenarios?: string[];
      supportedModes?: string[];
    }>;
    usage: { [key: string]: number };
    scenarios: { [key: string]: string[] };
    modes: { [key: string]: string[] };
  } {
    return {
      templates: this.list(),
      usage: Object.fromEntries(this.usageStats),
      scenarios: Object.fromEntries(this.scenarioMap),
      modes: Object.fromEntries(this.modeMap)
    };
  }

  /**
   * 重置使用统计
   */
  resetUsageStats(): void {
    this.usageStats.clear();
    console.log('📊 Usage statistics reset');
  }

  /**
   * 验证模板完整性
   */
  validateTemplates(): {
    valid: string[];
    invalid: Array<{ id: string; errors: string[] }>;
  } {
    const valid: string[] = [];
    const invalid: Array<{ id: string; errors: string[] }> = [];

    for (const [id, template] of Array.from(this.templates.entries())) {
      const errors: string[] = [];

      // 检查必需属性
      if (!template.name || template.name.trim().length === 0) {
        errors.push('模板名称不能为空');
      }

      if (!template.description || template.description.trim().length === 0) {
        errors.push('模板描述不能为空');
      }

      // 检查方法
      if (typeof template.build !== 'function') {
        errors.push('缺少build方法');
      }

      if (typeof template.buildMessages !== 'function') {
        errors.push('缺少buildMessages方法');
      }

      if (errors.length === 0) {
        valid.push(id);
      } else {
        invalid.push({ id, errors });
      }
    }

    return { valid, invalid };
  }

  /**
   * 生成使用报告
   */
  generateUsageReport(): {
    summary: {
      totalTemplates: number;
      totalUsage: number;
      averageUsage: number;
      mostUsed: string | null;
      leastUsed: string | null;
    };
    details: Array<{
      templateId: string;
      name: string;
      usageCount: number;
      percentage: number;
    }>;
    recommendations: string[];
  } {
    const totalUsage = Array.from(this.usageStats.values()).reduce((sum, count) => sum + count, 0);
    const templateCount = this.templates.size;
    const averageUsage = templateCount > 0 ? totalUsage / templateCount : 0;

    // 找出最常用和最少用的模板
    let mostUsed: string | null = null;
    let leastUsed: string | null = null;
    let maxUsage = -1;
    let minUsage = Infinity;

    for (const [id, count] of Array.from(this.usageStats.entries())) {
      if (count > maxUsage) {
        maxUsage = count;
        mostUsed = id;
      }
      if (count < minUsage) {
        minUsage = count;
        leastUsed = id;
      }
    }

    // 生成详细信息
    const details = Array.from(this.templates.values()).map(template => {
      const usageCount = this.usageStats.get(template.id) || 0;
      return {
        templateId: template.id,
        name: template.name,
        usageCount,
        percentage: totalUsage > 0 ? (usageCount / totalUsage) * 100 : 0
      };
    }).sort((a, b) => b.usageCount - a.usageCount);

    // 生成建议
    const recommendations: string[] = [];

    if (templateCount === 0) {
      recommendations.push('建议注册基础模板以开始使用');
    } else if (totalUsage === 0) {
      recommendations.push('模板已注册但未被使用，建议检查集成');
    } else {
      if (averageUsage < 5) {
        recommendations.push('模板使用频率较低，考虑优化模板设计');
      }

      const unusedTemplates = details.filter(d => d.usageCount === 0);
      if (unusedTemplates.length > 0) {
        recommendations.push(`发现${unusedTemplates.length}个未使用模板，考虑移除或改进`);
      }
    }

    return {
      summary: {
        totalTemplates: templateCount,
        totalUsage,
        averageUsage: Number(averageUsage.toFixed(2)),
        mostUsed,
        leastUsed: minUsage === Infinity ? null : leastUsed
      },
      details,
      recommendations
    };
  }
}

/**
 * 全局模板管理器实例
 */
export const templateManager = new TemplateManager();