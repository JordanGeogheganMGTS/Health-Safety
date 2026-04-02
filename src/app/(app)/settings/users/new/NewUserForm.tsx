'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Role { id: string; name: string }
interface Site { id: string; name: string }
interface Props { roles: Role[]; sites: Site[] }

const inputCls = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

export default function NewUserForm({ roles, sites }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const first_name = formData.get('first_name') as string
    const last_name = formData.get('last_name') as string

    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name,
          last_name,
          role_id: formData.get('role_id'),
          site_id: formData.get('site_id') || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create user')
        return
      }

      setCreated({ name: `${first_name} ${last_name}`, email, password: data.tempPassword })
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  function copyPassword() {
    if (created) {
      navigator.clipboard.writeText(created.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (created) {
    return (
      <div className="max-w-lg rounded-xl border border-green-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">User Created</h2>
            <p className="text-sm text-slate-500">{created.name} · {created.email}</p>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Temporary Password</p>
          <p className="text-sm text-amber-700 mb-3">Share this password with the user. They will be required to change it on their first login.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white border border-amber-300 px-3 py-2 text-sm font-mono font-semibold text-slate-800 tracking-wider select-all">
              {created.password}
            </code>
            <button
              onClick={copyPassword}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">This password will not be shown again. Make a note of it before leaving this page.</p>

        <div className="flex gap-3">
          <Link
            href="/settings/users"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Back to Users
          </Link>
          <button
            onClick={() => { setCreated(null); setCopied(false) }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input type="email" id="email" name="email" required className={inputCls} placeholder="user@example.com" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input type="text" id="first_name" name="first_name" required className={inputCls} />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input type="text" id="last_name" name="last_name" required className={inputCls} />
          </div>
        </div>

        <div>
          <label htmlFor="role_id" className="block text-sm font-medium text-slate-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select id="role_id" name="role_id" required className={inputCls}>
            <option value="">Select a role…</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="site_id" className="block text-sm font-medium text-slate-700 mb-1">Site</label>
          <select id="site_id" name="site_id" className={inputCls}>
            <option value="">All sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          A temporary password will be generated. You will need to share it with the user — they must change it on first login.
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/settings/users" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}
