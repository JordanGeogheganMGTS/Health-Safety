'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Menu, Bell, ChevronDown, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

interface HeaderProps {
  user: UserProfile
  sites: Site[]
  notificationCount: number
  onMenuClick: () => void
}

const PATH_TITLE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  documents: 'Document Library',
  'risk-assessments': 'Risk Assessments',
  'method-statements': 'Method Statements',
  coshh: 'COSHH Assessments',
  contractors: 'Contractor Management',
  equipment: 'Equipment Register',
  'fire-safety': 'Fire Safety',
  inspections: 'Inspections & Audits',
  incidents: 'Incident Log',
  'corrective-actions': 'Corrective Actions',
  training: 'Training Records',
  ppe: 'PPE Management',
  dse: 'DSE Assessments',
  reports: 'Reports',
  settings: 'System Settings',
}

const SITE_FILTER_ROLES = ['System Admin', 'H&S Manager']

function HeaderInner({ user, sites, notificationCount, onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  // Read current site from URL (only on dashboard pages)
  const currentSiteParam = searchParams.get('site') ?? ''

  // Derive page title from first non-empty path segment
  const segment = pathname.split('/').filter(Boolean)[0] ?? ''
  const pageTitle = PATH_TITLE_MAP[segment] ?? 'MGTS Sentinel'

  // Initials
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSiteChange = (siteId: string) => {
    if (siteId) {
      router.push(`/dashboard?site=${siteId}`)
    } else {
      router.push('/dashboard')
    }
  }

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showBadge = notificationCount > 0

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-slate-800 flex-1 truncate">{pageTitle}</h1>

      {/* Site filter — only shown for admin/manager roles */}
      {SITE_FILTER_ROLES.includes(user.role) ? (
        <div className="relative hidden sm:block">
          <select
            value={currentSiteParam}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 rounded-md pl-3 pr-8 py-1.5 text-sm text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        </div>
      ) : user.siteName ? (
        <span className="hidden sm:inline-flex items-center text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
          {user.siteName}
        </span>
      ) : null}

      {/* Notifications bell */}
      <button
        onClick={() => router.push('/dashboard/overdue')}
        className="relative p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        aria-label={`Notifications — ${notificationCount} overdue item${notificationCount !== 1 ? 's' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {showBadge ? (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        ) : (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold leading-none">
            0
          </span>
        )}
      </button>

      {/* Avatar + dropdown */}
      <div className="relative" ref={avatarRef}>
        <button
          onClick={() => setAvatarOpen((prev) => !prev)}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
          aria-label="User menu"
          aria-expanded={avatarOpen}
        >
          {initials}
        </button>

        {avatarOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-slate-100">
              <div className="text-sm font-medium text-slate-800 truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
            <button
              onClick={() => { setAvatarOpen(false); router.push(`/profile/${user.id}`) }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User className="h-4 w-4" />
              Your Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export function Header(props: HeaderProps) {
  return (
    <Suspense fallback={null}>
      <HeaderInner {...props} />
    </Suspense>
  )
}
