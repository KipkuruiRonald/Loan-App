import React from 'react'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y" style={{ borderColor: '#B4A58B' }}>
        {children}
      </table>
    </div>
  )
}

interface TableHeadProps {
  children: React.ReactNode
}

export function TableHead({ children }: TableHeadProps) {
  return (
    <thead style={{ backgroundColor: '#C4A995' }}>
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: React.ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return (
    <tbody style={{ backgroundColor: '#D5BFA4', borderColor: '#B4A58B' }} className="divide-y">
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export function TableRow({ children, onClick, className = '' }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer transition-colors' : ''} ${className}`}
      style={{
        backgroundColor: 'transparent',
        color: '#050505'
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.backgroundColor = '#D5BFA4')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </tr>
  )
}

interface TableHeaderCellProps {
  children: React.ReactNode
  sortable?: boolean
  onSort?: () => void
  sortDirection?: 'asc' | 'desc' | null
  align?: 'left' | 'center' | 'right'
}

export function TableHeaderCell({
  children,
  sortable = false,
  onSort,
  sortDirection = null,
  align = 'left',
}: TableHeaderCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  
  return (
    <th
      className={`table-cell font-semibold px-4 py-3 ${alignClasses[align]} ${
        sortable ? 'cursor-pointer select-none' : ''
      }`}
      onClick={sortable ? onSort : undefined}
      style={{ color: '#050505' }}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <span style={{ color: '#6D7464' }}>
            {sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </div>
    </th>
  )
}

interface TableCellProps {
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
}

export function TableCell({ children, align = 'left', className = '' }: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }
  
  return (
    <td className={`table-cell px-4 py-3 ${alignClasses[align]} ${className}`} style={{ color: '#050505' }}>
      {children}
    </td>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        style={{ color: '#6D7464' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium" style={{ color: '#050505' }}>{title}</h3>
      {description && (
        <p className="mt-1 text-sm" style={{ color: '#3E3D39' }}>{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
