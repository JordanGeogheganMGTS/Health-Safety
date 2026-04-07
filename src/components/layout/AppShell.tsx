'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  siteId: string | null
  siteName: string | null
}

interface Site {
  id: string
  name: string
}

interface AppShellProps {
  user: UserProfile
  sites: Site[]
  notificationCount: number
  children: React.ReactNode
}

export function AppShell({ user, sites, notificationCount, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 lg:pl-[220px]">
        <Header
          user={user}
          sites={sites}
          notificationCount={notificationCount}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
