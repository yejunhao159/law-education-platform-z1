/**
 * 争议焦点分析组件 - 基于三要素数据
 * 从提取的案例三要素中分析争议焦点
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Scale,
  Brain,
  FileText,
  AlertCircle,
  CheckCircle,
  Users,
  Gavel,
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

import { useCurrentCase } from '@/src/domains/stores';
import { logger } from '@/lib/utils/logger';
import legalProvisions from '@/data/legal-provisions.json';

// 争议焦点接口
interface DisputeFocus {
  id: string;
  content: string;
  type: 'factual' | 'legal' | 'procedural'; // 事实争议、法律争议、程序争议
  plaintiffView: string;
  defendantView: string;
  courtFocus: string;
  relatedFacts: string[];
  relatedEvidence: string[];
  legalBasis: Array<{
    law: string;
    article: string;
    content: string;
  }>;
  importance: 'critical' | 'high' | 'medium' | 'low';
  difficulty: 'complex' | 'moderate' | 'simple';
  teachingPoints: string[];
}

export function DisputeFocusFromThreeElements() {
  const caseData = useCurrentCase();
  const [disputes, setDisputes] = useState<DisputeFocus[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');

  // 从三要素中提取争议焦点
  const extractDisputesFromThreeElements = useMemo(() => {
    if (!caseData?.threeElements) {
      logger.warn('没有找到三要素数据');
      return [];
    }

    logger.info('开始从三要素提取争议焦点', {
      hassFacts: !!caseData.threeElements.facts,
      hasEvidence: !!caseData.threeElements.evidence,
      hasReasoning: !!caseData.threeElements.reasoning
    });

    const extractedDisputes: DisputeFocus[] = [];

    // 1. 从事实争议中提取
    if (caseData.threeElements.facts?.disputedFacts) {
      caseData.threeElements.facts.disputedFacts.forEach((fact, index) => {
        extractedDisputes.push({
          id: `fact-dispute-${index}`,
          content: fact,
          type: 'factual',
          plaintiffView: `原告主张：${fact}`,
          defendantView: `被告否认或有异议`,
          courtFocus: '法院需查明事实真相',
          relatedFacts: [fact],
          relatedEvidence: [],
          legalBasis: [],
          importance: 'high',
          difficulty: 'moderate',
          teachingPoints: [
            '事实认定的重要性',
            '举证责任的分配',
            '证据规则的适用'
          ]
        });
      });
    }

    // 2. 从关键事实中提取潜在争议
    if (caseData.threeElements.facts?.keyFacts) {
      caseData.threeElements.facts.keyFacts.forEach((keyFact, index) => {
        // 分析关键事实中的争议点
        const dispute: DisputeFocus = {
          id: `key-fact-${index}`,
          content: `关于"${keyFact}"的认定`,
          type: 'factual',
          plaintiffView: '该事实对原告有利',
          defendantView: '被告可能有不同理解',
          courtFocus: '该事实对案件走向具有关键影响',
          relatedFacts: [keyFact],
          relatedEvidence: extractRelatedEvidence(keyFact, caseData.threeElements.evidence),
          legalBasis: matchLegalProvisions(keyFact),
          importance: 'critical',
          difficulty: 'complex',
          teachingPoints: [
            '关键事实的识别',
            '事实与法律的结合',
            '裁判思维的形成'
          ]
        };
        extractedDisputes.push(dispute);
      });
    }

    // 3. 从法律适用中提取争议
    if (caseData.threeElements.reasoning?.legalBasis) {
      caseData.threeElements.reasoning.legalBasis.forEach((basis, index) => {
        const dispute: DisputeFocus = {
          id: `legal-dispute-${index}`,
          content: `${basis.law} ${basis.article}的适用问题`,
          type: 'legal',
          plaintiffView: `应当适用${basis.article}，${basis.application}`,
          defendantView: '对法律适用有不同理解',
          courtFocus: '正确理解和适用法律条文',
          relatedFacts: caseData.threeElements.facts?.keyFacts || [],
          relatedEvidence: [],
          legalBasis: [{
            law: basis.law,
            article: basis.article,
            content: basis.application
          }],
          importance: 'critical',
          difficulty: 'complex',
          teachingPoints: [
            '法律条文的理解',
            '法律适用的方法',
            '法律解释的技巧'
          ]
        };
        extractedDisputes.push(dispute);
      });
    }

    // 4. 从证据争议中提取
    if (caseData.threeElements.evidence?.items) {
      const disputedEvidence = caseData.threeElements.evidence.items.filter(
        item => !item.accepted || item.credibilityScore < 70
      );

      disputedEvidence.forEach((evidence, index) => {
        extractedDisputes.push({
          id: `evidence-dispute-${index}`,
          content: `证据"${evidence.name}"的采信问题`,
          type: 'procedural',
          plaintiffView: evidence.submittedBy === '原告' ? '该证据应被采信' : '对该证据有异议',
          defendantView: evidence.submittedBy === '被告' ? '该证据应被采信' : '对该证据有异议',
          courtFocus: '审查证据的真实性、合法性、关联性',
          relatedFacts: [],
          relatedEvidence: [evidence.name],
          legalBasis: [
            {
              law: '民事诉讼法',
              article: '第63条',
              content: '证据必须查证属实，才能作为认定事实的根据'
            }
          ],
          importance: 'high',
          difficulty: 'moderate',
          teachingPoints: [
            '证据的三性审查',
            '证据的采信标准',
            '证据链的形成'
          ]
        });
      });
    }

    logger.info(`成功提取 ${extractedDisputes.length} 个争议焦点`);
    return extractedDisputes;
  }, [caseData]);

  // 辅助函数：提取相关证据
  function extractRelatedEvidence(fact: string, evidence: any): string[] {
    if (!evidence?.items) return [];
    
    // 简单的关键词匹配
    return evidence.items
      .filter((item: any) => {
        const factKeywords = fact.toLowerCase().split(/\s+/);
        const evidenceName = item.name.toLowerCase();
        return factKeywords.some(keyword => evidenceName.includes(keyword));
      })
      .map((item: any) => item.name);
  }

  // 辅助函数：匹配法条
  function matchLegalProvisions(fact: string): Array<{law: string; article: string; content: string}> {
    const matched: Array<{law: string; article: string; content: string}> = [];
    
    // 关键词匹配法条
    const keywords = ['合同', '违约', '赔偿', '责任', '义务'];
    const factLower = fact.toLowerCase();
    
    legalProvisions.provisions[0].articles.forEach(article => {
      if (article.tags.some(tag => factLower.includes(tag))) {
        matched.push({
          law: '民法典',
          article: article.article,
          content: article.content
        });
      }
    });

    return matched.slice(0, 3); // 最多返回3个相关法条
  }

  // 初始化时提取争议焦点
  useEffect(() => {
    const extractedDisputes = extractDisputesFromThreeElements;
    setDisputes(extractedDisputes);
  }, [extractDisputesFromThreeElements]);

  // 切换卡片展开状态
  const toggleCardExpansion = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  // 获取争议类型的颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'factual': return 'bg-blue-100 text-blue-800';
      case 'legal': return 'bg-purple-100 text-purple-800';
      case 'procedural': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取重要性的颜色
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">请先上传并提取案例数据</p>
          <p className="text-sm text-gray-500 mt-2">使用三要素提取器导入案例文件</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              争议焦点分析（基于三要素）
            </span>
            <div className="flex gap-2">
              <Badge variant="outline">
                共 {disputes.length} 个争议点
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                事实争议 {disputes.filter(d => d.type === 'factual').length}
              </Badge>
              <Badge className="bg-purple-100 text-purple-800">
                法律争议 {disputes.filter(d => d.type === 'legal').length}
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                程序争议 {disputes.filter(d => d.type === 'procedural').length}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 案例基本信息 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">案号</p>
                <p className="font-medium">{caseData.basicInfo?.caseNumber || '未知'}</p>
              </div>
              <div>
                <p className="text-gray-500">法院</p>
                <p className="font-medium">{caseData.basicInfo?.court || '未知'}</p>
              </div>
              <div>
                <p className="text-gray-500">原告</p>
                <p className="font-medium">
                  {caseData.basicInfo?.parties?.plaintiff?.[0]?.name || '原告方'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">被告</p>
                <p className="font-medium">
                  {caseData.basicInfo?.parties?.defendant?.[0]?.name || '被告方'}
                </p>
              </div>
            </div>
          </div>

          {/* 数据来源提示 */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertTitle>数据来源</AlertTitle>
            <AlertDescription>
              争议焦点从案例的三要素（事实、证据、说理）中智能提取
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 争议焦点列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">全部争议</TabsTrigger>
          <TabsTrigger value="factual">事实争议</TabsTrigger>
          <TabsTrigger value="legal">法律争议</TabsTrigger>
          <TabsTrigger value="procedural">程序争议</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AnimatePresence mode="popLayout">
            {disputes.map((dispute, index) => (
              <motion.div
                key={dispute.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`${selectedDispute === dispute.id ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => toggleCardExpansion(dispute.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {dispute.content}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge className={getTypeColor(dispute.type)}>
                            {dispute.type === 'factual' ? '事实争议' :
                             dispute.type === 'legal' ? '法律争议' : '程序争议'}
                          </Badge>
                          <Badge className={getImportanceColor(dispute.importance)}>
                            {dispute.importance === 'critical' ? '关键' :
                             dispute.importance === 'high' ? '重要' :
                             dispute.importance === 'medium' ? '一般' : '次要'}
                          </Badge>
                          <Badge variant="outline">
                            难度: {dispute.difficulty === 'complex' ? '复杂' :
                                  dispute.difficulty === 'moderate' ? '中等' : '简单'}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {expandedCards.has(dispute.id) ? 
                          <ChevronUp className="w-4 h-4" /> : 
                          <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* 三方观点 */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">原告观点</p>
                          <p className="text-sm text-gray-600">{dispute.plaintiffView}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">被告观点</p>
                          <p className="text-sm text-gray-600">{dispute.defendantView}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gavel className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">法院关注</p>
                          <p className="text-sm text-gray-600">{dispute.courtFocus}</p>
                        </div>
                      </div>
                    </div>

                    {/* 展开内容 */}
                    {expandedCards.has(dispute.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t space-y-4"
                      >
                        {/* 相关证据 */}
                        {dispute.relatedEvidence.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              相关证据
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {dispute.relatedEvidence.map((evidence, i) => (
                                <Badge key={i} variant="secondary">
                                  {evidence}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 法律依据 */}
                        {dispute.legalBasis.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Scale className="w-4 h-4" />
                              法律依据
                            </p>
                            <div className="space-y-2">
                              {dispute.legalBasis.map((basis, i) => (
                                <div key={i} className="bg-blue-50 rounded p-3">
                                  <p className="text-sm font-medium text-blue-900">
                                    《{basis.law}》{basis.article}
                                  </p>
                                  <p className="text-sm text-blue-700 mt-1">
                                    {basis.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 教学要点 */}
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1 text-yellow-900">
                            <BookOpen className="w-4 h-4" />
                            教学要点
                          </p>
                          <ul className="text-sm text-yellow-800 space-y-1">
                            {dispute.teachingPoints.map((point, i) => (
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
            ))}
          </AnimatePresence>
        </TabsContent>

        {/* 其他标签页内容类似，只是过滤不同类型的争议 */}
        {['factual', 'legal', 'procedural'].map(type => (
          <TabsContent key={type} value={type} className="space-y-4">
            {disputes.filter(d => d.type === type).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-600">
                    暂无{type === 'factual' ? '事实' : type === 'legal' ? '法律' : '程序'}争议
                  </p>
                </CardContent>
              </Card>
            ) : (
              disputes.filter(d => d.type === type).map((dispute, index) => (
                // 渲染逻辑同上
                <Card key={dispute.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{dispute.content}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 内容同上 */}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}