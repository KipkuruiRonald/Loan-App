'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useNotifications } from '@/context/NotificationContext'
import { useRouter } from 'next/navigation'
import { NotificationPriority, NotificationType } from '@/types'
import { 
  FileText, 
  CreditCard, 
  Shield, 
  Settings, 
  TrendingUp, 
  Gift, 
  AlertTriangle, 
  AlertCircle,
  Wrench,
  Megaphone
} from 'lucide-react'

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case NotificationPriority.CRITICAL:
      return 'text-red-500'
    case NotificationPriority.HIGH:
      return 'text-orange-500'
    case NotificationPriority.MEDIUM:
      return 'text-blue-500'
    case NotificationPriority.LOW:
      return 'text-gray-500'
    default:
      return 'text-gray-500'
  }
}

function getTypeIcon(type: string) {
  // Loan notifications
  if (type.includes('LOAN_APPROVED')) return <FileText className="w-5 h-5 text-green-600" />
  if (type.includes('LOAN_DECLINED')) return <AlertCircle className="w-5 h-5 text-red-600" />
  if (type.includes('LOAN_DISBURSED')) return <CreditCard className="w-5 h-5 text-green-600" />
  if (type.includes('LOAN_REPAID')) return <FileText className="w-5 h-5 text-green-600" />
  
  // Payment notifications
  if (type.includes('PAYMENT')) return <CreditCard className="w-5 h-5 text-blue-600" />
  if (type.includes('REPAYMENT')) return <CreditCard className="w-5 h-5 text-green-600" />
  
  // Account notifications
  if (type.includes('CREDIT_LIMIT')) return <TrendingUp className="w-5 h-5 text-purple-600" />
  if (type.includes('TIER')) return <TrendingUp className="w-5 h-5 text-yellow-600" />
  if (type.includes('WELCOME')) return <Gift className="w-5 h-5 text-pink-600" />
  if (type.includes('REFERRAL')) return <Gift className="w-5 h-5 text-green-600" />
  if (type.includes('ACCOUNT_UPDATE')) return <Settings className="w-5 h-5 text-gray-600" />
  
  // Security notifications
  if (type.includes('SECURITY') || type.includes('PASSWORD') || type.includes('DEVICE')) return <Shield className="w-5 h-5 text-red-600" />
  
  // System notifications
  if (type.includes('SYSTEM_MAINTENANCE')) return <Wrench className="w-5 h-5 text-orange-600" />
  if (type.includes('PROMOTIONAL')) return <Megaphone className="w-5 h-5 text-purple-600" />
  
  // Default icon
  return <AlertTriangle className="w-5 h-5 text-gray-600" />
}

function getNavigationPath(type: string, relatedEntityType?: string, relatedEntityId?: number): string {
  // Loan-related notifications
  if (type.includes('LOAN') && relatedEntityType === 'loan' && relatedEntityId) {
    return `/myloans?id=${relatedEntityId}`
  }
  
  // Payment-related notifications
  if (type.includes('PAYMENT') || type.includes('REPAYMENT')) {
    return '/repay'
  }
  
  // Account-related notifications
  if (type.includes('CREDIT_LIMIT') || type.includes('TIER') || type.includes('ACCOUNT_UPDATE')) {
    return '/settings'
  }
  
  // Security notifications
  if (type.includes('SECURITY') || type.includes('PASSWORD') || type.includes('DEVICE')) {
    return '/settings?tab=security'
  }
  
  // Default fallback
  return '/notifications'
}

export default function NotificationBell() {
  const router = useRouter()
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    isOpen, 
    setIsOpen,
    markAsRead,
    markAllAsRead,
    deleteNotification 
  } = useNotifications()
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead([notification.id])
    }
    
    // Navigate to related page
    const path = getNavigationPath(
      notification.type, 
      notification.related_entity_type, 
      notification.related_entity_id
    )
    router.push(path)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 text-gray-600 dark:text-gray-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12 mb-2 opacity-50" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
                  />
                </svg>
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((notification) => (
                  <li 
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getTypeIcon(notification.type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${
                            !notification.is_read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.title}
                          </p>
                          <span className={`text-xs ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        aria-label="Delete notification"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-4 w-4" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M6 18L18 6M6 6l12 12" 
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <a 
                href="/notifications" 
                className="block text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
