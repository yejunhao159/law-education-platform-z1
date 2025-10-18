/**
 * PPT数据流调试器
 * 显示从 Store → CollectData → ExtractorKeyElements → Prompt 的完整数据流
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { PptGeneratorService } from '@/src/domains/teaching-acts/services/PptGeneratorService';
import { PptContentExtractor } from '@/src/domains/teaching-acts/services/PptContentExtractor';

interface DataFlowStage {
  name: string;
  status: 'pending' | 'success' | 'error';
  data: any;
  notes: string[];
}

export function PptDataFlowDebugger() {
  const [stages, setStages] = useState<DataFlowStage[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runDataFlowTest = async () => {
    setIsRunning(true);
    const results: DataFlowStage[] = [];

    try {
      // 阶段1: 从Store收集数据
      console.log('🔍 [数据流调试] 阶段1: 从Store收集数据');
      const service = new PptGeneratorService();
      const collectedData = service.collectData();

      const stage1Notes: string[] = [];
      if (!collectedData.analysisResult) {
        stage1Notes.push('❌ 第二幕数据为空！这是问题根源！');
      } else {
        const factCount = collectedData.analysisResult.factAnalysis?.keyFacts?.length || 0;
        const disputedCount = collectedData.analysisResult.factAnalysis?.disputedPoints?.length || 0;
        const timelineCount = collectedData.analysisResult.factAnalysis?.timeline?.length || 0;

        if (factCount === 0 && disputedCount === 0 && timelineCount === 0) {
          stage1Notes.push('⚠️ 第二幕数据存在但数组为空！数据结构可能不正确！');
        } else {
          stage1Notes.push(`✅ 第二幕数据正常: ${factCount}个关键事实, ${disputedCount}个争议点, ${timelineCount}个时间点`);
        }
      }

      results.push({
        name: '阶段1: Store → CollectedData',
        status: collectedData.analysisResult ? 'success' : 'error',
        data: {
          caseInfo: {
            hasData: !!collectedData.caseInfo,
            keys: Object.keys(collectedData.caseInfo || {}).slice(0, 5),
            preview: {
              caseNumber: collectedData.caseInfo?.basicInfo?.caseNumber,
              court: collectedData.caseInfo?.basicInfo?.court
            }
          },
          analysisResult: {
            hasData: !!collectedData.analysisResult,
            factAnalysis: collectedData.analysisResult?.factAnalysis ? {
              keyFacts: collectedData.analysisResult.factAnalysis.keyFacts?.length || 0,
              disputedPoints: collectedData.analysisResult.factAnalysis.disputedPoints?.length || 0,
              timeline: collectedData.analysisResult.factAnalysis.timeline?.length || 0,
              preview: {
                firstKeyFact: collectedData.analysisResult.factAnalysis.keyFacts?.[0]?.substring(0, 50),
                firstDisputedPoint: collectedData.analysisResult.factAnalysis.disputedPoints?.[0]?.substring(0, 50)
              }
            } : null,
            evidenceAnalysis: collectedData.analysisResult?.evidenceAnalysis ? {
              strengths: collectedData.analysisResult.evidenceAnalysis.strengths?.length || 0,
              weaknesses: collectedData.analysisResult.evidenceAnalysis.weaknesses?.length || 0,
              recommendations: collectedData.analysisResult.evidenceAnalysis.recommendations?.length || 0
            } : null,
            legalAnalysis: collectedData.analysisResult?.legalAnalysis ? {
              applicableLaws: collectedData.analysisResult.legalAnalysis.applicableLaws?.length || 0,
              precedents: collectedData.analysisResult.legalAnalysis.precedents?.length || 0,
              risks: collectedData.analysisResult.legalAnalysis.risks?.length || 0
            } : null
          },
          hasRealData: collectedData.hasRealData
        },
        notes: stage1Notes
      });

      // 阶段2: 提取PPT关键要素
      console.log('🔍 [数据流调试] 阶段2: 提取PPT关键要素');
      const extractor = new PptContentExtractor();
      const keyElements = extractor.extract(collectedData);

      const stage2Notes: string[] = [];

      // 检查第二幕提取结果
      const extractedFactCount = keyElements.teachingHighlights.factAnalysis.keyFacts.length;
      const extractedDisputedCount = keyElements.teachingHighlights.factAnalysis.disputedPoints.length;
      const extractedTimelineCount = keyElements.teachingHighlights.factAnalysis.timeline.length;

      if (extractedFactCount === 0 && extractedDisputedCount === 0 && extractedTimelineCount === 0) {
        stage2Notes.push('❌ Extractor提取失败！数据没有从CollectedData转换到KeyElements！');
        stage2Notes.push('这是核心问题所在：extractTeachingHighlights()方法有bug');
      } else {
        stage2Notes.push(`✅ Extractor提取成功: ${extractedFactCount}个关键事实, ${extractedDisputedCount}个争议点`);
        stage2Notes.push('数据已正确提取，可以传递给Prompt构建器');
      }

      results.push({
        name: '阶段2: CollectedData → KeyElements (Extractor)',
        status: (extractedFactCount > 0 || extractedDisputedCount > 0) ? 'success' : 'error',
        data: {
          caseOverview: keyElements.caseOverview,
          teachingHighlights: {
            factAnalysis: {
              keyFacts: extractedFactCount,
              disputedPoints: extractedDisputedCount,
              timeline: extractedTimelineCount,
              preview: {
                firstKeyFact: keyElements.teachingHighlights.factAnalysis.keyFacts[0]?.substring(0, 80),
                firstDisputedPoint: keyElements.teachingHighlights.factAnalysis.disputedPoints[0]?.substring(0, 80)
              }
            },
            evidenceAnalysis: {
              strengths: keyElements.teachingHighlights.evidenceAnalysis.strengths.length,
              weaknesses: keyElements.teachingHighlights.evidenceAnalysis.weaknesses.length,
              recommendations: keyElements.teachingHighlights.evidenceAnalysis.recommendations.length
            },
            legalAnalysis: {
              applicableLaws: keyElements.teachingHighlights.legalAnalysis.applicableLaws.length,
              precedents: keyElements.teachingHighlights.legalAnalysis.precedents.length,
              risks: keyElements.teachingHighlights.legalAnalysis.risks.length
            }
          }
        },
        notes: stage2Notes
      });

      // 阶段3: 检查会传递给AI的数据
      const stage3Notes: string[] = [];

      const totalDataPoints =
        extractedFactCount +
        extractedDisputedCount +
        extractedTimelineCount +
        keyElements.teachingHighlights.evidenceAnalysis.strengths.length +
        keyElements.teachingHighlights.legalAnalysis.applicableLaws.length;

      if (totalDataPoints === 0) {
        stage3Notes.push('❌ 没有任何具体数据会传递给AI！');
        stage3Notes.push('AI只会收到空数组，所以生成通用内容');
      } else {
        stage3Notes.push(`✅ 共${totalDataPoints}个数据点会传递给AI`);
        stage3Notes.push('Prompt会包含具体的案件信息');
      }

      results.push({
        name: '阶段3: KeyElements → AI Prompt',
        status: totalDataPoints > 0 ? 'success' : 'error',
        data: {
          totalDataPoints,
          breakdown: {
            facts: extractedFactCount,
            disputes: extractedDisputedCount,
            timeline: extractedTimelineCount,
            evidenceItems: keyElements.teachingHighlights.evidenceAnalysis.strengths.length +
                          keyElements.teachingHighlights.evidenceAnalysis.weaknesses.length,
            legalItems: keyElements.teachingHighlights.legalAnalysis.applicableLaws.length +
                       keyElements.teachingHighlights.legalAnalysis.precedents.length
          },
          sampleData: {
            firstFact: keyElements.teachingHighlights.factAnalysis.keyFacts[0],
            firstDispute: keyElements.teachingHighlights.factAnalysis.disputedPoints[0],
            firstLaw: keyElements.teachingHighlights.legalAnalysis.applicableLaws[0]
          }
        },
        notes: stage3Notes
      });

      setStages(results);

    } catch (error) {
      console.error('数据流调试失败:', error);
      results.push({
        name: '错误',
        status: 'error',
        data: { error: error instanceof Error ? error.message : String(error) },
        notes: ['调试过程中出现错误']
      });
      setStages(results);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleExpand = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <Card className="border-2 border-purple-500">
      <CardHeader className="bg-purple-50">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🔬 数据流调试器
            <span className="text-sm font-normal text-gray-600">
              追踪真实数据提取过程
            </span>
          </span>
          <Button
            onClick={runDataFlowTest}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? '调试中...' : '🔍 运行数据流测试'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {stages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            点击"运行数据流测试"按钮查看数据如何从Store传递到AI Prompt
          </div>
        ) : (
          stages.map((stage) => (
            <div key={stage.name} className="border rounded-lg">
              <button
                onClick={() => toggleExpand(stage.name)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                {expanded[stage.name] ? (
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 flex-shrink-0" />
                )}
                {stage.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-semibold text-left flex-1">
                  {stage.name}
                </span>
              </button>

              {expanded[stage.name] && (
                <div className="px-4 py-3 bg-gray-50 border-t space-y-3">
                  {/* 关键发现 */}
                  {stage.notes.length > 0 && (
                    <div className="space-y-1">
                      {stage.notes.map((note, i) => (
                        <div
                          key={i}
                          className={`text-sm p-2 rounded ${
                            note.startsWith('✅') ? 'bg-green-50 text-green-800' :
                            note.startsWith('❌') ? 'bg-red-50 text-red-800' :
                            'bg-yellow-50 text-yellow-800'
                          }`}
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 原始数据 */}
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                      查看原始数据 (JSON)
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-96 bg-white p-3 rounded border">
                      {JSON.stringify(stage.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))
        )}

        {/* 诊断总结 */}
        {stages.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="font-semibold text-blue-900 mb-2">
              🎯 诊断结果
            </div>
            {stages.some(s => s.status === 'error') ? (
              <div className="text-sm space-y-1">
                <div className="text-red-700 font-medium">
                  ❌ 发现数据流问题
                </div>
                <ul className="list-disc list-inside space-y-1 text-red-600">
                  {stages.filter(s => s.status === 'error').map((s, i) => (
                    <li key={i}>{s.name} 失败</li>
                  ))}
                </ul>
                <div className="mt-2 text-gray-700">
                  请检查上面的红色提示，定位具体问题所在
                </div>
              </div>
            ) : (
              <div className="text-sm text-green-700">
                ✅ 所有阶段数据流转正常！如果PPT大纲仍然通用，问题可能在Prompt构建或AI生成环节。
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
