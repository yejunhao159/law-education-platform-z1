'use client';

/**
 * 风险高亮卡片组件
 * 显示单个风险的详细信息和建议
 */

import { useState } from 'react';
import type { RiskHighlight } from '@/src/domains/contract-analysis/types/editor';
import { RISK_COLORS } from '@/src/domains/contract-analysis/types/editor';

interface RiskHighlightCardProps {
  risk: RiskHighlight;
  onJumpToPosition?: (position: { start: number; end: number }) => void;
  onApplySuggestion?: (suggestion: {
    originalText: string;
    suggestedText: string;
    position: { start: number; end: number };
  }) => void;
}

export function RiskHighlightCard({
  risk,
  onJumpToPosition,
  onApplySuggestion,
}: RiskHighlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const riskLevelText = {
    critical: '高风险',
    medium: '中风险',
    low: '低风险',
  };

  const riskLevelIcon = {
    critical: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
  };

  const handleApply = () => {
    if (risk.suggestedText && onApplySuggestion) {
      onApplySuggestion({
        originalText: risk.text,
        suggestedText: risk.suggestedText,
        position: risk.position,
      });
    }
  };

  return (
    <div
      className="border-l-4 rounded-lg p-4 mb-3 bg-white shadow-sm hover:shadow-md transition-shadow"
      style={{ borderLeftColor: RISK_COLORS[risk.riskLevel] }}
    >
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{riskLevelIcon[risk.riskLevel]}</span>
          <div>
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: RISK_COLORS[risk.riskLevel] + '20',
                color: RISK_COLORS[risk.riskLevel],
              }}
            >
              {riskLevelText[risk.riskLevel]}
            </span>
            <span className="ml-2 text-sm font-medium text-gray-700">
              {risk.riskType}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* 风险描述 */}
      <p className="text-sm text-gray-700 mb-2">{risk.description}</p>

      {/* 原文片段 */}
      <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 mb-2 cursor-pointer hover:bg-gray-100"
           onClick={() => onJumpToPosition?.(risk.position)}>
        <span className="font-medium">原文: </span>
        <span className="italic">"{risk.text.substring(0, 100)}..."</span>
      </div>

      {/* 展开的详细内容 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          {risk.legalBasis && (
            <div>
              <span className="text-xs font-semibold text-gray-700">法律依据: </span>
              <p className="text-xs text-gray-600 mt-1">{risk.legalBasis}</p>
            </div>
          )}

          {risk.consequence && (
            <div>
              <span className="text-xs font-semibold text-gray-700">可能后果: </span>
              <p className="text-xs text-gray-600 mt-1">{risk.consequence}</p>
            </div>
          )}

          <div>
            <span className="text-xs font-semibold text-gray-700">建议: </span>
            <p className="text-xs text-gray-600 mt-1">{risk.suggestion}</p>
          </div>

          {risk.suggestedText && (
            <div className="bg-green-50 p-3 rounded-md">
              <span className="text-xs font-semibold text-green-800">建议修改为: </span>
              <p className="text-xs text-green-700 mt-1 italic">
                "{risk.suggestedText}"
              </p>
              <button
                onClick={handleApply}
                className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
              >
                应用此建议
              </button>
            </div>
          )}
        </div>
      )}

      {/* 快速操作按钮 */}
      {!isExpanded && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onJumpToPosition?.(risk.position)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            定位原文
          </button>
          {risk.suggestedText && (
            <button
              onClick={handleApply}
              className="text-xs text-green-600 hover:text-green-800"
            >
              应用建议
            </button>
          )}
        </div>
      )}
    </div>
  );
}
