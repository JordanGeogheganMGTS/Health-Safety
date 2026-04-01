'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TemplateItem {
  id?: string
  item_text: string
  response_type: string
  is_mandatory: boolean
  guidance: string
  sort_order: number
}

interface Template {
  id: string
  name: string
  description: string | null
  site_id: string | null
  is_active: boolean
}

interface Site {
  id: string
  name: string
}

interface Props {
  template: Template
  items: TemplateItem[]
  sites: Site[]
}

const RESPONSE_TYPES = [
  { value: 'pass_fail', label: 'Pass / Fail' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'score_1_5', label: 'Score 1–5' },
  { value: 'text', label: 'Text' },
]

export default function TemplateEditForm({ template, items: initialItems, sites }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<TemplateItem[]>(
    initialItems.length > 0
      ? initialItems.map((i) => ({ ...i, guidance: i.guidance ?? '' }))
      : []
  )

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        item_text: '',
        response_type: 'pass_fail',
        is_mandatory: true,
        guidance: '',
        sort_order: prev.length + 1,
      },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof TemplateItem, value: string | boolean | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const site_id = formData.get('site_id') as string
    const is_active = formData.get('is_active') === 'true'

    try {
      const res = await fetch(`/api/settings/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          site_id: site_id || null,
          is_active,
          items: items.map((item, idx) => ({
            item_text: item.item_text,
            response_type: item.response_type,
            is_mandatory: item.is_mandatory,
            guidance: item.guidance || null,
            sort_order: idx + 1,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save template')
        return
      }

      router.push('/settings/templates')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Template Details</h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={template.name}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <label htmlFor="site_id" className="block text-sm font-medium text-slate-700 mb-1">Site</label>
            <select
              id="site_id"
              name="site_id"
              defaultValue={template.site_id ?? ''}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={template.description ?? ''}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>

          <div>
            <label htmlFor="is_active" className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              id="is_active"
              name="is_active"
              defaultValue={template.is_active ? 'true' : 'false'}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Checklist Items
            <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {items.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No items yet. Click &ldquo;Add Item&rdquo; to start building your checklist.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Item Text <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={item.item_text}
                        onChange={(e) => updateItem(idx, 'item_text', e.target.value)}
                        required
                        rows={2}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                        placeholder="Describe what the inspector should check…"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Response Type</label>
                        <select
                          value={item.response_type}
                          onChange={(e) => updateItem(idx, 'response_type', e.target.value)}
                          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          {RESPONSE_TYPES.map((rt) => (
                            <option key={rt.value} value={rt.value}>{rt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
                        <input
                          type="number"
                          value={item.sort_order}
                          onChange={(e) => updateItem(idx, 'sort_order', parseInt(e.target.value) || 0)}
                          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_mandatory}
                            onChange={(e) => updateItem(idx, 'is_mandatory', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-slate-700">Mandatory</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Guidance (optional)</label>
                      <input
                        type="text"
                        value={item.guidance}
                        onChange={(e) => updateItem(idx, 'guidance', e.target.value)}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="Optional guidance note for inspector"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="mt-1 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Remove item"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Link
          href="/settings/templates"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving…' : 'Save Template'}
        </button>
      </div>
    </form>
  )
}
