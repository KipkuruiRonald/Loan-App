'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { notificationsApi } from '@/lib/api'
import { Notification, NotificationListResponse, UserRole } from '@/types'
import { useAuth } from '@/context/AuthContext'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  refreshNotifications: () => Promise<void>
  markAsRead: (notificationIds: number[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: number) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const POLL_INTERVAL = 30000 // 30 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const { isAuthenticated } = useAuth()

  const refreshNotifications = useCallback(async () => {
    // Only fetch notifications when authenticated
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }
    
    try {
      const data: NotificationListResponse = await notificationsApi.getAll(0, 20, false)
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Initial fetch and polling - only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications()
      
      const interval = setInterval(refreshNotifications, POLL_INTERVAL)
      return () => clearInterval(interval)
    } else {
      // Clear notifications when logged out
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
    }
  }, [refreshNotifications, isAuthenticated])

  const markAsRead = async (notificationIds: number[]) => {
    try {
      await notificationsApi.markAsRead(notificationIds)
      await refreshNotifications()
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      await refreshNotifications()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      await notificationsApi.delete(notificationId)
      await refreshNotifications()
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isOpen,
        setIsOpen,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
