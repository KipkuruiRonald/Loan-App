'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  isActive?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export default function AccordionSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  isActive,
  description,
  children,
  className = ''
}: AccordionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile and handle resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, start collapsed regardless of defaultOpen
      if (mobile) {
        setIsExpanded(false);
      } else {
        setIsExpanded(defaultOpen);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [defaultOpen]);

  // Calculate height for animation
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = isExpanded 
        ? `${contentRef.current.scrollHeight + 32}px` 
        : '0px';
    }
  }, [isExpanded, children]);

  return (
    <div 
      className={`overflow-hidden rounded-xl border transition-colors ${className}`}
      style={{ 
        backgroundColor: '#D5BFA4', 
        borderColor: '#B4A58B' 
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 md:p-4 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2 md:gap-3">
          {icon && (
            <span className="w-5 h-5 flex-shrink-0" style={{ color: '#3E3D39' }}>
              {icon}
            </span>
          )}
          <div className="text-left">
            <span 
              className="font-medium text-sm md:text-base block"
              style={{ color: '#050505' }}
            >
              {title}
            </span>
            {description && (
              <span 
                className="text-xs text-nearblack/60 hidden md:block"
                style={{ color: '#3E3D39' }}
              >
                {description}
              </span>
            )}
          </div>
          {badge !== undefined && (
            <span 
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: '#3E3D39', color: '#D4C8B5' }}
            >
              {badge}
            </span>
          )}
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
        </div>
        <ChevronDown 
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: '#3E3D39' }}
        />
      </button>
      
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: '0px' }}
      >
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}
