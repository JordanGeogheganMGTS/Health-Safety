'use client'

import { useState, useTransition } from 'react'
import { addToMatrix, removeFromMatrix } from '@/app/(app)/skills-matrix/actions'

interface Props {
  userId: string
  isMember: boolean
}

export function MatrixMembershipButton({ userId, isMember: initial }: Props) {
  const [isMember, setIsMember] = useState(initial)
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    startTransition(async () => {
      await addToMatrix(userId)
      setIsMember(true)
    })
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromMatrix(userId)
      setIsMember(false)
    })
  }

  if (isMember) {
    return (
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50 transition-colors shadow-sm"
      >
        {isPending ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        )}
        {isPending ? 'Removing…' : 'Remove from Skills Matrix'}
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 disabled:opacity-50 transition-colors shadow-sm"
    >
      {isPending ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {isPending ? 'Adding…' : 'Add to Skills Matrix'}
    </button>
  )
}
