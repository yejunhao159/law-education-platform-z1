/**
 * Claim Element Drop Zone Component
 * Drop zone for mapping evidence to claim elements
 */

'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
  Sparkles,
  Shield,
  FileCheck,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClaimElement } from '@/types/dispute-evidence';

interface ClaimElementDropZoneProps {
  element: ClaimElement;
  isActive?: boolean;
  isOver?: boolean;
  canDrop?: boolean;
  onDrop?: (evidenceId: string) => void;
  onRemove?: (evidenceId: string) => void;
  className?: string;
}

export function ClaimElementDropZone({
  element,
  isActive = false,
  isOver = false,
  canDrop = true,
  onDrop,
  onRemove,
  className
}: ClaimElementDropZoneProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    setNodeRef,
    isOver: dropIsOver,
    active
  } = useDroppable({
    id: element.id,
    disabled: !canDrop || element.proved,
    data: {
      type: 'claimElement',
      element
    }
  });

  // Calculate proof percentage
  const proofPercentage = element.supportingEvidence.length > 0
    ? Math.min(100, (element.supportingEvidence.length / (element.required ? 1 : 2)) * 100)
    : 0;

  // Determine zone state
  const getZoneState = () => {
    if (element.proved) return 'proved';
    if (dropIsOver || isOver) return 'over';
    if (isActive || (active && canDrop)) return 'active';
    return 'default';
  };

  const zoneState = getZoneState();

  // Get state colors and styles
  const getStateStyles = () => {
    switch (zoneState) {
      case 'proved':
        return 'border-green-500 bg-green-50 shadow-green-200';
      case 'over':
        return 'border-blue-500 bg-blue-50 shadow-blue-300 scale-102';
      case 'active':
        return 'border-yellow-500 bg-yellow-50 shadow-yellow-200';
      default:
        return 'border-gray-300 bg-white hover:border-gray-400';
    }
  };

  // Get requirement badge variant
  const getRequirementBadge = () => {
    if (element.proved) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle className="w-3 h-3" />
          已证明
        </Badge>
      );
    }
    if (element.required) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          必需
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Shield className="w-3 h-3" />
        可选
      </Badge>
    );
  };

  return (
    <motion.div
      ref={setNodeRef}
      animate={{
        scale: zoneState === 'over' ? 1.02 : 1,
        y: zoneState === 'over' ? -2 : 0
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={className}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200',
          getStateStyles(),
          !element.proved && canDrop && 'cursor-pointer',
          className
        )}
        onClick={() => !element.proved && setIsExpanded(!isExpanded)}
      >
        {/* Drop Indicator Overlay */}
        <AnimatePresence>
          {(dropIsOver || isOver) && !element.proved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-blue-100/50 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <ArrowDown className="w-8 h-8 text-blue-500" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Animation Overlay */}
        <AnimatePresence>
          {element.proved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-2 right-2 z-10"
            >
              <Sparkles className="w-5 h-5 text-green-500" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Target className={cn(
                  'w-4 h-4',
                  element.proved ? 'text-green-600' : 'text-gray-600'
                )} />
                <h4 className="font-medium text-gray-900">
                  {element.name}
                </h4>
              </div>
              <p className="text-sm text-gray-600">
                {element.description}
              </p>
            </div>
            {getRequirementBadge()}
          </div>

          {/* Progress Bar */}
          {!element.proved && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>证明进度</span>
                <span>{Math.round(proofPercentage)}%</span>
              </div>
              <Progress 
                value={proofPercentage} 
                className="h-2"
                indicatorClassName={cn(
                  proofPercentage === 100 ? 'bg-green-500' :
                  proofPercentage >= 50 ? 'bg-yellow-500' : 'bg-gray-300'
                )}
              />
            </div>
          )}

          {/* Supporting Evidence */}
          {element.supportingEvidence.length > 0 && (
            <motion.div
              initial={false}
              animate={{ height: isExpanded ? 'auto' : '32px' }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FileCheck className="w-4 h-4" />
                  <span className="font-medium">
                    支持证据 ({element.supportingEvidence.length})
                  </span>
                </div>
                {isExpanded && (
                  <div className="pl-6 space-y-1">
                    {element.supportingEvidence.map((evidenceId) => (
                      <div
                        key={evidenceId}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm text-gray-600">
                          {evidenceId}
                        </span>
                        {onRemove && !element.proved && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(evidenceId);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {element.supportingEvidence.length === 0 && !element.proved && (
            <div className="text-center py-4">
              <div className="text-gray-400 mb-2">
                <Target className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-sm text-gray-500">
                {canDrop ? '拖拽证据到此处' : '等待证据'}
              </p>
            </div>
          )}

          {/* Drop Hint */}
          <AnimatePresence>
            {(isActive || active) && !element.proved && canDrop && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 p-2 bg-blue-50 rounded text-center"
              >
                <p className="text-xs text-blue-600">
                  松开鼠标将证据映射到此要素
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}

// Export memoized version for performance
export default React.memo(ClaimElementDropZone);