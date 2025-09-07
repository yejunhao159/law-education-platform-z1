/**
 * 整合版证据质量评估组件
 * 基于中国证据法体系，接入真实案例数据
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Shield,
  FileCheck,
  Link2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Info,
  TrendingUp
} from 'lucide-react';

import { useCaseStore } from '@/lib/stores/useCaseStore';

// 中国证据法的三性评估标准
interface EvidenceQualityDimensions {
  authenticity: number;  // 真实性 (0-100)
  legitimacy: number;    // 合法性 (0-100)
  relevance: number;     // 关联性 (0-100)
}

interface EvidenceAssessment {
  id: string;
  evidenceName: string;
  evidenceType: string;
  quality: EvidenceQualityDimensions;
  issues: string[];
  suggestions: string[];
  supportsClaims: string[];
  legalBasis: string[];
}

export function EvidenceQualitySystemIntegrated() {
  const { caseData } = useCaseStore();
  const [assessments, setAssessments] = useState<EvidenceAssessment[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);

  // 基于中国证据法评估证据质量
  const assessEvidenceQuality = useCallback((evidence: any): EvidenceAssessment => {
    const assessment: EvidenceAssessment = {
      id: evidence.id,
      evidenceName: evidence.title,
      evidenceType: evidence.type,
      quality: {
        authenticity: 0,
        legitimacy: 0,
        relevance: 0
      },
      issues: [],
      suggestions: [],
      supportsClaims: evidence.supportsClaim || [],
      legalBasis: []
    };

    // 评估真实性
    if (evidence.type === 'document') {
      if (evidence.source === 'original') {
        assessment.quality.authenticity = 95;
        assessment.legalBasis.push('《民事诉讼法》第70条 - 书证应当提交原件');
      } else if (evidence.source === 'copy') {
        assessment.quality.authenticity = 70;
        assessment.issues.push('复印件需要与原件核对');
        assessment.suggestions.push('建议提供原件或进行公证');
      } else {
        assessment.quality.authenticity = 50;
        assessment.issues.push('证据来源不明确');
      }
    } else if (evidence.type === 'witness') {
      assessment.quality.authenticity = 75;
      assessment.legalBasis.push('《民事诉讼法》第72条 - 证人证言规定');
      if (!evidence.witnessIdentity) {
        assessment.issues.push('证人身份未核实');
        assessment.suggestions.push('需要提供证人身份证明');
      }
    } else if (evidence.type === 'electronic') {
      assessment.quality.authenticity = 80;
      assessment.legalBasis.push('《民法典》第1356条 - 电子数据作为证据');
      if (evidence.hasDigitalSignature) {
        assessment.quality.authenticity = 90;
      } else {
        assessment.suggestions.push('建议进行电子数据公证或存证');
      }
    }

    // 评估合法性
    assessment.quality.legitimacy = 90; // 默认合法
    if (evidence.obtainedIllegally) {
      assessment.quality.legitimacy = 0;
      assessment.issues.push('证据可能通过非法手段获得');
      assessment.legalBasis.push('《民事诉讼法》第68条 - 非法证据排除');
    }
    if (evidence.type === 'recording' && !evidence.hasConsent) {
      assessment.quality.legitimacy = 60;
      assessment.issues.push('录音证据未经对方同意');
      assessment.suggestions.push('需要证明录音内容不侵犯他人合法权益');
    }

    // 评估关联性
    if (evidence.supportsClaim && evidence.supportsClaim.length > 0) {
      assessment.quality.relevance = 85;
      if (evidence.directEvidence) {
        assessment.quality.relevance = 95;
      }
    } else {
      assessment.quality.relevance = 40;
      assessment.issues.push('证据与案件事实关联性不强');
      assessment.suggestions.push('需要补充说明证据与待证事实的关系');
    }

    // 添加中国法律依据
    assessment.legalBasis.push('《最高人民法院关于民事诉讼证据的若干规定》');
    
    return assessment;
  }, []);

  // 批量评估所有证据
  const assessAllEvidence = useCallback(async () => {
    if (!caseData?.evidence) return;

    setIsAssessing(true);
    try {
      const allAssessments = caseData.evidence.map(evidence => 
        assessEvidenceQuality(evidence)
      );
      
      // 模拟异步处理
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAssessments(allAssessments);
    } catch (error) {
      console.error('证据评估失败:', error);
    } finally {
      setIsAssessing(false);
    }
  }, [caseData, assessEvidenceQuality]);

  // 初始化时自动评估
  useEffect(() => {
    if (caseData?.evidence && assessments.length === 0) {
      assessAllEvidence();
    }
  }, [caseData, assessments.length, assessAllEvidence]);

  // 计算总体质量分数
  const calculateOverallScore = (quality: EvidenceQualityDimensions): number => {
    return Math.round((quality.authenticity + quality.legitimacy + quality.relevance) / 3);
  };

  // 获取质量等级
  const getQualityLevel = (score: number): { label: string; color: string } => {
    if (score >= 85) return { label: '优秀', color: 'text-green-600' };
    if (score >= 70) return { label: '良好', color: 'text-blue-600' };
    if (score >= 60) return { label: '合格', color: 'text-yellow-600' };
    return { label: '需改进', color: 'text-red-600' };
  };

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">请先导入案例数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 证据概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              证据质量评估（中国证据法体系）
            </span>
            <Button 
              size="sm" 
              onClick={assessAllEvidence}
              disabled={isAssessing}
            >
              {isAssessing ? '评估中...' : '重新评估'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {caseData.evidence?.length || 0}
              </p>
              <p className="text-sm text-gray-500">证据总数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {assessments.filter(a => calculateOverallScore(a.quality) >= 70).length}
              </p>
              <p className="text-sm text-gray-500">合格证据</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {assessments.reduce((sum, a) => sum + a.issues.length, 0)}
              </p>
              <p className="text-sm text-gray-500">待解决问题</p>
            </div>
          </div>

          {/* 法律依据提示 */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              根据《民事诉讼法》和《最高人民法院关于民事诉讼证据的若干规定》进行证据三性评估
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 证据列表 */}
      <div className="grid gap-4">
        {assessments.map((assessment, index) => {
          const overallScore = calculateOverallScore(assessment.quality);
          const qualityLevel = getQualityLevel(overallScore);
          const isSelected = selectedEvidence === assessment.id;

          return (
            <motion.div
              key={assessment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onClick={() => setSelectedEvidence(isSelected ? null : assessment.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="w-4 h-4" />
                        {assessment.evidenceName}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{assessment.evidenceType}</Badge>
                        <Badge className={qualityLevel.color}>
                          {qualityLevel.label} ({overallScore}分)
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* 三性评分 */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>真实性</span>
                        <span>{assessment.quality.authenticity}%</span>
                      </div>
                      <Progress value={assessment.quality.authenticity} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>合法性</span>
                        <span>{assessment.quality.legitimacy}%</span>
                      </div>
                      <Progress value={assessment.quality.legitimacy} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>关联性</span>
                        <span>{assessment.quality.relevance}%</span>
                      </div>
                      <Progress value={assessment.quality.relevance} className="h-2" />
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t space-y-3"
                    >
                      {/* 问题 */}
                      {assessment.issues.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <XCircle className="w-4 h-4 text-red-500" />
                            存在问题
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {assessment.issues.map((issue, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-red-500">•</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 建议 */}
                      {assessment.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            改进建议
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {assessment.suggestions.map((suggestion, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 法律依据 */}
                      {assessment.legalBasis.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Scale className="w-4 h-4 text-green-500" />
                            法律依据
                          </p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {assessment.legalBasis.map((basis, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500">§</span>
                                {basis}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 如果没有证据 */}
      {assessments.length === 0 && !isAssessing && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-gray-600">暂无证据需要评估</p>
            <p className="text-sm text-gray-500 mt-2">请先在案例中添加证据材料</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}