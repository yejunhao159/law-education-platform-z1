'use client';

/**
 * 条款导航面板
 * 显示合同的所有条款，按分类组织
 */

import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { CheckCircle, XCircle, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import type { ClauseCategory } from '@/src/domains/contract-analysis/types/analysis';

export function ClauseNavigationPanel() {
  const { parsedContract, analysisStatus } = useContractEditorStore();

  // 如果还在分析中
  if (analysisStatus === 'analyzing') {
    return (
      <div className="w-64 border-r bg-gray-50 p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
        <p className="text-sm text-gray-600">正在分析条款...</p>
      </div>
    );
  }

  // 如果分析失败
  if (analysisStatus === 'failed') {
    return (
      <div className="w-64 border-r bg-gray-50 p-4">
        <div className="text-center text-sm text-gray-500">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
          <p>条款分析失败</p>
        </div>
      </div>
    );
  }

  // 如果没有解析结果
  if (!parsedContract) {
    return (
      <div className="w-64 border-r bg-gray-50 p-4">
        <div className="text-center text-sm text-gray-500">
          <p>等待AI分析...</p>
        </div>
      </div>
    );
  }

  // 按分类组织条款
  const clausesByCategory = groupClausesByCategory(parsedContract.clauses);

  // 6大核心条款
  const essentialCategories: ClauseCategory[] = [
    '违约责任',
    '合同终止',
    '交付履行',
    '管辖条款',
    '争议解决',
    '费用承担',
  ];

  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b bg-white">
        <h3 className="font-semibold text-gray-900 text-sm">条款导航</h3>
        <p className="text-xs text-gray-500 mt-1">
          共 {parsedContract.clauses.length} 个条款
        </p>
      </div>

      {/* 条款列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 核心条款 */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            核心条款
          </h4>
          {essentialCategories.map((category) => {
            const clauses = clausesByCategory[category] || [];
            const hasClause = clauses.length > 0;

            return (
              <div key={category} className="mb-2">
                <div className="flex items-center gap-2 text-sm">
                  {hasClause ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span
                    className={`flex-1 ${
                      hasClause ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {category}
                  </span>
                  {hasClause && (
                    <span className="text-xs text-gray-400">
                      {clauses.length}
                    </span>
                  )}
                </div>

                {/* 展开显示该分类下的条款 */}
                {hasClause && (
                  <div className="ml-6 mt-1 space-y-1">
                    {clauses.map((clause) => (
                      <button
                        key={clause.id}
                        onClick={() => jumpToClause(clause.id)}
                        className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 group"
                      >
                        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                        <span className="truncate">{clause.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 其他条款 */}
        {clausesByCategory['其他'] && clausesByCategory['其他'].length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              其他条款
            </h4>
            <div className="space-y-1">
              {clausesByCategory['其他'].map((clause) => (
                <button
                  key={clause.id}
                  onClick={() => jumpToClause(clause.id)}
                  className="w-full text-left text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1 group"
                >
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                  <span className="truncate">{clause.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 按分类组织条款
 */
function groupClausesByCategory(clauses: any[]) {
  const grouped: Record<string, any[]> = {};

  for (const clause of clauses) {
    const category = clause.category || '其他';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(clause);
  }

  return grouped;
}

/**
 * 跳转到指定条款
 */
function jumpToClause(clauseId: string) {
  // TODO: 实现跳转逻辑
  console.log('跳转到条款:', clauseId);

  // 方案1：通过暴露的contractEditor API跳转
  const contractEditor = (window as any).contractEditor;
  if (contractEditor && contractEditor.jumpToPosition) {
    // 需要根据clauseId找到对应的position
    console.log('使用编辑器API跳转');
  }

  // 方案2：通过DOM滚动
  const element = document.querySelector(`[data-clause-id="${clauseId}"]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
