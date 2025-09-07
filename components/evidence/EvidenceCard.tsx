/**
 * Evidence Card Component
 * Draggable evidence card with quality indicators
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Image, 
  Mic, 
  Video, 
  File,
  Shield,
  Link,
  Scale,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Evidence {
  id: string;
  name: string;
  type: 'document' | 'image' | 'audio' | 'video' | 'testimony' | 'other';
  content: string;
  source?: string;
  date?: string;
  quality?: {
    authenticity: number;  // 真实性 0-100
    relevance: number;     // 相关性 0-100
    legality: number;      // 合法性 0-100
  };
  mappedTo?: string[];     // 已映射到的要素ID
  verified?: boolean;
}

interface EvidenceCardProps {
  evidence: Evidence;
  isDraggable?: boolean;
  isFlippable?: boolean;
  isCompact?: boolean;
  showQuality?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export function EvidenceCard({
  evidence,
  isDraggable = true,
  isFlippable = false,
  isCompact = false,
  showQuality = true,
  isSelected = false,
  onSelect,
  className,
}: EvidenceCardProps) {
  // Get icon based on evidence type
  const getTypeIcon = () => {
    switch (evidence.type) {
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'audio':
        return <Mic className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'testimony':
        return <Scale className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };

  // Get type color
  const getTypeColor = () => {
    switch (evidence.type) {
      case 'document':
        return 'bg-blue-100 text-blue-800';
      case 'image':
        return 'bg-green-100 text-green-800';
      case 'audio':
        return 'bg-purple-100 text-purple-800';
      case 'video':
        return 'bg-pink-100 text-pink-800';
      case 'testimony':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate overall quality score
  const calculateOverallQuality = () => {
    if (!evidence.quality) return 0;
    const { authenticity, relevance, legality } = evidence.quality;
    return Math.round((authenticity + relevance + legality) / 3);
  };

  const overallQuality = calculateOverallQuality();
  
  // Get quality indicator color
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Front content
  const frontContent = (
    <div className={cn("p-4", isCompact && "p-3")}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded", getTypeColor())}>
            {getTypeIcon()}
          </div>
          <div>
            <h4 className={cn(
              "font-medium text-gray-900",
              isCompact ? "text-sm" : "text-base"
            )}>
              {evidence.name}
            </h4>
            {evidence.source && !isCompact && (
              <p className="text-xs text-gray-500 mt-0.5">
                来源: {evidence.source}
              </p>
            )}
          </div>
        </div>
        
        {/* Verification Badge */}
        {evidence.verified !== undefined && (
          <Badge
            variant={evidence.verified ? "default" : "secondary"}
            className="gap-1"
          >
            {evidence.verified ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {evidence.verified ? "已验证" : "未验证"}
          </Badge>
        )}
      </div>

      {/* Content Preview */}
      {!isCompact && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {evidence.content}
        </p>
      )}

      {/* Quality Indicators */}
      {showQuality && evidence.quality && (
        <div className="space-y-2">
          {!isCompact && (
            <>
              {/* Individual Quality Metrics */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    真实性
                  </span>
                  <span className={getQualityColor(evidence.quality.authenticity)}>
                    {evidence.quality.authenticity}%
                  </span>
                </div>
                <Progress value={evidence.quality.authenticity} className="h-1.5" />

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Link className="w-3 h-3" />
                    相关性
                  </span>
                  <span className={getQualityColor(evidence.quality.relevance)}>
                    {evidence.quality.relevance}%
                  </span>
                </div>
                <Progress value={evidence.quality.relevance} className="h-1.5" />

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    合法性
                  </span>
                  <span className={getQualityColor(evidence.quality.legality)}>
                    {evidence.quality.legality}%
                  </span>
                </div>
                <Progress value={evidence.quality.legality} className="h-1.5" />
              </div>
            </>
          )}

          {/* Overall Score */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">综合评分</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-bold",
                getQualityColor(overallQuality)
              )}>
                {overallQuality}
              </span>
              <span className="text-xs text-gray-500">/100</span>
            </div>
          </div>
        </div>
      )}

      {/* Mapped Elements */}
      {evidence.mappedTo && evidence.mappedTo.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">已映射到要素:</p>
          <div className="flex flex-wrap gap-1">
            {evidence.mappedTo.map((elementId) => (
              <Badge key={elementId} variant="outline" className="text-xs">
                {elementId}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      {evidence.date && (
        <div className="mt-3 text-xs text-gray-500">
          日期: {evidence.date}
        </div>
      )}
    </div>
  );

  // Back content (if flippable)
  const backContent = isFlippable ? (
    <div className="p-4">
      <h4 className="font-medium text-gray-900 mb-3">详细信息</h4>
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">类型:</span> {evidence.type}
        </div>
        <div>
          <span className="font-medium">来源:</span> {evidence.source || '未知'}
        </div>
        <div>
          <span className="font-medium">日期:</span> {evidence.date || '未知'}
        </div>
        <div className="pt-2">
          <span className="font-medium">完整内容:</span>
          <p className="mt-1 text-gray-600">{evidence.content}</p>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <motion.div
      whileHover={isDraggable ? { scale: 1.02 } : undefined}
      whileDrag={{ scale: 1.05 }}
      className={cn(
        "relative",
        isSelected && "ring-2 ring-primary",
        className
      )}
    >
      <InteractiveCard
        id={evidence.id}
        frontContent={frontContent}
        backContent={backContent}
        isDraggable={isDraggable}
        isFlippable={isFlippable}
        dragData={{ type: 'evidence', evidence }}
        className="h-full"
      />
      
      {/* Drag Indicator Overlay */}
      {isDraggable && (
        <div className="absolute top-2 left-2 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-6 h-0.5 bg-gray-300 rounded mb-1"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-4 h-0.5 bg-gray-300 rounded"
          />
        </div>
      )}
    </motion.div>
  );
}