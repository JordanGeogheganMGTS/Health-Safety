'use client'

import { useState, useTransition } from 'react'
import { toggleCompetency } from './actions'

interface Skill {
  id: string
  name: string
}

interface Member {
  userId: string
  firstName: string
  lastName: string
  siteName: string | null
}

interface Props {
  skills: Skill[]
  members: Member[]
  competencies: Record<string, boolean>
  canEdit: boolean
}

export function SkillsMatrixGrid({ skills, members, competencies: initial, canEdit }: Props) {
  const [comps, setComps] = useState(initial)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function handleToggle(userId: string, skillId: string) {
    if (!canEdit) return
    const key = `${userId}_${skillId}`
    const current = comps[key] ?? false

    // Optimistic update
    setComps((prev) => ({ ...prev, [key]: !current }))
    setPending((prev) => new Set([...Array.from(prev), key]))

    startTransition(async () => {
      try {
        await toggleCompetency(userId, skillId, current)
      } catch {
        // Revert on error
        setComps((prev) => ({ ...prev, [key]: current }))
      } finally {
        setPending((prev) => {
          const next = new Set(Array.from(prev))
          next.delete(key)
          return next
        })
      }
    })
  }

  const totalCells = members.length * skills.length
  const competentCount = Object.values(comps).filter(Boolean).length
  const overallPct = totalCells > 0 ? Math.round((competentCount / totalCells) * 100) : 0

  if (skills.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-12 text-center">
        <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
        <p className="text-sm font-medium text-slate-500">No skills defined yet</p>
        <p className="text-xs text-slate-400 mt-1">Go to Settings → Skills to add skill columns.</p>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-12 text-center">
        <svg className="mx-auto h-10 w-10 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        <p className="text-sm font-medium text-slate-500">No staff on the matrix yet</p>
        <p className="text-xs text-slate-400 mt-1">Use the &ldquo;Add to Skills Matrix&rdquo; button on a user&rsquo;s profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Staff on Matrix</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{members.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Skills Tracked</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{skills.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Competency</p>
          <div className="flex items-end gap-2 mt-1">
            <p className={`text-2xl font-bold ${overallPct >= 75 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-slate-900'}`}>
              {overallPct}%
            </p>
            <p className="text-xs text-slate-400 mb-1">{competentCount} of {totalCells} cells</p>
          </div>
        </div>
      </div>

      {/* Matrix table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {canEdit && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-500">Click a cell to toggle competency</p>
          </div>
        )}
        <div className="overflow-auto max-h-[calc(100vh-20rem)]">
          <table className="border-collapse" style={{ minWidth: `${220 + skills.length * 80 + 70}px` }}>
            <thead>
              <tr>
                {/* Sticky corner */}
                <th
                  className="sticky left-0 top-0 z-30 bg-slate-50 border-b-2 border-r border-b-slate-200 border-r-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  style={{ minWidth: 220 }}
                >
                  Staff Member
                </th>
                {skills.map((skill) => (
                  <th
                    key={skill.id}
                    className="sticky top-0 z-20 bg-slate-50 border-b-2 border-r border-b-slate-200 border-r-slate-100 px-2 py-3 text-center"
                    style={{ minWidth: 80 }}
                  >
                    <span className="block text-xs font-semibold text-slate-600 leading-tight">
                      {skill.name}
                    </span>
                  </th>
                ))}
                <th
                  className="sticky top-0 z-20 bg-slate-50 border-b-2 border-b-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  style={{ minWidth: 70 }}
                >
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => {
                const memberScore = skills.filter((s) => comps[`${member.userId}_${s.id}`]).length
                const pct = skills.length > 0 ? Math.round((memberScore / skills.length) * 100) : 0
                return (
                  <tr key={member.userId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    {/* Sticky name column */}
                    <td
                      className={`sticky left-0 z-10 border-b border-r border-slate-100 px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {member.firstName} {member.lastName}
                      </p>
                      {member.siteName && (
                        <p className="text-xs text-slate-400 mt-0.5">{member.siteName}</p>
                      )}
                    </td>

                    {/* Skill cells */}
                    {skills.map((skill) => {
                      const key = `${member.userId}_${skill.id}`
                      const isComp = comps[key] ?? false
                      const isPend = pending.has(key)
                      return (
                        <td key={skill.id} className="border-b border-r border-slate-100 p-1.5 text-center">
                          <button
                            onClick={() => handleToggle(member.userId, skill.id)}
                            disabled={!canEdit || isPend}
                            title={
                              !canEdit
                                ? isComp ? 'Competent' : 'Not competent'
                                : isComp ? 'Click to remove competency' : 'Click to mark competent'
                            }
                            className={[
                              'inline-flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150',
                              isComp
                                ? 'bg-green-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-300',
                              canEdit && !isPend
                                ? isComp
                                  ? 'hover:bg-green-600 cursor-pointer'
                                  : 'hover:bg-slate-200 cursor-pointer'
                                : 'cursor-default',
                              isPend ? 'opacity-60' : '',
                            ].join(' ')}
                          >
                            {isPend ? (
                              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            ) : isComp ? (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            )}
                          </button>
                        </td>
                      )
                    })}

                    {/* Score cell */}
                    <td className="border-b border-slate-100 px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${
                          pct === 100 ? 'text-green-600' :
                          pct >= 70 ? 'text-amber-600' :
                          'text-slate-500'
                        }`}>
                          {memberScore}/{skills.length}
                        </span>
                        <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct === 100 ? 'bg-green-500' :
                              pct >= 70 ? 'bg-amber-400' :
                              'bg-slate-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
