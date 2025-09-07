/**
 * 开发日志监控页面
 * 实时显示应用中的所有日志
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Play, Pause, Filter } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  source: string;
}

export default function DevLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCapturing, setIsCapturing] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const originalConsole = useRef<any>({});

  useEffect(() => {
    // 保存原始 console 方法
    originalConsole.current = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // 拦截 console 方法
    const interceptConsole = (method: string, level: string) => {
      const original = (console as any)[method];
      (console as any)[method] = function(...args: any[]) {
        if (isCapturing) {
          const logEntry: LogEntry = {
            id: `${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            level: level as any,
            message: args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '),
            data: args.length > 1 ? args.slice(1) : undefined,
            source: 'console'
          };
          
          setLogs(prev => [...prev.slice(-99), logEntry]); // 保留最近100条
        }
        original.apply(console, args);
      };
    };

    // 拦截所有 console 方法
    interceptConsole('log', 'info');
    interceptConsole('info', 'info');
    interceptConsole('warn', 'warn');
    interceptConsole('error', 'error');
    interceptConsole('debug', 'debug');

    // 测试日志
    console.log('📝 日志监控已启动');
    console.info('ℹ️ 这是一条信息日志');
    console.warn('⚠️ 这是一条警告日志');
    console.error('❌ 这是一条错误日志');

    // 清理函数
    return () => {
      // 恢复原始 console 方法
      Object.keys(originalConsole.current).forEach(method => {
        (console as any)[method] = originalConsole.current[method];
      });
    };
  }, [isCapturing]);

  // 自动滚动到底部
  useEffect(() => {
    if (isCapturing) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isCapturing]);

  const clearLogs = () => {
    setLogs([]);
    console.log('🗑️ 日志已清空');
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📥 日志已导出');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-gray-100 text-gray-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'debug': return '🐛';
      case 'info': return '📘';
      case 'warn': return '⚠️';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  // 生成一些测试日志
  const generateTestLogs = () => {
    console.log('🚀 开始测试流程');
    console.info('正在加载数据...', { userId: 123, timestamp: Date.now() });
    console.warn('缓存即将过期', { ttl: 3600 });
    console.error('API 调用失败', new Error('Network timeout'));
    console.debug('调试信息', { state: 'active', count: 42 });
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="h-[80vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              🔍 开发日志监控
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsCapturing(!isCapturing)}
                variant={isCapturing ? 'default' : 'outline'}
                size="sm"
              >
                {isCapturing ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                {isCapturing ? '暂停' : '继续'}
              </Button>
              <Button onClick={generateTestLogs} variant="outline" size="sm">
                生成测试日志
              </Button>
              <Button onClick={clearLogs} variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                清空
              </Button>
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            </div>
          </div>
          
          {/* 过滤器 */}
          <div className="flex gap-2 mt-4">
            <Badge 
              className={`cursor-pointer ${filter === 'all' ? 'bg-primary' : 'bg-gray-200'}`}
              onClick={() => setFilter('all')}
            >
              全部 ({logs.length})
            </Badge>
            <Badge 
              className={`cursor-pointer ${filter === 'debug' ? 'bg-gray-600' : 'bg-gray-200'}`}
              onClick={() => setFilter('debug')}
            >
              调试 ({logs.filter(l => l.level === 'debug').length})
            </Badge>
            <Badge 
              className={`cursor-pointer ${filter === 'info' ? 'bg-blue-600' : 'bg-gray-200'}`}
              onClick={() => setFilter('info')}
            >
              信息 ({logs.filter(l => l.level === 'info').length})
            </Badge>
            <Badge 
              className={`cursor-pointer ${filter === 'warn' ? 'bg-yellow-600' : 'bg-gray-200'}`}
              onClick={() => setFilter('warn')}
            >
              警告 ({logs.filter(l => l.level === 'warn').length})
            </Badge>
            <Badge 
              className={`cursor-pointer ${filter === 'error' ? 'bg-red-600' : 'bg-gray-200'}`}
              onClick={() => setFilter('error')}
            >
              错误 ({logs.filter(l => l.level === 'error').length})
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-2 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                暂无日志。等待日志输出或点击"生成测试日志"...
              </div>
            ) : (
              filteredLogs.map(log => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded"
                >
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <Badge className={`${getLevelColor(log.level)} px-2 py-0`}>
                    {getLevelIcon(log.level)} {log.level}
                  </Badge>
                  <pre className="flex-1 whitespace-pre-wrap break-all">
                    {log.message}
                  </pre>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
      
      {/* 使用说明 */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">💡 使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">在代码中打印日志：</h4>
              <pre className="bg-gray-100 p-2 rounded">
{`console.log('普通日志');
console.info('信息日志');
console.warn('警告日志');
console.error('错误日志');
console.debug('调试日志');`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">功能说明：</h4>
              <ul className="space-y-1">
                <li>• 实时捕获所有 console 输出</li>
                <li>• 按级别过滤日志</li>
                <li>• 导出日志到文本文件</li>
                <li>• 自动滚动到最新日志</li>
                <li>• 最多保留 100 条日志</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}