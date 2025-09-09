/**
 * 指标导出器
 * 负责将收集的指标导出到外部监控系统（如Prometheus、Grafana等）
 */

import { metricsCollector, AggregatedMetrics } from './metrics-collector';
import { createLogger } from '../utils/socratic-logger';

const logger = createLogger('metrics-exporter');

export interface ExporterConfig {
  type: 'prometheus' | 'grafana' | 'console' | 'file';
  endpoint?: string;
  apiKey?: string;
  interval?: number;
  format?: 'json' | 'prometheus' | 'influx';
}

export class MetricsExporter {
  private static instance: MetricsExporter;
  private exporters: Map<string, any> = new Map();
  private exportInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.initialize();
  }

  public static getInstance(): MetricsExporter {
    if (!MetricsExporter.instance) {
      MetricsExporter.instance = new MetricsExporter();
    }
    return MetricsExporter.instance;
  }

  /**
   * 初始化导出器
   */
  private initialize() {
    // 监听指标事件
    metricsCollector.on('metrics', (metrics: AggregatedMetrics) => {
      this.handleMetrics(metrics);
    });

    metricsCollector.on('alert', (alert: any) => {
      this.handleAlert(alert);
    });

    // 从环境变量读取配置
    this.setupExportersFromEnv();
    
    logger.info('指标导出器已初始化');
  }

  /**
   * 从环境变量设置导出器
   */
  private setupExportersFromEnv() {
    // Prometheus导出器
    if (process.env.PROMETHEUS_ENABLED === 'true') {
      this.addExporter('prometheus', {
        type: 'prometheus',
        endpoint: process.env.PROMETHEUS_PUSHGATEWAY_URL || 'http://localhost:9091',
        interval: parseInt(process.env.PROMETHEUS_PUSH_INTERVAL || '10000')
      });
    }

    // Grafana导出器
    if (process.env.GRAFANA_ENABLED === 'true') {
      this.addExporter('grafana', {
        type: 'grafana',
        endpoint: process.env.GRAFANA_ENDPOINT,
        apiKey: process.env.GRAFANA_API_KEY,
        interval: 30000
      });
    }

    // 控制台导出器（开发环境）
    if (process.env.NODE_ENV === 'development') {
      this.addExporter('console', {
        type: 'console',
        interval: 60000 // 每分钟输出一次
      });
    }
  }

  /**
   * 添加导出器
   */
  public addExporter(name: string, config: ExporterConfig) {
    switch (config.type) {
      case 'prometheus':
        this.exporters.set(name, new PrometheusExporter(config));
        break;
      case 'grafana':
        this.exporters.set(name, new GrafanaExporter(config));
        break;
      case 'console':
        this.exporters.set(name, new ConsoleExporter(config));
        break;
      case 'file':
        this.exporters.set(name, new FileExporter(config));
        break;
    }
    
    logger.info(`添加导出器: ${name}`, { type: config.type });
  }

  /**
   * 处理指标
   */
  private async handleMetrics(metrics: AggregatedMetrics) {
    for (const [name, exporter] of this.exporters.entries()) {
      try {
        await exporter.export(metrics);
      } catch (error) {
        logger.error(`导出器 ${name} 失败`, error);
      }
    }
  }

  /**
   * 处理告警
   */
  private async handleAlert(alert: any) {
    logger.warn('收到告警', alert);
    
    // 发送到告警通道
    for (const [name, exporter] of this.exporters.entries()) {
      if (exporter.sendAlert) {
        try {
          await exporter.sendAlert(alert);
        } catch (error) {
          logger.error(`告警发送失败 ${name}`, error);
        }
      }
    }
  }

  /**
   * 停止导出器
   */
  public stop() {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
    
    for (const exporter of this.exporters.values()) {
      if (exporter.stop) {
        exporter.stop();
      }
    }
    
    logger.info('指标导出器已停止');
  }
}

/**
 * Prometheus导出器
 */
class PrometheusExporter {
  private config: ExporterConfig;
  private pushInterval: NodeJS.Timeout | null = null;
  
  constructor(config: ExporterConfig) {
    this.config = config;
    this.startPushing();
  }

  private startPushing() {
    if (this.config.interval) {
      this.pushInterval = setInterval(() => {
        this.pushMetrics();
      }, this.config.interval);
    }
  }

  async export(metrics: AggregatedMetrics) {
    const promMetrics = this.formatPrometheus(metrics);
    // 这里实际应该推送到Prometheus Pushgateway
    // 为了演示，只记录日志
    logger.debug('Prometheus metrics formatted', { 
      lines: promMetrics.split('\n').length 
    });
  }

  private formatPrometheus(metrics: AggregatedMetrics): string {
    const lines: string[] = [];
    const timestamp = Date.now();
    
    // 格式化为Prometheus文本格式
    lines.push(`# HELP socratic_active_users Number of active users`);
    lines.push(`# TYPE socratic_active_users gauge`);
    lines.push(`socratic_active_users ${metrics.metrics.activeUsers} ${timestamp}`);
    
    lines.push(`# HELP socratic_active_sessions Number of active sessions`);
    lines.push(`# TYPE socratic_active_sessions gauge`);
    lines.push(`socratic_active_sessions ${metrics.metrics.activeSessions} ${timestamp}`);
    
    lines.push(`# HELP socratic_messages_per_second Messages processed per second`);
    lines.push(`# TYPE socratic_messages_per_second gauge`);
    lines.push(`socratic_messages_per_second ${metrics.metrics.messagesPerSecond} ${timestamp}`);
    
    lines.push(`# HELP socratic_avg_response_time Average response time in ms`);
    lines.push(`# TYPE socratic_avg_response_time gauge`);
    lines.push(`socratic_avg_response_time ${metrics.metrics.avgResponseTime} ${timestamp}`);
    
    lines.push(`# HELP socratic_total_requests Total number of requests`);
    lines.push(`# TYPE socratic_total_requests counter`);
    lines.push(`socratic_total_requests ${metrics.metrics.totalRequests} ${timestamp}`);
    
    lines.push(`# HELP socratic_error_rate Error rate`);
    lines.push(`# TYPE socratic_error_rate gauge`);
    lines.push(`socratic_error_rate ${metrics.metrics.errorRate} ${timestamp}`);
    
    lines.push(`# HELP socratic_ai_calls Total AI calls`);
    lines.push(`# TYPE socratic_ai_calls counter`);
    lines.push(`socratic_ai_calls ${metrics.metrics.aiCalls} ${timestamp}`);
    
    lines.push(`# HELP socratic_ai_response_time AI average response time`);
    lines.push(`# TYPE socratic_ai_response_time gauge`);
    lines.push(`socratic_ai_response_time ${metrics.metrics.aiAvgResponseTime} ${timestamp}`);
    
    lines.push(`# HELP socratic_cpu_usage CPU usage percentage`);
    lines.push(`# TYPE socratic_cpu_usage gauge`);
    lines.push(`socratic_cpu_usage ${metrics.metrics.cpuUsage} ${timestamp}`);
    
    lines.push(`# HELP socratic_memory_usage Memory usage in MB`);
    lines.push(`# TYPE socratic_memory_usage gauge`);
    lines.push(`socratic_memory_usage ${metrics.metrics.memoryUsage} ${timestamp}`);
    
    return lines.join('\n');
  }

  private async pushMetrics() {
    const snapshot = metricsCollector.getSnapshot();
    // 实际推送到Pushgateway的代码
    logger.debug('推送指标到Prometheus', {
      endpoint: this.config.endpoint,
      metrics: Object.keys(snapshot.counters).length
    });
  }

  stop() {
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
    }
  }
}

/**
 * Grafana导出器
 */
class GrafanaExporter {
  private config: ExporterConfig;
  
  constructor(config: ExporterConfig) {
    this.config = config;
  }

  async export(metrics: AggregatedMetrics) {
    if (!this.config.endpoint || !this.config.apiKey) {
      return;
    }

    const payload = this.formatGrafana(metrics);
    
    try {
      // 实际发送到Grafana的代码
      logger.debug('发送指标到Grafana', {
        endpoint: this.config.endpoint,
        dataPoints: payload.length
      });
    } catch (error) {
      logger.error('Grafana导出失败', error);
    }
  }

  private formatGrafana(metrics: AggregatedMetrics): any[] {
    const timestamp = Math.floor(metrics.timestamp.getTime() / 1000);
    
    return [
      {
        name: 'socratic.active_users',
        value: metrics.metrics.activeUsers,
        timestamp
      },
      {
        name: 'socratic.active_sessions', 
        value: metrics.metrics.activeSessions,
        timestamp
      },
      {
        name: 'socratic.messages_per_second',
        value: metrics.metrics.messagesPerSecond,
        timestamp
      },
      {
        name: 'socratic.avg_response_time',
        value: metrics.metrics.avgResponseTime,
        timestamp
      },
      {
        name: 'socratic.error_rate',
        value: metrics.metrics.errorRate,
        timestamp
      },
      {
        name: 'socratic.ai_response_time',
        value: metrics.metrics.aiAvgResponseTime,
        timestamp
      }
    ];
  }

  async sendAlert(alert: any) {
    // 发送告警到Grafana
    logger.info('发送告警到Grafana', alert);
  }
}

/**
 * 控制台导出器
 */
class ConsoleExporter {
  private config: ExporterConfig;
  private lastExport: Date = new Date();
  
  constructor(config: ExporterConfig) {
    this.config = config;
  }

  async export(metrics: AggregatedMetrics) {
    const now = new Date();
    const timeSinceLastExport = now.getTime() - this.lastExport.getTime();
    
    // 按配置的间隔输出
    if (timeSinceLastExport < (this.config.interval || 60000)) {
      return;
    }
    
    this.lastExport = now;
    
    console.log('\n📊 === 苏格拉底模块性能指标 ===');
    console.log(`⏰ 时间: ${metrics.timestamp.toLocaleString()}`);
    console.log('\n实时指标:');
    console.log(`  👥 活跃用户: ${metrics.metrics.activeUsers}`);
    console.log(`  📚 活跃会话: ${metrics.metrics.activeSessions}`);
    console.log(`  💬 消息速率: ${metrics.metrics.messagesPerSecond.toFixed(2)}/秒`);
    console.log(`  ⚡ 平均响应时间: ${metrics.metrics.avgResponseTime.toFixed(2)}ms`);
    
    console.log('\n累计指标:');
    console.log(`  📈 总请求数: ${metrics.metrics.totalRequests}`);
    console.log(`  ❌ 错误率: ${(metrics.metrics.errorRate * 100).toFixed(2)}%`);
    
    console.log('\nAI指标:');
    console.log(`  🤖 AI调用次数: ${metrics.metrics.aiCalls}`);
    console.log(`  ⏱️ AI响应时间: ${metrics.metrics.aiAvgResponseTime.toFixed(2)}ms`);
    console.log(`  🔄 降级率: ${(metrics.metrics.aiFallbackRate * 100).toFixed(2)}%`);
    
    console.log('\nWebSocket指标:');
    console.log(`  🔌 连接数: ${metrics.metrics.wsConnections}`);
    console.log(`  📨 消息速率: ${metrics.metrics.wsMessageRate.toFixed(2)}/秒`);
    console.log(`  🕐 延迟: ${metrics.metrics.wsLatency.toFixed(2)}ms`);
    
    console.log('\n系统资源:');
    console.log(`  💻 CPU使用率: ${metrics.metrics.cpuUsage.toFixed(2)}%`);
    console.log(`  🧠 内存使用: ${metrics.metrics.memoryUsage.toFixed(2)}MB`);
    console.log(`  📦 堆使用: ${metrics.metrics.heapUsage.toFixed(2)}MB`);
    console.log('================================\n');
  }
}

/**
 * 文件导出器
 */
class FileExporter {
  private config: ExporterConfig;
  private fs = require('fs').promises;
  private path = require('path');
  
  constructor(config: ExporterConfig) {
    this.config = config;
  }

  async export(metrics: AggregatedMetrics) {
    const filename = `metrics-${metrics.timestamp.toISOString().split('T')[0]}.jsonl`;
    const filepath = this.path.join(
      process.env.METRICS_DIR || './metrics',
      filename
    );
    
    try {
      const line = JSON.stringify({
        ...metrics,
        timestamp: metrics.timestamp.toISOString()
      }) + '\n';
      
      await this.fs.appendFile(filepath, line);
    } catch (error) {
      logger.error('文件导出失败', error);
    }
  }
}

// 导出单例实例
export const metricsExporter = MetricsExporter.getInstance();