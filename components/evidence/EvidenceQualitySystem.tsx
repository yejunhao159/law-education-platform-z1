/**
 * Evidence Quality System Component
 * Main interface for evidence quality assessment with interactive features
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  Link,
  Scale,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Download,
  Sparkles
} from 'lucide-react';

import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { useEvidenceInteractionStore } from '@/lib/stores/useEvidenceInteractionStore';
import type { Evidence, EvidenceQuality } from '@/types/dispute-evidence';
import { cn } from '@/lib/utils';

interface EvidenceQualitySystemProps {
  evidenceList?: Evidence[];
  onQualityUpdate?: (evidenceId: string, quality: EvidenceQuality) => void;
  onComplete?: (results: QualityAssessmentResult[]) => void;
}

interface QualityAssessmentResult {
  evidenceId: string;
  quality: EvidenceQuality;
  suggestions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  approved: boolean;
}

export function EvidenceQualitySystem({
  evidenceList = [],
  onQualityUpdate,
  onComplete
}: EvidenceQualitySystemProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<Map<string, QualityAssessmentResult>>(new Map());
  const [isAssessing, setIsAssessing] = useState(false);
  const [manualQuality, setManualQuality] = useState<EvidenceQuality>({
    authenticity: 50,
    relevance: 50,
    legality: 50
  });

  const interactionStore = useEvidenceInteractionStore();

  // Default evidence if none provided
  const defaultEvidence: Evidence[] = evidenceList.length > 0 ? evidenceList : [
    {
      id: 'ev-1',
      name: '购销合同',
      type: 'document',
      content: '双方签订的购销合同原件，包含签字盖章',
      source: '原告提供',
      date: '2024-01-15',
      quality: { authenticity: 85, relevance: 90, legality: 95 },
      verified: true
    },
    {
      id: 'ev-2',
      name: '银行转账记录',
      type: 'document',
      content: '显示款项支付的银行流水',
      source: '原告银行',
      date: '2024-02-20',
      quality: { authenticity: 95, relevance: 85, legality: 100 },
      verified: true
    },
    {
      id: 'ev-3',
      name: '微信聊天记录',
      type: 'image',
      content: '双方协商过程的聊天截图',
      source: '原告手机',
      date: '2024-01-10',
      quality: { authenticity: 60, relevance: 70, legality: 65 },
      verified: false
    },
    {
      id: 'ev-4',
      name: '证人证言',
      type: 'testimony',
      content: '业务经理李某关于交易过程的证言',
      source: '证人李某',
      date: '2024-03-20',
      quality: { authenticity: 70, relevance: 75, legality: 85 },
      verified: false
    },
    {
      id: 'ev-5',
      name: '录音证据',
      type: 'audio',
      content: '双方电话协商的录音',
      source: '原告录制',
      date: '2024-02-15',
      quality: { authenticity: 55, relevance: 80, legality: 50 },
      verified: false
    }
  ];

  // Auto-assess evidence quality
  const assessEvidence = useCallback(async (evidence: Evidence) => {
    setIsAssessing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate quality scores
    const baseQuality = evidence.quality || { authenticity: 50, relevance: 50, legality: 50 };
    
    // Adjust based on evidence type
    const typeModifiers = {
      document: { authenticity: 10, relevance: 5, legality: 10 },
      image: { authenticity: -10, relevance: 0, legality: -5 },
      audio: { authenticity: -15, relevance: 5, legality: -10 },
      video: { authenticity: -5, relevance: 10, legality: -5 },
      testimony: { authenticity: -5, relevance: 0, legality: 5 },
      other: { authenticity: 0, relevance: 0, legality: 0 }
    };
    
    const modifier = typeModifiers[evidence.type];
    const adjustedQuality: EvidenceQuality = {
      authenticity: Math.min(100, Math.max(0, baseQuality.authenticity + modifier.authenticity)),
      relevance: Math.min(100, Math.max(0, baseQuality.relevance + modifier.relevance)),
      legality: Math.min(100, Math.max(0, baseQuality.legality + modifier.legality))
    };
    
    // Generate suggestions
    const suggestions: string[] = [];
    if (adjustedQuality.authenticity < 70) {
      suggestions.push('建议提供原件或公证认证');
    }
    if (adjustedQuality.relevance < 70) {
      suggestions.push('证据与案件关联性需要加强说明');
    }
    if (adjustedQuality.legality < 70) {
      suggestions.push('注意证据取得方式的合法性');
    }
    if (!evidence.verified) {
      suggestions.push('建议进行证据验证或质证');
    }
    
    // Calculate risk level
    const avgScore = (adjustedQuality.authenticity + adjustedQuality.relevance + adjustedQuality.legality) / 3;
    const riskLevel: 'low' | 'medium' | 'high' = 
      avgScore >= 80 ? 'low' : avgScore >= 60 ? 'medium' : 'high';
    
    const result: QualityAssessmentResult = {
      evidenceId: evidence.id,
      quality: adjustedQuality,
      suggestions,
      riskLevel,
      approved: avgScore >= 70 && evidence.verified === true
    };
    
    setAssessmentResults(prev => new Map(prev).set(evidence.id, result));
    onQualityUpdate?.(evidence.id, adjustedQuality);
    
    setIsAssessing(false);
    
    // Add feedback
    if (result.approved) {
      interactionStore.addFeedback('success', `${evidence.name} 质量评估通过`);
      interactionStore.addPoints(5);
    } else {
      interactionStore.addFeedback('warning', `${evidence.name} 需要改进质量`);
    }
    
    return result;
  }, [onQualityUpdate, interactionStore]);

  // Batch assess all evidence
  const assessAllEvidence = async () => {
    setIsAssessing(true);
    const results: QualityAssessmentResult[] = [];
    
    for (const evidence of defaultEvidence) {
      const result = await assessEvidence(evidence);
      results.push(result);
    }
    
    onComplete?.(results);
    interactionStore.addFeedback('success', '所有证据评估完成');
    setIsAssessing(false);
  };

  // Manual quality adjustment
  const handleManualAdjustment = () => {
    if (!selectedEvidence) return;
    
    const result: QualityAssessmentResult = {
      evidenceId: selectedEvidence.id,
      quality: manualQuality,
      suggestions: [],
      riskLevel: 'medium',
      approved: Object.values(manualQuality).every(v => v >= 70)
    };
    
    setAssessmentResults(prev => new Map(prev).set(selectedEvidence.id, result));
    onQualityUpdate?.(selectedEvidence.id, manualQuality);
    interactionStore.addFeedback('info', '质量评分已手动更新');
  };

  // Calculate statistics
  const calculateStats = () => {
    const assessed = Array.from(assessmentResults.values());
    const totalAssessed = assessed.length;
    const approved = assessed.filter(r => r.approved).length;
    const avgAuthenticity = assessed.reduce((sum, r) => sum + r.quality.authenticity, 0) / totalAssessed || 0;
    const avgRelevance = assessed.reduce((sum, r) => sum + r.quality.relevance, 0) / totalAssessed || 0;
    const avgLegality = assessed.reduce((sum, r) => sum + r.quality.legality, 0) / totalAssessed || 0;
    const highRisk = assessed.filter(r => r.riskLevel === 'high').length;
    
    return {
      totalAssessed,
      approved,
      avgAuthenticity: Math.round(avgAuthenticity),
      avgRelevance: Math.round(avgRelevance),
      avgLegality: Math.round(avgLegality),
      highRisk,
      approvalRate: totalAssessed > 0 ? Math.round((approved / totalAssessed) * 100) : 0
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                证据质量评估系统
              </CardTitle>
              <CardDescription>
                智能评估证据的真实性、相关性和合法性
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Activity className="w-3 h-3" />
                已评估: {stats.totalAssessed}/{defaultEvidence.length}
              </Badge>
              <Button
                onClick={assessAllEvidence}
                disabled={isAssessing}
                className="gap-2"
              >
                {isAssessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    评估中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    批量评估
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1">
            <BarChart3 className="w-4 h-4" />
            总览
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1">
            <FileText className="w-4 h-4" />
            证据列表
          </TabsTrigger>
          <TabsTrigger value="assessment" className="gap-1">
            <Eye className="w-4 h-4" />
            质量评估
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-1">
            <FileCheck className="w-4 h-4" />
            评估报告
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Approval Rate */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">通过率</p>
                    <p className="text-2xl font-bold">{stats.approvalRate}%</p>
                  </div>
                  {stats.approvalRate >= 70 ? (
                    <TrendingUp className="w-8 h-8 text-green-500" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-500" />
                  )}
                </div>
                <Progress value={stats.approvalRate} className="mt-3" />
              </CardContent>
            </Card>

            {/* Authenticity Score */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <p className="text-sm text-muted-foreground">平均真实性</p>
                </div>
                <p className="text-2xl font-bold">{stats.avgAuthenticity}%</p>
                <Progress value={stats.avgAuthenticity} className="mt-3" />
              </CardContent>
            </Card>

            {/* Relevance Score */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-muted-foreground">平均相关性</p>
                </div>
                <p className="text-2xl font-bold">{stats.avgRelevance}%</p>
                <Progress value={stats.avgRelevance} className="mt-3" />
              </CardContent>
            </Card>

            {/* Legality Score */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">平均合法性</p>
                </div>
                <p className="text-2xl font-bold">{stats.avgLegality}%</p>
                <Progress value={stats.avgLegality} className="mt-3" />
              </CardContent>
            </Card>
          </div>

          {/* Risk Alert */}
          {stats.highRisk > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertTitle>风险提示</AlertTitle>
              <AlertDescription>
                有 {stats.highRisk} 份证据存在高风险，建议重点审查
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Evidence List Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {defaultEvidence.map((evidence) => {
              const result = assessmentResults.get(evidence.id);
              return (
                <div key={evidence.id} className="relative">
                  <EvidenceCard
                    evidence={{
                      ...evidence,
                      quality: result?.quality || evidence.quality
                    }}
                    isDraggable={false}
                    showQuality={true}
                  />
                  {result && (
                    <div className="absolute top-2 right-2">
                      {result.approved ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedEvidence(evidence);
                        setActiveTab('assessment');
                      }}
                    >
                      评估
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assessEvidence(evidence)}
                      disabled={isAssessing}
                    >
                      快速评估
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Assessment Tab */}
        <TabsContent value="assessment" className="space-y-4">
          {selectedEvidence ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Selected Evidence */}
              <div>
                <h3 className="text-lg font-semibold mb-4">当前证据</h3>
                <EvidenceCard
                  evidence={selectedEvidence}
                  isDraggable={false}
                  showQuality={true}
                  isFlippable={true}
                />
              </div>

              {/* Quality Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4">质量调整</h3>
                <Card>
                  <CardContent className="space-y-6 pt-6">
                    {/* Authenticity Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          真实性
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {manualQuality.authenticity}%
                        </span>
                      </div>
                      <Slider
                        value={[manualQuality.authenticity]}
                        onValueChange={([value]) =>
                          setManualQuality(prev => ({ ...prev, authenticity: value }))
                        }
                        max={100}
                        step={5}
                      />
                    </div>

                    {/* Relevance Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          相关性
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {manualQuality.relevance}%
                        </span>
                      </div>
                      <Slider
                        value={[manualQuality.relevance]}
                        onValueChange={([value]) =>
                          setManualQuality(prev => ({ ...prev, relevance: value }))
                        }
                        max={100}
                        step={5}
                      />
                    </div>

                    {/* Legality Slider */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          合法性
                        </label>
                        <span className="text-sm text-muted-foreground">
                          {manualQuality.legality}%
                        </span>
                      </div>
                      <Slider
                        value={[manualQuality.legality]}
                        onValueChange={([value]) =>
                          setManualQuality(prev => ({ ...prev, legality: value }))
                        }
                        max={100}
                        step={5}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleManualAdjustment} className="flex-1">
                        应用调整
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => assessEvidence(selectedEvidence)}
                        disabled={isAssessing}
                      >
                        自动评估
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions */}
                {assessmentResults.has(selectedEvidence.id) && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">改进建议</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {assessmentResults.get(selectedEvidence.id)?.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                            <span className="text-sm">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">请从证据列表中选择一份证据进行评估</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>证据质量评估报告</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  导出报告
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {Array.from(assessmentResults.entries()).map(([evidenceId, result]) => {
                    const evidence = defaultEvidence.find(e => e.id === evidenceId);
                    if (!evidence) return null;
                    
                    return (
                      <div key={evidenceId} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{evidence.name}</h4>
                            <p className="text-sm text-muted-foreground">{evidence.type}</p>
                          </div>
                          <Badge
                            variant={result.approved ? 'default' : 'destructive'}
                            className="gap-1"
                          >
                            {result.approved ? (
                              <>
                                <ThumbsUp className="w-3 h-3" />
                                通过
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="w-3 h-3" />
                                未通过
                              </>
                            )}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">真实性</p>
                            <p className="font-semibold">{result.quality.authenticity}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">相关性</p>
                            <p className="font-semibold">{result.quality.relevance}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">合法性</p>
                            <p className="font-semibold">{result.quality.legality}%</p>
                          </div>
                        </div>
                        
                        {result.suggestions.length > 0 && (
                          <div className="pt-3 border-t">
                            <p className="text-sm font-medium mb-1">建议:</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {result.suggestions.map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {assessmentResults.size === 0 && (
                    <div className="text-center py-8">
                      <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">暂无评估结果</p>
                      <p className="text-sm text-gray-500 mt-2">
                        请先对证据进行质量评估
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}