/**
 * LevelProgress组件测试
 * @description 测试层级进度组件的渲染和交互
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { 
  LevelProgress, 
  LevelStatus,
  type LevelProgressData 
} from '../../../components/socratic/LevelProgress'
import { 
  DialogueLevel,
  type DialogueMetrics 
} from '../../../lib/types/socratic'

describe('LevelProgress组件', () => {
  // 创建测试数据
  const createProgressData = (): LevelProgressData[] => [
    {
      level: DialogueLevel.OBSERVATION,
      status: LevelStatus.COMPLETED,
      score: 85,
      timeSpent: 120,
      messageCount: 5,
      qualityScore: 90,
      keyInsights: ['识别了关键事实', '提出了重要问题'],
      completedAt: Date.now() - 3600000
    },
    {
      level: DialogueLevel.FACTS,
      status: LevelStatus.COMPLETED,
      score: 78,
      timeSpent: 180,
      messageCount: 8,
      qualityScore: 85,
      keyInsights: ['理解了法律条文', '找到了相关案例'],
      completedAt: Date.now() - 1800000
    },
    {
      level: DialogueLevel.ANALYSIS,
      status: LevelStatus.IN_PROGRESS,
      score: 60,
      timeSpent: 90,
      messageCount: 3,
      qualityScore: 75,
      keyInsights: ['开始分析法律关系'],
    },
    {
      level: DialogueLevel.APPLICATION,
      status: LevelStatus.AVAILABLE,
      score: 0,
      timeSpent: 0,
      messageCount: 0,
      qualityScore: 0,
      keyInsights: [],
    },
    {
      level: DialogueLevel.VALUES,
      status: LevelStatus.LOCKED,
      score: 0,
      timeSpent: 0,
      messageCount: 0,
      qualityScore: 0,
      keyInsights: [],
    }
  ]
  
  const mockMetrics: DialogueMetrics = {
    averageQuality: 85,
    totalTime: 390,
    totalMessages: 16,
    completionRate: 40,
    levelProgress: {
      [DialogueLevel.OBSERVATION]: 100,
      [DialogueLevel.FACTS]: 100,
      [DialogueLevel.ANALYSIS]: 60,
      [DialogueLevel.APPLICATION]: 0,
      [DialogueLevel.VALUES]: 0
    },
    insights: [],
    strengths: [],
    improvements: []
  }
  
  const mockOnLevelChange = jest.fn()
  const mockOnViewDetails = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('线性布局 (Linear)', () => {
    it('应该正确渲染所有层级', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          variant="linear"
        />
      )
      
      expect(screen.getByText('观察层')).toBeInTheDocument()
      expect(screen.getByText('事实层')).toBeInTheDocument()
      expect(screen.getByText('分析层')).toBeInTheDocument()
      expect(screen.getByText('应用层')).toBeInTheDocument()
      expect(screen.getByText('价值层')).toBeInTheDocument()
    })
    
    it('应该显示总体进度', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          variant="linear"
        />
      )
      
      expect(screen.getByText('对话进度')).toBeInTheDocument()
      expect(screen.getByText('40%')).toBeInTheDocument() // 2/5 completed
    })
    
    it('应该标记当前层级', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          variant="linear"
        />
      )
      
      const currentBadge = screen.getByText('当前')
      expect(currentBadge).toBeInTheDocument()
    })
    
    it('应该显示已完成标记', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          variant="linear"
        />
      )
      
      const completedBadges = screen.getAllByText('已完成')
      expect(completedBadges).toHaveLength(2) // OBSERVATION and FACTS
    })
    
    it('应该处理层级点击', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          onLevelChange={mockOnLevelChange}
          variant="linear"
        />
      )
      
      // 点击已完成的层级
      const observationLevel = screen.getByText('观察层').closest('.group')
      fireEvent.click(observationLevel!)
      
      expect(mockOnLevelChange).toHaveBeenCalledWith(DialogueLevel.OBSERVATION)
    })
    
    it('应该禁止点击锁定层级', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          onLevelChange={mockOnLevelChange}
          variant="linear"
        />
      )
      
      // 点击锁定的层级
      const valuesLevel = screen.getByText('价值层').closest('.group')
      fireEvent.click(valuesLevel!)
      
      expect(mockOnLevelChange).not.toHaveBeenCalled()
    })
    
    it('应该显示层级指标', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          showMetrics={true}
          variant="linear"
        />
      )
      
      expect(screen.getByText('85分')).toBeInTheDocument()
      expect(screen.getByText('2分钟')).toBeInTheDocument() // 120 seconds
      expect(screen.getByText('5条消息')).toBeInTheDocument()
      expect(screen.getByText('质量: 90%')).toBeInTheDocument()
    })
    
    it('应该显示关键洞察', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          showInsights={true}
          variant="linear"
        />
      )
      
      expect(screen.getByText('识别了关键事实')).toBeInTheDocument()
      expect(screen.getByText('提出了重要问题')).toBeInTheDocument()
    })
    
    it('应该显示查看详情按钮', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          onViewDetails={mockOnViewDetails}
          variant="linear"
        />
      )
      
      const detailButtons = screen.getAllByText('查看详情')
      expect(detailButtons.length).toBeGreaterThan(0)
      
      fireEvent.click(detailButtons[0])
      expect(mockOnViewDetails).toHaveBeenCalledWith(DialogueLevel.OBSERVATION)
    })
    
    it('应该显示跳过按钮', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          onLevelChange={mockOnLevelChange}
          allowSkip={true}
          variant="linear"
        />
      )
      
      const skipButton = screen.getByText('跳过')
      expect(skipButton).toBeInTheDocument()
      
      fireEvent.click(skipButton)
      expect(mockOnLevelChange).toHaveBeenCalledWith(DialogueLevel.APPLICATION)
    })
    
    it('应该显示总体指标', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          metrics={mockMetrics}
          showMetrics={true}
          variant="linear"
        />
      )
      
      expect(screen.getByText('总体表现')).toBeInTheDocument()
      expect(screen.getByText('平均质量')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
      expect(screen.getByText('总时长')).toBeInTheDocument()
      expect(screen.getByText('6分30秒')).toBeInTheDocument() // 390 seconds
      expect(screen.getByText('消息数')).toBeInTheDocument()
      expect(screen.getByText('16')).toBeInTheDocument()
      expect(screen.getByText('完成度')).toBeInTheDocument()
      // 有两个40% - 一个是总进度，一个是完成度
      const allFortyPercent = screen.getAllByText('40%')
      expect(allFortyPercent).toHaveLength(2)
    })
  })
  
  describe('紧凑布局 (Compact)', () => {
    it('应该正确渲染紧凑视图', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          variant="compact"
        />
      )
      
      expect(screen.getByText('观察层')).toBeInTheDocument()
      expect(screen.getByText('事实层')).toBeInTheDocument()
      expect(screen.getByText('分析层')).toBeInTheDocument()
      expect(screen.getByText('应用层')).toBeInTheDocument()
      expect(screen.getByText('价值层')).toBeInTheDocument()
    })
    
    it('应该显示层级间的箭头', () => {
      const { container } = render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={createProgressData()}
          variant="compact"
        />
      )
      
      const arrows = container.querySelectorAll('.lucide-chevron-right')
      expect(arrows).toHaveLength(4) // 5 levels - 1 = 4 arrows
    })
    
    it('应该处理紧凑视图的层级点击', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          onLevelChange={mockOnLevelChange}
          variant="compact"
        />
      )
      
      const buttons = screen.getAllByRole('button')
      const factsButton = buttons.find(btn => btn.textContent?.includes('事实层'))
      
      fireEvent.click(factsButton!)
      expect(mockOnLevelChange).toHaveBeenCalledWith(DialogueLevel.FACTS)
    })
    
    it('应该在紧凑视图中标记完成状态', () => {
      const { container } = render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={createProgressData()}
          variant="compact"
        />
      )
      
      // 查找完成图标 - 在紧凑视图中，完成的层级显示CheckCircle2图标
      const completedIcons = container.querySelectorAll('.lucide-check-circle-2')
      expect(completedIcons.length).toBeGreaterThanOrEqual(2) // OBSERVATION and FACTS至少有2个完成
    })
    
    it('应该高亮当前层级', () => {
      const { container } = render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={createProgressData()}
          variant="compact"
        />
      )
      
      const buttons = container.querySelectorAll('button')
      const analysisButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('分析层')
      )
      
      expect(analysisButton?.className).toContain('bg-accent')
      expect(analysisButton?.querySelector('.ring-2')).toBeTruthy()
    })
  })
  
  describe('时间格式化', () => {
    it('应该正确格式化秒', () => {
      const progressData = [{
        ...createProgressData()[0],
        timeSpent: 45
      }]
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={progressData}
          showMetrics={true}
          variant="linear"
        />
      )
      
      expect(screen.getByText('45秒')).toBeInTheDocument()
    })
    
    it('应该正确格式化分钟', () => {
      const progressData = [{
        ...createProgressData()[0],
        timeSpent: 125 // 2分5秒
      }]
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={progressData}
          showMetrics={true}
          variant="linear"
        />
      )
      
      expect(screen.getByText('2分5秒')).toBeInTheDocument()
    })
    
    it('应该正确格式化小时', () => {
      const progressData = [{
        ...createProgressData()[0],
        timeSpent: 3665 // 1小时1分5秒
      }]
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={progressData}
          showMetrics={true}
          variant="linear"
        />
      )
      
      expect(screen.getByText('1小时1分')).toBeInTheDocument()
    })
  })
  
  describe('边缘情况', () => {
    it('应该处理空进度数据', () => {
      render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={[]}
          variant="linear"
        />
      )
      
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
    
    it('应该处理所有层级完成', () => {
      const progressData = createProgressData().map(p => ({
        ...p,
        status: LevelStatus.COMPLETED
      }))
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.VALUES}
          progressData={progressData}
          variant="linear"
        />
      )
      
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
    
    it('应该处理没有洞察的层级', () => {
      const progressData = [{
        ...createProgressData()[0],
        keyInsights: []
      }]
      
      const { container } = render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={progressData}
          showInsights={true}
          variant="linear"
        />
      )
      
      // 不应该显示洞察区域
      const insightArea = container.querySelector('.bg-muted.rounded')
      expect(insightArea).not.toBeInTheDocument()
    })
    
    it('应该处理没有回调函数的情况', () => {
      const progressData = createProgressData()
      
      render(
        <LevelProgress
          currentLevel={DialogueLevel.ANALYSIS}
          progressData={progressData}
          variant="linear"
        />
      )
      
      // 点击层级不应该报错
      const observationLevel = screen.getByText('观察层').closest('.group')
      expect(() => fireEvent.click(observationLevel!)).not.toThrow()
    })
  })
  
  describe('样式自定义', () => {
    it('应该应用自定义类名', () => {
      const { container } = render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={createProgressData()}
          className="custom-class"
          variant="linear"
        />
      )
      
      const card = container.querySelector('.custom-class')
      expect(card).toBeInTheDocument()
    })
    
    it('应该应用紧凑视图的自定义类名', () => {
      const { container } = render(
        <LevelProgress
          currentLevel={DialogueLevel.OBSERVATION}
          progressData={createProgressData()}
          className="custom-compact"
          variant="compact"
        />
      )
      
      const compactContainer = container.querySelector('.custom-compact')
      expect(compactContainer).toBeInTheDocument()
    })
  })
})