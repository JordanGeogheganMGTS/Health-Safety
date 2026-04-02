'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Company name is required'),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  type_id: z.string().optional(),
  is_active: z.boolean(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface LookupValue {
  id: string
  label: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditContractorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [contractorTypes, setContractorTypes] = useState<LookupValue[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase
        .from('contractors')
        .select('name, contact_name, contact_email, contact_phone, address, type_id, is_active, notes')
        .eq('id', id)
        .single(),
      supabase
        .from('lookup_values')
        .select('id, label, sort_order, lookup_categories!inner(key)')
        .eq('lookup_categories.key', 'contractor_type')
        .eq('is_active', true)
        .order('sort_order'),
    ]).then(([{ data: contractor }, { data: types }]) => {
      if (contractor) {
        reset({
          name: contractor.name,
          contact_name: contractor.contact_name ?? '',
          contact_email: contractor.contact_email ?? '',
          contact_phone: contractor.contact_phone ?? '',
          address: contractor.address ?? '',
          type_id: contractor.type_id ?? '',
          is_active: contractor.is_active,
          notes: contractor.notes ?? '',
        })
      }
      setContractorTypes((types ?? []) as unknown as LookupValue[])
      setLoading(false)
    })
  }, [id, reset])

  async function onSubmit(data: FormData) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase
      .from('contractors')
      .update({
        name: data.name,
        contact_name: data.contact_name || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        address: data.address || null,
        type_id: data.type_id || null,
        is_active: data.is_active,
        notes: data.notes || null,
      })
      .eq('id', id)

    if (error) {
      setServerError(error.message)
      return
    }

    router.push(`/contractors/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/contractors/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Contractor
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Edit Contractor</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {/* Company Info */}
        <div className="px-6 py-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Company Details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contractor Type</label>
            <select
              {...register('type_id')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">Select type…</option>
              {contractorTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              {...register('is_active')}
              type="checkbox"
              id="is_active"
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
          </div>
        </div>

        {/* Contact Info */}
        <div className="px-6 py-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Contact Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
              <input
                {...register('contact_name')}
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                {...register('contact_phone')}
                type="tel"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...register('contact_email')}
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            {errors.contact_email && (
              <p className="mt-1 text-xs text-red-600">{errors.contact_email.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="px-6 py-5">
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-between bg-slate-50 rounded-b-xl">
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <div className="ml-auto flex gap-3">
            <Link
              href={`/contractors/${id}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
