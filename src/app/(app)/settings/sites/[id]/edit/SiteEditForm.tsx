'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Site {
  id: string
  name: string
  address: string | null
  postcode: string | null
  is_active: boolean
}

export default function SiteEditForm({ site }: { site: Site }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const postcode = formData.get('postcode') as string
    const is_active = formData.get('is_active') === 'true'

    try {
      const res = await fetch(`/api/settings/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address: address || null,
          postcode: postcode || null,
          is_active,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update site')
        return
      }

      router.push('/settings/sites')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
            Site Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={site.name}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            defaultValue={site.address ?? ''}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-slate-700 mb-1">
            Postcode
          </label>
          <input
            type="text"
            id="postcode"
            name="postcode"
            defaultValue={site.postcode ?? ''}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <div>
          <label htmlFor="is_active" className="block text-sm font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            id="is_active"
            name="is_active"
            defaultValue={site.is_active ? 'true' : 'false'}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/settings/sites"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
