/**
 * Error State Component for Dispute Analysis
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  XCircle,
  WifiOff,
  FileQuestion,
  ShieldAlert,
  Home,
  ArrowLeft
} from 'lucide-react';

export type ErrorType = 'network' | 'parsing' | 'api' | 'validation' | 'unknown';

interface DisputeErrorStateProps {
  error?: Error | string;
  errorType?: ErrorType;
  onRetry?: () => void;
  onBack?: () => void;
  showDetails?: boolean;
}

export function DisputeErrorState({
  error,
  errorType = 'unknown',
  onRetry,
  onBack,
  showDetails = false
}: DisputeErrorStateProps) {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="w-12 h-12 text-red-500" />;
      case 'parsing':
        return <FileQuestion className="w-12 h-12 text-orange-500" />;
      case 'api':
        return <ShieldAlert className="w-12 h-12 text-yellow-500" />;
      case 'validation':
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
      default:
        return <XCircle className="w-12 h-12 text-red-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'network':
        return '网络连接失败';
      case 'parsing':
        return '数据解析错误';
      case 'api':
        return 'API 服务异常';
      case 'validation':
        return '数据验证失败';
      default:
        return '分析出现错误';
    }
  };

  const getErrorMessage = () => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    
    switch (errorType) {
      case 'network':
        return '无法连接到服务器，请检查网络连接后重试';
      case 'parsing':
        return '无法解析返回的数据，请联系技术支持';
      case 'api':
        return 'AI 服务暂时不可用，请稍后重试';
      case 'validation':
        return '提交的数据不符合要求，请检查后重试';
      default:
        return '系统遇到了一个意外错误，请重试或联系支持';
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center space-y-6"
        >
          {/* Error Icon */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse'
            }}
          >
            {getErrorIcon()}
          </motion.div>

          {/* Error Message */}
          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-xl font-semibold text-gray-900">
              {getErrorTitle()}
            </h3>
            <p className="text-gray-600">
              {getErrorMessage()}
            </p>
          </div>

          {/* Error Details */}
          {showDetails && error && (
            <Alert className="max-w-lg">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>错误详情</AlertTitle>
              <AlertDescription className="mt-2 font-mono text-xs">
                {typeof error === 'string' ? error : error.stack || error.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onRetry && (
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                重新尝试
              </Button>
            )}
            {onBack && (
              <Button onClick={onBack} variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                返回上一页
              </Button>
            )}
            {!onBack && !onRetry && (
              <Button onClick={() => window.location.href = '/'} variant="outline" className="gap-2">
                <Home className="w-4 h-4" />
                返回首页
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-500 max-w-md">
            <p>如果问题持续存在，请尝试：</p>
            <ul className="mt-2 space-y-1">
              <li>• 刷新页面</li>
              <li>• 清除浏览器缓存</li>
              <li>• 联系技术支持</li>
            </ul>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

/**
 * Mini Error Alert for inline errors
 */
interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertTitle>错误</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{message}</span>
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="ml-2 h-6 px-2"
            >
              关闭
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

/**
 * Empty State Component
 */
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = '暂无数据',
  message = '当前没有可显示的内容',
  icon,
  action
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon && (
          <div className="mb-4 text-gray-400">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 text-center max-w-sm mb-6">{message}</p>
        {action && (
          <Button onClick={action.onClick} variant="outline">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}