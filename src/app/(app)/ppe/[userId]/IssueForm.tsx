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
  sizeOptions: Record<string, { id: string; label: string }[]>
  sizeLabels: Record<string, string>
  action: (formData: FormData) => Promise<{ error?: string } | void>
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function IssueForm({ userId, items, sizeOptions, sizeLabels, action }: IssueFormProps) {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = items.find((i) => i.id === selectedItemId)
  const sizeCategoryKey = selectedItem?.has_sizes ? selectedItem.size_category_key : null
  const sizeChoices = sizeCategoryKey ? (sizeOptions[sizeCategoryKey] ?? []) : []
  const sizeLabel = sizeCategoryKey ? (sizeLabels[sizeCategoryKey] ?? 'Size') : 'Size'

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    setError(null)
    const result = await action(formData)
    if (result && 'error' in result && result.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectCls = `${inputCls} bg-white`

  return (
    <form action={handleSubmit} className="p-6 space-y-4">
      <input type="hidden" name="user_id" value={userId} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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

        {sizeCategoryKey && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {sizeLabel}
            </label>
            {sizeChoices.length > 0 ? (
              <select name="size_value_id" className={selectCls}>
                <option value="">Select size…</option>
                {sizeChoices.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                No sizes configured for this item. Add them in Lookup Management.
              </p>
            )}
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
          Replacement interval: every {selectedItem.replacement_months} month{selectedItem.replacement_months !== 1 ? 's' : ''}
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
