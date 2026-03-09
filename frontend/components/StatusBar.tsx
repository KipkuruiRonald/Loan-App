'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export default function StatusBarSetup() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Configure status bar
      StatusBar.setStyle({ style: Style.Light })
      
      // Set background color to match app theme (blue)
      StatusBar.setBackgroundColor({ color: '#3B82F6' })
      
      // Don't overlay the webview - prevents app content from being hidden behind status bar
      StatusBar.setOverlaysWebView({ overlay: false })
    }
  }, [])

  return null
}
