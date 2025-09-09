import { EnvironmentConfig, Environment } from '../../lib/config/environment';

describe('环境配置管理', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let config: EnvironmentConfig;

  beforeAll(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  beforeEach(() => {
    // 重置环境变量
    process.env = {
      NODE_ENV: 'test',
      PORT: '3000',
      HOST: 'localhost',
      LOG_LEVEL: 'info',
      SESSION_SECRET: 'test-secret-key-that-is-long-enough-for-validation'
    };
    
    // 清除单例缓存
    (EnvironmentConfig as any).instance = null;
    config = EnvironmentConfig.getInstance();
  });

  describe('基本配置加载', () => {
    it('应该加载默认配置', () => {
      expect(config.get('NODE_ENV')).toBe('test');
      expect(config.get('PORT')).toBe(3000);
      expect(config.get('HOST')).toBe('localhost');
    });

    it('应该正确转换数据类型', () => {
      process.env.PORT = '4000';
      process.env.CACHE_ENABLED = 'true';
      process.env.RATE_LIMIT_MAX_REQUESTS = '200';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.get('PORT')).toBe(4000);
      expect(config.get('CACHE_ENABLED')).toBe(true);
      expect(config.get('RATE_LIMIT_MAX_REQUESTS')).toBe(200);
    });

    it('应该使用默认值', () => {
      expect(config.get('CACHE_TTL')).toBe(3600);
      expect(config.get('RATE_LIMIT_WINDOW_MS')).toBe(60000);
      expect(config.get('LOG_FORMAT')).toBe('json');
    });
  });

  describe('环境检测', () => {
    it('应该正确识别开发环境', () => {
      process.env.NODE_ENV = 'development';
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
      expect(config.isTest()).toBe(false);
      expect(config.getEnvironment()).toBe(Environment.DEVELOPMENT);
    });

    it('应该正确识别生产环境', () => {
      process.env.NODE_ENV = 'production';
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(false);
      expect(config.getEnvironment()).toBe(Environment.PRODUCTION);
    });

    it('应该正确识别测试环境', () => {
      expect(config.isTest()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(false);
      expect(config.getEnvironment()).toBe(Environment.TEST);
    });
  });

  describe('功能开关', () => {
    it('应该正确检查功能是否启用', () => {
      process.env.FEATURE_SOCRATIC_ENABLED = 'true';
      process.env.FEATURE_CLASSROOM_ENABLED = 'false';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.isFeatureEnabled('SOCRATIC')).toBe(true);
      expect(config.isFeatureEnabled('CLASSROOM')).toBe(false);
      expect(config.isFeatureEnabled('VOTING')).toBe(true); // 默认值
    });
  });

  describe('维护模式', () => {
    it('应该检测维护模式', () => {
      process.env.MAINTENANCE_MODE = 'true';
      process.env.MAINTENANCE_MESSAGE = '系统升级中';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.isMaintenanceMode()).toBe(true);
      expect(config.get('MAINTENANCE_MESSAGE')).toBe('系统升级中');
    });

    it('应该在维护结束时间后自动退出维护模式', () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1小时前
      process.env.MAINTENANCE_MODE = 'true';
      process.env.MAINTENANCE_END_TIME = pastTime;
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.isMaintenanceMode()).toBe(false);
    });

    it('应该在维护结束时间前保持维护模式', () => {
      const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1小时后
      process.env.MAINTENANCE_MODE = 'true';
      process.env.MAINTENANCE_END_TIME = futureTime;
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      expect(config.isMaintenanceMode()).toBe(true);
    });
  });

  describe('配置组获取', () => {
    it('应该获取数据库配置', () => {
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.DATABASE_POOL_MIN = '5';
      process.env.DATABASE_POOL_MAX = '20';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const dbConfig = config.getDatabaseConfig();
      expect(dbConfig.url).toBe('postgresql://localhost/test');
      expect(dbConfig.pool.min).toBe(5);
      expect(dbConfig.pool.max).toBe(20);
    });

    it('应该获取Redis配置', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.REDIS_PASSWORD = 'secret';
      process.env.REDIS_TTL = '7200';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const redisConfig = config.getRedisConfig();
      expect(redisConfig.url).toBe('redis://localhost:6379');
      expect(redisConfig.password).toBe('secret');
      expect(redisConfig.ttl).toBe(7200);
    });

    it('应该获取AI服务配置', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.DEEPSEEK_API_KEY = 'ds-test';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const aiConfig = config.getAIConfig();
      expect(aiConfig.openai.apiKey).toBe('sk-test');
      expect(aiConfig.openai.model).toBe('gpt-4');
      expect(aiConfig.deepseek.apiKey).toBe('ds-test');
    });

    it('应该获取WebSocket配置', () => {
      process.env.WS_PORT = '3001';
      process.env.WS_CORS_ORIGIN = 'http://localhost:3000';
      process.env.WS_MAX_CONNECTIONS = '500';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const wsConfig = config.getWebSocketConfig();
      expect(wsConfig.port).toBe(3001);
      expect(wsConfig.cors.origin).toBe('http://localhost:3000');
      expect(wsConfig.maxConnections).toBe(500);
    });

    it('应该获取限流配置', () => {
      process.env.RATE_LIMIT_ENABLED = 'true';
      process.env.RATE_LIMIT_WINDOW_MS = '30000';
      process.env.RATE_LIMIT_MAX_REQUESTS = '50';
      process.env.AI_RATE_LIMIT_MAX_REQUESTS = '5';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const rateLimitConfig = config.getRateLimitConfig();
      expect(rateLimitConfig.enabled).toBe(true);
      expect(rateLimitConfig.windowMs).toBe(30000);
      expect(rateLimitConfig.maxRequests).toBe(50);
      expect(rateLimitConfig.aiMaxRequests).toBe(5);
    });
  });

  describe('配置验证', () => {
    it('应该验证必需的配置', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const isValid = config.validateRequired(['OPENAI_API_KEY', 'DATABASE_URL']);
      expect(isValid).toBe(true);
    });

    it('应该检测缺失的必需配置', () => {
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const isValid = config.validateRequired(['OPENAI_API_KEY', 'DATABASE_URL']);
      expect(isValid).toBe(false);
    });

    it('应该验证URL格式', () => {
      process.env.BASE_URL = 'not-a-url';
      
      // 在测试环境下，错误的URL会使用默认值
      (EnvironmentConfig as any).instance = null;
      expect(() => EnvironmentConfig.getInstance()).not.toThrow();
    });

    it('应该验证邮箱格式', () => {
      process.env.ALERT_EMAIL = 'not-an-email';
      
      // 在测试环境下，错误的邮箱会使用默认值
      (EnvironmentConfig as any).instance = null;
      expect(() => EnvironmentConfig.getInstance()).not.toThrow();
    });
  });

  describe('配置摘要', () => {
    it('应该隐藏敏感信息', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.OPENAI_API_KEY = 'sk-secret-key';
      process.env.SESSION_SECRET = 'very-secret-session-key-that-is-long';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const summary = config.getSummary();
      expect(summary.DATABASE_URL).toBe('[CONFIGURED]');
      expect(summary.OPENAI_API_KEY).toBe('[CONFIGURED]');
      expect(summary.SESSION_SECRET).toBe('[CONFIGURED]');
      expect(summary.PORT).toBe(3000); // 非敏感信息应该显示
    });

    it('应该标记未设置的敏感配置', () => {
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const summary = config.getSummary();
      expect(summary.DATABASE_URL).toBe('[NOT_SET]');
      expect(summary.OPENAI_API_KEY).toBe('[NOT_SET]');
    });
  });

  describe('健康检查', () => {
    it('应该检测配置问题', () => {
      process.env.NODE_ENV = 'production';
      process.env.FEATURE_SOCRATIC_ENABLED = 'true';
      // 不设置AI服务密钥
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const health = config.checkHealth();
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('苏格拉底功能已启用但未配置AI服务');
    });

    it('应该在生产环境检测安全配置', () => {
      process.env.NODE_ENV = 'production';
      // 不设置SESSION_SECRET
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const health = config.checkHealth();
      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('生产环境缺少SESSION_SECRET');
    });

    it('应该在配置正确时返回健康状态', () => {
      process.env.NODE_ENV = 'production';
      process.env.SESSION_SECRET = 'a-very-long-secret-key-for-production-use';
      process.env.DATABASE_URL = 'postgresql://localhost/prod';
      process.env.FEATURE_SOCRATIC_ENABLED = 'false';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const health = config.checkHealth();
      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });
  });

  describe('配置重载', () => {
    it('应该支持热重载配置', () => {
      expect(config.get('LOG_LEVEL')).toBe('info');
      
      // 修改环境变量
      process.env.LOG_LEVEL = 'debug';
      
      // 重载配置
      config.reload();
      
      expect(config.get('LOG_LEVEL')).toBe('debug');
    });
  });

  describe('获取所有配置', () => {
    it('应该返回完整的配置对象', () => {
      process.env.PORT = '5000';
      process.env.CACHE_ENABLED = 'true';
      
      (EnvironmentConfig as any).instance = null;
      config = EnvironmentConfig.getInstance();
      
      const allConfig = config.getAll();
      expect(allConfig.PORT).toBe(5000);
      expect(allConfig.CACHE_ENABLED).toBe(true);
      expect(allConfig.NODE_ENV).toBe('test');
    });
  });
});