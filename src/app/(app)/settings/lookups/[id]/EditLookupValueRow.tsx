'use client'

import { useState, useTransition } from 'react'

interface LookupValue {
  id: string
  label: string
  value: string
  sort_order: number
  is_default: boolean
  is_active: boolean
}

interface Props {
  val: LookupValue
  categoryId: string
  updateValue: (valueId: string, label: string, value: string, sortOrder: number) => Promise<void>
  toggleActive: (valueId: string, current: boolean) => Promise<void>
  setDefault: (valueId: string) => Promise<void>
}

export default function EditLookupValueRow({ val, updateValue, toggleActive, setDefault }: Props) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(val.label)
  const [value, setValue] = useState(val.value)
  const [sortOrder, setSortOrder] = useState(val.sort_order)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateValue(val.id, label, value, sortOrder)
      setEditing(false)
    })
  }

  function handleCancel() {
    setLabel(val.label)
    setValue(val.value)
    setSortOrder(val.sort_order)
    setEditing(false)
  }

  if (editing) {
    return (
      <tr className="bg-orange-50">
        <td className="px-6 py-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-orange-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </td>
        <td className="px-6 py-3">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-orange-300 px-2 py-1.5 text-sm font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </td>
        <td className="px-6 py-3">
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-20 rounded-lg border border-orange-300 px-2 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </td>
        <td className="px-6 py-3 text-sm text-slate-400">—</td>
        <td className="px-6 py-3 text-sm text-slate-400">—</td>
        <td className="px-6 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={isPending || !label || !value}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-slate-900">{val.label}</td>
      <td className="px-6 py-4 text-sm font-mono text-slate-600">{val.value}</td>
      <td className="px-6 py-4 text-sm text-slate-600">{val.sort_order}</td>
      <td className="px-6 py-4 text-sm">
        {val.is_default ? (
          <span className="text-green-600 font-medium">✓</span>
        ) : (
          <button
            onClick={() => startTransition(() => setDefault(val.id))}
            disabled={isPending}
            className="text-xs text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
          >
            Set default
          </button>
        )}
      </td>
      <td className="px-6 py-4 text-sm">
        <button
          onClick={() => startTransition(() => toggleActive(val.id, val.is_active))}
          disabled={isPending}
          className="inline-flex cursor-pointer disabled:opacity-50"
        >
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            val.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          } transition-colors`}>
            {val.is_active ? 'Active' : 'Inactive'}
          </span>
        </button>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Edit
        </button>
      </td>
    </tr>
  )
}
