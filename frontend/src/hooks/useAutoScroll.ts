import { useEffect, useRef, useState } from 'react';

interface UseAutoScrollOptions {
  threshold?: number; // Minimum content height to enable scroll
  maxHeight?: string; // Maximum height before scroll kicks in
  enabled?: boolean; // Whether auto-scroll is enabled
  dependencies?: any[]; // Dependencies to re-check scroll need
}

interface ScrollState {
  needsScroll: boolean;
  contentHeight: number;
  containerHeight: number;
  scrollHeight: string;
}

export const useAutoScroll = (options: UseAutoScrollOptions = {}): [React.RefObject<HTMLDivElement>, ScrollState] => {
  const {
    threshold = 300,
    maxHeight = '70vh',
    enabled = true,
    dependencies = []
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    needsScroll: false,
    contentHeight: 0,
    containerHeight: 0,
    scrollHeight: 'auto'
  });

  const checkScrollNeed = () => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const contentHeight = container.scrollHeight;
    const containerHeight = container.clientHeight;
    
    // Calculate max height in pixels
    const maxHeightPx = parseFloat(maxHeight) * (
      maxHeight.includes('vh') ? window.innerHeight / 100 :
      maxHeight.includes('vw') ? window.innerWidth / 100 :
      maxHeight.includes('%') ? (container.parentElement?.clientHeight || window.innerHeight) / 100 :
      1
    );

    const needsScroll = contentHeight > threshold && contentHeight > maxHeightPx;
    const finalHeight = needsScroll ? maxHeight : 'auto';

    setScrollState({
      needsScroll,
      contentHeight,
      containerHeight: maxHeightPx,
      scrollHeight: finalHeight
    });
  };

  // Check on mount and when dependencies change
  useEffect(() => {
    checkScrollNeed();
  }, [enabled, threshold, maxHeight, ...dependencies]);

  // Check on window resize
  useEffect(() => {
    const handleResize = () => checkScrollNeed();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use ResizeObserver to detect content changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Delay to ensure DOM has updated
      setTimeout(checkScrollNeed, 100);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Use MutationObserver to detect DOM changes
  useEffect(() => {
    if (!containerRef.current) return;

    const mutationObserver = new MutationObserver(() => {
      setTimeout(checkScrollNeed, 100);
    });

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return [containerRef, scrollState];
};

// Utility function to get scroll styles
export const getScrollStyles = (scrollState: ScrollState, customStyles: React.CSSProperties = {}): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    maxHeight: scrollState.scrollHeight,
    overflowY: scrollState.needsScroll ? 'auto' : 'visible',
    overflowX: 'hidden',
    ...customStyles
  };

  // Add custom scrollbar styles if scroll is needed
  if (scrollState.needsScroll) {
    return {
      ...baseStyles,
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--border-color) var(--secondary-bg)',
    };
  }

  return baseStyles;
};

// CSS class generator for scroll styles
export const getScrollClassName = (scrollState: ScrollState, baseClass: string = ''): string => {
  const classes = [baseClass];
  
  if (scrollState.needsScroll) {
    classes.push('auto-scroll-enabled');
  } else {
    classes.push('auto-scroll-disabled');
  }
  
  return classes.filter(Boolean).join(' ');
};

// Hook for specific use cases
export const usePatentListScroll = (patents: any[] = []) => {
  return useAutoScroll({
    threshold: 200,
    maxHeight: '60vh',
    dependencies: [patents.length]
  });
};

export const useFigureGridScroll = (figures: any[] = []) => {
  return useAutoScroll({
    threshold: 400,
    maxHeight: '70vh',
    dependencies: [figures.length]
  });
};

export const useModalContentScroll = (content: any = null) => {
  return useAutoScroll({
    threshold: 300,
    maxHeight: '80vh',
    dependencies: [content]
  });
};

export const useTableScroll = (data: any[] = []) => {
  return useAutoScroll({
    threshold: 250,
    maxHeight: '65vh',
    dependencies: [data.length]
  });
};

export const useSidebarScroll = (items: any[] = []) => {
  return useAutoScroll({
    threshold: 400,
    maxHeight: 'calc(100vh - 200px)',
    dependencies: [items.length]
  });
};
