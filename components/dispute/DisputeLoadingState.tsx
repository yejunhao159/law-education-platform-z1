/**
 * Loading State Component for Dispute Analysis
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Loader2 } from 'lucide-react';

interface DisputeLoadingStateProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function DisputeLoadingState({
  message = '正在分析争议焦点...',
  showProgress = false,
  progress = 0
}: DisputeLoadingStateProps) {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Animated Icon */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' }
          }}
          className="relative"
        >
          <Brain className="w-16 h-16 text-primary" />
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <div className="w-full h-full bg-primary/20 rounded-full blur-xl" />
          </motion.div>
        </motion.div>

        {/* Loading Message */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
          <p className="text-sm text-gray-500">AI 正在深度分析案件内容</p>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>分析进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Skeleton Content */}
        <div className="w-full space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>

        {/* Loading Spinner */}
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    </Card>
  );
}

/**
 * Skeleton Card for Dispute List
 */
export function DisputeCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Evidence Loading State
 */
export function EvidenceLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            
            <Skeleton className="h-12 w-full" />
            
            <div className="space-y-1">
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}