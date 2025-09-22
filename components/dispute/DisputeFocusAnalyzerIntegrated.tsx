/**
 * 整合版争议焦点分析组件
 * 接入真实案例数据，基于中国法律体系
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Scale,
  Brain,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Users,
  Gavel,
  BookOpen
} from 'lucide-react';

import { useCurrentCase } from '@/src/domains/stores';
import legalProvisions from '@/data/legal-provisions.json';

interface DisputeFocusIntegrated {
  id: string;
  content: string;
  plaintiffView: string;
  defendantView: string;
  courtView: string;
  legalBasis: Array<{
    law: string;
    article: string;
    content: string;
  }>;
  evidenceSupport: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  teachingValue: string;
}

export function DisputeFocusAnalyzerIntegrated() {
  const caseData = useCurrentCase();
  const [disputes, setDisputes] = useState<DisputeFocusIntegrated[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('disputes');

  // 从案例数据中提取争议焦点
  const extractDisputesFromCase = useCallback(() => {
    if (!caseData) return [];

    const extractedDisputes: DisputeFocusIntegrated[] = [];

    // 基于案例的诉求和事实提取争议焦点
    if (caseData.claims) {
      caseData.claims.forEach((claim, index) => {
        const dispute: DisputeFocusIntegrated = {
          id: `dispute-${index}`,
          content: claim.request || '诉讼请求',
          plaintiffView: claim.reasoning || '原告认为其请求应得到支持',
          defendantView: '被告对此持有异议',
          courtView: '法院需要审查相关事实和法律依据',
          legalBasis: [],
          evidenceSupport: [],
          difficulty: 'intermediate',
          teachingValue: '该争议焦点涉及合同法的核心概念'
        };

        // 匹配相关法条
        if (claim.legalBasis) {
          const matchedProvisions = legalProvisions.provisions[0].articles.filter(
            article => claim.legalBasis?.includes(article.article)
          );
          
          dispute.legalBasis = matchedProvisions.map(article => ({
            law: '民法典',
            article: article.article,
            content: article.content
          }));
        }

        // 关联证据
        if (caseData.evidence) {
          dispute.evidenceSupport = caseData.evidence
            .filter(e => e.supportsClaim?.includes(claim.id))
            .map(e => e.title);
        }

        extractedDisputes.push(dispute);
      });
    }

    // 基于时间轴事件提取额外的争议焦点
    if (caseData.timeline) {
      const disputedEvents = caseData.timeline.filter(event => 
        event.importance === 'critical' || event.disputed
      );

      disputedEvents.forEach((event, index) => {
        const dispute: DisputeFocusIntegrated = {
          id: `timeline-dispute-${index}`,
          content: `关于"${event.event}"的事实认定`,
          plaintiffView: event.plaintiffView || `该事件对原告有利`,
          defendantView: event.defendantView || `被告对该事件有不同解释`,
          courtView: `需要结合证据认定事实真相`,
          legalBasis: [],
          evidenceSupport: event.relatedEvidence || [],
          difficulty: event.importance === 'critical' ? 'advanced' : 'basic',
          teachingValue: '事实认定是法律适用的基础'
        };

        extractedDisputes.push(dispute);
      });
    }

    return extractedDisputes;
  }, [caseData]);

  // 自动分析争议焦点
  const analyzeDisputes = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // 提取争议焦点
      const extractedDisputes = extractDisputesFromCase();
      
      // 如果有AI服务，可以进一步增强分析
      // 这里暂时使用本地分析
      const enhancedDisputes = extractedDisputes.map(dispute => ({
        ...dispute,
        // 根据证据数量评估难度
        difficulty: dispute.evidenceSupport.length > 3 ? 'advanced' : 
                   dispute.evidenceSupport.length > 1 ? 'intermediate' : 'basic' as any,
        // 添加教学价值评估
        teachingValue: `此争议点涉及${dispute.legalBasis.length}个法条，具有重要教学意义`
      }));

      setDisputes(enhancedDisputes);
      
      // 模拟异步分析
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('分析失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [extractDisputesFromCase]);

  // 初始化时自动分析
  useEffect(() => {
    if (caseData && disputes.length === 0) {
      analyzeDisputes();
    }
  }, [caseData, disputes.length, analyzeDisputes]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">请先导入案例数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 案例信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            {caseData.title || '案例分析'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">案件类型</p>
              <p className="font-medium">{caseData.type || '民事案件'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">原告</p>
              <p className="font-medium">{caseData.plaintiff || '原告方'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">被告</p>
              <p className="font-medium">{caseData.defendant || '被告方'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">争议焦点</p>
              <p className="font-medium">{disputes.length} 个</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分析按钮 */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          争议焦点智能分析
        </h2>
        <Button 
          onClick={analyzeDisputes} 
          disabled={isAnalyzing}
          variant="default"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              重新分析
            </>
          )}
        </Button>
      </div>

      {/* 争议焦点展示 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disputes">争议焦点</TabsTrigger>
          <TabsTrigger value="legal">法律依据</TabsTrigger>
          <TabsTrigger value="evidence">证据支撑</TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="space-y-4">
          <AnimatePresence mode="popLayout">
            {disputes.map((dispute, index) => (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedDispute === dispute.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedDispute(dispute.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{dispute.content}</CardTitle>
                      <Badge className={getDifficultyColor(dispute.difficulty)}>
                        {dispute.difficulty === 'basic' ? '基础' :
                         dispute.difficulty === 'intermediate' ? '中等' : '高级'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 三方观点 */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-1 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">原告观点</p>
                          <p className="text-sm text-gray-600">{dispute.plaintiffView}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-1 text-red-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">被告观点</p>
                          <p className="text-sm text-gray-600">{dispute.defendantView}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gavel className="w-4 h-4 mt-1 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">法院视角</p>
                          <p className="text-sm text-gray-600">{dispute.courtView}</p>
                        </div>
                      </div>
                    </div>

                    {/* 教学提示 */}
                    <Alert>
                      <BookOpen className="w-4 h-4" />
                      <AlertDescription>{dispute.teachingValue}</AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          {disputes.map(dispute => (
            <Card key={dispute.id}>
              <CardHeader>
                <CardTitle className="text-base">{dispute.content}</CardTitle>
              </CardHeader>
              <CardContent>
                {dispute.legalBasis.length > 0 ? (
                  <div className="space-y-2">
                    {dispute.legalBasis.map((law, index) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <p className="font-medium text-sm">
                          {law.law} {law.article}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{law.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无相关法条</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          {disputes.map(dispute => (
            <Card key={dispute.id}>
              <CardHeader>
                <CardTitle className="text-base">{dispute.content}</CardTitle>
              </CardHeader>
              <CardContent>
                {dispute.evidenceSupport.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {dispute.evidenceSupport.map((evidence, index) => (
                      <Badge key={index} variant="secondary">
                        <FileText className="w-3 h-3 mr-1" />
                        {evidence}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">暂无关联证据</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}