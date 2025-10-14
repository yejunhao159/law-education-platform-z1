/**
 * 第四幕：总结提升
 * 展示案件学习报告
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, Scale, Shield, MessageCircle, Lightbulb, CheckCircle, Quote, Clock, Target, Presentation } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTeachingStore } from '@/src/domains/teaching-acts/stores/useTeachingStore';
import type { CaseLearningReport } from '@/src/types';

export function ActFour() {
  const router = useRouter();
  const {
    summaryData,
    setGeneratingReport,
    setCaseLearningReport,
    setCurrentAct,
    markActComplete
  } = useTeachingStore();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 进入第四幕时自动生成报告
    if (!summaryData.caseLearningReport && !summaryData.isGenerating) {
      generateReport();
    }
  }, []);

  const generateReport = async () => {
    try {
      setError(null);
      setGeneratingReport(true);

      // 🔧 修复：从客户端Store读取数据并传递给API
      const store = useTeachingStore.getState();
      const requestData = {
        uploadData: store.uploadData,
        analysisData: store.analysisData,
        socraticData: {
          level: store.socraticData.level,
          completedNodes: Array.from(store.socraticData.completedNodes),
        }
      };

      console.log('📤 [ActFour] 发送Store数据到API:', {
        uploadData存在: !!requestData.uploadData.extractedElements,
        analysisData存在: !!requestData.analysisData.result,
        socraticLevel: requestData.socraticData.level,
        completedNodes: requestData.socraticData.completedNodes.length
      });

      const response = await fetch('/api/teaching-acts/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '生成报告失败');
      }
      
      setCaseLearningReport(result.data);
      // 标记第四幕完成
      markActComplete('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告时发生错误');
      setGeneratingReport(false);
    }
  };

  const downloadPDF = () => {
    // TODO: 实现PDF下载功能
    alert('PDF下载功能开发中...');
  };

  const startNewCase = () => {
    // 重置状态，开始新案例
    useTeachingStore.getState().reset();
    setCurrentAct('upload');
  };

  // 加载状态
  if (summaryData.isGenerating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">正在生成学习报告</h2>
          <p className="text-gray-600 mb-8">AI正在分析您的学习过程，请稍候...</p>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={generateReport} className="mt-4">
          重新生成
        </Button>
      </div>
    );
  }

  const report = summaryData.caseLearningReport as CaseLearningReport;
  
  if (!report) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* 标题 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">案件学习报告</h2>
        <p className="text-gray-600">{report.caseOverview.title}</p>
      </div>
      
      {/* 一句话总结卡片 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <Quote className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-lg font-medium">{report.caseOverview.oneLineSummary}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              学习时长：{report.metadata.studyDuration}分钟
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              案件难度：{report.metadata.difficultyLevel}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 核心争议和判决 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">核心争议</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{report.caseOverview.keyDispute}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">判决结果</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{report.caseOverview.judgmentResult}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* 学习要点网格 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 事实认定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              事实认定要点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.learningPoints.factualInsights.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* 法律原理 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4 text-green-600" />
              法律原理要点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.learningPoints.legalPrinciples.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-green-600 mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* 证据处理 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              证据处理要点
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.learningPoints.evidenceHandling.map((point, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      
      {/* 讨论精华 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            苏格拉底讨论精华
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 text-sm text-gray-700">关键提问</h4>
              <ul className="space-y-2">
                {report.socraticHighlights.keyQuestions.map((question, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-blue-500 mt-1">?</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 text-sm text-gray-700">重要领悟</h4>
              <ul className="space-y-2">
                {report.socraticHighlights.studentInsights.map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 实践提醒 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-700">⚡ 实务要点提醒</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">适用案件类型：</p>
              <p className="text-sm text-gray-700">{report.practicalTakeaways.similarCases}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">注意事项：</p>
              <ul className="space-y-1">
                {report.practicalTakeaways.cautionPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-orange-600 mt-1">!</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">操作要点：</p>
              <ul className="space-y-1">
                {report.practicalTakeaways.checkList.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 操作按钮 */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={downloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          下载报告
        </Button>

        {/* PPT生成按钮 - 跳转到独立页面 */}
        <Button
          variant="outline"
          onClick={() => router.push('/teaching/ppt/generate')}
        >
          <Presentation className="w-4 h-4 mr-2" />
          生成教学PPT
        </Button>

        <Button onClick={startNewCase}>
          学习下一个案例
        </Button>
      </div>
    </div>
  );
}