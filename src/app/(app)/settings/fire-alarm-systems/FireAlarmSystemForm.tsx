'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Site {
  id: string
  name: string
}

interface DefaultValues {
  site_id?: string
  panel_location?: string
  manufacturer?: string
  model?: string
  serial_number?: string
  installation_date?: string
  last_service_date?: string
  next_service_date?: string
  notes?: string
}

interface Props {
  sites: Site[]
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  defaultValues?: DefaultValues
}

const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1'

export default function FireAlarmSystemForm({ sites, action, submitLabel, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData)
    })
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Site <span className="text-red-500">*</span></label>
          <select
            name="site_id"
            required
            defaultValue={defaultValues?.site_id ?? ''}
            className={inputClass}
          >
            <option value="">Select site…</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Panel Location</label>
          <input
            type="text"
            name="panel_location"
            defaultValue={defaultValues?.panel_location ?? ''}
            className={inputClass}
            placeholder="e.g. Main Reception, Zone A"
          />
          <p className="mt-1 text-xs text-slate-400">This is the name shown in the alarm test dropdown.</p>
        </div>

        <div>
          <label className={labelClass}>Manufacturer</label>
          <input
            type="text"
            name="manufacturer"
            defaultValue={defaultValues?.manufacturer ?? ''}
            className={inputClass}
            placeholder="e.g. Hochiki, Advanced"
          />
        </div>

        <div>
          <label className={labelClass}>Model</label>
          <input
            type="text"
            name="model"
            defaultValue={defaultValues?.model ?? ''}
            className={inputClass}
            placeholder="e.g. ESP Series"
          />
        </div>

        <div>
          <label className={labelClass}>Serial Number</label>
          <input
            type="text"
            name="serial_number"
            defaultValue={defaultValues?.serial_number ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Installation Date</label>
          <input
            type="date"
            name="installation_date"
            defaultValue={defaultValues?.installation_date ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Last Service Date</label>
          <input
            type="date"
            name="last_service_date"
            defaultValue={defaultValues?.last_service_date ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Next Service Date</label>
          <input
            type="date"
            name="next_service_date"
            defaultValue={defaultValues?.next_service_date ?? ''}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={defaultValues?.notes ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
