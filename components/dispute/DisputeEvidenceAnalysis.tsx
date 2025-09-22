/**
 * Main Dispute Evidence Analysis Component
 * Integrates dispute focus and evidence review functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDisputeStore, useEvidenceInteractionStore } from '@/src/domains/stores';
import { DisputeList } from './DisputeList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  FileText, 
  Target, 
  TrendingUp,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import type { DisputeFocus } from '@/types/dispute-evidence';

interface DisputeEvidenceAnalysisProps {
  documentText?: string;
  caseId?: string;
  onAnalysisComplete?: (disputes: DisputeFocus[]) => void;
}

export function DisputeEvidenceAnalysis({
  documentText,
  caseId,
  onAnalysisComplete
}: DisputeEvidenceAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('disputes');
  
  // Zustand stores
  const {
    disputes,
    selectedDisputeId,
    status,
    error,
    isLoading,
    setDisputes,
    selectDispute,
    setLoading,
    setError,
    setStatus
  } = useDisputeStore();

  const {
    score,
    feedback,
    mode,
    completedMappings,
    setMode,
    addFeedback,
    resetScore
  } = useEvidenceInteractionStore();

  // Analyze document
  const analyzeDocument = async () => {
    if (!documentText) {
      setError('请先上传或输入法律文书');
      return;
    }

    setIsAnalyzing(true);
    setLoading(true);
    setStatus('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/dispute-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentText,
          caseType: 'civil',
          extractClaimBasis: true,
          analyzeDifficulty: true,
          generateTeachingNotes: true,
          caseId
        })
      });

      const result = await response.json();

      if (result.success) {
        setDisputes(result.disputes);
        setStatus('completed');
        addFeedback('success', `成功识别 ${result.disputes.length} 个争议焦点`);
        onAnalysisComplete?.(result.disputes);
      } else {
        throw new Error(result.error || '分析失败');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('failed');
      addFeedback('error', `分析失败: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  // Calculate progress
  const calculateProgress = () => {
    const totalTasks = disputes.length * 3; // Each dispute has 3 aspects
    const completedTasks = completedMappings.size;
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">争议焦点与证据分析</CardTitle>
              <p className="text-gray-600 mt-2">
                AI智能识别案件争议焦点，交互式证据映射评估
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={analyzeDocument}
                disabled={isAnalyzing || !documentText}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    开始分析
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status and Progress */}
          <div className="space-y-4">
            {/* Status Badges */}
            <div className="flex gap-2">
              <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                状态: {status === 'pending' ? '待分析' :
                       status === 'analyzing' ? '分析中' :
                       status === 'completed' ? '已完成' :
                       status === 'failed' ? '失败' : '已缓存'}
              </Badge>
              <Badge variant="outline">
                争议数: {disputes.length}
              </Badge>
              <Badge variant="outline">
                得分: {score}
              </Badge>
              <Badge variant={mode === 'practice' ? 'default' : 'secondary'}>
                模式: {mode === 'practice' ? '练习' : '观看'}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>完成进度</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disputes" className="gap-2">
            <BookOpen className="w-4 h-4" />
            争议焦点
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-2">
            <FileText className="w-4 h-4" />
            证据评估
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            分析报告
          </TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          {disputes.length > 0 ? (
            <DisputeList
              disputes={disputes}
              selectedId={selectedDisputeId}
              onSelectDispute={selectDispute}
              showTeachingNotes={true}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  尚未识别争议焦点
                </p>
                <p className="text-sm text-gray-600">
                  请先上传法律文书并点击"开始分析"按钮
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>证据质量评估</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                拖拽证据到对应的请求权要素，系统将自动评估证据质量
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>证据交互组件将在下一步实现</p>
                <p className="text-sm mt-2">支持拖放交互和自动质量评估</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>综合分析报告</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-600 font-medium">争议焦点</p>
                  <p className="text-2xl font-bold text-blue-900">{disputes.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-green-600 font-medium">已映射证据</p>
                  <p className="text-2xl font-bold text-green-900">{completedMappings.size}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-sm text-purple-600 font-medium">当前得分</p>
                  <p className="text-2xl font-bold text-purple-900">{score}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-sm text-yellow-600 font-medium">完成度</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {Math.round(calculateProgress())}%
                  </p>
                </div>
              </div>

              {/* Feedback Messages */}
              {feedback.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">系统反馈：</p>
                  {feedback.slice(-5).map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-2 rounded text-sm ${
                        msg.type === 'success' ? 'bg-green-50 text-green-800' :
                        msg.type === 'error' ? 'bg-red-50 text-red-800' :
                        msg.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                        'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {msg.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Export Options */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  导出报告
                </Button>
                <Button variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  保存进度
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}