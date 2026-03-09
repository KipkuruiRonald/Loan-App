'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { notificationsApi } from '@/lib/api'
import { Notification, NotificationPriority } from '@/types'
import { 
  Bell, Check, CheckCheck, Trash2, Filter, Search, 
  AlertCircle, Info, AlertTriangle, FileText, CreditCard, 
  Shield, Settings, TrendingUp, Gift, Wrench, Megaphone,
  Square, CheckSquare
} from 'lucide-react'

// Notification categories
const CATEGORIES = [
  { id: 'all', name: 'All', icon: Bell },
  { id: 'LOANS', name: 'Loans', icon: FileText },
  { id: 'PAYMENTS', name: 'Payments', icon: CreditCard },
  { id: 'ACCOUNT', name: 'Account', icon: Settings },
  { id: 'SECURITY', name: 'Security', icon: Shield },
  { id: 'SYSTEM', name: 'System', icon: Wrench },
]

// Category mapping
const NOTIFICATION_CATEGORIES: Record<string, string[]> = {
  'LOANS': ['LOAN_APPROVED', 'LOAN_DECLINED', 'LOAN_DISBURSED', 'LOAN_REPAID'],
  'PAYMENTS': ['PAYMENT_DUE_REMINDER', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'REPAYMENT_CONFIRMATION'],
  'ACCOUNT': ['CREDIT_LIMIT_INCREASED', 'CREDIT_LIMIT_DECREASED', 'TIER_UPGRADE', 'TIER_DOWNGRADE', 'WELCOME_MESSAGE', 'REFERRAL_BONUS', 'ACCOUNT_UPDATE'],
  'SECURITY': ['SECURITY_ALERT', 'PASSWORD_CHANGED', 'NEW_DEVICE_LOGIN'],
  'SYSTEM': ['SYSTEM_MAINTENANCE', 'PROMOTIONAL'],
}

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

function getTypeIcon(type: string) {
  if (type.includes('LOAN_APPROVED')) return <FileText className="w-6 h-6 text-green-600" />
  if (type.includes('LOAN_DECLINED')) return <AlertCircle className="w-6 h-6 text-red-600" />
  if (type.includes('LOAN_DISBURSED')) return <CreditCard className="w-6 h-6 text-green-600" />
  if (type.includes('LOAN_REPAID')) return <FileText className="w-6 h-6 text-green-600" />
  if (type.includes('PAYMENT')) return <CreditCard className="w-6 h-6 text-blue-600" />
  if (type.includes('REPAYMENT')) return <CreditCard className="w-6 h-6 text-green-600" />
  if (type.includes('CREDIT_LIMIT')) return <TrendingUp className="w-6 h-6 text-purple-600" />
  if (type.includes('TIER')) return <TrendingUp className="w-6 h-6 text-yellow-600" />
  if (type.includes('WELCOME')) return <Gift className="w-6 h-6 text-pink-600" />
  if (type.includes('REFERRAL')) return <Gift className="w-6 h-6 text-green-600" />
  if (type.includes('ACCOUNT_UPDATE')) return <Settings className="w-6 h-6 text-gray-600" />
  if (type.includes('SECURITY') || type.includes('PASSWORD') || type.includes('DEVICE')) return <Shield className="w-6 h-6 text-red-600" />
  if (type.includes('SYSTEM_MAINTENANCE')) return <Wrench className="w-6 h-6 text-orange-600" />
  if (type.includes('PROMOTIONAL')) return <Megaphone className="w-6 h-6 text-purple-600" />
  if (type.includes('FRAUD') || type.includes('HIGH_RISK')) return <AlertTriangle className="w-6 h-6 text-red-600" />
  if (type.includes('DEFAULT')) return <AlertCircle className="w-6 h-6 text-orange-600" />
  if (type.includes('USER_REGISTRATION')) return <Shield className="w-6 h-6 text-blue-600" />
  if (type.includes('STATS')) return <TrendingUp className="w-6 h-6 text-green-600" />
  return <Bell className="w-6 h-6 text-gray-600" />
}

function getNavigationPath(type: string, relatedEntityType?: string, relatedEntityId?: number): string {
  if (type.includes('LOAN') && relatedEntityType === 'loan' && relatedEntityId) {
    return `/myloans?id=${relatedEntityId}`
  }
  if (type.includes('PAYMENT') || type.includes('REPAYMENT')) {
    return '/repay'
  }
  if (type.includes('CREDIT_LIMIT') || type.includes('TIER') || type.includes('ACCOUNT_UPDATE')) {
    return '/settings'
  }
  if (type.includes('SECURITY') || type.includes('PASSWORD') || type.includes('DEVICE')) {
    return '/settings?tab=security'
  }
  return '/notifications'
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState<number[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Set page title
  useEffect(() => {
    document.title = 'Notifications | Okolea - Quick Loans'
  }, [])

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
      
      if (category !== 'all' && NOTIFICATION_CATEGORIES[category]) {
        const categoryTypes = NOTIFICATION_CATEGORIES[category]
        filtered = filtered.filter((n: Notification) => 
          categoryTypes.some(ct => n.type.includes(ct))
        )
      }
      
      if (search.trim()) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter((n: Notification) =>
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower)
        )
      }
      
      setNotifications(filtered)
      setUnreadCount(data.unread_count)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [filter, category, search])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkAsRead = async (ids: number[]) => {
    try {
      await notificationsApi.markAsRead(ids)
      loadNotifications()
      setSelectedNotifications([])
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

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedNotifications) {
        await notificationsApi.delete(id)
      }
      setSelectedNotifications([])
      setShowBulkActions(false)
      loadNotifications()
    } catch (error) {
      console.error('Failed to delete notifications:', error)
    }
  }

  const handleBulkMarkRead = async () => {
    try {
      await notificationsApi.markAsRead(selectedNotifications)
      setSelectedNotifications([])
      setShowBulkActions(false)
      loadNotifications()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(notifications.map(n => n.id))
    }
  }

  const toggleSelect = (id: number) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(selectedNotifications.filter(n => n !== id))
    } else {
      setSelectedNotifications([...selectedNotifications, id])
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead([notification.id])
    }
    const path = getNavigationPath(
      notification.type, 
      notification.related_entity_type, 
      notification.related_entity_id
    )
    router.push(path)
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
          
          <div className="flex items-center gap-2">
            {selectedNotifications.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {selectedNotifications.length} selected
                </span>
              </div>
            )}
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
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ring-2 ring-offset-2 ring-blue-500`}
                style={{ 
                  backgroundColor: category === cat.id ? 'var(--accent-primary)' : 'var(--bg-card)',
                  color: category === cat.id ? 'white' : 'var(--text-primary)'
                }}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-light)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          
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
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ring-2 ring-offset-2 ring-blue-500"
            style={{ 
              backgroundColor: showBulkActions ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: showBulkActions ? 'white' : 'var(--text-primary)',
              borderColor: 'var(--border-light)'
            }}
          >
            {showBulkActions ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            Select
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedNotifications.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card-alt)' }}>
            <button
              onClick={handleBulkMarkRead}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <Check className="w-4 h-4" />
              Mark as read
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={toggleSelectAll}
              className="ml-auto text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {selectedNotifications.length === notifications.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        )}

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-16 h-16 mb-4 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
              No notifications found
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {search || category !== 'all' 
                ? 'Try adjusting your filters or search term' 
                : "We'll notify you when something important happens"}
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
                } ${selectedNotifications.includes(notification.id) ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                style={{ 
                  backgroundColor: 'var(--bg-card)',
                  borderColor: notification.is_read ? 'var(--border-light)' : 'var(--accent-primary)',
                  borderLeftColor: !notification.is_read ? 'var(--accent-primary)' : 'transparent'
                }}
              >
                <div className="flex items-start gap-4">
                  {showBulkActions && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelect(notification.id)
                      }}
                      className="flex-shrink-0 mt-1"
                    >
                      {selectedNotifications.includes(notification.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  )}

                  <div 
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {getTypeIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 
                        className="font-semibold cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {notification.title}
                      </h3>
                      {getPriorityIcon(notification.priority)}
                    </div>
                    <p 
                      className="text-sm mt-1 cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => handleNotificationClick(notification)}
                    >
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
