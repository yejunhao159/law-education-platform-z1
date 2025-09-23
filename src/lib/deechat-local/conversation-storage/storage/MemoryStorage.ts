/**
 * 内存存储适配器 - 法学教育平台简化版本
 * 提供基本的内存存储能力，支持持久化到localStorage
 */

import type {
  ConversationSession,
  ConversationMessage,
  ConversationStats,
  SessionQueryOptions,
  MessageQueryOptions,
  ConversationStorageOptions,
  SearchOptions,
  SearchResult,
  ExportOptions,
  ExportResult,
  DatabaseError,
  NotFoundError,
  ValidationError
} from '../types';

export class MemoryStorage {
  private sessions: Map<string, ConversationSession> = new Map();
  private messages: Map<string, ConversationMessage> = new Map();
  private messagesBySession: Map<string, string[]> = new Map();
  private options: ConversationStorageOptions;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(options: ConversationStorageOptions) {
    this.options = {
      auto_save: true,
      max_sessions: 1000,
      max_messages_per_session: 500,
      enable_compression: false,
      ...options
    };

    // 从localStorage加载数据
    this.loadFromStorage();

    // 设置自动保存
    if (this.options.auto_save) {
      this.autoSaveTimer = setInterval(() => {
        this.saveToStorage();
      }, 30000); // 30秒自动保存一次
    }

    // 页面关闭时保存
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  // === 会话管理 ===

  createSession(input: any): ConversationSession {
    this.validateSessionInput(input);

    const session: ConversationSession = {
      id: this.generateId(),
      title: input.title,
      ai_config_name: input.ai_config_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      // 法学教育扩展字段
      case_info: input.case_info,
      teaching_mode: input.teaching_mode,
      education_level: input.education_level,
      legal_domain: input.legal_domain,
      session_type: input.session_type,
      metadata: input.metadata || {}
    };

    // 检查会话数量限制
    if (this.sessions.size >= (this.options.max_sessions || 1000)) {
      this.cleanupOldSessions();
    }

    this.sessions.set(session.id, session);
    this.messagesBySession.set(session.id, []);

    if (this.options.auto_save) {
      this.saveToStorage();
    }

    return session;
  }

  getSession(sessionId: string): ConversationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getSessions(options?: SessionQueryOptions): ConversationSession[] {
    let sessions = Array.from(this.sessions.values());

    // 应用过滤器
    if (options) {
      sessions = this.applySessionFilters(sessions, options);
    }

    // 应用排序
    if (options?.orderBy) {
      sessions = this.applySorting(sessions, options);
    }

    // 应用分页
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || sessions.length;
      sessions = sessions.slice(offset, offset + limit);
    }

    return sessions;
  }

  updateSession(sessionId: string, input: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }

    const updatedSession: ConversationSession = {
      ...session,
      ...input,
      updated_at: new Date().toISOString()
    };

    this.sessions.set(sessionId, updatedSession);

    if (this.options.auto_save) {
      this.saveToStorage();
    }
  }

  deleteSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      throw new NotFoundError('Session', sessionId);
    }

    // 删除会话和相关消息
    const messageIds = this.messagesBySession.get(sessionId) || [];
    messageIds.forEach(messageId => {
      this.messages.delete(messageId);
    });

    this.sessions.delete(sessionId);
    this.messagesBySession.delete(sessionId);

    if (this.options.auto_save) {
      this.saveToStorage();
    }
  }

  // === 消息管理 ===

  saveMessage(input: any): ConversationMessage {
    this.validateMessageInput(input);

    const message: ConversationMessage = {
      id: this.generateId(),
      session_id: input.session_id,
      role: input.role,
      content: input.content,
      timestamp: new Date().toISOString(),
      token_usage: input.token_usage,
      // 法学教育扩展字段
      message_type: input.message_type,
      legal_reference: input.legal_reference,
      pedagogical_intent: input.pedagogical_intent,
      difficulty_level: input.difficulty_level,
      evaluation_score: input.evaluation_score,
      feedback: input.feedback,
      metadata: input.metadata || {}
    };

    // 检查会话是否存在
    const session = this.sessions.get(input.session_id);
    if (!session) {
      throw new NotFoundError('Session', input.session_id);
    }

    // 检查消息数量限制
    const sessionMessages = this.messagesBySession.get(input.session_id) || [];
    if (sessionMessages.length >= (this.options.max_messages_per_session || 500)) {
      // 删除最老的消息
      const oldestMessageId = sessionMessages.shift();
      if (oldestMessageId) {
        this.messages.delete(oldestMessageId);
      }
    }

    this.messages.set(message.id, message);
    sessionMessages.push(message.id);
    this.messagesBySession.set(input.session_id, sessionMessages);

    // 更新会话消息计数
    this.updateSession(input.session_id, {
      message_count: sessionMessages.length,
      updated_at: new Date().toISOString()
    });

    if (this.options.auto_save) {
      this.saveToStorage();
    }

    return message;
  }

  getMessageHistory(sessionId: string, options?: MessageQueryOptions): ConversationMessage[] {
    const messageIds = this.messagesBySession.get(sessionId) || [];
    let messages = messageIds
      .map(id => this.messages.get(id))
      .filter(Boolean) as ConversationMessage[];

    // 应用过滤器
    if (options) {
      messages = this.applyMessageFilters(messages, options);
    }

    // 应用排序
    if (options?.orderBy) {
      messages = this.applyMessageSorting(messages, options);
    }

    // 应用分页
    if (options?.limit || options?.offset) {
      const offset = options.offset || 0;
      const limit = options.limit || messages.length;
      messages = messages.slice(offset, offset + limit);
    }

    return messages;
  }

  getRecentMessages(sessionId: string, limit: number = 10): ConversationMessage[] {
    return this.getMessageHistory(sessionId, {
      limit,
      orderBy: 'timestamp',
      orderDirection: 'DESC'
    });
  }

  // === 统计和分析 ===

  getStats(): ConversationStats {
    const sessions = Array.from(this.sessions.values());
    const messages = Array.from(this.messages.values());

    // 基础统计
    const totalSessions = sessions.length;
    const totalMessages = messages.length;

    // 按角色统计消息
    const messagesByRole = {
      user: messages.filter(m => m.role === 'user').length,
      assistant: messages.filter(m => m.role === 'assistant').length,
      system: messages.filter(m => m.role === 'system').length
    };

    // 按教学模式统计会话
    const sessionsByTeachingMode: any = {};
    sessions.forEach(session => {
      if (session.teaching_mode) {
        sessionsByTeachingMode[session.teaching_mode] =
          (sessionsByTeachingMode[session.teaching_mode] || 0) + 1;
      }
    });

    // 按教育水平统计会话
    const sessionsByEducationLevel: any = {};
    sessions.forEach(session => {
      if (session.education_level) {
        sessionsByEducationLevel[session.education_level] =
          (sessionsByEducationLevel[session.education_level] || 0) + 1;
      }
    });

    // 按消息类型统计
    const messagesByType: any = {};
    messages.forEach(message => {
      if (message.message_type) {
        messagesByType[message.message_type] =
          (messagesByType[message.message_type] || 0) + 1;
      }
    });

    // 计算平均值
    const averageSessionLength = totalSessions > 0 ? totalMessages / totalSessions : 0;
    const averageTokensPerMessage = messages.reduce((sum, msg) =>
      sum + (msg.token_usage?.total_tokens || 0), 0) / Math.max(totalMessages, 1);
    const totalCost = messages.reduce((sum, msg) =>
      sum + (msg.token_usage?.estimated_cost || 0), 0);

    // 热门法律领域
    const domainCounts: { [key: string]: number } = {};
    sessions.forEach(session => {
      session.legal_domain?.forEach(domain => {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      });
    });

    const popularLegalDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 学生表现摘要
    const progressData = sessions
      .map(s => s.student_progress)
      .filter(Boolean);

    const studentPerformanceSummary = {
      average_participation: this.calculateAverage(progressData, 'participation_level'),
      average_comprehension: this.calculateAverage(progressData, 'comprehension_level'),
      average_critical_thinking: this.calculateAverage(progressData, 'critical_thinking'),
      average_legal_reasoning: this.calculateAverage(progressData, 'legal_reasoning')
    };

    return {
      total_sessions: totalSessions,
      total_messages: totalMessages,
      messages_by_role: messagesByRole,
      sessions_by_teaching_mode: sessionsByTeachingMode,
      sessions_by_education_level: sessionsByEducationLevel,
      messages_by_type: messagesByType,
      average_session_length: Math.round(averageSessionLength * 100) / 100,
      average_tokens_per_message: Math.round(averageTokensPerMessage * 100) / 100,
      total_cost: Math.round(totalCost * 1000000) / 1000000,
      popular_legal_domains: popularLegalDomains,
      student_performance_summary: studentPerformanceSummary
    };
  }

  // === 搜索功能 ===

  search(options: SearchOptions): SearchResult {
    const query = options.query.toLowerCase();
    const fields = options.fields || ['title', 'content'];

    // 搜索会话
    let sessions = Array.from(this.sessions.values());
    if (options.session_filters) {
      sessions = this.applySessionFilters(sessions, options.session_filters);
    }

    const matchingSessions = sessions
      .map(session => {
        let relevanceScore = 0;

        if (fields.includes('title') && session.title.toLowerCase().includes(query)) {
          relevanceScore += 10;
        }

        // 检查案例信息
        if (session.case_info?.case_number?.toLowerCase().includes(query)) {
          relevanceScore += 5;
        }

        return { ...session, relevance_score: relevanceScore };
      })
      .filter(session => session.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    // 搜索消息
    let messages = Array.from(this.messages.values());
    if (options.message_filters) {
      messages = this.applyMessageFilters(messages, options.message_filters);
    }

    const matchingMessages = messages
      .map(message => {
        let relevanceScore = 0;

        if (fields.includes('content') && message.content.toLowerCase().includes(query)) {
          relevanceScore += 8;
        }

        if (fields.includes('legal_reference') &&
            message.legal_reference?.some(ref => ref.toLowerCase().includes(query))) {
          relevanceScore += 6;
        }

        return { ...message, relevance_score: relevanceScore };
      })
      .filter(message => message.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    const totalMatches = matchingSessions.length + matchingMessages.length;

    return {
      sessions: matchingSessions,
      messages: matchingMessages,
      total_matches: totalMatches,
      suggestions: this.generateSearchSuggestions(query)
    };
  }

  // === 导出功能 ===

  export(options: ExportOptions): ExportResult {
    let sessions = this.getSessions(options.session_filters);
    let messages: ConversationMessage[] = [];

    // 收集相关消息
    sessions.forEach(session => {
      const sessionMessages = this.getMessageHistory(session.id, options.message_filters);
      messages.push(...sessionMessages);
    });

    // 匿名化处理
    if (options.anonymize) {
      sessions = this.anonymizeSessions(sessions);
      messages = this.anonymizeMessages(messages);
    }

    const exportData = {
      sessions,
      messages,
      metadata: options.include_metadata ? {
        export_date: new Date().toISOString(),
        total_sessions: sessions.length,
        total_messages: messages.length,
        format: options.format
      } : undefined
    };

    let data: string;
    switch (options.format) {
      case 'json':
        data = JSON.stringify(exportData, null, 2);
        break;
      case 'csv':
        data = this.convertToCSV(exportData);
        break;
      case 'xml':
        data = this.convertToXML(exportData);
        break;
      default:
        throw new ValidationError(`Unsupported export format: ${options.format}`);
    }

    return {
      data,
      metadata: {
        export_date: new Date().toISOString(),
        total_sessions: sessions.length,
        total_messages: messages.length,
        format: options.format
      }
    };
  }

  // === 工具方法 ===

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateSessionInput(input: any): void {
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('Session title is required');
    }
    if (!input.ai_config_name || input.ai_config_name.trim().length === 0) {
      throw new ValidationError('AI config name is required');
    }
  }

  private validateMessageInput(input: any): void {
    if (!input.session_id) {
      throw new ValidationError('Session ID is required');
    }
    if (!input.role || !['user', 'assistant', 'system'].includes(input.role)) {
      throw new ValidationError('Invalid message role');
    }
    if (!input.content || input.content.trim().length === 0) {
      throw new ValidationError('Message content is required');
    }
  }

  private applySessionFilters(sessions: ConversationSession[], options: SessionQueryOptions): ConversationSession[] {
    return sessions.filter(session => {
      if (options.ai_config_name && session.ai_config_name !== options.ai_config_name) return false;
      if (options.teaching_mode && session.teaching_mode !== options.teaching_mode) return false;
      if (options.education_level && session.education_level !== options.education_level) return false;
      if (options.session_type && session.session_type !== options.session_type) return false;
      if (options.legal_domain && !session.legal_domain?.includes(options.legal_domain)) return false;

      if (options.date_range) {
        const sessionDate = new Date(session.created_at);
        const startDate = new Date(options.date_range.start);
        const endDate = new Date(options.date_range.end);
        if (sessionDate < startDate || sessionDate > endDate) return false;
      }

      return true;
    });
  }

  private applyMessageFilters(messages: ConversationMessage[], options: MessageQueryOptions): ConversationMessage[] {
    return messages.filter(message => {
      if (options.role && message.role !== options.role) return false;
      if (options.message_type && message.message_type !== options.message_type) return false;
      if (options.difficulty_level && message.difficulty_level !== options.difficulty_level) return false;
      if (options.has_legal_reference !== undefined) {
        const hasRef = message.legal_reference && message.legal_reference.length > 0;
        if (options.has_legal_reference !== hasRef) return false;
      }

      if (options.date_range) {
        const messageDate = new Date(message.timestamp);
        const startDate = new Date(options.date_range.start);
        const endDate = new Date(options.date_range.end);
        if (messageDate < startDate || messageDate > endDate) return false;
      }

      return true;
    });
  }

  private applySorting(sessions: ConversationSession[], options: QueryOptions): ConversationSession[] {
    const { orderBy = 'created_at', orderDirection = 'DESC' } = options;

    return sessions.sort((a, b) => {
      let aValue = (a as any)[orderBy];
      let bValue = (b as any)[orderBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (orderDirection === 'ASC') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  private applyMessageSorting(messages: ConversationMessage[], options: QueryOptions): ConversationMessage[] {
    const { orderBy = 'timestamp', orderDirection = 'ASC' } = options;

    return messages.sort((a, b) => {
      let aValue = (a as any)[orderBy];
      let bValue = (b as any)[orderBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (orderDirection === 'ASC') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  private calculateAverage(data: any[], field: string): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((total, item) => total + (item[field] || 0), 0);
    return Math.round((sum / data.length) * 100) / 100;
  }

  private generateSearchSuggestions(query: string): string[] {
    // 简单的搜索建议生成
    const suggestions = [
      '合同纠纷',
      '侵权责任',
      '民事诉讼',
      '刑事案件',
      '行政处罚',
      '婚姻家庭',
      '劳动争议',
      '公司法务'
    ];

    return suggestions.filter(s =>
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }

  private anonymizeSessions(sessions: ConversationSession[]): ConversationSession[] {
    return sessions.map(session => ({
      ...session,
      title: `会话 ${session.id.substr(-8)}`,
      case_info: session.case_info ? {
        ...session.case_info,
        case_number: session.case_info.case_number ? 'XXXX号' : undefined,
        parties: session.case_info.parties?.map(() => '当事人X')
      } : undefined
    }));
  }

  private anonymizeMessages(messages: ConversationMessage[]): ConversationMessage[] {
    return messages.map(message => ({
      ...message,
      content: `[已匿名化的${message.role}消息]`
    }));
  }

  private convertToCSV(data: any): string {
    // 简化的CSV转换
    return 'CSV format not implemented in demo version';
  }

  private convertToXML(data: any): string {
    // 简化的XML转换
    return 'XML format not implemented in demo version';
  }

  private cleanupOldSessions(): void {
    const sessions = Array.from(this.sessions.values())
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // 删除最老的10%的会话
    const deleteCount = Math.floor(sessions.length * 0.1);
    for (let i = 0; i < deleteCount; i++) {
      this.deleteSession(sessions[i].id);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        messages: Array.from(this.messages.entries()),
        messagesBySession: Array.from(this.messagesBySession.entries()),
        timestamp: Date.now()
      };

      const serialized = JSON.stringify(data);
      const key = `${this.options.table_prefix || 'deechat'}_conversations`;

      if (this.options.enable_compression) {
        // 简化的压缩（实际应使用真正的压缩库）
        localStorage.setItem(key, serialized);
      } else {
        localStorage.setItem(key, serialized);
      }

    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `${this.options.table_prefix || 'deechat'}_conversations`;
      const serialized = localStorage.getItem(key);

      if (!serialized) return;

      const data = JSON.parse(serialized);

      this.sessions = new Map(data.sessions);
      this.messages = new Map(data.messages);
      this.messagesBySession = new Map(data.messagesBySession);

    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }

  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.saveToStorage();
  }

  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    try {
      const stats = this.getStats();
      return {
        status: 'healthy',
        details: {
          storage_type: this.options.storage_type,
          total_sessions: stats.total_sessions,
          total_messages: stats.total_messages,
          memory_usage: {
            sessions: this.sessions.size,
            messages: this.messages.size
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }
}