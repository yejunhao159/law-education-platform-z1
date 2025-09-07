/**
 * Accessibility Utilities
 * ARIA helpers and keyboard navigation utilities
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Keyboard navigation hook
 */
export function useKeyboardNavigation(
  items: any[],
  onSelect: (item: any, index: number) => void,
  options?: {
    vertical?: boolean;
    wrap?: boolean;
    onEscape?: () => void;
  }
) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const { vertical = true, wrap = true, onEscape } = options || {};

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      const maxIndex = items.length - 1;

      switch (key) {
        case vertical ? 'ArrowDown' : 'ArrowRight':
          event.preventDefault();
          setFocusedIndex((prev) => {
            if (prev >= maxIndex) return wrap ? 0 : maxIndex;
            return prev + 1;
          });
          break;

        case vertical ? 'ArrowUp' : 'ArrowLeft':
          event.preventDefault();
          setFocusedIndex((prev) => {
            if (prev <= 0) return wrap ? maxIndex : 0;
            return prev - 1;
          });
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            onSelect(items[focusedIndex], focusedIndex);
          }
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(maxIndex);
          break;

        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
      }
    },
    [items, focusedIndex, onSelect, vertical, wrap, onEscape]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { focusedIndex, setFocusedIndex };
}

/**
 * Focus trap hook
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef, isActive]);
}

/**
 * Announce to screen readers
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!announceRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.setAttribute('role', 'status');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }

    return () => {
      if (announceRef.current && document.body.contains(announceRef.current)) {
        document.body.removeChild(announceRef.current);
        announceRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return announce;
}

/**
 * ARIA attributes helper
 */
export function getAriaAttributes(props: {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  required?: boolean;
  invalid?: boolean;
  role?: string;
  level?: number;
  pressed?: boolean;
  current?: boolean | string;
}) {
  const attrs: Record<string, any> = {};

  if (props.label) attrs['aria-label'] = props.label;
  if (props.labelledBy) attrs['aria-labelledby'] = props.labelledBy;
  if (props.describedBy) attrs['aria-describedby'] = props.describedBy;
  if (props.expanded !== undefined) attrs['aria-expanded'] = props.expanded;
  if (props.selected !== undefined) attrs['aria-selected'] = props.selected;
  if (props.checked !== undefined) attrs['aria-checked'] = props.checked;
  if (props.disabled !== undefined) attrs['aria-disabled'] = props.disabled;
  if (props.hidden !== undefined) attrs['aria-hidden'] = props.hidden;
  if (props.required !== undefined) attrs['aria-required'] = props.required;
  if (props.invalid !== undefined) attrs['aria-invalid'] = props.invalid;
  if (props.role) attrs['role'] = props.role;
  if (props.level) attrs['aria-level'] = props.level;
  if (props.pressed !== undefined) attrs['aria-pressed'] = props.pressed;
  if (props.current !== undefined) attrs['aria-current'] = props.current;

  return attrs;
}

/**
 * Skip links component
 */
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-0 left-0 p-2 bg-primary text-primary-foreground focus:not-sr-only"
      >
        跳转到主要内容
      </a>
      <a
        href="#navigation"
        className="absolute top-0 left-0 p-2 bg-primary text-primary-foreground focus:not-sr-only"
      >
        跳转到导航
      </a>
    </div>
  );
}

/**
 * Focus visible hook
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const onFocus = useCallback(() => setIsFocused(true), []);
  const onBlur = useCallback(() => {
    setIsFocused(false);
    setIsFocusVisible(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setIsFocusVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return {
    isFocusVisible: isFocused && isFocusVisible,
    focusProps: { onFocus, onBlur }
  };
}

/**
 * Live region hook for dynamic content
 */
export function useLiveRegion(
  message: string,
  options?: {
    priority?: 'polite' | 'assertive';
    relevant?: string;
    atomic?: boolean;
  }
) {
  const { priority = 'polite', relevant = 'additions text', atomic = true } = options || {};
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (regionRef.current && message) {
      regionRef.current.textContent = message;
    }
  }, [message]);

  const regionProps = {
    'aria-live': priority,
    'aria-relevant': relevant,
    'aria-atomic': atomic,
    role: 'status',
    className: 'sr-only'
  };

  return { regionProps, regionRef };
}

/**
 * Roving tabindex hook
 */
export function useRovingTabIndex(
  items: any[],
  activeIndex: number = 0
) {
  const [currentIndex, setCurrentIndex] = React.useState(activeIndex);

  const getRovingProps = useCallback(
    (index: number) => ({
      tabIndex: index === currentIndex ? 0 : -1,
      onFocus: () => setCurrentIndex(index)
    }),
    [currentIndex]
  );

  return { currentIndex, setCurrentIndex, getRovingProps };
}

/**
 * High contrast mode detection
 */
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    setIsHighContrast(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isHighContrast;
}

/**
 * Reduced motion detection
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

// Import React for hooks
import * as React from 'react';