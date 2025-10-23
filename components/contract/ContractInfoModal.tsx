'use client';

/**
 * 合同信息详情弹窗
 * 显示AI解析的完整合同信息
 */

import { useContractEditorStore } from '@/src/domains/contract-analysis/stores/contractEditorStore';
import { X, FileText, Users, Calendar, ListChecks, BarChart3 } from 'lucide-react';

interface ContractInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContractInfoModal({ isOpen, onClose }: ContractInfoModalProps) {
  const { parsedContract } = useContractEditorStore();

  if (!isOpen || !parsedContract) return null;

  const { metadata, clauses, extractionConfidence } = parsedContract;

  // 按分类统计条款
  const clauseStats = clauses.reduce((acc, clause) => {
    acc[clause.category] = (acc[clause.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">合同信息</h2>
              <p className="text-sm text-gray-600">AI智能解析结果</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">合同类型</p>
                  <p className="font-semibold text-gray-900">
                    {metadata.contractType}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">置信度</p>
                  <p className="font-semibold text-gray-900">
                    {(extractionConfidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </section>

            {/* 当事人信息 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                当事人信息
              </h3>
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-1 rounded">
                      {metadata.parties.partyA.role}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {metadata.parties.partyA.name}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-800 bg-blue-100 px-2 py-1 rounded">
                      {metadata.parties.partyB.role}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {metadata.parties.partyB.name}
                  </p>
                </div>
              </div>
            </section>

            {/* 日期信息 */}
            {(metadata.signDate || metadata.effectiveDate) && (
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  日期信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {metadata.signDate && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">签订日期</p>
                      <p className="font-semibold text-gray-900">
                        {metadata.signDate}
                      </p>
                    </div>
                  )}
                  {metadata.effectiveDate && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-1">生效日期</p>
                      <p className="font-semibold text-gray-900">
                        {metadata.effectiveDate}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 条款统计 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                条款统计
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">条款总数</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {clauses.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">分类数量</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(clauseStats).length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t space-y-2">
                  {Object.entries(clauseStats).map(([category, count]) => (
                    <div
                      key={category}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{category}</span>
                      <span className="font-medium text-gray-900">
                        {count} 个条款
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 条款列表 */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600" />
                条款清单
              </h3>
              <div className="space-y-2">
                {clauses.map((clause, index) => (
                  <div
                    key={clause.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {clause.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {clause.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {clause.content.length} 字符
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
