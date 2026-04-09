'use client'

import { useState, useTransition } from 'react'

interface Skill {
  id: string
  name: string
}

interface Props {
  skills: Skill[]
  competencies: Record<string, boolean>
  canEdit: boolean
  toggleAction: (skillId: string, current: boolean) => Promise<void>
}

export function ProfileSkillsSection({ skills, competencies: initial, canEdit, toggleAction }: Props) {
  const [comps, setComps] = useState(initial)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  function handleToggle(skillId: string) {
    if (!canEdit) return
    const current = comps[skillId] ?? false
    setComps((prev) => ({ ...prev, [skillId]: !current }))
    setPending((prev) => new Set([...Array.from(prev), skillId]))

    startTransition(async () => {
      try {
        await toggleAction(skillId, current)
      } catch {
        setComps((prev) => ({ ...prev, [skillId]: current }))
      } finally {
        setPending((prev) => {
          const next = new Set(Array.from(prev))
          next.delete(skillId)
          return next
        })
      }
    })
  }

  const competentCount = skills.filter((s) => comps[s.id]).length
  const pct = skills.length > 0 ? Math.round((competentCount / skills.length) * 100) : 0

  if (skills.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-slate-500">No skills have been defined yet.</p>
        <p className="text-xs text-slate-400 mt-1">Ask a System Admin to add skills in Settings → Skills.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-5">
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-orange-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-sm font-bold min-w-[3rem] text-right ${
          pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-slate-700'
        }`}>
          {pct}%
        </span>
        <span className="text-xs text-slate-400">{competentCount}/{skills.length} skills</span>
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
        {skills.map((skill) => {
          const isComp = comps[skill.id] ?? false
          const isPend = pending.has(skill.id)
          return (
            <button
              key={skill.id}
              onClick={() => handleToggle(skill.id)}
              disabled={!canEdit || isPend}
              title={
                !canEdit
                  ? isComp ? 'Competent' : 'Not competent'
                  : isComp ? 'Click to remove competency' : 'Click to mark competent'
              }
              className={[
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-center transition-all',
                isComp
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-slate-100 bg-slate-50 text-slate-400',
                canEdit && !isPend
                  ? 'cursor-pointer hover:shadow-sm active:scale-95'
                  : 'cursor-default',
                isPend ? 'opacity-60' : '',
              ].join(' ')}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                isComp ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                {isPend ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : isComp ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-medium leading-tight">{skill.name}</span>
            </button>
          )
        })}
      </div>

      {canEdit && (
        <p className="text-xs text-slate-400 mt-3">Click a skill tile to toggle competency</p>
      )}
    </div>
  )
}
