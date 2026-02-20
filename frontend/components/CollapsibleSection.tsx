'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  landscapeCollapsed?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title,
  icon,
  defaultExpanded = true,
  landscapeCollapsed = false,
  children,
  className = ''
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isLandscape, setIsLandscape] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<string>('2000px');

  // Check for landscape orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscapeMode = window.innerWidth > window.innerHeight && 
        window.innerHeight <= 700;
      setIsLandscape(isLandscapeMode);
      
      // Auto-collapse in landscape if specified
      if (landscapeCollapsed && isLandscapeMode) {
        setIsExpanded(false);
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, [landscapeCollapsed]);

  // Calculate max-height for animation
  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isExpanded ? `${contentRef.current.scrollHeight + 50}px` : '0px');
    }
  }, [isExpanded, children]);

  return (
    <div className={`rounded-xl overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="collapsible-header w-full p-3 md:p-4 flex items-center justify-between rounded-xl transition-colors"
        style={{ 
          backgroundColor: '#D5BFA4', 
          border: '1px solid #B4A58B' 
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="w-5 h-5">{icon}</span>}
          <span className="font-medium" style={{ color: '#3E3D39' }}>
            {title}
          </span>
        </div>
        <ChevronDown 
          className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: '#3E3D39' }}
        />
      </button>
      
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ 
          maxHeight: maxHeight,
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div className="p-3 md:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
