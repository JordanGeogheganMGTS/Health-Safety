'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isSelf: boolean
  isActive: boolean
  currentRoleId: string
  currentSiteId: string | null
  roleName: string
  siteName: string
  roles: Array<{ id: string; name: string }>
  sites: Array<{ id: string; name: string }>
}

export default function AdminUserControls({
  userId, isSelf, isActive,
  currentRoleId, currentSiteId,
  roleName, siteName,
  roles, sites,
}: Props) {
  const router = useRouter()
  const [roleId, setRoleId] = useState(currentRoleId)
  const [siteId, setSiteId] = useState(currentSiteId ?? '')
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function call(action: string, extra?: Record<string, unknown>) {
    setSaving(action)
    setError(null)
    const res = await fetch(`/api/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    setSaving(null)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return null
    }
    router.refresh()
    return data
  }

  async function handleActivate() {
    await call(isActive ? 'deactivate' : 'activate')
  }

  async function handleRoleUpdate() {
    if (roleId === currentRoleId) return
    await call('update_role', { role_id: roleId })
  }

  async function handleSiteUpdate() {
    await call('update_site', { site_id: siteId || null })
  }

  async function handleResetPassword() {
    if (!window.confirm(`Reset password for this user? A new temporary password will be generated and the user will be required to change it on next login.`)) return
    const data = await call('reset_password')
    if (data?.tempPassword) {
      setResetPassword(data.tempPassword)
    }
  }

  function copyPassword() {
    if (resetPassword) {
      navigator.clipboard.writeText(resetPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const btnBase = 'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50'

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Reset password result */}
      {resetPassword && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">New Temporary Password</p>
          <p className="text-xs text-amber-700">Share this with the user. They must change it on next login.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white border border-amber-300 px-3 py-2 text-sm font-mono font-semibold text-slate-800 tracking-wider select-all">
              {resetPassword}
            </code>
            <button onClick={copyPassword} className={`${btnBase} bg-amber-500 text-white hover:bg-amber-600`}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setResetPassword(null)} className="text-xs text-amber-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Account Status */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Account Status</h2>
        </div>
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-700">
              This account is currently{' '}
              <span className={`font-semibold ${isActive ? 'text-green-700' : 'text-red-700'}`}>
                {isActive ? 'active' : 'inactive'}
              </span>.
            </p>
            {isSelf && <p className="text-xs text-slate-400 mt-1">You cannot deactivate your own account.</p>}
          </div>
          {!isSelf && (
            <button
              onClick={handleActivate}
              disabled={saving === 'activate' || saving === 'deactivate'}
              className={`${btnBase} border ${isActive ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
            >
              {saving === 'activate' || saving === 'deactivate' ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {/* Role */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Role</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-slate-500">Current role: <span className="font-medium text-slate-800">{roleName}</span></p>
          <div className="flex gap-3 items-end">
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button
              onClick={handleRoleUpdate}
              disabled={saving === 'update_role' || roleId === currentRoleId}
              className={`${btnBase} bg-orange-500 text-white hover:bg-orange-600`}
            >
              {saving === 'update_role' ? 'Saving…' : 'Update Role'}
            </button>
          </div>
        </div>
      </div>

      {/* Site */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Site Assignment</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-slate-500">Current site: <span className="font-medium text-slate-800">{siteName}</span></p>
          <div className="flex gap-3 items-end">
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">All sites</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              onClick={handleSiteUpdate}
              disabled={saving === 'update_site'}
              className={`${btnBase} bg-orange-500 text-white hover:bg-orange-600`}
            >
              {saving === 'update_site' ? 'Saving…' : 'Update Site'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Reset */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Password Reset</h2>
        </div>
        <div className="px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-700">Generate a new temporary password for this user.</p>
            <p className="text-xs text-slate-400 mt-1">
              The user will be required to change it on their next login. Use this to help users who are locked out.
            </p>
          </div>
          <button
            onClick={handleResetPassword}
            disabled={saving === 'reset_password'}
            className={`${btnBase} shrink-0 border border-slate-300 text-slate-700 hover:bg-slate-50`}
          >
            {saving === 'reset_password' ? 'Generating…' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
