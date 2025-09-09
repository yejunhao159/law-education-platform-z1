/**
 * 苏格拉底日志工具单元测试
 * @module __tests__/utils/socratic-logger
 */

import { SocraticLogger, LogStorage } from '@/lib/utils/socratic-logger'
import { LogLevel, LogEntry, LogContext } from '@/lib/types/socratic'

describe('SocraticLogger', () => {
  let logger: SocraticLogger
  let consoleSpies: {
    log: jest.SpyInstance
    info: jest.SpyInstance
    warn: jest.SpyInstance
    error: jest.SpyInstance
  }

  beforeEach(() => {
    // 清理存储
    LogStorage.clear()
    
    // 创建新实例
    logger = new SocraticLogger({
      module: 'test-module',
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableStorage: true,
      maxStorageSize: 100
    })

    // 监听console方法
    consoleSpies = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation()
    }
  })

  afterEach(() => {
    // 恢复console方法
    Object.values(consoleSpies).forEach(spy => spy.mockRestore())
  })

  describe('日志级别控制', () => {
    it('应该记录所有级别的日志（DEBUG模式）', () => {
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      expect(consoleSpies.log).toHaveBeenCalledTimes(1)
      expect(consoleSpies.info).toHaveBeenCalledTimes(1)
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpies.error).toHaveBeenCalledTimes(1)
    })

    it('应该过滤低级别日志（INFO模式）', () => {
      const infoLogger = new SocraticLogger({
        module: 'info-test',
        level: LogLevel.INFO,
        enableConsole: true
      })

      infoLogger.debug('Debug message') // 不应该输出
      infoLogger.info('Info message')
      infoLogger.warn('Warning message')
      infoLogger.error('Error message')

      expect(consoleSpies.log).not.toHaveBeenCalled()
      expect(consoleSpies.info).toHaveBeenCalledTimes(1)
      expect(consoleSpies.warn).toHaveBeenCalledTimes(1)
      expect(consoleSpies.error).toHaveBeenCalledTimes(1)
    })

    it('应该只记录错误日志（ERROR模式）', () => {
      const errorLogger = new SocraticLogger({
        module: 'error-test',
        level: LogLevel.ERROR,
        enableConsole: true
      })

      errorLogger.debug('Debug message')
      errorLogger.info('Info message')
      errorLogger.warn('Warning message')
      errorLogger.error('Error message')

      expect(consoleSpies.log).not.toHaveBeenCalled()
      expect(consoleSpies.info).not.toHaveBeenCalled()
      expect(consoleSpies.warn).not.toHaveBeenCalled()
      expect(consoleSpies.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('上下文信息', () => {
    it('应该正确记录上下文信息', () => {
      const context: LogContext = {
        sessionId: 'test-session',
        userId: 'test-user',
        level: 1,
        action: 'test-action',
        duration: 100,
        success: true,
        extra: { key: 'value' }
      }

      logger.info('Test message', context)

      const logs = LogStorage.getAll()
      expect(logs).toHaveLength(1)
      expect(logs[0].context).toEqual(context)
    })

    it('应该正确合并默认上下文', () => {
      const contextLogger = new SocraticLogger({
        module: 'context-test',
        defaultContext: {
          sessionId: 'default-session'
        }
      })

      contextLogger.info('Message 1', { userId: 'user-1' })
      contextLogger.info('Message 2', { userId: 'user-2', sessionId: 'override-session' })

      const logs = LogStorage.getAll()
      expect(logs[0].context?.sessionId).toBe('default-session')
      expect(logs[0].context?.userId).toBe('user-1')
      expect(logs[1].context?.sessionId).toBe('override-session')
      expect(logs[1].context?.userId).toBe('user-2')
    })
  })

  describe('存储管理', () => {
    it('应该将日志存储到LogStorage', () => {
      logger.info('Test message 1')
      logger.warn('Test message 2')
      logger.error('Test message 3')

      const logs = LogStorage.getAll()
      expect(logs).toHaveLength(3)
      expect(logs[0].message).toBe('Test message 1')
      expect(logs[1].message).toBe('Test message 2')
      expect(logs[2].message).toBe('Test message 3')
    })

    it('应该限制存储大小', () => {
      const limitedLogger = new SocraticLogger({
        module: 'limited',
        enableStorage: true,
        maxStorageSize: 3
      })

      for (let i = 0; i < 5; i++) {
        limitedLogger.info(`Message ${i}`)
      }

      const logs = LogStorage.getAll()
      expect(logs).toHaveLength(3)
      expect(logs[0].message).toBe('Message 2') // 最旧的被删除
      expect(logs[2].message).toBe('Message 4') // 最新的保留
    })

    it('应该支持按模块筛选日志', () => {
      const logger1 = new SocraticLogger({ module: 'module1' })
      const logger2 = new SocraticLogger({ module: 'module2' })

      logger1.info('Module 1 message')
      logger2.info('Module 2 message')

      const module1Logs = LogStorage.getByModule('module1')
      const module2Logs = LogStorage.getByModule('module2')

      expect(module1Logs).toHaveLength(1)
      expect(module2Logs).toHaveLength(1)
      expect(module1Logs[0].module).toBe('module1')
      expect(module2Logs[0].module).toBe('module2')
    })

    it('应该支持按会话筛选日志', () => {
      logger.info('Message 1', { sessionId: 'session-1' })
      logger.info('Message 2', { sessionId: 'session-2' })
      logger.info('Message 3', { sessionId: 'session-1' })

      const session1Logs = LogStorage.getBySession('session-1')
      const session2Logs = LogStorage.getBySession('session-2')

      expect(session1Logs).toHaveLength(2)
      expect(session2Logs).toHaveLength(1)
    })

    it('应该支持按级别筛选日志', () => {
      logger.debug('Debug')
      logger.info('Info')
      logger.warn('Warning')
      logger.error('Error')

      const errorLogs = LogStorage.getByLevel(LogLevel.ERROR)
      const warnAndAbove = LogStorage.getByLevel(LogLevel.WARN)

      expect(errorLogs).toHaveLength(1)
      expect(warnAndAbove).toHaveLength(2) // warn + error
    })
  })

  describe('性能测量', () => {
    it('应该正确测量操作耗时', async () => {
      const operation = logger.startTimer('test-operation')
      
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const duration = operation.end('Operation completed')
      
      expect(duration).toBeGreaterThan(90)
      expect(duration).toBeLessThan(150)

      const logs = LogStorage.getAll()
      const lastLog = logs[logs.length - 1]
      expect(lastLog.context?.action).toBe('test-operation')
      expect(lastLog.context?.duration).toBe(duration)
      expect(lastLog.context?.success).toBe(true)
    })

    it('应该记录失败的操作', () => {
      const operation = logger.startTimer('failed-operation')
      operation.end('Operation failed', false)

      const logs = LogStorage.getAll()
      const lastLog = logs[logs.length - 1]
      expect(lastLog.level).toBe(LogLevel.ERROR)
      expect(lastLog.context?.success).toBe(false)
    })
  })

  describe('格式化输出', () => {
    it('应该正确格式化日志消息', () => {
      logger.info('Test message', {
        sessionId: 'test-123',
        userId: 'user-456'
      })

      const expectedPattern = /\[test-module\] Test message \| Session: test-123, User: user-456/
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringMatching(expectedPattern)
      )
    })

    it('应该格式化错误对象', () => {
      const error = new Error('Test error')
      logger.error('Operation failed', { extra: { error } })

      expect(consoleSpies.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed'),
        { error }
      )
    })
  })

  describe('批量操作', () => {
    it('应该支持批量导出日志', () => {
      logger.info('Message 1')
      logger.warn('Message 2')
      logger.error('Message 3')

      const exported = LogStorage.export()
      const parsed = JSON.parse(exported)

      expect(parsed.logs).toHaveLength(3)
      expect(parsed.exportedAt).toBeDefined()
      expect(parsed.totalCount).toBe(3)
    })

    it('应该支持批量导入日志', () => {
      const logs: LogEntry[] = [
        {
          timestamp: Date.now(),
          level: LogLevel.INFO,
          module: 'imported',
          message: 'Imported message'
        }
      ]

      const exportData = JSON.stringify({
        logs,
        exportedAt: Date.now(),
        totalCount: 1
      })

      LogStorage.clear()
      LogStorage.import(exportData)

      const imported = LogStorage.getAll()
      expect(imported).toHaveLength(1)
      expect(imported[0].module).toBe('imported')
    })
  })

  describe('统计分析', () => {
    it('应该提供日志统计信息', () => {
      logger.debug('Debug')
      logger.info('Info 1')
      logger.info('Info 2')
      logger.warn('Warning')
      logger.error('Error')

      const stats = LogStorage.getStats()

      expect(stats.total).toBe(5)
      expect(stats.byLevel[LogLevel.DEBUG]).toBe(1)
      expect(stats.byLevel[LogLevel.INFO]).toBe(2)
      expect(stats.byLevel[LogLevel.WARN]).toBe(1)
      expect(stats.byLevel[LogLevel.ERROR]).toBe(1)
      expect(stats.modules).toContain('test-module')
    })

    it('应该统计会话信息', () => {
      logger.info('Message 1', { sessionId: 'session-1' })
      logger.info('Message 2', { sessionId: 'session-1' })
      logger.info('Message 3', { sessionId: 'session-2' })

      const stats = LogStorage.getStats()
      expect(stats.sessions).toHaveLength(2)
      expect(stats.sessions).toContain('session-1')
      expect(stats.sessions).toContain('session-2')
    })
  })

  describe('清理功能', () => {
    it('应该清理旧日志', () => {
      const now = Date.now()
      
      // 添加不同时间的日志
      LogStorage['logs'] = [
        { timestamp: now - 8 * 60 * 60 * 1000, level: LogLevel.INFO, module: 'old', message: 'Old' },
        { timestamp: now - 4 * 60 * 60 * 1000, level: LogLevel.INFO, module: 'recent', message: 'Recent' },
        { timestamp: now, level: LogLevel.INFO, module: 'new', message: 'New' }
      ]

      LogStorage.cleanup(6 * 60 * 60 * 1000) // 清理6小时前的日志

      const remaining = LogStorage.getAll()
      expect(remaining).toHaveLength(2)
      expect(remaining[0].message).toBe('Recent')
      expect(remaining[1].message).toBe('New')
    })

    it('应该清理特定会话的日志', () => {
      logger.info('Keep 1', { sessionId: 'keep' })
      logger.info('Remove 1', { sessionId: 'remove' })
      logger.info('Keep 2', { sessionId: 'keep' })
      logger.info('Remove 2', { sessionId: 'remove' })

      LogStorage.clearSession('remove')

      const remaining = LogStorage.getAll()
      expect(remaining).toHaveLength(2)
      expect(remaining.every(log => log.context?.sessionId === 'keep')).toBe(true)
    })
  })
})