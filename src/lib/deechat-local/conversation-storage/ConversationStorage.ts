/**
 * 对话存储管理器 - 法学教育平台集成版本
 * 提供统一的对话存储接口，支持多种存储后端
 */

import { MemoryStorage } from './storage/MemoryStorage';
import type {
  ConversationSession,
  ConversationMessage,
  CreateSessionInput,
  UpdateSessionInput,
  CreateMessageInput,
  SessionQueryOptions,
  MessageQueryOptions,
  ConversationStats,
  ConversationStorageOptions,
  SearchOptions,
  SearchResult,
  ExportOptions,
  ExportResult,
  ImportOptions,
  ImportResult,
  AnalyticsResult,
  DatabaseError,
  ValidationError,
  NotFoundError
} from './types';

/**
 * 对话存储管理器主类
 * 专为法学教育平台优化，提供丰富的教学数据管理功能
 */
export class ConversationStorage {
  private storage: MemoryStorage;
  private initialized = false;
  private options: ConversationStorageOptions;

  constructor(options: ConversationStorageOptions = { storage_type: 'memory' }) {
    this.options = {
      auto_save: true,
      max_sessions: 1000,
      max_messages_per_session: 500,
      enable_compression: false,
      ...options
    };

    // 根据存储类型创建相应的存储实例
    switch (this.options.storage_type) {
      case 'memory':
      case 'localstorage':
        this.storage = new MemoryStorage(this.options);
        break;
      case 'indexeddb':
        // TODO: 实现IndexedDB存储
        console.warn('IndexedDB storage not implemented, falling back to memory storage');
        this.storage = new MemoryStorage(this.options);
        break;
      default:
        throw new DatabaseError(`Unsupported storage type: ${this.options.storage_type}`);
    }
  }

  /**
   * 初始化存储管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 内存存储不需要异步初始化，但保持接口一致性
      this.initialized = true;
      console.log('✅ 对话存储管理器初始化完成');
    } catch (error) {
      throw new DatabaseError(`Failed to initialize ConversationStorage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============ 会话管理 ============

  /**
   * 创建新会话
   */
  createSession(input: CreateSessionInput): ConversationSession {
    this.ensureInitialized();

    // 添加法学教育特有的默认值
    const enhancedInput = {
      ...input,
      education_level: input.education_level || 'undergraduate',
      session_type: input.session_type || 'individual',
      legal_domain: input.legal_domain || ['民法']
    };

    const session = this.storage.createSession(enhancedInput);

    console.log(`📝 创建新会话: ${session.title} (${session.id})`);
    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): ConversationSession | null {
    this.ensureInitialized();
    return this.storage.getSession(sessionId);
  }

  /**
   * 获取会话列表
   */
  getSessions(options?: SessionQueryOptions): ConversationSession[] {
    this.ensureInitialized();
    return this.storage.getSessions(options);
  }

  /**
   * 更新会话
   */
  updateSession(sessionId: string, input: UpdateSessionInput): void {
    this.ensureInitialized();
    this.storage.updateSession(sessionId, input);
    console.log(`📝 更新会话: ${sessionId}`);
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): void {
    this.ensureInitialized();
    this.storage.deleteSession(sessionId);
    console.log(`🗑️ 删除会话: ${sessionId}`);
  }

  /**
   * 获取活跃会话（最近使用的会话）
   */
  getActiveSessions(limit: number = 10): ConversationSession[] {
    return this.getSessions({
      orderBy: 'updated_at',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * 按教学模式获取会话
   */
  getSessionsByTeachingMode(mode: string, limit?: number): ConversationSession[] {
    return this.getSessions({
      teaching_mode: mode as any,
      orderBy: 'updated_at',
      orderDirection: 'DESC',
      limit
    });
  }

  /**
   * 按法律领域获取会话
   */
  getSessionsByLegalDomain(domain: string, limit?: number): ConversationSession[] {
    return this.getSessions({
      legal_domain: domain,
      orderBy: 'updated_at',
      orderDirection: 'DESC',
      limit
    });
  }

  // ============ 消息管理 ============

  /**
   * 保存消息
   */
  saveMessage(input: CreateMessageInput): ConversationMessage {
    this.ensureInitialized();

    // 自动生成教学相关元数据
    const enhancedInput = {
      ...input,
      metadata: {
        ...input.metadata,
        generated_at: new Date().toISOString(),
        platform: 'legal-education'
      }
    };

    const message = this.storage.saveMessage(enhancedInput);

    // 分析消息内容，自动提取法律引用
    if (!message.legal_reference && message.role === 'assistant') {
      message.legal_reference = this.extractLegalReferences(message.content);
    }

    return message;
  }

  /**
   * 获取消息历史
   */
  getMessageHistory(sessionId: string, options?: MessageQueryOptions): ConversationMessage[] {
    this.ensureInitialized();
    return this.storage.getMessageHistory(sessionId, options);
  }

  /**
   * 获取最近消息
   */
  getRecentMessages(sessionId: string, limit: number = 10): ConversationMessage[] {
    this.ensureInitialized();
    return this.storage.getRecentMessages(sessionId, limit);
  }

  /**
   * 获取对话上下文（用于AI）
   */
  getDialogueContext(sessionId: string, maxMessages: number = 20): ConversationMessage[] {
    const messages = this.getMessageHistory(sessionId, {
      orderBy: 'timestamp',
      orderDirection: 'DESC',
      limit: maxMessages
    });

    // 按时间正序排列以构建正确的对话上下文
    return messages.reverse();
  }

  /**
   * 获取苏格拉底对话历史
   */
  getSocraticDialogueHistory(sessionId: string): ConversationMessage[] {
    return this.getMessageHistory(sessionId, {
      message_type: 'question',
      orderBy: 'timestamp',
      orderDirection: 'ASC'
    });
  }

  // ============ 教学分析功能 ============

  /**
   * 分析学生参与度
   */
  analyzeStudentEngagement(sessionId: string): {
    participation_score: number;
    response_quality: number;
    interaction_frequency: number;
    recommendations: string[];
  } {
    const messages = this.getMessageHistory(sessionId);
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    const participationScore = Math.min(userMessages.length * 10, 100);
    const avgResponseLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / Math.max(userMessages.length, 1);
    const responseQuality = Math.min(avgResponseLength / 50 * 100, 100);

    const recommendations: string[] = [];
    if (participationScore < 50) {
      recommendations.push('建议增加互动频率');
    }
    if (responseQuality < 60) {
      recommendations.push('鼓励提供更详细的回答');
    }
    if (userMessages.length === 0) {
      recommendations.push('需要引导学生开始参与对话');
    }

    return {
      participation_score: Math.round(participationScore),
      response_quality: Math.round(responseQuality),
      interaction_frequency: userMessages.length,
      recommendations
    };
  }

  /**
   * 生成教学报告
   */
  generateTeachingReport(sessionId: string): {
    session_summary: any;
    learning_objectives: string[];
    key_concepts_covered: string[];
    student_performance: any;
    improvement_suggestions: string[];
  } {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }

    const messages = this.getMessageHistory(sessionId);
    const engagement = this.analyzeStudentEngagement(sessionId);

    // 提取关键概念
    const keyConcepts = this.extractKeyConcepts(messages);

    // 生成学习目标
    const learningObjectives = this.generateLearningObjectives(session, messages);

    return {
      session_summary: {
        title: session.title,
        duration: this.calculateSessionDuration(messages),
        message_count: messages.length,
        teaching_mode: session.teaching_mode,
        legal_domain: session.legal_domain
      },
      learning_objectives: learningObjectives,
      key_concepts_covered: keyConcepts,
      student_performance: engagement,
      improvement_suggestions: engagement.recommendations
    };
  }

  // ============ 搜索和统计 ============

  /**
   * 搜索对话
   */
  search(options: SearchOptions): SearchResult {
    this.ensureInitialized();
    return this.storage.search(options);
  }

  /**
   * 获取统计信息
   */
  getStats(): ConversationStats {
    this.ensureInitialized();
    return this.storage.getStats();
  }

  /**
   * 获取教学分析报告
   */
  getTeachingAnalytics(dateRange?: { start: string; end: string }): AnalyticsResult {
    const sessions = this.getSessions(dateRange ? { date_range: dateRange } : undefined);
    const allMessages = sessions.flatMap(s => this.getMessageHistory(s.id));

    // 时间序列数据
    const timeSeries = this.generateTimeSeries(sessions, allMessages, dateRange);

    // 热门法律领域
    const domainStats = this.analyzeLegalDomains(sessions);

    // 教学效果分析
    const teachingEffectiveness = this.analyzeTeachingEffectiveness(sessions);

    // 成本分析
    const costAnalysis = this.analyzeCosts(allMessages);

    return {
      time_series: timeSeries,
      top_legal_domains: domainStats,
      teaching_effectiveness: teachingEffectiveness,
      cost_analysis: costAnalysis
    };
  }

  // ============ 导入导出 ============

  /**
   * 导出数据
   */
  export(options: ExportOptions): ExportResult {
    this.ensureInitialized();
    return this.storage.export(options);
  }

  /**
   * 导入数据（简化实现）
   */
  import(data: string, options: ImportOptions): ImportResult {
    this.ensureInitialized();

    try {
      const parsedData = JSON.parse(data);
      let importedSessions = 0;
      let importedMessages = 0;
      const errors: string[] = [];

      // 导入会话
      if (parsedData.sessions) {
        for (const sessionData of parsedData.sessions) {
          try {
            this.createSession(sessionData);
            importedSessions++;
          } catch (error) {
            errors.push(`Failed to import session ${sessionData.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // 导入消息
      if (parsedData.messages) {
        for (const messageData of parsedData.messages) {
          try {
            this.saveMessage(messageData);
            importedMessages++;
          } catch (error) {
            errors.push(`Failed to import message ${messageData.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        imported_sessions: importedSessions,
        imported_messages: importedMessages,
        errors,
        warnings: []
      };

    } catch (error) {
      return {
        success: false,
        imported_sessions: 0,
        imported_messages: 0,
        errors: [`Failed to parse import data: ${error instanceof Error ? error.message : String(error)}`],
        warnings: []
      };
    }
  }

  // ============ 工具方法 ============

  /**
   * 健康检查
   */
  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        details: { error: 'ConversationStorage not initialized' }
      };
    }

    const storageHealth = this.storage.healthCheck();
    const stats = this.getStats();

    return {
      status: storageHealth.status,
      details: {
        ...storageHealth.details,
        conversation_stats: {
          total_sessions: stats.total_sessions,
          total_messages: stats.total_messages,
          average_session_length: stats.average_session_length
        },
        legal_education_features: {
          teaching_modes: Object.keys(stats.sessions_by_teaching_mode),
          education_levels: Object.keys(stats.sessions_by_education_level),
          popular_domains: stats.popular_legal_domains.slice(0, 3)
        }
      }
    };
  }

  /**
   * 关闭存储
   */
  close(): void {
    if (this.storage) {
      this.storage.destroy();
    }
    this.initialized = false;
    console.log('📦 对话存储管理器已关闭');
  }

  // ============ 私有辅助方法 ============

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new DatabaseError('ConversationStorage not initialized. Call initialize() first.');
    }
  }

  private extractLegalReferences(content: string): string[] {
    const references: string[] = [];

    // 提取法条引用
    const statutePattern = /《([^》]+)》第([零一二三四五六七八九十百千万\d]+)条/g;
    let match;
    while ((match = statutePattern.exec(content)) !== null) {
      references.push(`《${match[1]}》第${match[2]}条`);
    }

    // 提取案例引用
    const casePattern = /\((\d{4})\)(.+?)第?(\d+)号/g;
    while ((match = casePattern.exec(content)) !== null) {
      references.push(`(${match[1]})${match[2]}第${match[3]}号`);
    }

    return [...new Set(references)]; // 去重
  }

  private extractKeyConcepts(messages: ConversationMessage[]): string[] {
    const concepts = new Set<string>();
    const legalTerms = [
      '合同', '侵权', '违约', '赔偿', '责任', '权利', '义务', '诉讼',
      '证据', '事实', '法条', '判例', '抗辩', '请求权', '时效', '管辖'
    ];

    messages.forEach(message => {
      legalTerms.forEach(term => {
        if (message.content.includes(term)) {
          concepts.add(term);
        }
      });
    });

    return Array.from(concepts);
  }

  private generateLearningObjectives(session: ConversationSession, messages: ConversationMessage[]): string[] {
    const objectives: string[] = [];

    if (session.teaching_mode === 'socratic') {
      objectives.push('通过苏格拉底式对话培养批判性思维');
      objectives.push('掌握法律问题的分析方法');
    }

    if (session.legal_domain?.includes('合同法')) {
      objectives.push('理解合同的成立和履行规则');
    }

    if (session.legal_domain?.includes('侵权法')) {
      objectives.push('掌握侵权责任的构成要件');
    }

    return objectives;
  }

  private calculateSessionDuration(messages: ConversationMessage[]): number {
    if (messages.length < 2) return 0;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    const startTime = new Date(firstMessage.timestamp).getTime();
    const endTime = new Date(lastMessage.timestamp).getTime();

    return Math.round((endTime - startTime) / 1000 / 60); // 返回分钟数
  }

  private generateTimeSeries(sessions: ConversationSession[], messages: ConversationMessage[], dateRange?: any): any[] {
    // 简化的时间序列生成
    const dailyStats: { [key: string]: any } = {};

    sessions.forEach(session => {
      const date = session.created_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { date, sessions_created: 0, messages_sent: 0, tokens_used: 0, cost: 0 };
      }
      dailyStats[date].sessions_created++;
    });

    messages.forEach(message => {
      const date = message.timestamp.split('T')[0];
      if (dailyStats[date]) {
        dailyStats[date].messages_sent++;
        dailyStats[date].tokens_used += message.token_usage?.total_tokens || 0;
        dailyStats[date].cost += message.token_usage?.estimated_cost || 0;
      }
    });

    return Object.values(dailyStats);
  }

  private analyzeLegalDomains(sessions: ConversationSession[]): Array<{ domain: string; usage_count: number; percentage: number }> {
    const domainCounts: { [key: string]: number } = {};
    let totalCount = 0;

    sessions.forEach(session => {
      session.legal_domain?.forEach(domain => {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        totalCount++;
      });
    });

    return Object.entries(domainCounts)
      .map(([domain, count]) => ({
        domain,
        usage_count: count,
        percentage: Math.round((count / totalCount) * 100 * 100) / 100
      }))
      .sort((a, b) => b.usage_count - a.usage_count);
  }

  private analyzeTeachingEffectiveness(sessions: ConversationSession[]): any {
    // 简化的教学效果分析
    const progressData = sessions
      .map(s => s.student_progress)
      .filter(Boolean);

    if (progressData.length === 0) {
      return {
        engagement_trend: 0,
        learning_progress: 0,
        knowledge_retention: 0
      };
    }

    const avgParticipation = progressData.reduce((sum, p) => sum + p.participation_level, 0) / progressData.length;
    const avgComprehension = progressData.reduce((sum, p) => sum + p.comprehension_level, 0) / progressData.length;
    const avgCriticalThinking = progressData.reduce((sum, p) => sum + p.critical_thinking, 0) / progressData.length;

    return {
      engagement_trend: Math.round(avgParticipation),
      learning_progress: Math.round(avgComprehension),
      knowledge_retention: Math.round(avgCriticalThinking)
    };
  }

  private analyzeCosts(messages: ConversationMessage[]): any {
    const totalCost = messages.reduce((sum, msg) => sum + (msg.token_usage?.estimated_cost || 0), 0);
    const totalMessages = messages.length;
    const totalSessions = new Set(messages.map(m => m.session_id)).size;

    const costByModel: { [key: string]: number } = {};
    messages.forEach(msg => {
      if (msg.token_usage?.model) {
        costByModel[msg.token_usage.model] = (costByModel[msg.token_usage.model] || 0) + (msg.token_usage.estimated_cost || 0);
      }
    });

    return {
      total_cost: Math.round(totalCost * 1000000) / 1000000,
      cost_per_session: totalSessions > 0 ? Math.round((totalCost / totalSessions) * 1000000) / 1000000 : 0,
      cost_per_message: totalMessages > 0 ? Math.round((totalCost / totalMessages) * 1000000) / 1000000 : 0,
      cost_by_model: costByModel
    };
  }
}