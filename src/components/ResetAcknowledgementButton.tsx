'use client'

import { useState, useTransition } from 'react'
import { resetAcknowledgement } from '@/app/(app)/acknowledgements/actions'

interface Props {
  acknowledgementId: string
}

export function ResetAcknowledgementButton({ acknowledgementId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleSubmit() {
    if (!reason.trim()) return
    startTransition(async () => {
      await resetAcknowledgement(acknowledgementId, reason.trim())
      setDone(true)
      setOpen(false)
    })
  }

  if (done) {
    return (
      <span className="text-xs text-slate-400 italic">Reset</span>
    )
  }

  if (open) {
    return (
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
        <label className="block text-xs font-medium text-slate-600">Reason for reset</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="e.g. Document has been updated, please re-read"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isPending || !reason.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Resetting…' : 'Confirm Reset'}
          </button>
          <button
            onClick={() => { setOpen(false); setReason('') }}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
    >
      Reset
    </button>
  )
}
