/**
 * 苏格拉底模块性能监控服务 - 简化版本
 */

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log
};

export class SocraticPerformanceService {
  private static instance: SocraticPerformanceService;
  private sessionMetrics: Map<string, any> = new Map();

  private constructor() {
    logger.info('SocraticPerformanceService initialized');
  }

  public static getInstance(): SocraticPerformanceService {
    if (!SocraticPerformanceService.instance) {
      SocraticPerformanceService.instance = new SocraticPerformanceService();
    }
    return SocraticPerformanceService.instance;
  }

  async recordAPIRequest(params: {
    endpoint: string;
    method: string;
    duration: number;
    status: number;
    sessionId?: string;
  }) {
    const { endpoint, method, duration, status, sessionId } = params;
    
    logger.info(`API Request: ${method} ${endpoint} - ${status} - ${duration}ms`, {
      sessionId
    });
    
    return {
      recorded: true,
      timestamp: Date.now()
    };
  }

  async recordDialogueMetrics(params: {
    sessionId: string;
    level: number;
    responseTime: number;
    questionCount: number;
    participantCount: number;
  }) {
    const { sessionId, level, responseTime, questionCount, participantCount } = params;
    
    logger.info(`Dialogue Metrics: Session ${sessionId}`, {
      level,
      responseTime,
      questionCount,
      participantCount
    });
    
    this.sessionMetrics.set(sessionId, {
      level,
      responseTime,
      questionCount,
      participantCount,
      timestamp: Date.now()
    });
    
    return {
      recorded: true,
      timestamp: Date.now()
    };
  }

  getSessionMetrics(sessionId: string) {
    return this.sessionMetrics.get(sessionId) || null;
  }

  getAllMetrics() {
    return Object.fromEntries(this.sessionMetrics);
  }
}

// 单例导出
export const socraticPerformance = SocraticPerformanceService.getInstance();