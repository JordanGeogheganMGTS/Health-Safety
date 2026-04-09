'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { assignAcknowledgements } from '@/app/(app)/acknowledgements/actions'

interface User { id: string; first_name: string; last_name: string; email: string }

interface Props {
  itemType: 'document' | 'risk_assessment' | 'method_statement' | 'coshh'
  itemId: string
  itemTitle: string
}

export function AssignAcknowledgementButton({ itemType, itemId, itemTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [assigned, setAssigned] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSuccess(false)
    Promise.all([
      supabase.from('users').select('id, first_name, last_name, email').eq('is_active', true).order('first_name'),
      supabase.from('document_acknowledgements')
        .select('user_id')
        .eq('item_type', itemType)
        .eq('item_id', itemId),
    ]).then(([usersRes, assignedRes]) => {
      setUsers((usersRes.data ?? []) as User[])
      setAssigned(new Set((assignedRes.data ?? []).map((r: { user_id: string }) => r.user_id)))
      setSelected(new Set())
      setNotes('')
      setLoading(false)
    })
  }, [open])

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  function handleSubmit() {
    const newIds = Array.from(selected).filter((id) => !assigned.has(id))
    if (newIds.length === 0) return
    startTransition(async () => {
      await assignAcknowledgements(itemType, itemId, itemTitle, newIds, notes || null)
      setSuccess(true)
      setSelected(new Set())
      setAssigned((prev) => new Set([...Array.from(prev), ...newIds]))
    })
  }

  const newCount = Array.from(selected).filter((id) => !assigned.has(id)).length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Assign for Acknowledgement
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Assign for Acknowledgement</h3>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="h-5 w-5 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : (
            <>
              {success && (
                <div className="mx-4 mt-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Assigned successfully
                </div>
              )}

              <div className="max-h-60 overflow-y-auto px-4 py-2">
                {users.map((u) => {
                  const isAssigned = assigned.has(u.id)
                  const isSelected = selected.has(u.id)
                  return (
                    <label
                      key={u.id}
                      className={`flex items-center gap-3 py-2 cursor-pointer rounded px-1 hover:bg-slate-50 ${isAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned || isSelected}
                        disabled={isAssigned}
                        onChange={() => !isAssigned && toggle(u.id)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      {isAssigned && (
                        <span className="shrink-0 text-xs text-green-600 font-medium">Assigned</span>
                      )}
                    </label>
                  )
                })}
              </div>

              <div className="border-t border-slate-100 px-4 py-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Note for recipients (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Please read before your next shift"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || newCount === 0}
                  className="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? 'Assigning…' : `Assign to ${newCount} user${newCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
