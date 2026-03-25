'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  ClipboardList,
  FlaskConical,
  HardHat,
  Wrench,
  Flame,
  Search,
  Siren,
  CheckSquare,
  GraduationCap,
  Shield,
  Monitor,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
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

interface SidebarProps {
  user: UserProfile
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Documents', href: '/documents', icon: FileText, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Risk Assessments', href: '/risk-assessments', icon: AlertTriangle, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Method Statements', href: '/method-statements', icon: ClipboardList, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'COSHH', href: '/coshh', icon: FlaskConical, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Contractors', href: '/contractors', icon: HardHat, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'Read-Only'] },
  { label: 'Equipment', href: '/equipment', icon: Wrench, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Fire Safety', href: '/fire-safety', icon: Flame, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Inspections', href: '/inspections', icon: Search, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Incidents', href: '/incidents', icon: Siren, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Corrective Actions', href: '/corrective-actions', icon: CheckSquare, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'Training', href: '/training', icon: GraduationCap, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff', 'Read-Only'] },
  { label: 'PPE', href: '/ppe', icon: Shield, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff'] },
  { label: 'DSE Assessments', href: '/dse', icon: Monitor, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'TDA / Staff'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['System Admin', 'H&S Manager', 'Site Manager', 'Read-Only'] },
  { label: 'System Settings', href: '/settings', icon: Settings, roles: ['System Admin'] },
]

export function Sidebar({ user, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarClasses = [
    'fixed left-0 top-0 h-full w-[220px] bg-white border-r border-slate-200 flex flex-col z-30',
    'transition-transform duration-200 ease-in-out',
    // Mobile: hidden by default, slide in when open
    open ? 'translate-x-0' : '-translate-x-full',
    // Desktop: always visible
    'lg:translate-x-0',
  ].join(' ')

  return (
    <aside className={sidebarClasses}>
      {/* Logo */}
      <div className="flex-shrink-0 px-4 py-5 border-b border-slate-200">
        <div className="text-blue-600 text-xl font-bold tracking-tight">MGTS</div>
        <div className="text-slate-500 text-xs mt-0.5">Health &amp; Safety</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={[
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3">
        <div className="text-sm font-medium text-slate-800 truncate">
          {user.firstName} {user.lastName}
        </div>
        <div className="text-xs text-slate-500 truncate mt-0.5">{user.role}</div>
        {user.siteName && (
          <div className="text-xs text-slate-400 truncate mt-0.5">{user.siteName}</div>
        )}
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
