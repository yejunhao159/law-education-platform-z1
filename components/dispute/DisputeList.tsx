/**
 * Dispute List Component
 * Displays a list of dispute cards with filtering and sorting
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DisputeFocus, DifficultyLevel, TeachingValueLevel } from '@/types/dispute-evidence';
import { DisputeCard } from './DisputeCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';

interface DisputeListProps {
  disputes: DisputeFocus[];
  selectedId?: string | null;
  onSelectDispute?: (id: string) => void;
  showTeachingNotes?: boolean;
  className?: string;
}

export function DisputeList({
  disputes,
  selectedId,
  onSelectDispute,
  showTeachingNotes = false,
  className = ''
}: DisputeListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | 'all'>('all');
  const [teachingValueFilter, setTeachingValueFilter] = useState<TeachingValueLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'difficulty' | 'teachingValue' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort disputes
  const filteredAndSortedDisputes = useMemo(() => {
    let filtered = disputes.filter(dispute => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          dispute.content.toLowerCase().includes(searchLower) ||
          dispute.plaintiffView.toLowerCase().includes(searchLower) ||
          dispute.defendantView.toLowerCase().includes(searchLower) ||
          dispute.courtView.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Difficulty filter
      if (difficultyFilter !== 'all' && dispute.difficulty !== difficultyFilter) {
        return false;
      }

      // Teaching value filter
      if (teachingValueFilter !== 'all' && dispute.teachingValue !== teachingValueFilter) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'difficulty':
          const difficultyOrder = { basic: 1, advanced: 2, professional: 3 };
          comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
        case 'teachingValue':
          const valueOrder = { low: 1, medium: 2, high: 3 };
          comparison = valueOrder[a.teachingValue] - valueOrder[b.teachingValue];
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [disputes, searchTerm, difficultyFilter, teachingValueFilter, sortBy, sortOrder]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="搜索争议内容..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Difficulty Filter */}
          <Select value={difficultyFilter} onValueChange={(value) => setDifficultyFilter(value as any)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="难度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部难度</SelectItem>
              <SelectItem value="basic">基础</SelectItem>
              <SelectItem value="advanced">进阶</SelectItem>
              <SelectItem value="professional">专业</SelectItem>
            </SelectContent>
          </Select>

          {/* Teaching Value Filter */}
          <Select value={teachingValueFilter} onValueChange={(value) => setTeachingValueFilter(value as any)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="教学价值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部价值</SelectItem>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Controls */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">按时间</SelectItem>
              <SelectItem value="difficulty">按难度</SelectItem>
              <SelectItem value="teachingValue">按价值</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          找到 {filteredAndSortedDisputes.length} 个争议焦点
        </div>
      </div>

      {/* Dispute Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedDisputes.map((dispute, index) => (
            <motion.div
              key={dispute.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <DisputeCard
                dispute={dispute}
                isSelected={selectedId === dispute.id}
                onSelect={onSelectDispute}
                showTeachingNotes={showTeachingNotes}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAndSortedDisputes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">没有找到匹配的争议焦点</p>
            <p className="text-sm mt-2">尝试调整筛选条件或搜索关键词</p>
          </div>
        )}
      </div>
    </div>
  );
}