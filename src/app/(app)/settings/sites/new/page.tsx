'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewSitePage() {
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

    try {
      const res = await fetch('/api/settings/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          address: address || null,
          postcode: postcode || null,
          is_active: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create site')
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Settings
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/settings/sites" className="text-sm text-slate-500 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">New Site</span>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add New Site</h1>
        <p className="mt-1 text-sm text-slate-500">Create a new MGTS site location.</p>
      </div>

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
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. London HQ"
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
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 123 High Street, London"
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
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. EC1A 1BB"
            />
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating…' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
