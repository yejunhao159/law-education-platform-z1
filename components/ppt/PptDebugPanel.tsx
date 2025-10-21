/**
 * PPT生成调试面板
 * 实时显示数据提取过程和中间结果
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore';
import { useSocraticDialogueStore } from '@/src/domains/socratic-dialogue/stores/useSocraticDialogueStore';

interface DebugSection {
  title: string;
  status: 'success' | 'warning' | 'error';
  data: any;
}

export function PptDebugPanel() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<DebugSection[]>([]);

  // 从store获取数据
  const teachingStore = useTeachingStore();
  const socraticStore = useSocraticDialogueStore();

  useEffect(() => {
    // 收集所有数据
    const debugSections: DebugSection[] = [];

    // 第一幕：案例导入数据
    const act1Data = teachingStore.uploadData.extractedElements;
    debugSections.push({
      title: '第一幕：案例导入数据',
      status: act1Data ? 'success' : 'error',
      data: {
        hasData: !!act1Data,
        confidence: teachingStore.uploadData.confidence,
        dataKeys: act1Data ? Object.keys(act1Data) : [],
        preview: act1Data ? {
          basicInfo: (act1Data as any).basicInfo,
          caseNumber: (act1Data as any).basicInfo?.caseNumber,
          parties: (act1Data as any).basicInfo?.parties
        } : null
      }
    });

    // 第二幕：深度分析数据
    const act2Data = teachingStore.analysisData.result;
    debugSections.push({
      title: '第二幕：深度分析数据（关键！）',
      status: act2Data ? 'success' : 'error',
      data: {
        hasData: !!act2Data,
        factAnalysis: act2Data?.factAnalysis ? {
          keyFacts: act2Data.factAnalysis.keyFacts?.length || 0,
          disputedPoints: act2Data.factAnalysis.disputedPoints?.length || 0,
          timeline: act2Data.factAnalysis.timeline?.length || 0,
          preview: {
            firstKeyFact: act2Data.factAnalysis.keyFacts?.[0],
            firstDisputedPoint: act2Data.factAnalysis.disputedPoints?.[0],
            firstTimelineEvent: act2Data.factAnalysis.timeline?.[0]
          }
        } : null,
        evidenceAnalysis: act2Data?.evidenceAnalysis ? {
          strengths: act2Data.evidenceAnalysis.strengths?.length || 0,
          weaknesses: act2Data.evidenceAnalysis.weaknesses?.length || 0,
          recommendations: act2Data.evidenceAnalysis.recommendations?.length || 0
        } : null,
        legalAnalysis: act2Data?.legalAnalysis ? {
          applicableLaws: act2Data.legalAnalysis.applicableLaws?.length || 0,
          precedents: act2Data.legalAnalysis.precedents?.length || 0,
          risks: act2Data.legalAnalysis.risks?.length || 0
        } : null
      }
    });

    // 第三幕：苏格拉底对话数据
    const act3Data = socraticStore.messages;
    debugSections.push({
      title: '第三幕：苏格拉底对话数据',
      status: act3Data.length > 0 ? 'success' : 'warning',
      data: {
        messageCount: act3Data.length,
        studentMessages: act3Data.filter(m => m.role === 'user').length,
        teacherMessages: act3Data.filter(m => m.role === 'assistant').length,
        preview: act3Data.slice(0, 3).map(m => ({
          role: m.role,
          contentPreview: m.content.substring(0, 100)
        }))
      }
    });

    // 第四幕：学习报告数据
    const act4Report = teachingStore.summaryData.caseLearningReport;
    debugSections.push({
      title: '第四幕：学习报告数据',
      status: act4Report ? 'success' : 'warning',
      data: {
        hasReport: !!act4Report,
        hasCaseLearningReport: !!teachingStore.summaryData.caseLearningReport,
        hasGeneralReport: !!teachingStore.summaryData.report,
        preview: act4Report ? {
          caseTitle: act4Report.caseOverview.title,
          keyDispute: act4Report.caseOverview.keyDispute,
          learningPointsCount: (
            act4Report.learningPoints.factualInsights.length +
            act4Report.learningPoints.legalPrinciples.length +
            act4Report.learningPoints.evidenceHandling.length
          ),
          socraticHighlightsCount: (
            act4Report.socraticHighlights.keyQuestions.length +
            act4Report.socraticHighlights.studentInsights.length +
            act4Report.socraticHighlights.criticalThinking.length
          ),
          practicalTakeawaysCount: (
            act4Report.practicalTakeaways.cautionPoints.length +
            act4Report.practicalTakeaways.checkList.length
          )
        } : null
      }
    });

    setSections(debugSections);
  }, [teachingStore, socraticStore]);

  const toggleSection = (title: string) => {
    setExpanded(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const getStatusIcon = (status: DebugSection['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  return (
    <Card id="PptDebugPanelId" className="border-2 border-blue-500">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          🔍 数据调试面板
          <span className="text-sm font-normal text-gray-600">
            实时查看四幕教学数据
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="border rounded-lg">
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              {expanded[section.title] ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              {getStatusIcon(section.status)}
              <span className="font-semibold text-left flex-1">
                {section.title}
              </span>
            </button>

            {expanded[section.title] && (
              <div className="px-4 py-3 bg-gray-50 border-t">
                <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border">
                  {JSON.stringify(section.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}

        {/* 数据完整性总结 */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold text-yellow-900 mb-2">
            ⚠️ 数据完整性检查
          </div>
          <ul className="text-sm space-y-1">
            <li className={teachingStore.uploadData.extractedElements ? 'text-green-700' : 'text-red-700'}>
              {teachingStore.uploadData.extractedElements ? '✅' : '❌'} 第一幕数据
            </li>
            <li className={teachingStore.analysisData.result ? 'text-green-700' : 'text-red-700'}>
              {teachingStore.analysisData.result ? '✅' : '❌'} 第二幕数据（最重要！）
            </li>
            <li className={socraticStore.messages.length > 0 ? 'text-green-700' : 'text-yellow-700'}>
              {socraticStore.messages.length > 0 ? '✅' : '⚠️'} 第三幕数据（可选）
            </li>
            <li className={teachingStore.summaryData.caseLearningReport ? 'text-green-700' : 'text-yellow-700'}>
              {teachingStore.summaryData.caseLearningReport ? '✅' : '⚠️'} 第四幕数据（可选）
            </li>
          </ul>
        </div>

        {/* 提示信息 */}
        {!teachingStore.analysisData.result && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <div className="font-semibold text-red-900 mb-1">
              ❌ 第二幕数据缺失
            </div>
            <p className="text-sm text-red-700">
              这是PPT生成的核心数据源！请先完成第二幕深度分析，系统才能提取案件的关键事实、争议焦点、证据分析等信息。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
