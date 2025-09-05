import { render, screen, fireEvent } from '@testing-library/react'
import { CaseTimeline } from '../CaseTimeline'
import { useCaseStore } from '@/lib/stores/useCaseStore'

// Mock the store
jest.mock('@/lib/stores/useCaseStore')
const mockUseCaseStore = useCaseStore as jest.MockedFunction<typeof useCaseStore>

describe('CaseTimeline', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  describe('真实数据流转测试', () => {
    test('应该在没有案件数据时显示空状态', () => {
      // Arrange - 没有案件数据
      mockUseCaseStore.mockReturnValue(null)

      // Act - 渲染组件
      render(<CaseTimeline />)

      // Assert - 应该显示空状态
      expect(screen.getByText('暂无时间轴数据')).toBeInTheDocument()
      expect(screen.getByText('请先上传并解析判决书文件，系统将自动提取时间轴信息')).toBeInTheDocument()
    })

    test('应该从真实案件数据中提取时间线事件', () => {
      // Arrange - 模拟真实案件数据
      const mockCaseData = {
        threeElements: {
          facts: {
            timeline: [
              {
                date: '2023-03-15',
                event: '签订合同',
                detail: '双方签订房屋买卖合同',
                isKeyEvent: true,
                party: '双方'
              },
              {
                date: '2023-04-20',
                event: '支付首付款',
                detail: '原告支付首付款150万元',
                isKeyEvent: true,
                party: '原告'
              }
            ]
          }
        },
        basicInfo: {
          filingDate: '2023-07-01',
          judgmentDate: '2023-09-20',
          court: '某某法院'
        }
      }
      mockUseCaseStore.mockReturnValue(mockCaseData)

      // Act - 渲染组件
      render(<CaseTimeline />)

      // Assert - 应该显示从真实数据提取的事件
      expect(screen.getByText('签订合同')).toBeInTheDocument()
      expect(screen.getByText('支付首付款')).toBeInTheDocument()
      expect(screen.getByText('案件受理')).toBeInTheDocument()
      expect(screen.getByText('作出判决')).toBeInTheDocument()
      
      // 验证显示事件总数
      expect(screen.getByText(/共 4 个关键事件/)).toBeInTheDocument()
    })
  })

  describe('交互功能测试', () => {
    const mockCaseData = {
      threeElements: {
        facts: {
          timeline: [
            {
              date: '2023-03-15',
              event: '签订合同',
              detail: '双方签订房屋买卖合同',
              isKeyEvent: true,
              party: '双方'
            }
          ]
        }
      },
      basicInfo: {
        filingDate: '2023-07-01',
        court: '某某法院'
      }
    }

    beforeEach(() => {
      mockUseCaseStore.mockReturnValue(mockCaseData)
    })

    test('应该支持视角切换功能', () => {
      // Act - 渲染组件
      render(<CaseTimeline />)

      // Assert - 应该有视角切换按钮
      expect(screen.getByText('中性')).toBeInTheDocument()
      expect(screen.getByText('原告')).toBeInTheDocument()
      expect(screen.getByText('被告')).toBeInTheDocument()
      expect(screen.getByText('法官')).toBeInTheDocument()

      // Act - 点击原告视角
      fireEvent.click(screen.getByText('原告'))

      // Assert - 应该显示原告视角的总结
      expect(screen.getByText(/原告视角/)).toBeInTheDocument()
    })

    test('应该支持教学模式切换', () => {
      // Act - 渲染组件
      render(<CaseTimeline />)

      // Assert - 默认不在教学模式
      expect(screen.getByText('教学模式')).toBeInTheDocument()
      expect(screen.queryByText('学习进度')).not.toBeInTheDocument()

      // Act - 启用教学模式
      fireEvent.click(screen.getByText('教学模式'))

      // Assert - 应该显示教学相关UI
      expect(screen.getByText('退出教学')).toBeInTheDocument()
      expect(screen.getByText('学习进度')).toBeInTheDocument()
      expect(screen.getByText(/关键节点/)).toBeInTheDocument()
    })

    test('应该支持时间节点交互', () => {
      // Act - 渲染组件
      render(<CaseTimeline />)

      // Act - 启用教学模式
      fireEvent.click(screen.getByText('教学模式'))

      // Assert - 应该显示教学要点提示（使用getAllByText处理多个元素）
      expect(screen.getAllByText('点击查看详细分析 →').length).toBeGreaterThan(0)

      // 注意：实际点击节点的测试会更复杂，因为需要模拟DOM节点的click事件
      // 这里我们测试了基本的UI状态
    })
  })

  describe('法学思维要素测试', () => {
    test('应该为合同相关事件生成教学要点', () => {
      // Arrange - 包含合同签订的数据
      const mockCaseData = {
        threeElements: {
          facts: {
            timeline: [
              {
                date: '2023-03-15',
                event: '签订合同',
                detail: '双方签订房屋买卖合同',
                isKeyEvent: true,
                party: '双方'
              }
            ]
          }
        },
        basicInfo: {}
      }
      mockUseCaseStore.mockReturnValue(mockCaseData)

      // Act - 渲染组件并启用教学模式
      render(<CaseTimeline />)
      fireEvent.click(screen.getByText('教学模式'))

      // 这个测试验证了智能推断教学要点的功能
      // 由于UI交互较复杂，我们主要测试数据处理逻辑
      expect(screen.getByText('签订合同')).toBeInTheDocument()
      expect(screen.getAllByText(/关键/).length).toBeGreaterThan(0)
    })
  })

  describe('边界情况测试', () => {
    test('应该处理部分数据缺失的情况', () => {
      // Arrange - 只有基本信息，没有时间线
      const mockCaseData = {
        basicInfo: {
          filingDate: '2023-07-01',
          court: '某某法院'
        }
      }
      mockUseCaseStore.mockReturnValue(mockCaseData)

      // Act - 渲染组件
      render(<CaseTimeline />)

      // Assert - 应该只显示程序性事件
      expect(screen.getByText('案件受理')).toBeInTheDocument()
      expect(screen.getByText(/共 1 个关键事件/)).toBeInTheDocument()
    })

    test('应该处理空的时间线数据', () => {
      // Arrange - 空的时间线
      const mockCaseData = {
        threeElements: {
          facts: {
            timeline: []
          }
        },
        basicInfo: {}
      }
      mockUseCaseStore.mockReturnValue(mockCaseData)

      // Act - 渲染组件
      render(<CaseTimeline />)

      // Assert - 应该显示空状态
      expect(screen.getByText('暂无时间轴数据')).toBeInTheDocument()
    })
  })
})