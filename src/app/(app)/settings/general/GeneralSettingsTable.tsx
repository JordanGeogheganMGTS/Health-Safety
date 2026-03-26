'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/dates'

interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string | null
}

interface Props {
  settings: Setting[]
  updateSetting: (key: string, value: string) => Promise<void>
}

export default function GeneralSettingsTable({ settings, updateSetting }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(setting: Setting) {
    setEditingKey(setting.key)
    setEditValue(setting.value ?? '')
  }

  function cancelEdit() {
    setEditingKey(null)
    setEditValue('')
  }

  async function handleSave(key: string) {
    setSaving(true)
    try {
      await updateSetting(key, editValue)
      setEditingKey(null)
      setEditValue('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-56">Setting</th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Current Value</th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Last Updated</th>
          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {settings.map((setting) => (
          <tr key={setting.key} className="hover:bg-slate-50 transition-colors">
            <td className="px-6 py-4 text-sm font-mono font-medium text-slate-700">{setting.key}</td>
            <td className="px-6 py-4 text-sm text-slate-900">
              {editingKey === setting.key ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="block w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave(setting.key)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                  />
                  <button
                    onClick={() => handleSave(setting.key)}
                    disabled={saving}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="font-medium">{setting.value ?? '—'}</span>
              )}
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">{setting.description ?? '—'}</td>
            <td className="px-6 py-4 text-sm text-slate-500">{formatDate(setting.updated_at)}</td>
            <td className="px-6 py-4 text-right">
              {editingKey !== setting.key && (
                <button
                  onClick={() => startEdit(setting)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
