/**
 * 证据质量评估组件 - 基于三要素数据
 * 从提取的案例三要素中评估证据质量
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Info,
  TrendingUp,
  Users,
  Clock,
  FileText,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { useCaseStore } from '@/lib/stores/useCaseStore';
import { logger } from '@/lib/utils/logger';

// 证据质量评估接口
interface EvidenceQualityAssessment {
  id: string;
  evidenceName: string;
  evidenceType: string;
  submittedBy: string;
  
  // 中国证据法的"三性"
  authenticity: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  legitimacy: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  relevance: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  
  // 额外评估维度
  credibilityScore: number; // 从三要素数据中获取
  accepted: boolean; // 法院是否采纳
  weight: 'decisive' | 'important' | 'supporting' | 'weak'; // 证据权重
  chainPosition: string[]; // 在证据链中的位置
  
  // 法律依据
  legalBasis: Array<{
    law: string;
    article: string;
    content: string;
  }>;
  
  // 教学要点
  teachingPoints: string[];
}

export function EvidenceQualityFromThreeElements() {
  const { caseData } = useCaseStore();
  const [assessments, setAssessments] = useState<EvidenceQualityAssessment[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');

  // 从三要素中评估证据质量
  const assessEvidenceFromThreeElements = useMemo(() => {
    if (!caseData?.threeElements?.evidence?.items) {
      logger.warn('没有找到证据数据');
      return [];
    }

    logger.info('开始评估证据质量', {
      evidenceCount: caseData.threeElements.evidence.items.length
    });

    const assessedEvidence: EvidenceQualityAssessment[] = [];

    caseData.threeElements.evidence.items.forEach((evidence: any, index: number) => {
      const assessment: EvidenceQualityAssessment = {
        id: `evidence-${index}`,
        evidenceName: evidence.name,
        evidenceType: evidence.type || '书证',
        submittedBy: evidence.submittedBy || '未知',
        
        // 评估真实性
        authenticity: assessAuthenticity(evidence),
        
        // 评估合法性
        legitimacy: assessLegitimacy(evidence),
        
        // 评估关联性
        relevance: assessRelevance(evidence, caseData.threeElements.facts),
        
        // 从原始数据获取
        credibilityScore: evidence.credibilityScore || 50,
        accepted: evidence.accepted !== false,
        
        // 判断证据权重
        weight: determineWeight(evidence),
        
        // 证据链位置（简化处理）
        chainPosition: determineChainPosition(evidence, caseData.threeElements.evidence.chains),
        
        // 法律依据
        legalBasis: getEvidenceLegalBasis(evidence.type),
        
        // 教学要点
        teachingPoints: generateTeachingPoints(evidence)
      };
      
      assessedEvidence.push(assessment);
    });

    logger.info(`完成评估 ${assessedEvidence.length} 个证据`);
    return assessedEvidence;
  }, [caseData]);

  // 评估真实性
  function assessAuthenticity(evidence: any): { score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 70; // 基础分

    // 根据证据类型评估
    switch (evidence.type) {
      case '书证':
      case '原件':
        score = 95;
        if (!evidence.original) {
          score = 70;
          issues.push('未提供原件');
          suggestions.push('建议提供原件或进行公证');
        }
        break;
      
      case '物证':
        score = 90;
        if (!evidence.preserved) {
          issues.push('保存状态未说明');
          suggestions.push('需要说明物证的保存链条');
        }
        break;
      
      case '证人证言':
        score = 75;
        if (!evidence.witnessIdentity) {
          issues.push('证人身份未明确');
          suggestions.push('需要提供证人身份证明和联系方式');
        }
        if (!evidence.witnessPresent) {
          score -= 10;
          issues.push('证人未出庭');
          suggestions.push('建议证人出庭接受质询');
        }
        break;
      
      case '电子数据':
        score = 80;
        if (!evidence.digitalSignature && !evidence.notarized) {
          score = 60;
          issues.push('电子数据未经公证或存证');
          suggestions.push('建议进行电子数据公证或区块链存证');
        }
        break;
      
      case '鉴定意见':
        score = 85;
        if (!evidence.qualifiedExpert) {
          issues.push('鉴定机构资质未明');
          suggestions.push('需要提供鉴定机构和鉴定人的资质证明');
        }
        break;
      
      default:
        score = 60;
        issues.push('证据类型不明确');
        suggestions.push('需要明确证据的类型和来源');
    }

    // 根据可信度调整
    if (evidence.credibilityScore) {
      score = Math.round((score + evidence.credibilityScore) / 2);
    }

    return { score, issues, suggestions };
  }

  // 评估合法性
  function assessLegitimacy(evidence: any): { score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 90; // 默认合法

    // 检查是否有非法取证标记
    if (evidence.illegal || evidence.obtainedIllegally) {
      score = 0;
      issues.push('证据可能通过非法手段获得');
      suggestions.push('非法证据应予排除');
      return { score, issues, suggestions };
    }

    // 特殊证据类型的合法性检查
    if (evidence.type === '录音' || evidence.type === '录像') {
      if (!evidence.consent && !evidence.publicPlace) {
        score = 50;
        issues.push('录音录像未经对方同意');
        suggestions.push('需要证明录制行为不侵犯他人合法权益');
      }
    }

    if (evidence.type === '偷拍' || evidence.type === '偷录') {
      score = 30;
      issues.push('证据获取方式可能违法');
      suggestions.push('建议通过合法途径重新获取证据');
    }

    // 程序合法性
    if (evidence.type === '鉴定意见' && !evidence.procedureFollowed) {
      score -= 20;
      issues.push('鉴定程序可能不规范');
      suggestions.push('需要说明鉴定程序的合法性');
    }

    return { score, issues, suggestions };
  }

  // 评估关联性
  function assessRelevance(evidence: any, facts: any): { score: number; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 50; // 基础分

    // 检查是否与关键事实相关
    if (facts?.keyFacts) {
      const isRelatedToKeyFacts = facts.keyFacts.some((fact: string) => {
        const factKeywords = fact.toLowerCase().split(/\s+/);
        const evidenceName = evidence.name.toLowerCase();
        return factKeywords.some((keyword: string) => evidenceName.includes(keyword));
      });

      if (isRelatedToKeyFacts) {
        score = 90;
      } else {
        score = 60;
        issues.push('与关键事实关联性不强');
        suggestions.push('需要说明证据与待证事实的关系');
      }
    }

    // 检查是否与争议事实相关
    if (facts?.disputedFacts && facts.disputedFacts.length > 0) {
      const isRelatedToDispute = facts.disputedFacts.some((fact: string) => 
        evidence.name.toLowerCase().includes(fact.toLowerCase())
      );
      
      if (isRelatedToDispute) {
        score = Math.max(score, 85);
      }
    }

    // 直接证据得分更高
    if (evidence.directEvidence) {
      score = Math.max(score, 95);
    }

    return { score, issues, suggestions };
  }

  // 判断证据权重
  function determineWeight(evidence: any): 'decisive' | 'important' | 'supporting' | 'weak' {
    if (evidence.credibilityScore >= 90 && evidence.accepted) {
      return 'decisive';
    } else if (evidence.credibilityScore >= 70) {
      return 'important';
    } else if (evidence.credibilityScore >= 50) {
      return 'supporting';
    } else {
      return 'weak';
    }
  }

  // 确定证据链位置
  function determineChainPosition(evidence: any, chains?: any[]): string[] {
    if (!chains || chains.length === 0) {
      return ['独立证据'];
    }

    const positions: string[] = [];
    chains.forEach((chain: any, index: number) => {
      if (chain.evidenceIds?.includes(evidence.id)) {
        positions.push(`证据链${index + 1}`);
      }
    });

    return positions.length > 0 ? positions : ['独立证据'];
  }

  // 获取证据相关法条
  function getEvidenceLegalBasis(evidenceType: string): Array<{law: string; article: string; content: string}> {
    const basis = [];

    // 通用证据规则
    basis.push({
      law: '民事诉讼法',
      article: '第63条',
      content: '证据包括：当事人的陈述、书证、物证、视听资料、电子数据、证人证言、鉴定意见、勘验笔录'
    });

    // 根据证据类型添加特定法条
    switch (evidenceType) {
      case '书证':
        basis.push({
          law: '民事诉讼法',
          article: '第70条',
          content: '书证应当提交原件。物证应当提交原物'
        });
        break;
      case '电子数据':
        basis.push({
          law: '民法典',
          article: '第1356条',
          content: '电子数据作为证据，应当符合法律规定'
        });
        break;
      case '证人证言':
        basis.push({
          law: '民事诉讼法',
          article: '第72条',
          content: '凡是知道案件情况的单位和个人，都有义务出庭作证'
        });
        break;
    }

    return basis;
  }

  // 生成教学要点
  function generateTeachingPoints(evidence: any): string[] {
    const points = ['证据三性的理解和运用'];

    if (evidence.type === '电子数据') {
      points.push('电子证据的固定和保全');
    }
    if (!evidence.accepted) {
      points.push('证据不被采纳的原因分析');
    }
    if (evidence.credibilityScore < 70) {
      points.push('如何提高证据的证明力');
    }

    points.push('证据链的构建方法');
    return points;
  }

  // 初始化评估
  useEffect(() => {
    const assessed = assessEvidenceFromThreeElements;
    setAssessments(assessed);
  }, [assessEvidenceFromThreeElements]);

  // 切换卡片展开
  const toggleCardExpansion = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  // 计算综合得分
  const calculateOverallScore = (assessment: EvidenceQualityAssessment): number => {
    return Math.round(
      (assessment.authenticity.score + 
       assessment.legitimacy.score + 
       assessment.relevance.score) / 3
    );
  };

  // 获取得分等级
  const getScoreLevel = (score: number): { label: string; color: string } => {
    if (score >= 85) return { label: '优秀', color: 'text-green-600' };
    if (score >= 70) return { label: '良好', color: 'text-blue-600' };
    if (score >= 60) return { label: '合格', color: 'text-yellow-600' };
    return { label: '不合格', color: 'text-red-600' };
  };

  // 获取权重颜色
  const getWeightColor = (weight: string) => {
    switch (weight) {
      case 'decisive': return 'bg-red-100 text-red-800';
      case 'important': return 'bg-orange-100 text-orange-800';
      case 'supporting': return 'bg-blue-100 text-blue-800';
      case 'weak': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">请先上传并提取案例数据</p>
          <p className="text-sm text-gray-500 mt-2">使用三要素提取器导入案例文件</p>
        </CardContent>
      </Card>
    );
  }

  const totalEvidence = assessments.length;
  const acceptedEvidence = assessments.filter(a => a.accepted).length;
  const highQualityEvidence = assessments.filter(a => calculateOverallScore(a) >= 70).length;

  return (
    <div className="space-y-6">
      {/* 标题和统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              证据质量评估（基于三要素）
            </span>
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="text-gray-500">证据总数:</span>
                <span className="ml-1 font-semibold">{totalEvidence}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">采纳:</span>
                <span className="ml-1 font-semibold text-green-600">{acceptedEvidence}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">高质量:</span>
                <span className="ml-1 font-semibold text-blue-600">{highQualityEvidence}</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 整体质量分布 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(assessments.reduce((sum, a) => sum + a.authenticity.score, 0) / totalEvidence || 0)}%
              </p>
              <p className="text-sm text-gray-600">平均真实性</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">
                {Math.round(assessments.reduce((sum, a) => sum + a.legitimacy.score, 0) / totalEvidence || 0)}%
              </p>
              <p className="text-sm text-gray-600">平均合法性</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(assessments.reduce((sum, a) => sum + a.relevance.score, 0) / totalEvidence || 0)}%
              </p>
              <p className="text-sm text-gray-600">平均关联性</p>
            </div>
          </div>

          {/* 法律提示 */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertTitle>评估标准</AlertTitle>
            <AlertDescription>
              基于《民事诉讼法》和《最高人民法院关于民事诉讼证据的若干规定》进行证据"三性"评估
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 证据列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">全部证据</TabsTrigger>
          <TabsTrigger value="accepted">已采纳</TabsTrigger>
          <TabsTrigger value="rejected">未采纳</TabsTrigger>
          <TabsTrigger value="problems">有问题</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {assessments.map((assessment, index) => {
            const overallScore = calculateOverallScore(assessment);
            const scoreLevel = getScoreLevel(overallScore);
            const isExpanded = expandedCards.has(assessment.id);

            return (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={selectedEvidence === assessment.id ? 'ring-2 ring-primary' : ''}>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleCardExpansion(assessment.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileCheck className="w-4 h-4" />
                          {assessment.evidenceName}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{assessment.evidenceType}</Badge>
                          <Badge variant="outline">提交方: {assessment.submittedBy}</Badge>
                          <Badge className={getWeightColor(assessment.weight)}>
                            {assessment.weight === 'decisive' ? '决定性' :
                             assessment.weight === 'important' ? '重要' :
                             assessment.weight === 'supporting' ? '辅助' : '微弱'}
                          </Badge>
                          {assessment.accepted ? (
                            <Badge className="bg-green-100 text-green-800">已采纳</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">未采纳</Badge>
                          )}
                          <Badge className={scoreLevel.color}>
                            {scoreLevel.label} ({overallScore}分)
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* 三性评分 */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>真实性</span>
                          <span className={assessment.authenticity.score >= 70 ? 'text-green-600' : 'text-red-600'}>
                            {assessment.authenticity.score}%
                          </span>
                        </div>
                        <Progress value={assessment.authenticity.score} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>合法性</span>
                          <span className={assessment.legitimacy.score >= 70 ? 'text-green-600' : 'text-red-600'}>
                            {assessment.legitimacy.score}%
                          </span>
                        </div>
                        <Progress value={assessment.legitimacy.score} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>关联性</span>
                          <span className={assessment.relevance.score >= 70 ? 'text-green-600' : 'text-red-600'}>
                            {assessment.relevance.score}%
                          </span>
                        </div>
                        <Progress value={assessment.relevance.score} className="h-2" />
                      </div>
                    </div>

                    {/* 展开详情 */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t space-y-4"
                      >
                        {/* 问题汇总 */}
                        {(assessment.authenticity.issues.length > 0 || 
                          assessment.legitimacy.issues.length > 0 || 
                          assessment.relevance.issues.length > 0) && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-500" />
                              存在问题
                            </p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {[...assessment.authenticity.issues, 
                                ...assessment.legitimacy.issues, 
                                ...assessment.relevance.issues].map((issue, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-red-500">•</span>
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 改进建议 */}
                        {(assessment.authenticity.suggestions.length > 0 || 
                          assessment.legitimacy.suggestions.length > 0 || 
                          assessment.relevance.suggestions.length > 0) && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              改进建议
                            </p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {[...assessment.authenticity.suggestions, 
                                ...assessment.legitimacy.suggestions, 
                                ...assessment.relevance.suggestions].map((suggestion, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-blue-500">•</span>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 证据链位置 */}
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Zap className="w-4 h-4 text-purple-500" />
                            证据链位置
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {assessment.chainPosition.map((position, i) => (
                              <Badge key={i} variant="secondary">
                                {position}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* 法律依据 */}
                        <div>
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Scale className="w-4 h-4 text-green-500" />
                            法律依据
                          </p>
                          <div className="space-y-2">
                            {assessment.legalBasis.map((basis, i) => (
                              <div key={i} className="bg-green-50 rounded p-2">
                                <p className="text-sm font-medium text-green-900">
                                  《{basis.law}》{basis.article}
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                  {basis.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 教学要点 */}
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1 text-yellow-900">
                            <Info className="w-4 h-4" />
                            教学要点
                          </p>
                          <ul className="text-sm text-yellow-800 space-y-1">
                            {assessment.teachingPoints.map((point, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span>•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* 其他标签页 */}
        <TabsContent value="accepted" className="space-y-4">
          {assessments.filter(a => a.accepted).map(assessment => (
            <Card key={assessment.id}>
              <CardHeader>
                <CardTitle className="text-base">{assessment.evidenceName}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {assessments.filter(a => !a.accepted).map(assessment => (
            <Card key={assessment.id}>
              <CardHeader>
                <CardTitle className="text-base">{assessment.evidenceName}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="problems" className="space-y-4">
          {assessments.filter(a => calculateOverallScore(a) < 70).map(assessment => (
            <Card key={assessment.id}>
              <CardHeader>
                <CardTitle className="text-base">{assessment.evidenceName}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}