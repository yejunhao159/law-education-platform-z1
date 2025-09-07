'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { TimelineViewMode, ViewModeControllerProps } from '@/types/timeline-claim-analysis'
import {
  LayoutGrid,
  Brain,
  Sparkles,
  Settings,
  Eye,
  EyeOff,
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Scale,
  Filter
} from 'lucide-react'

export function ViewModeController({
  currentMode,
  onModeChange,
  aiEnabled,
  onAIToggle,
  isAnalyzing = false
}: ViewModeControllerProps) {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [viewOptions, setViewOptions] = useState({
    showClaimAnnotations: true,
    showTimestamp: true,
    showActor: true,
    highlightCritical: true,
    compactMode: false
  })

  // 视图模式配置
  const viewModes = [
    {
      mode: 'simple' as TimelineViewMode,
      label: '简化视图',
      icon: <LayoutGrid className="w-4 h-4" />,
      description: '基础时间轴展示',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      mode: 'enhanced' as TimelineViewMode,
      label: '增强视图',
      icon: <Target className="w-4 h-4" />,
      description: '分阶段详细展示',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      mode: 'analysis' as TimelineViewMode,
      label: 'AI分析',
      icon: <Brain className="w-4 h-4" />,
      description: '智能法律分析',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ]

  // 处理模式切换
  const handleModeChange = (mode: TimelineViewMode) => {
    if (mode === 'analysis' && !aiEnabled) {
      onAIToggle(true)
    }
    onModeChange(mode)
  }

  // 获取当前模式配置
  const currentModeConfig = viewModes.find(m => m.mode === currentMode)

  // 处理视图选项变更
  const updateViewOption = (key: string, value: boolean) => {
    setViewOptions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* 主控制面板 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-800">视图控制</span>
          {currentModeConfig && (
            <Badge className={cn("ml-2", currentModeConfig.bgColor, currentModeConfig.color)}>
              {currentModeConfig.label}
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="h-8 px-2"
        >
          <Settings className="w-4 h-4 mr-1" />
          高级选项
          {showAdvancedOptions ? 
            <ChevronUp className="w-3 h-3 ml-1" /> : 
            <ChevronDown className="w-3 h-3 ml-1" />
          }
        </Button>
      </div>

      {/* 模式切换按钮组 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {viewModes.map((modeConfig) => (
          <motion.div
            key={modeConfig.mode}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant={currentMode === modeConfig.mode ? "default" : "outline"}
              onClick={() => handleModeChange(modeConfig.mode)}
              disabled={isAnalyzing && modeConfig.mode === 'analysis'}
              className={cn(
                "w-full h-auto p-3 flex flex-col items-center gap-1",
                currentMode === modeConfig.mode && modeConfig.bgColor,
                currentMode === modeConfig.mode && modeConfig.borderColor,
                currentMode === modeConfig.mode && modeConfig.color
              )}
            >
              <div className="flex items-center gap-2">
                {modeConfig.icon}
                <span className="font-medium text-sm">{modeConfig.label}</span>
                {modeConfig.mode === 'analysis' && isAnalyzing && (
                  <Zap className="w-3 h-3 animate-pulse" />
                )}
              </div>
              <span className="text-xs text-gray-500 text-center">
                {modeConfig.description}
              </span>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* AI功能控制 */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <div>
            <span className="font-medium text-sm text-purple-800">AI智能分析</span>
            <p className="text-xs text-purple-600">
              {aiEnabled ? (isAnalyzing ? '正在分析中...' : '已启用智能分析') : '开启后可使用AI功能'}
            </p>
          </div>
        </div>
        <Switch
          checked={aiEnabled}
          onCheckedChange={onAIToggle}
          disabled={isAnalyzing}
        />
      </div>

      {/* 高级选项面板 */}
      <AnimatePresence>
        {showAdvancedOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Separator className="mb-4" />
            
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                显示选项
              </h4>

              {/* 显示选项 */}
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">显示请求权标注</span>
                  </div>
                  <Switch
                    checked={viewOptions.showClaimAnnotations}
                    onCheckedChange={(checked) => updateViewOption('showClaimAnnotations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm">显示时间戳</span>
                  </div>
                  <Switch
                    checked={viewOptions.showTimestamp}
                    onCheckedChange={(checked) => updateViewOption('showTimestamp', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">显示参与方</span>
                  </div>
                  <Switch
                    checked={viewOptions.showActor}
                    onCheckedChange={(checked) => updateViewOption('showActor', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-red-600" />
                    <span className="text-sm">高亮关键节点</span>
                  </div>
                  <Switch
                    checked={viewOptions.highlightCritical}
                    onCheckedChange={(checked) => updateViewOption('highlightCritical', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {viewOptions.compactMode ? 
                      <EyeOff className="w-4 h-4 text-gray-600" /> : 
                      <Eye className="w-4 h-4 text-gray-600" />
                    }
                    <span className="text-sm">紧凑模式</span>
                  </div>
                  <Switch
                    checked={viewOptions.compactMode}
                    onCheckedChange={(checked) => updateViewOption('compactMode', checked)}
                  />
                </div>
              </div>

              {/* 快捷预设 */}
              <div className="pt-3 border-t">
                <h5 className="text-sm font-medium text-gray-700 mb-2">快捷预设</h5>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewOptions({
                      showClaimAnnotations: true,
                      showTimestamp: true,
                      showActor: true,
                      highlightCritical: true,
                      compactMode: false
                    })}
                    className="text-xs"
                  >
                    完整视图
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewOptions({
                      showClaimAnnotations: true,
                      showTimestamp: false,
                      showActor: false,
                      highlightCritical: true,
                      compactMode: true
                    })}
                    className="text-xs"
                  >
                    专业模式
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewOptions({
                      showClaimAnnotations: false,
                      showTimestamp: true,
                      showActor: true,
                      highlightCritical: false,
                      compactMode: true
                    })}
                    className="text-xs"
                  >
                    简洁模式
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 状态指示器 */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>当前模式: {currentModeConfig?.label}</span>
          {aiEnabled && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI已启用
            </span>
          )}
        </div>
        
        {isAnalyzing && (
          <div className="flex items-center gap-1 text-purple-600">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-3 h-3" />
            </motion.div>
            <span>分析中...</span>
          </div>
        )}
      </div>
    </div>
  )
}