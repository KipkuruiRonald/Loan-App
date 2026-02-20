import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium'
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }
  
  const variantClasses = {
    success: 'badge-success-okoleo',
    warning: 'badge-warning-okoleo',
    danger: 'badge-error-okoleo',
    info: 'badge-info-okoleo',
    default: 'badge-default-okoleo',
  }
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'COMPLETED':
        return 'success'
      case 'FAILED':
      case 'DEFAULTED':
        return 'danger'
      case 'SETTLED':
        return 'info'
      default:
        return 'default'
    }
  }
  
  return <Badge variant={getStatusVariant(status)}>{status}</Badge>
}
