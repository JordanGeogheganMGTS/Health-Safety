'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleCompetency, signOffSkill, revokeSkill } from './actions'

interface Category {
  id: string
  name: string
}

interface Skill {
  id: string
  name: string
  categoryId: string | null
}

interface Member {
  userId: string
  firstName: string
  lastName: string
  siteName: string | null
}

interface Props {
  skills: Skill[]
  categories: Category[]
  members: Member[]
  competencies: Record<string, boolean>
  certificates: Record<string, boolean>   // key = userId_skillId
  canEdit: boolean
}

export function SkillsMatrixGrid({
  skills, categories, members,
  competencies: initial, certificates: initialCerts,
  canEdit,
}: Props) {
  const [comps, setComps] = useState(initial)
  const [certs, setCerts] = useState(initialCerts)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [signOffPending, setSignOffPending] = useState<Set<string>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [, startTransition] = useTransition()

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<{ userId: string; skillId: string; skillName: string; memberName: string } | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [revokePending, startRevoke] = useTransition()

  function handleToggle(userId: string, skillId: string) {
    if (!editMode) return
    const key = `${userId}_${skillId}`
    const current = comps[key] ?? false
    const hasCert = certs[key] ?? false

    // If skill has a certificate, must go through revocation flow
    if (current && hasCert) {
      const member = members.find((m) => m.userId === userId)
      const skill = skills.find((s) => s.id === skillId)
      setRevokeTarget({
        userId,
        skillId,
        skillName: skill?.name ?? 'this skill',
        memberName: member ? `${member.firstName} ${member.lastName}` : 'this staff member',
      })
      setRevokeReason('')
      return
    }

    // Normal toggle (no certificate involved)
    setComps((prev) => ({ ...prev, [key]: !current }))
    setPending((prev) => new Set([...Array.from(prev), key]))

    startTransition(async () => {
      try {
        await toggleCompetency(userId, skillId, current)
      } catch {
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

  function handleSignOff(userId: string, skillId: string) {
    const key = `${userId}_${skillId}`
    setSignOffPending((prev) => new Set([...Array.from(prev), key]))

    startTransition(async () => {
      try {
        await signOffSkill(userId, skillId)
        setComps((prev) => ({ ...prev, [key]: true }))
        setCerts((prev) => ({ ...prev, [key]: true }))
      } finally {
        setSignOffPending((prev) => {
          const next = new Set(Array.from(prev))
          next.delete(key)
          return next
        })
      }
    })
  }

  function handleRevokeConfirm() {
    if (!revokeTarget || !revokeReason.trim()) return
    const { userId, skillId } = revokeTarget
    const key = `${userId}_${skillId}`
    startRevoke(async () => {
      await revokeSkill(userId, skillId, revokeReason)
      setComps((prev) => ({ ...prev, [key]: false }))
      setCerts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setRevokeTarget(null)
      setRevokeReason('')
    })
  }

  // Build grouped skill list
  const grouped: Array<{ category: Category | null; skills: Skill[] }> = []
  for (const cat of categories) {
    const catSkills = skills.filter((s) => s.categoryId === cat.id)
    if (catSkills.length > 0) grouped.push({ category: cat, skills: catSkills })
  }
  const uncategorised = skills.filter((s) => s.categoryId === null || !categories.find((c) => c.id === s.categoryId))
  if (uncategorised.length > 0) grouped.push({ category: null, skills: uncategorised })

  const orderedSkills = grouped.flatMap((g) => g.skills)
  const hasCategories = categories.length > 0 && grouped.some((g) => g.category !== null)

  const totalCells = members.length * orderedSkills.length
  const competentCount = Object.values(comps).filter(Boolean).length
  const overallPct = totalCells > 0 ? Math.round((competentCount / totalCells) * 100) : 0

  if (orderedSkills.length === 0) {
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
          <p className="text-2xl font-bold text-slate-900 mt-1">{orderedSkills.length}</p>
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
      <div className={`rounded-xl border bg-white shadow-sm overflow-hidden transition-colors ${editMode ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}>
        {/* Toolbar */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${editMode ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100'}`}>
          {editMode ? (
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-xs font-medium text-orange-700">Editing — toggle cells or use the certificate icon to sign off</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Read-only — click a <span className="font-medium text-slate-500">green tick</span> with an orange ring to view the sign-off certificate</p>
          )}
          {canEdit && (
            <button
              onClick={() => setEditMode((v) => !v)}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                editMode
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              ].join(' ')}
            >
              {editMode ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Done Editing
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Matrix
                </>
              )}
            </button>
          )}
        </div>

        {/* Scrollable table */}
        <div className="overflow-auto max-h-[calc(100vh-22rem)]">
          <table className="border-collapse" style={{ minWidth: `${220 + orderedSkills.length * 90 + 70}px` }}>
            <thead>
              {hasCategories && (
                <tr style={{ height: '36px' }}>
                  <th
                    rowSpan={2}
                    className="sticky left-0 top-0 z-40 bg-slate-50 border-b-2 border-r border-b-slate-200 border-r-slate-200 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    style={{ minWidth: 220 }}
                  >
                    Staff Member
                  </th>
                  {grouped.map((g) => (
                    <th
                      key={g.category?.id ?? '__uncategorised'}
                      colSpan={g.skills.length}
                      className="sticky top-0 z-20 bg-slate-100 border-b border-r border-b-slate-200 border-r-slate-200 px-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider"
                    >
                      {g.category?.name ?? 'Uncategorised'}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 bg-slate-50 border-b-2 border-b-slate-200 px-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    style={{ minWidth: 70 }}
                  >
                    Score
                  </th>
                </tr>
              )}
              <tr>
                {!hasCategories && (
                  <th
                    className="sticky left-0 top-0 z-30 bg-slate-50 border-b-2 border-r border-b-slate-200 border-r-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    style={{ minWidth: 220 }}
                  >
                    Staff Member
                  </th>
                )}
                {orderedSkills.map((skill) => (
                  <th
                    key={skill.id}
                    className="sticky z-20 bg-slate-50 border-b-2 border-r border-b-slate-200 border-r-slate-100 px-2 py-2 text-center"
                    style={{ minWidth: 90, top: hasCategories ? '36px' : undefined }}
                  >
                    <span className="block text-xs font-semibold text-slate-600 leading-tight">{skill.name}</span>
                  </th>
                ))}
                {!hasCategories && (
                  <th
                    className="sticky top-0 z-20 bg-slate-50 border-b-2 border-b-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    style={{ minWidth: 70 }}
                  >
                    Score
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member, idx) => {
                const memberScore = orderedSkills.filter((s) => comps[`${member.userId}_${s.id}`]).length
                const pct = orderedSkills.length > 0 ? Math.round((memberScore / orderedSkills.length) * 100) : 0
                return (
                  <tr key={member.userId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                    <td className={`sticky left-0 z-10 border-b border-r border-slate-100 px-4 py-3 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                      <Link href={`/profile/${member.userId}`} className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition-colors">
                        {member.firstName} {member.lastName}
                      </Link>
                      {member.siteName && <p className="text-xs text-slate-400 mt-0.5">{member.siteName}</p>}
                    </td>

                    {orderedSkills.map((skill) => {
                      const key = `${member.userId}_${skill.id}`
                      const isComp = comps[key] ?? false
                      const isPend = pending.has(key)
                      const isSignOff = signOffPending.has(key)
                      const hasCert = certs[key] ?? false

                      return (
                        <td key={skill.id} className="border-b border-r border-slate-100 p-1.5 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {/* Green tick — link to certificate in read-only mode, button in edit mode */}
                            {!editMode && hasCert && isComp ? (
                              <a
                                href={`/api/certificates/skill/${member.userId}/${skill.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View sign-off certificate"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-500 text-white shadow-sm ring-2 ring-orange-300 hover:ring-orange-500 hover:shadow-md transition-all duration-150 cursor-pointer"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </a>
                            ) : (
                              <button
                                onClick={() => handleToggle(member.userId, skill.id)}
                                disabled={!editMode || isPend || isSignOff}
                                title={
                                  hasCert && isComp
                                    ? 'Click to revoke certificate'
                                    : isComp ? 'Competent — click to remove' : 'Not competent — click to mark competent'
                                }
                                className={[
                                  'inline-flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150',
                                  isComp
                                    ? hasCert
                                      ? 'bg-green-500 text-white shadow-sm ring-2 ring-orange-300'
                                      : 'bg-green-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-300',
                                  editMode && !isPend && !isSignOff
                                    ? isComp
                                      ? 'hover:bg-red-400 hover:ring-0 hover:shadow-md cursor-pointer'
                                      : 'hover:bg-green-400 hover:text-white hover:shadow-md cursor-pointer'
                                    : 'cursor-default',
                                  isPend || isSignOff ? 'opacity-60' : '',
                                ].join(' ')}
                              >
                                {isPend || isSignOff ? (
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
                            )}

                            {/* Edit mode: sign-off button when competent but no certificate yet */}
                            {editMode && isComp && !hasCert && (
                              <button
                                onClick={() => handleSignOff(member.userId, skill.id)}
                                disabled={isSignOff || isPend}
                                title="Generate sign-off certificate"
                                className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-50"
                              >
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-[9px] font-medium">Sign Off</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    <td className="border-b border-slate-100 px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold ${pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {memberScore}/{orderedSkills.length}
                        </span>
                        <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-slate-300'}`}
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

      {/* Revocation modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Revoke Sign-Off Certificate</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Revoke <span className="font-medium text-slate-700">{revokeTarget.skillName}</span> for{' '}
                  <span className="font-medium text-slate-700">{revokeTarget.memberName}</span>.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-3">
              The sign-off certificate will be permanently deleted and the training record removed.
              Please provide a reason for revocation:
            </p>

            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="e.g. Staff member has not maintained competency following a re-assessment…"
              rows={3}
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={revokePending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeConfirm}
                disabled={revokePending || !revokeReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {revokePending ? 'Revoking…' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
