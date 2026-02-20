'use client'

import { useState, useEffect, useCallback } from 'react'
import { notificationsApi } from '@/lib/api'
import { Notification, NotificationPriority, UserRole } from '@/types'
import { Bell, Check, CheckCheck, Trash2, Filter, AlertCircle, Info, AlertTriangle } from 'lucide-react'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPriorityIcon(priority: NotificationPriority) {
  switch (priority) {
    case NotificationPriority.CRITICAL:
      return <AlertCircle className="w-5 h-5 text-red-500" />
    case NotificationPriority.HIGH:
      return <AlertTriangle className="w-5 h-5 text-orange-500" />
    case NotificationPriority.MEDIUM:
      return <Info className="w-5 h-5 text-blue-500" />
    case NotificationPriority.LOW:
      return <Info className="w-5 h-5 text-gray-500" />
  }
}

function getTypeIcon(type: string): string {
  if (type.includes('LOAN_APPROVED')) return '✅'
  if (type.includes('LOAN_DECLINED')) return '❌'
  if (type.includes('PAYMENT')) return '💰'
  if (type.includes('CREDIT_LIMIT')) return '📈'
  if (type.includes('TIER')) return '⭐'
  if (type.includes('FRAUD') || type.includes('HIGH_RISK')) return '🚨'
  if (type.includes('DEFAULT')) return '⚠️'
  if (type.includes('USER_REGISTRATION')) return '👤'
  if (type.includes('WELCOME')) return '🎊'
  if (type.includes('REFERRAL')) return '🎁'
  if (type.includes('STATS')) return '📊'
  return '🔔'
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const includeRead = filter === 'all' || filter === 'read'
      const data = await notificationsApi.getAll(0, 100, includeRead)
      let filtered: Notification[] = data.notifications
      if (filter === 'unread') {
        filtered = filtered.filter((n: Notification) => !n.is_read)
      } else if (filter === 'read') {
        filtered = filtered.filter((n: Notification) => n.is_read)
      }
      setNotifications(filtered)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkAsRead = async (ids: number[]) => {
    try {
      await notificationsApi.markAsRead(ids)
      loadNotifications()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      loadNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.delete(id)
      loadNotifications()
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'You are all caught up!'}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-light)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-16 h-16 mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              No notifications yet
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              We&apos;ll notify you when something important happens
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all ${
                  notification.is_read 
                    ? '' 
                    : 'border-l-4'
                }`}
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: notification.is_read ? 'var(--border-light)' : 'var(--accent-primary)',
                  borderLeftColor: !notification.is_read ? 'var(--accent-primary)' : undefined
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <span className="text-2xl flex-shrink-0">
                    {getTypeIcon(notification.type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {notification.title}
                      </h3>
                      {getPriorityIcon(notification.priority)}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(notification.created_at)}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead([notification.id])}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            <Check className="w-3 h-3" />
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
