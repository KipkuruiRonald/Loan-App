'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  style?: React.CSSProperties;
}

export default function GlassCard({ children, className = '', hover = true, gradient = false, style }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -2 } : undefined}
      className={`
        relative overflow-hidden rounded-xl border border-[var(--border-light)] p-3 shadow-lg
        transition-all duration-300 pointer-events-auto group
        sm:rounded-2xl sm:p-4 lg:p-3 xl:p-4
        ${hover ? 'hover:shadow-xl' : ''}
        ${className}
      `}
      style={{ backgroundColor: 'var(--bg-card)', ...style }}
    >
      {/* Gradient overlay on hover */}
      {hover && (
        <div 
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" 
          style={{ background: 'linear-gradient(to bottom right, rgba(109,116,100,0.1), rgba(62,61,57,0.1))' }}
        />
      )}
      {/* Gradient background when gradient prop is true */}
      {gradient && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ background: 'linear-gradient(to bottom right, rgba(109,116,100,0.05), transparent, rgba(62,61,57,0.05))' }}
        />
      )}
      <div className="pointer-events-auto relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

