'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Target
} from 'lucide-react';

/**
 * 论证树可视化组件 - 教师专用
 * 展示学生的论证逻辑结构，帮助教师快速理解和评价
 */

// 论证节点类型
export interface ArgumentNode {
  id: string;
  type: 'claim' | 'reason' | 'evidence' | 'counter' | 'question';
  content: string;
  speaker: 'teacher' | 'student' | 'ai';
  parentId?: string;
  children?: ArgumentNode[];
  evaluation?: {
    strength: 'strong' | 'medium' | 'weak';
    issues?: string[];
  };
  timestamp?: string;
  isExpanded?: boolean;
}

interface ArgumentTreeProps {
  nodes: ArgumentNode[];
  onNodeClick?: (node: ArgumentNode) => void;
  onAddQuestion?: (parentId: string, question: string) => void;
  currentFocus?: string;
  showEvaluation?: boolean;
}

export default function ArgumentTree({
  nodes,
  onNodeClick,
  onAddQuestion,
  currentFocus,
  showEvaluation = true
}: ArgumentTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [showQuestionFor, setShowQuestionFor] = useState<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  // 构建树形结构
  const buildTree = (nodes: ArgumentNode[]): ArgumentNode[] => {
    const nodeMap = new Map<string, ArgumentNode>();
    const roots: ArgumentNode[] = [];

    // 首先创建所有节点的映射
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // 建立父子关系
    nodes.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        const child = nodeMap.get(node.id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(child);
      } else {
        roots.push(nodeMap.get(node.id)!);
      }
    });

    return roots;
  };

  // 获取节点图标
  const getNodeIcon = (node: ArgumentNode) => {
    switch (node.type) {
      case 'claim':
        return <Target className="w-4 h-4" />;
      case 'reason':
        return <Lightbulb className="w-4 h-4" />;
      case 'evidence':
        return <CheckCircle className="w-4 h-4" />;
      case 'counter':
        return <AlertTriangle className="w-4 h-4" />;
      case 'question':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // 获取节点颜色
  const getNodeColor = (node: ArgumentNode) => {
    if (node.id === currentFocus) return 'ring-2 ring-blue-500';
    
    switch (node.type) {
      case 'claim':
        return 'bg-purple-50 border-purple-300';
      case 'reason':
        return 'bg-blue-50 border-blue-300';
      case 'evidence':
        return 'bg-green-50 border-green-300';
      case 'counter':
        return 'bg-orange-50 border-orange-300';
      case 'question':
        return 'bg-gray-50 border-gray-300';
      default:
        return 'bg-white';
    }
  };

  // 获取强度标识
  const getStrengthIndicator = (strength?: 'strong' | 'medium' | 'weak') => {
    if (!strength) return null;
    
    switch (strength) {
      case 'strong':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      case 'medium':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      case 'weak':
        return <div className="w-2 h-2 rounded-full bg-red-500" />;
    }
  };

  // 切换节点展开状态
  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // 处理节点点击
  const handleNodeClick = (node: ArgumentNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node);
  };

  // 添加教师提问
  const handleAddQuestion = (parentId: string) => {
    if (questionInput.trim()) {
      onAddQuestion?.(parentId, questionInput);
      setQuestionInput('');
      setShowQuestionFor(null);
    }
  };

  // 渲染节点
  const renderNode = (node: ArgumentNode, level: number = 0): React.ReactElement => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode === node.id;

    return (
      <div key={node.id} className="mb-2">
        <div 
          className={`
            flex items-start p-3 rounded-lg border cursor-pointer
            transition-all duration-200 hover:shadow-md
            ${getNodeColor(node)}
            ${isSelected ? 'ring-2 ring-blue-400' : ''}
          `}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* 展开/折叠按钮 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="mr-2 mt-0.5"
            >
              {isExpanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </button>
          )}

          {/* 节点图标 */}
          <div className="mr-2 mt-0.5">
            {getNodeIcon(node)}
          </div>

          {/* 节点内容 */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* 发言者标签 */}
                <span className={`
                  inline-block px-2 py-0.5 text-xs rounded-full mb-1
                  ${node.speaker === 'teacher' ? 'bg-blue-100 text-blue-700' :
                    node.speaker === 'student' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'}
                `}>
                  {node.speaker === 'teacher' ? '教师' :
                   node.speaker === 'student' ? '学生' : 'AI'}
                </span>

                {/* 内容 */}
                <div className="text-sm text-gray-800">
                  {node.content}
                </div>

                {/* 评估信息 */}
                {showEvaluation && node.evaluation && (
                  <div className="mt-2 flex items-center gap-2">
                    {getStrengthIndicator(node.evaluation.strength)}
                    <span className="text-xs text-gray-500">
                      论证强度: {
                        node.evaluation.strength === 'strong' ? '强' :
                        node.evaluation.strength === 'medium' ? '中' : '弱'
                      }
                    </span>
                    {node.evaluation.issues && node.evaluation.issues.length > 0 && (
                      <span className="text-xs text-orange-600">
                        ({node.evaluation.issues.length}个问题)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuestionFor(node.id === showQuestionFor ? null : node.id);
                  }}
                  className="p-1"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 添加提问输入框 */}
            {showQuestionFor === node.id && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="输入引导性问题..."
                  className="flex-1 px-2 py-1 text-sm border rounded"
                  onClick={(e) => e.stopPropagation()}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddQuestion(node.id);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddQuestion(node.id);
                  }}
                >
                  提问
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children!.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const treeData = buildTree(nodes);

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">论证结构图</h3>
        
        {/* 图例 */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-purple-600" />
            <span>主张</span>
          </div>
          <div className="flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-blue-600" />
            <span>理由</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span>证据</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            <span>反驳</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-gray-600" />
            <span>提问</span>
          </div>
        </div>
      </div>

      {/* 论证树 */}
      <div ref={treeRef} className="overflow-auto max-h-[600px]">
        {treeData.length > 0 ? (
          treeData.map(node => renderNode(node))
        ) : (
          <div className="text-center text-gray-500 py-8">
            暂无论证内容
          </div>
        )}
      </div>

      {/* 统计信息 */}
      {nodes.length > 0 && (
        <div className="mt-4 pt-4 border-t text-sm text-gray-600">
          <div className="flex justify-between">
            <span>总节点数: {nodes.length}</span>
            <span>
              论证深度: {Math.max(...nodes.map(n => {
                let depth = 0;
                let current = n;
                while (current.parentId) {
                  depth++;
                  current = nodes.find(node => node.id === current.parentId) || current;
                  if (depth > 10) break; // 防止循环
                }
                return depth;
              })) + 1}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}