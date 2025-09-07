/**
 * Dispute Card Component
 * Displays a single dispute focus with interactive elements
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DisputeFocus } from '@/types/dispute-evidence';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users, Gavel, BookOpen, AlertCircle } from 'lucide-react';

interface DisputeCardProps {
  dispute: DisputeFocus;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  showTeachingNotes?: boolean;
  className?: string;
}

export function DisputeCard({
  dispute,
  isSelected = false,
  onSelect,
  showTeachingNotes = false,
  className = ''
}: DisputeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic':
        return 'bg-green-100 text-green-800';
      case 'advanced':
        return 'bg-yellow-100 text-yellow-800';
      case 'professional':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeachingValueColor = (value: string) => {
    switch (value) {
      case 'high':
        return 'bg-purple-100 text-purple-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card 
        className={`cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
        onClick={() => onSelect?.(dispute.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {dispute.content}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Badge className={getDifficultyColor(dispute.difficulty)}>
              难度: {dispute.difficulty === 'basic' ? '基础' : 
                     dispute.difficulty === 'advanced' ? '进阶' : '专业'}
            </Badge>
            <Badge className={getTeachingValueColor(dispute.teachingValue)}>
              教学价值: {dispute.teachingValue === 'high' ? '高' :
                        dispute.teachingValue === 'medium' ? '中' : '低'}
            </Badge>
            {dispute.claimBasis.length > 0 && (
              <Badge variant="outline">
                请求权: {dispute.claimBasis.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Three Views Story */}
          <div className="space-y-3">
            {/* Plaintiff View */}
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">原告说：</p>
                <p className="text-sm text-gray-600 mt-1">{dispute.plaintiffView}</p>
              </div>
            </div>

            {/* Defendant View */}
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">被告说：</p>
                <p className="text-sm text-gray-600 mt-1">{dispute.defendantView}</p>
              </div>
            </div>

            {/* Court View */}
            <div className="flex items-start gap-2">
              <Gavel className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">法官认为：</p>
                <p className="text-sm text-gray-600 mt-1">{dispute.courtView}</p>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t"
              >
                {/* Related Laws */}
                {dispute.relatedLaws.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">相关法条：</p>
                    <div className="flex flex-wrap gap-1">
                      {dispute.relatedLaws.map((law, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {law.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Points */}
                {dispute.keyPoints && dispute.keyPoints.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">关键要点：</p>
                    <ul className="list-disc list-inside space-y-1">
                      {dispute.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm text-gray-600">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Teaching Notes */}
                {showTeachingNotes && dispute.aiAnalysis && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">教学提示：</p>
                        <p className="text-sm text-blue-800">{dispute.aiAnalysis}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Claim Basis */}
                {dispute.claimBasis.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">请求权基础：</p>
                    <div className="space-y-2">
                      {dispute.claimBasis.map((claim) => (
                        <div key={claim.id} className="bg-gray-50 rounded p-2">
                          <p className="text-sm font-medium text-gray-800">{claim.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{claim.legalBasis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}