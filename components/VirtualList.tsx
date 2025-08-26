"use client"

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface VirtualListProps<T> {
  items: T[]
  height: number // 容器高度
  itemHeight: number | ((index: number) => number) // 每项高度
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number // 缓冲区大小
  className?: string
  onScroll?: (scrollTop: number) => void
  scrollToIndex?: number // 滚动到指定索引
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3,
  className,
  onScroll,
  scrollToIndex
}: VirtualListProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // 计算项高度
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
    },
    [itemHeight]
  )

  // 计算可见范围
  const calculateVisibleRange = useCallback(() => {
    let accumulatedHeight = 0
    let startIndex = 0
    let endIndex = items.length - 1

    // 找到第一个可见项
    for (let i = 0; i < items.length; i++) {
      const h = getItemHeight(i)
      if (accumulatedHeight + h > scrollTop) {
        startIndex = Math.max(0, i - overscan)
        break
      }
      accumulatedHeight += h
    }

    // 找到最后一个可见项
    accumulatedHeight = 0
    for (let i = startIndex; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + height) {
        endIndex = Math.min(items.length - 1, i + overscan)
        break
      }
      accumulatedHeight += getItemHeight(i)
    }

    return { startIndex, endIndex }
  }, [items.length, scrollTop, height, getItemHeight, overscan])

  const { startIndex, endIndex } = calculateVisibleRange()

  // 计算总高度
  const totalHeight = items.reduce((acc, _, index) => acc + getItemHeight(index), 0)

  // 计算偏移量
  const offsetY = items
    .slice(0, startIndex)
    .reduce((acc, _, index) => acc + getItemHeight(index), 0)

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)
    setIsScrolling(true)
    
    onScroll?.(scrollTop)

    // 防抖处理滚动结束
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
  }, [onScroll])

  // 滚动到指定索引
  useEffect(() => {
    if (scrollToIndex !== undefined && scrollElementRef.current) {
      let targetScrollTop = 0
      for (let i = 0; i < scrollToIndex; i++) {
        targetScrollTop += getItemHeight(i)
      }
      scrollElementRef.current.scrollTop = targetScrollTop
    }
  }, [scrollToIndex, getItemHeight])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const visibleItems = items.slice(startIndex, endIndex + 1)

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            willChange: isScrolling ? 'transform' : 'auto'
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index
            return (
              <div
                key={actualIndex}
                style={{
                  height: getItemHeight(actualIndex),
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 专门为时间轴优化的虚拟滚动组件
export function VirtualTimeline<T extends { date: string; event: string }>({
  items,
  height = 400,
  itemHeight = 80,
  className
}: {
  items: T[]
  height?: number
  itemHeight?: number
  className?: string
}) {
  return (
    <VirtualList
      items={items}
      height={height}
      itemHeight={itemHeight}
      className={className}
      renderItem={(item, index) => (
        <div className="flex items-center p-4 border-b border-gray-200 hover:bg-gray-50">
          <div className="flex-shrink-0 w-24 text-sm text-gray-500">
            {item.date}
          </div>
          <div className="flex-1 ml-4">
            <p className="text-gray-800">{item.event}</p>
          </div>
          <div className="flex-shrink-0">
            <span className="text-xs text-gray-400">#{index + 1}</span>
          </div>
        </div>
      )}
    />
  )
}

// 专门为证据列表优化的虚拟滚动组件
export function VirtualEvidenceList<T extends { id: number; name: string; type: string }>({
  items,
  height = 500,
  onItemClick
}: {
  items: T[]
  height?: number
  onItemClick?: (item: T) => void
}) {
  return (
    <VirtualList
      items={items}
      height={height}
      itemHeight={60}
      renderItem={(item) => (
        <div
          className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
          onClick={() => onItemClick?.(item)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{item.name}</p>
              <p className="text-sm text-gray-500">{item.type}</p>
            </div>
            <span className="text-xs text-gray-400">ID: {item.id}</span>
          </div>
        </div>
      )}
    />
  )
}

// Hook for 监测滚动性能
export function useScrollPerformance() {
  const [fps, setFps] = useState(60)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    let animationId: number

    const measureFPS = () => {
      frameCountRef.current++
      const currentTime = performance.now()
      const elapsed = currentTime - lastTimeRef.current

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed))
        frameCountRef.current = 0
        lastTimeRef.current = currentTime
      }

      animationId = requestAnimationFrame(measureFPS)
    }

    animationId = requestAnimationFrame(measureFPS)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return fps
}