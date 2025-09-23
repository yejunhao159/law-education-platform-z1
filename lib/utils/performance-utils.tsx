/**
 * Performance Optimization Utilities
 * Tools and helpers for optimizing React component performance
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * Debounce hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Lazy load component with intersection observer
 */
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Virtual list hook for rendering large lists efficiently
 */
interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getItemHeight?: (index: number) => number;
}

export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
) {
  const { itemHeight, containerHeight, overscan = 3, getItemHeight } = options;
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  const offsetY = visibleRange.startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}

/**
 * Request idle callback hook
 */
export function useIdleCallback(
  callback: () => void,
  delay: number = 0
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(
        () => savedCallback.current(),
        { timeout: delay }
      );
      return () => window.cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => savedCallback.current(), delay);
      return () => clearTimeout(id);
    }
  }, [delay]);
}

/**
 * Prefetch data hook
 */
export function usePrefetch<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): { data: T | null; loading: boolean; error: Error | null; refetch: () => void } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Image preloader
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        })
    )
  );
}

/**
 * Component profiler wrapper
 */
export function withProfiler<P extends object>(
  Component: React.ComponentType<P>,
  id: string
): React.ComponentType<P> {
  if (process.env.NODE_ENV === 'production') {
    return Component;
  }

  return (props: P) => {
    const onRender = useCallback(
      (
        id: string,
        phase: 'mount' | 'update',
        actualDuration: number,
        baseDuration: number,
        startTime: number,
        commitTime: number
      ) => {
        console.log(`⚡ Component: ${id}`);
        console.log(`  Phase: ${phase}`);
        console.log(`  Actual duration: ${actualDuration.toFixed(2)}ms`);
        console.log(`  Base duration: ${baseDuration.toFixed(2)}ms`);
        console.log(`  Render time: ${(commitTime - startTime).toFixed(2)}ms`);
      },
      []
    );

    return (
      <React.Profiler id={id} onRender={onRender}>
        <Component {...props} />
      </React.Profiler>
    );
  };
}

/**
 * Batch state updates
 */
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = React.useState(initialState);
  
  const batchedSetState = useCallback((updates: Partial<T>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  return [state, batchedSetState];
}

/**
 * Memory leak prevention hook
 */
export function useMounted(): () => boolean {
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => mounted.current, []);
}

// Import React for the utilities that need it
import * as React from 'react';