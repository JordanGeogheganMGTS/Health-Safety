'use client'

import { useState, useTransition } from 'react'
import { acknowledgeItem } from '@/app/(app)/acknowledgements/actions'

interface Props {
  acknowledgementId: string
  itemTitle: string
}

export function AcknowledgeButton({ acknowledgementId, itemTitle }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await acknowledgeItem(acknowledgementId)
      setDone(true)
      setConfirming(false)
    })
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Acknowledged
      </span>
    )
  }

  if (confirming) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
        <p className="text-sm font-medium text-slate-800 mb-1">
          Please confirm you have read and understood:
        </p>
        <p className="text-sm text-slate-600 mb-4 italic">&ldquo;{itemTitle}&rdquo;</p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Yes, I confirm
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors shadow-sm"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      I have read and understood this
    </button>
  )
}
