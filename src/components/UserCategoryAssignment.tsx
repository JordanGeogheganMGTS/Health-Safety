'use client'

import { useState, useTransition } from 'react'
import { assignUserCategory, removeUserCategory } from '@/app/(app)/skills-matrix/actions'

interface Category {
  id: string
  name: string
}

interface Props {
  userId: string
  allCategories: Category[]
  initialAssignedIds: string[]
}

export function UserCategoryAssignment({ userId, allCategories, initialAssignedIds }: Props) {
  const [assignedIds, setAssignedIds] = useState(new Set(initialAssignedIds))
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function handleToggle(categoryId: string) {
    const isAssigned = assignedIds.has(categoryId)

    // Optimistic update
    setAssignedIds((prev) => {
      const next = new Set(prev)
      if (isAssigned) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
    setPending((prev) => new Set([...Array.from(prev), categoryId]))

    startTransition(async () => {
      try {
        if (isAssigned) {
          await removeUserCategory(userId, categoryId)
        } else {
          await assignUserCategory(userId, categoryId)
        }
      } catch {
        // Rollback on error
        setAssignedIds((prev) => {
          const next = new Set(prev)
          if (isAssigned) next.add(categoryId)
          else next.delete(categoryId)
          return next
        })
      } finally {
        setPending((prev) => {
          const next = new Set(Array.from(prev))
          next.delete(categoryId)
          return next
        })
      }
    })
  }

  if (allCategories.length === 0) return null

  return (
    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Assigned Skill Categories</p>
      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat) => {
          const isAssigned = assignedIds.has(cat.id)
          const isPending = pending.has(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => handleToggle(cat.id)}
              disabled={isPending}
              title={isAssigned ? 'Click to remove category' : 'Click to assign category'}
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
                isAssigned
                  ? 'bg-orange-100 text-orange-700 hover:bg-red-100 hover:text-red-700 border border-orange-200 hover:border-red-200'
                  : 'bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 hover:border-orange-200',
                isPending ? 'opacity-60' : '',
              ].join(' ')}
            >
              {isPending ? (
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : isAssigned ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              {cat.name}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Only skills from assigned categories appear on this staff member&rsquo;s profile.
      </p>
    </div>
  )
}
