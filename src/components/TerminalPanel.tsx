import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, ChevronUp, X } from 'lucide-react';
import Terminal from './Terminal';
import { useThemeStore } from '../store/themeStore';

interface TerminalPanelProps {
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export default function TerminalPanel({ 
  defaultHeight = 200, 
  minHeight = 32,
  maxHeight = 0.8 
}: TerminalPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState(defaultHeight);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = panelRef.current?.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const deltaY = startYRef.current - e.clientY;
    let newHeight = startHeightRef.current + deltaY;
    
    // Calculate max height as a percentage of the container or fixed pixels
    const maxHeightPx = typeof maxHeight === 'number' && maxHeight <= 1 
      ? containerRect.height * maxHeight 
      : maxHeight;
    
    // Apply constraints
    newHeight = Math.max(minHeight, Math.min(newHeight, maxHeightPx));
    
    setHeight(newHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // If height is close to minHeight, consider it collapsed
    if (height <= minHeight + 5) {
      setIsOpen(false);
      setHeight(minHeight);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleTerminal = () => {
    if (!isOpen) {
      // If opening, set to 1/3 of the viewport height or default height, whichever is smaller
      const viewportHeight = window.innerHeight;
      const newHeight = Math.min(viewportHeight / 3, 400); // Cap at 400px or 1/3 of viewport
      setHeight(Math.max(newHeight, minHeight));
    } else {
      // If closing, just collapse to min height
      setHeight(minHeight);
    }
    setIsOpen(!isOpen);
  };

  const { theme } = useThemeStore();

  return (
    <div 
      ref={panelRef}
      className={`fixed bottom-0 left-0 right-0 transition-all duration-200 ease-in-out ${
        isOpen ? 'shadow-lg' : ''
      }`}
      style={{
        height: isOpen ? `${height}px` : `${minHeight}px`,
        zIndex: 40,
        transform: isOpen ? 'translateY(0)' : 'translateY(0)',
        backgroundColor: theme.colors.background,
        borderTop: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Terminal header - now also the toggle button */}
      <div 
        className="flex items-center justify-between p-1 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <div className="flex items-center">
          <TerminalIcon className="h-4 w-4 mr-2 text-secondary" />
          <span className="text-sm font-medium text-foreground">Terminal</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTerminal();
            }}
            className="p-1 rounded-md text-secondary hover:text-foreground hover:bg-surface-hover"
            aria-label={isOpen ? 'Minimize terminal' : 'Maximize terminal'}
          >
            <ChevronUp className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-0' : 'rotate-180'}`} />
          </button>
          {isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setHeight(minHeight);
              }}
              className="p-1 rounded-md text-secondary hover:text-foreground hover:bg-surface-hover"
              aria-label="Close terminal"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Terminal content - only shown when open */}
      {isOpen && (
        <>
          {/* Resize handle */}
          <div 
            className="h-2 cursor-row-resize flex items-center justify-center group"
            onMouseDown={handleMouseDown}
          >
            <div className="h-px w-16 bg-border group-hover:bg-accent transition-colors" />
          </div>
          
          <div className="h-[calc(100%-2.5rem)] w-full overflow-hidden">
            <Terminal />
          </div>
        </>
      )}
    </div>
  );
}
