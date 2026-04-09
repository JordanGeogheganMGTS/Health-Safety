'use client'

import { useState, useTransition } from 'react'
import { addSkill, updateSkill, toggleSkillActive, deleteSkill } from '@/app/(app)/skills-matrix/actions'

interface Skill {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

interface Props {
  skills: Skill[]
}

export function SkillsSettingsClient({ skills: initial }: Props) {
  const [skills, setSkills] = useState(initial)

  // Add form
  const [newName, setNewName] = useState('')
  const [addPending, startAdd] = useTransition()

  // Edit row
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editOrder, setEditOrder] = useState(0)
  const [editPending, startEdit] = useTransition()

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deletePending, startDelete] = useTransition()

  // Toggle active
  const [togglePending, startToggle] = useTransition()

  function handleAdd() {
    if (!newName.trim()) return
    const name = newName.trim()
    startAdd(async () => {
      await addSkill(name)
      setNewName('')
      // Optimistic add (server will revalidate too)
      const nextOrder = (Math.max(0, ...skills.map((s) => s.sort_order)) + 10)
      setSkills((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, sort_order: nextOrder, is_active: true },
      ])
    })
  }

  function startEditing(skill: Skill) {
    setEditId(skill.id)
    setEditName(skill.name)
    setEditOrder(skill.sort_order)
  }

  function handleSaveEdit() {
    if (!editId || !editName.trim()) return
    const id = editId
    const name = editName.trim()
    const order = editOrder
    startEdit(async () => {
      await updateSkill(id, name, order)
      setSkills((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name, sort_order: order } : s))
            .sort((a, b) => a.sort_order - b.sort_order)
      )
      setEditId(null)
    })
  }

  function handleToggleActive(skill: Skill) {
    startToggle(async () => {
      await toggleSkillActive(skill.id, skill.is_active)
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, is_active: !s.is_active } : s))
      )
    })
  }

  function handleDeleteConfirm() {
    if (!deleteId) return
    const id = deleteId
    startDelete(async () => {
      await deleteSkill(id)
      setSkills((prev) => prev.filter((s) => s.id !== id))
      setDeleteId(null)
    })
  }

  const sorted = [...skills].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-6">
      {/* Skills table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No skills defined yet. Add your first skill below.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Skill Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((skill) => (
                <tr key={skill.id} className="hover:bg-slate-50">
                  {editId === skill.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={editOrder}
                          onChange={(e) => setEditOrder(parseInt(e.target.value) || 0)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-3" colSpan={2}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={editPending || !editName.trim()}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                          >
                            {editPending ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            disabled={editPending}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : deleteId === skill.id ? (
                    <>
                      <td colSpan={2} className="px-6 py-3">
                        <p className="text-sm text-slate-800">
                          Delete <span className="font-semibold">{skill.name}</span>?
                          <span className="text-red-600 text-xs ml-2">This will remove all competency records for this skill.</span>
                        </p>
                      </td>
                      <td colSpan={2} className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleDeleteConfirm}
                            disabled={deletePending}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {deletePending ? 'Deleting…' : 'Confirm Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            disabled={deletePending}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-3 text-sm text-slate-500">{skill.sort_order}</td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900">{skill.name}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => handleToggleActive(skill)}
                          disabled={togglePending}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            skill.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {skill.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => startEditing(skill)}
                            className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(skill.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add new skill */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Add New Skill</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Milling, Turning, CAD…"
            className="flex-1 max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <button
            onClick={handleAdd}
            disabled={addPending || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {addPending ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            Add Skill
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Skills are sorted by the Order number. New skills are added at the end — edit the order to rearrange.
        </p>
      </div>
    </div>
  )
}
