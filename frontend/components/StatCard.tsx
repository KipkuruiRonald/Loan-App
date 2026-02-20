'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: 'up' | 'down';
  delay?: number;
}

export default function StatCard({ title, value, change, icon: Icon, trend, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <GlassCard className="group h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p 
              className="text-xs font-medium sm:text-sm" 
              style={{ color: '#3E3D39' }}
            >
              {title}
            </p>
            <h3 
              className="mt-1 text-lg font-bold sm:mt-2 sm:text-2xl lg:text-xl" 
              style={{ color: '#050505' }}
            >
              {value}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1 sm:mt-2">
              <span 
                className="text-xs font-medium sm:text-sm"
                style={{ color: trend === 'up' ? '#6D7464' : '#3E3D39' }}
              >
                {change}
              </span>
              <span 
                className="text-[10px] sm:text-xs" 
                style={{ color: '#3E3D39' }}
              >
                vs last month
              </span>
            </div>
          </div>
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="shrink-0 rounded-lg p-2 shadow-lg sm:rounded-xl sm:p-2"
            style={{ backgroundColor: '#3E3D39' }}
          >
            <Icon 
              className="h-4 w-4 sm:h-5 sm:w-5" 
              style={{ color: '#D4C8B5' }} 
            />
          </motion.div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
