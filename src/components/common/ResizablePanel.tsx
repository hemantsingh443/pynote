import { useState, useEffect, useRef, useCallback } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  onResize?: (height: number) => void;
  className?: string;
  onToggleCollapse?: (isCollapsed: boolean) => void;
  isCollapsed?: boolean;
}

export function ResizablePanel({
  children,
  initialHeight = 200,
  minHeight = 32, // Height of the header when collapsed
  maxHeight = 0.8, // Percentage of window height
  onResize,
  className = '',
  onToggleCollapse,
  isCollapsed = true,
}: ResizablePanelProps) {
  const [height, setHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  // Removed unused isHovered state
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const toggleCollapse = useCallback(() => {
    onToggleCollapse?.(!isCollapsed);
    if (isCollapsed) {
      // Restore previous height or use initial height
      setHeight(prev => prev > minHeight ? prev : initialHeight);
    }
  }, [isCollapsed, initialHeight, minHeight, onToggleCollapse]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    if (isCollapsed) return;
    
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    e.preventDefault();
    e.stopPropagation();
  }, [height, isCollapsed]);

  const stopResizing = useCallback(() => {
    if (!isResizing) return;
    setIsResizing(false);
  }, [isResizing]);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || isCollapsed) return;
    
    const deltaY = startYRef.current - e.clientY;
    let newHeight = startHeightRef.current + deltaY;
    
    // Constrain height
    newHeight = Math.max(minHeight, Math.min(window.innerHeight * maxHeight, newHeight));
    
    setHeight(newHeight);
    onResize?.(newHeight);
  }, [isResizing, isCollapsed, minHeight, maxHeight, onResize]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const displayHeight = isCollapsed ? minHeight : height;
  const isAtMinHeight = displayHeight <= minHeight;

  return (
    <div 
      ref={panelRef}
      className={`relative flex flex-col bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-all duration-200 ease-out ${
        isAtMinHeight ? 'cursor-ns-resize' : ''
      } ${className}`}
      style={{ height: `${displayHeight}px` }}
      onClick={isAtMinHeight ? toggleCollapse : undefined}
      onMouseDown={(e) => {
        // Prevent click events from propagating to parent when resizing
        if (!isAtMinHeight) {
          e.stopPropagation();
        }
      }}
    >
      {/* Resize handle - only visible when not collapsed */}
      {!isCollapsed && (
        <div 
          className={`h-1.5 w-full cursor-ns-resize flex items-center justify-center transition-colors ${
            isResizing ? 'bg-blue-400' : 'bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          onMouseDown={startResizing}
        >
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
      )}
      
      {/* Content */}
      <div className={`flex-1 overflow-hidden ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {children}
      </div>
      
      {/* Collapsed header - only shows when collapsed */}
      {isAtMinHeight && (
        <div className="absolute inset-0 flex items-center px-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">Terminal</span>
          <div className="ml-auto flex items-center space-x-2">
            <span className="text-xs opacity-70">Click to expand</span>
          </div>
        </div>
      )}
    </div>
  );
}
