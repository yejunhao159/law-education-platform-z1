"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, Gavel, User, Users, AlertCircle, FileText, Scale } from 'lucide-react'

// 证据项目类型，匹配实际数据结构
interface EvidenceItem {
  id?: string;
  content?: string;
  description?: string;
  title?: string;
  type?: string;
  [key: string]: any;
}

interface TimelineEvent {
  id?: string;
  date: string;
  title?: string;
  event?: string;  // 兼容实际数据结构
  description?: string;
  detail?: string; // 兼容实际数据结构
  type?: string;
  parties?: string[];
  evidence?: EvidenceItem[]; // 支持对象数组
}

interface EventClaimAnalysis {
  eventId: string;
  eventSummary: {
    date: string;
    title: string;
    parties: string[];
    legalNature: string;
  };
  plaintiffAnalysis: {
    action: string;
    legalBasis: string;
    requirements: string[];
    evidence: string[];
    strength: 'strong' | 'medium' | 'weak';
  };
  defendantAnalysis: {
    action: string;
    response: string;
    defenses: string[];
    counterClaims: string[];
    strength: 'strong' | 'medium' | 'weak';
  };
  legalSignificance: {
    impact: string;
    consequences: string[];
    relatedClaims: string[];
  };
  courtPerspective: {
    keyFindings: string[];
    appliedLaws: string[];
    reasoning: string;
  };
}

interface EventClaimAnalysisDialogProps {
  event: TimelineEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventClaimAnalysisDialog({
  event,
  isOpen,
  onClose
}: EventClaimAnalysisDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<EventClaimAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && event) {
      analyzeEvent();
    }
  }, [isOpen, event]);

  const analyzeEvent = async () => {
    if (!event) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      // 转换证据格式为字符串数组以兼容API
      const eventForAPI = {
        ...event,
        title: event.title || event.event || '未命名事件',
        description: event.description || event.detail || '',
        evidence: event.evidence?.map(e =>
          typeof e === 'string' ? e : (e.content || e.description || e.title || JSON.stringify(e))
        ) || []
      };

      const response = await fetch('/api/legal-analysis/event-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventForAPI })
      });

      if (!response.ok) {
        throw new Error('分析请求失败');
      }

      const result = await response.json();
      setAnalysis(result);
    } catch (error) {
      console.error('事件请求权分析失败:', error);
      setError('分析失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-purple-600" />
            事件请求权分析
          </DialogTitle>
          <DialogDescription>
            深入分析该时间节点的法律行为和请求权基础
          </DialogDescription>
        </DialogHeader>

        {/* 事件信息 */}
        <Card className="p-4 bg-gray-50">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{event.date}</Badge>
              <h3 className="font-semibold">{event.title || event.event || '未命名事件'}</h3>
            </div>
            {(event.description || event.detail) && (
              <p className="text-sm text-gray-600">{event.description || event.detail}</p>
            )}
          </div>
        </Card>

        {/* 分析内容 */}
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>正在分析事件的法律性质...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span>{error}</span>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* 原告行为分析 */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold">原告行为分析</h4>
                <Badge variant={
                  analysis.plaintiffAnalysis.strength === 'strong' ? 'default' :
                  analysis.plaintiffAnalysis.strength === 'medium' ? 'secondary' : 'outline'
                }>
                  {analysis.plaintiffAnalysis.strength === 'strong' ? '强' :
                   analysis.plaintiffAnalysis.strength === 'medium' ? '中' : '弱'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">行为性质：</span>
                  <span className="text-gray-700">{analysis.plaintiffAnalysis.action}</span>
                </div>
                <div>
                  <span className="font-medium">法律依据：</span>
                  <span className="text-blue-600">{analysis.plaintiffAnalysis.legalBasis}</span>
                </div>
                {analysis.plaintiffAnalysis.requirements.length > 0 && (
                  <div>
                    <span className="font-medium">构成要件：</span>
                    <ul className="mt-1 ml-4 text-gray-600">
                      {analysis.plaintiffAnalysis.requirements.map((req, i) => (
                        <li key={i} className="list-disc">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            {/* 被告行为分析 */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-orange-600" />
                <h4 className="font-semibold">被告行为分析</h4>
                <Badge variant={
                  analysis.defendantAnalysis.strength === 'strong' ? 'default' :
                  analysis.defendantAnalysis.strength === 'medium' ? 'secondary' : 'outline'
                }>
                  {analysis.defendantAnalysis.strength === 'strong' ? '强' :
                   analysis.defendantAnalysis.strength === 'medium' ? '中' : '弱'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">行为性质：</span>
                  <span className="text-gray-700">{analysis.defendantAnalysis.action}</span>
                </div>
                <div>
                  <span className="font-medium">应对方式：</span>
                  <span className="text-orange-600">{analysis.defendantAnalysis.response}</span>
                </div>
                {analysis.defendantAnalysis.defenses.length > 0 && (
                  <div>
                    <span className="font-medium">抗辩理由：</span>
                    <ul className="mt-1 ml-4 text-gray-600">
                      {analysis.defendantAnalysis.defenses.map((def, i) => (
                        <li key={i} className="list-disc">{def}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            {/* 法律意义 */}
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold">法律意义</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">关键影响：</span>
                  <span className="text-purple-700">{analysis.legalSignificance.impact}</span>
                </div>
                {analysis.legalSignificance.consequences.length > 0 && (
                  <div>
                    <span className="font-medium">法律后果：</span>
                    <ul className="mt-1 ml-4 text-purple-600">
                      {analysis.legalSignificance.consequences.map((con, i) => (
                        <li key={i} className="list-disc">{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            {/* 法院视角 */}
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">法院认定</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">关键认定：</span>
                  <ul className="mt-1 ml-4 text-green-700">
                    {analysis.courtPerspective.keyFindings.map((finding, i) => (
                      <li key={i} className="list-disc">{finding}</li>
                    ))}
                  </ul>
                </div>
                {analysis.courtPerspective.appliedLaws.length > 0 && (
                  <div>
                    <span className="font-medium">适用法条：</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {analysis.courtPerspective.appliedLaws.map((law, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {law}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-medium">裁判理由：</span>
                  <p className="mt-1 text-green-700">{analysis.courtPerspective.reasoning}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            点击分析按钮开始分析
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 mt-4">
          {!isAnalyzing && !analysis && (
            <Button onClick={analyzeEvent} variant="default">
              开始分析
            </Button>
          )}
          <Button onClick={onClose} variant="outline">
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}