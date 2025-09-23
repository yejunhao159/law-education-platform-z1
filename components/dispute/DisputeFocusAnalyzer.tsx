/**
 * Dispute Focus Analyzer Component
 * Main interface for dispute focus analysis with drag-drop interaction
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, closestCenter } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Target,
  FileText,
  Scale,
  Brain,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  ChevronRight,
  Trophy,
  Zap
} from 'lucide-react';

import { DisputeCard } from '@/components/dispute/DisputeCard';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { ClaimElementDropZone } from '@/components/evidence/ClaimElementDropZone';
import { useDisputeStore } from '@/src/domains/stores';
import { useEvidenceInteractionStore } from '@/src/domains/stores';
import { analyzeDisputesWithAI } from '@/src/domains/legal-analysis/services/DisputeAnalysisService';
import { EvidenceMappingService } from '@/lib/evidence-mapping-service';
import type { DisputeFocus, Evidence, ClaimElement } from '@/types/dispute-evidence';

interface DisputeFocusAnalyzerProps {
  documentText?: string;
  caseId?: string;
  evidenceList?: Evidence[];
  onComplete?: (result: any) => void;
}

export function DisputeFocusAnalyzer({
  documentText,
  caseId,
  evidenceList = [],
  onComplete
}: DisputeFocusAnalyzerProps) {
  const [activeTab, setActiveTab] = useState('disputes');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draggedEvidence, setDraggedEvidence] = useState<Evidence | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<DisputeFocus | null>(null);
  const [claimElements, setClaimElements] = useState<ClaimElement[]>([]);
  
  const disputeStore = useDisputeStore();
  const interactionStore = useEvidenceInteractionStore();
  // No need for analyzer instance, using direct function call
  const mappingService = new EvidenceMappingService();

  // Mock evidence data if not provided
  const defaultEvidence: Evidence[] = evidenceList.length > 0 ? evidenceList : [
    {
      id: 'ev-1',
      name: '购销合同',
      type: 'document',
      content: '双方签订的购销合同原件',
      source: '原告提供',
      date: '2024-01-15',
      quality: { authenticity: 85, relevance: 90, legality: 95 },
      verified: true
    },
    {
      id: 'ev-2',
      name: '付款凭证',
      type: 'document',
      content: '银行转账记录',
      source: '原告提供',
      date: '2024-02-20',
      quality: { authenticity: 95, relevance: 85, legality: 100 },
      verified: true
    },
    {
      id: 'ev-3',
      name: '催款通知',
      type: 'document',
      content: '律师函及送达回执',
      source: '原告提供',
      date: '2024-03-10',
      quality: { authenticity: 90, relevance: 80, legality: 95 }
    },
    {
      id: 'ev-4',
      name: '证人证言',
      type: 'testimony',
      content: '业务经理关于交易过程的证言',
      source: '证人李某',
      date: '2024-03-20',
      quality: { authenticity: 70, relevance: 75, legality: 85 }
    }
  ];

  // Analyze document
  const handleAnalyze = async () => {
    if (!documentText && !caseId) {
      interactionStore.addFeedback('error', '请提供案件文本或案件ID');
      return;
    }

    setIsAnalyzing(true);
    interactionStore.resetInteraction();

    try {
      const result = await analyzeDisputesWithAI({
        documentText: documentText || '',
        caseType: 'civil', // Default to civil case
        caseId: caseId || `case-${Date.now()}`,
        options: {
          extractClaimBasis: true,
          generateTeachingNotes: true,
          analyzeDifficulty: true
        }
      });

      if (result.success && result.disputes) {
        disputeStore.setDisputes(result.disputes);
        
        // Extract claim elements from first dispute
        if (result.disputes.length > 0) {
          const firstDispute = result.disputes[0];
          setSelectedDispute(firstDispute);
          
          // Create claim elements from claim basis
          const elements: ClaimElement[] = firstDispute.claimBasis.flatMap(basis =>
            basis.elements.map(el => ({
              ...el,
              claimBasisId: basis.id
            }))
          );
          setClaimElements(elements);
        }

        interactionStore.addFeedback('success', '争议焦点分析完成！');
        onComplete?.(result);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      interactionStore.addFeedback('error', '分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle drag events
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'evidence') {
      setDraggedEvidence(active.data.current.evidence);
      interactionStore.startDrag(active.id as string);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over?.data.current?.type === 'claimElement') {
      interactionStore.setDropTarget(over.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedEvidence) {
      interactionStore.completeDrop(null, null, false);
      setDraggedEvidence(null);
      return;
    }

    // Find the target element
    const targetElement = claimElements.find(el => el.id === over.id);
    if (!targetElement) {
      interactionStore.completeDrop(null, null, false);
      setDraggedEvidence(null);
      return;
    }

    // Validate mapping
    const mappings = mappingService.autoMapEvidence(
      { 
        id: draggedEvidence.id, 
        content: draggedEvidence.content, 
        type: draggedEvidence.type 
      },
      [targetElement]
    );

    const isValid = mappings.length > 0 && mappings[0].confidence > 0.5;

    if (isValid) {
      // Update element with new evidence
      setClaimElements(prev => prev.map(el => {
        if (el.id === targetElement.id) {
          const updated = {
            ...el,
            supportingEvidence: [...el.supportingEvidence, draggedEvidence.id],
            proved: el.required ? true : el.supportingEvidence.length >= 1
          };
          return updated;
        }
        return el;
      }));

      interactionStore.completeDrop(draggedEvidence.id, targetElement.id, true);
      interactionStore.addPoints(10);
      interactionStore.addFeedback('success', `成功将 "${draggedEvidence.name}" 映射到 "${targetElement.name}"`);
    } else {
      interactionStore.completeDrop(draggedEvidence.id, targetElement.id, false);
      interactionStore.addFeedback('error', '证据与要素不匹配，请重试');
    }

    setDraggedEvidence(null);
  };

  // Remove evidence from element
  const handleRemoveEvidence = (elementId: string, evidenceId: string) => {
    setClaimElements(prev => prev.map(el => {
      if (el.id === elementId) {
        return {
          ...el,
          supportingEvidence: el.supportingEvidence.filter(id => id !== evidenceId),
          proved: false
        };
      }
      return el;
    }));
    
    interactionStore.addFeedback('info', '已移除证据映射');
  };

  // Calculate progress
  const totalElements = claimElements.length;
  const provedElements = claimElements.filter(el => el.proved).length;
  const progressPercentage = totalElements > 0 ? (provedElements / totalElements) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-primary" />
              <CardTitle>争议焦点智能分析系统</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Trophy className="w-3 h-3" />
                得分: {interactionStore.score}
              </Badge>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    开始分析
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-sm text-gray-600 mt-2">
            证明进度: {provedElements}/{totalElements} 要素已完成
          </p>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="disputes" className="gap-2">
            <Target className="w-4 h-4" />
            争议焦点
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-2">
            <FileText className="w-4 h-4" />
            证据材料
          </TabsTrigger>
          <TabsTrigger value="mapping" className="gap-2">
            <Scale className="w-4 h-4" />
            证据映射
          </TabsTrigger>
        </TabsList>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="space-y-4">
          {disputeStore.disputes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">尚未识别争议焦点</p>
                <p className="text-sm text-gray-500 mt-2">
                  点击"开始分析"按钮进行智能分析
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {disputeStore.disputes.map((dispute) => (
                <DisputeCard
                  key={dispute.id}
                  dispute={dispute}
                  isSelected={selectedDispute?.id === dispute.id}
                  onSelect={() => {
                    setSelectedDispute(dispute);
                    const elements: ClaimElement[] = dispute.claimBasis.flatMap(basis =>
                      basis.elements.map(el => ({
                        ...el,
                        claimBasisId: basis.id
                      }))
                    );
                    setClaimElements(elements);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {defaultEvidence.map((evidence) => (
              <EvidenceCard
                key={evidence.id}
                evidence={evidence}
                isDraggable={true}
                showQuality={true}
              />
            ))}
          </div>
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Evidence Pool */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  可用证据
                </h3>
                <div className="space-y-3">
                  {defaultEvidence.map((evidence) => (
                    <EvidenceCard
                      key={evidence.id}
                      evidence={evidence}
                      isDraggable={true}
                      isCompact={true}
                      showQuality={false}
                    />
                  ))}
                </div>
              </div>

              {/* Claim Elements */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  请求权要素
                </h3>
                {claimElements.length === 0 ? (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      请先选择一个争议焦点以查看其请求权要素
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {claimElements.map((element) => (
                      <ClaimElementDropZone
                        key={element.id}
                        element={element}
                        onRemove={(evidenceId) => 
                          handleRemoveEvidence(element.id, evidenceId)
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DndContext>
        </TabsContent>
      </Tabs>

      {/* Feedback Messages */}
      <AnimatePresence>
        {interactionStore.feedback.slice(-3).map((fb, index) => (
          <motion.div
            key={`${fb.timestamp}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-4 right-4 z-50"
            style={{ bottom: `${(index + 1) * 60}px` }}
          >
            <Alert className={cn(
              'w-80',
              fb.type === 'success' && 'border-green-500 bg-green-50',
              fb.type === 'error' && 'border-red-500 bg-red-50',
              fb.type === 'info' && 'border-blue-500 bg-blue-50'
            )}>
              {fb.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
              {fb.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
              <AlertDescription>{fb.message}</AlertDescription>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helper function
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}