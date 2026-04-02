'use client'

import { useState } from 'react'

interface PpeItem {
  id: string
  name: string
  has_sizes: boolean
  size_category_key: string | null
  replacement_months: number | null
  is_active: boolean
}

interface IssueFormProps {
  userId: string
  items: PpeItem[]
  action: (formData: FormData) => Promise<void>
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function IssueForm({ userId, items, action }: IssueFormProps) {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedItem = items.find((i) => i.id === selectedItemId)
  const showSizeField = selectedItem?.has_sizes === true

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    await action(formData)
    setSubmitting(false)
    setSelectedItemId('')
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectCls = `${inputCls} bg-white`

  return (
    <form action={handleSubmit} className="p-6 space-y-4">
      <input type="hidden" name="user_id" value={userId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            PPE Item <span className="text-red-500">*</span>
          </label>
          <select
            name="ppe_item_id"
            required
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className={selectCls}
          >
            <option value="">Select PPE item…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        {showSizeField && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Size
              {selectedItem?.size_category_key && (
                <span className="ml-1 text-xs text-slate-400 font-normal">({selectedItem.size_category_key})</span>
              )}
            </label>
            <input
              name="size_value"
              type="text"
              className={inputCls}
              placeholder="e.g. M, L, 9, 10"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date Issued <span className="text-red-500">*</span>
          </label>
          <input
            name="date_issued"
            type="date"
            defaultValue={todayISO()}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Condition <span className="text-red-500">*</span>
          </label>
          <select name="condition" required className={selectCls}>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
            <option value="Replaced">Replaced</option>
          </select>
        </div>
      </div>

      {selectedItem?.replacement_months && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          Recommended replacement interval: {selectedItem.replacement_months} month{selectedItem.replacement_months !== 1 ? 's' : ''}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className={`${inputCls} resize-none`}
          placeholder="Optional notes…"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting || !selectedItemId}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Issuing…' : 'Issue PPE'}
        </button>
      </div>
    </form>
  )
}
