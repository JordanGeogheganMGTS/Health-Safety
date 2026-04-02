'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
}

export default function ChangePasswordForm({ email }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPwd.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPwd !== confirm) {
      setError('New passwords do not match.')
      return
    }

    setSubmitting(true)

    // Verify current password by attempting sign-in
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current })
    if (signInErr) {
      setError('Current password is incorrect.')
      setSubmitting(false)
      return
    }

    // Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd })
    if (updateErr) {
      setError(updateErr.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setCurrent('')
    setNewPwd('')
    setConfirm('')
    setSubmitting(false)
    setTimeout(() => { setSuccess(false); setOpen(false) }, 2500)
  }

  const inputCls = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        Change Password
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-semibold text-slate-800">Change Password</h3>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">Password changed successfully.</div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Current Password</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">New Password</label>
        <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={8} className={inputCls} placeholder="At least 8 characters" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Confirm New Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputCls} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
          {submitting ? 'Saving…' : 'Update Password'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
