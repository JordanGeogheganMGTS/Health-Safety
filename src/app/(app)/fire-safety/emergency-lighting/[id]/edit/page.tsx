'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  test_date: z.string().min(1, 'Test date is required'),
  test_type: z.enum(['Monthly Functional', 'Annual Duration']),
  notes: z.string().optional(),
  results: z.array(z.object({
    result_id: z.string().uuid(),
    light_id: z.string().uuid(),
    result: z.enum(['Pass', 'Fail', 'N/A']),
    defects: z.string().optional(),
    corrective_action: z.string().optional(),
  })),
})

type FormValues = z.infer<typeof schema>

interface Light { id: string; identifier: string; location: string | null; fitting_type: string | null }
interface ResultRow { id: string; light_id: string; result: 'Pass' | 'Fail' | 'N/A'; defects: string | null; corrective_action: string | null; light: Light | null }

interface PageProps { params: Promise<{ id: string }> }

export default function EditEmergencyLightTestPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [testId, setTestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) })

  const resultsWatched = watch('results') ?? []

  useEffect(() => {
    async function load() {
      const { id } = await params
      setTestId(id)

      const [{ data: test }, { data: results }] = await Promise.all([
        supabase.from('emergency_light_tests').select('*').eq('id', id).single(),
        supabase
          .from('emergency_light_test_results')
          .select('id, light_id, result, defects, corrective_action, light:emergency_lights!light_id(id, identifier, location, fitting_type)')
          .eq('test_id', id)
          .order('created_at'),
      ])

      if (test) {
        reset({
          test_date: test.test_date,
          test_type: test.test_type,
          notes: test.notes ?? '',
          results: ((results ?? []) as unknown as ResultRow[]).map((r) => ({
            result_id: r.id,
            light_id: r.light_id,
            result: r.result,
            defects: r.defects ?? '',
            corrective_action: r.corrective_action ?? '',
          })),
        })
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep lights info for display (not reactive, loaded once)
  const [lights, setLights] = useState<Record<string, Light>>({})
  useEffect(() => {
    if (!testId) return
    supabase
      .from('emergency_light_test_results')
      .select('light_id, light:emergency_lights!light_id(id, identifier, location, fitting_type)')
      .eq('test_id', testId)
      .then(({ data }) => {
        const map: Record<string, Light> = {}
        ;(data ?? []).forEach((r: { light_id: string; light: unknown }) => {
          const l = r.light as Light | null
          if (l) map[r.light_id] = l
        })
        setLights(map)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId])

  async function onSubmit(values: FormValues) {
    if (!testId) return
    setServerError(null)

    const hasFailure = values.results.some((r) => r.result === 'Fail')

    // Update test header
    const { error: testError } = await supabase
      .from('emergency_light_tests')
      .update({
        test_date: values.test_date,
        test_type: values.test_type,
        overall_result: hasFailure ? 'Fail' : 'Pass',
        notes: values.notes || null,
      })
      .eq('id', testId)

    if (testError) { setServerError(testError.message); return }

    // Update each result row
    for (const r of values.results) {
      const { error } = await supabase
        .from('emergency_light_test_results')
        .update({
          result: r.result,
          defects: r.defects || null,
          corrective_action: r.corrective_action || null,
        })
        .eq('id', r.result_id)
      if (error) { setServerError(error.message); return }
    }

    router.push(`/fire-safety/emergency-lighting/${testId}`)
  }

  const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const labelClass = 'block text-sm font-medium text-slate-700'

  if (loading) return <div className="flex items-center justify-center py-16"><p className="text-sm text-slate-500">Loading…</p></div>

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <a href={`/fire-safety/emergency-lighting/${testId}`} className="hover:text-slate-700 hover:underline">Test</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Edit</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Emergency Lighting Test</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {serverError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

        {/* Header */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Test Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label htmlFor="test_date" className={labelClass}>Test Date <span className="text-red-500">*</span></label>
              <input id="test_date" type="date" {...register('test_date')} className={inputClass} />
              {errors.test_date && <p className="text-xs text-red-600">{errors.test_date.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="test_type" className={labelClass}>Test Type <span className="text-red-500">*</span></label>
              <select id="test_type" {...register('test_type')} className={selectClass}>
                <option value="Monthly Functional">Monthly Functional</option>
                <option value="Annual Duration">Annual Duration (3hr)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="notes" className={labelClass}>General Notes</label>
              <input id="notes" type="text" {...register('notes')} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Light Fittings</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {resultsWatched.map((r, i) => {
              const light = lights[r.light_id]
              const isFail = r.result === 'Fail'
              return (
                <div key={r.result_id} className={`px-5 py-4 ${isFail ? 'bg-red-50' : ''}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{light?.identifier ?? '—'}</p>
                      {light?.location && <p className="text-xs text-slate-500">{light.location}</p>}
                      {light?.fitting_type && <p className="text-xs text-slate-400">{light.fitting_type}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(['Pass', 'Fail', 'N/A'] as const).map((val) => (
                        <label key={val} className="cursor-pointer">
                          <input type="radio" {...register(`results.${i}.result`)} value={val} className="sr-only" />
                          <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            r.result === val
                              ? val === 'Pass' ? 'bg-green-500 text-white border-green-500'
                                : val === 'Fail' ? 'bg-red-500 text-white border-red-500'
                                : 'bg-slate-400 text-white border-slate-400'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                          }`}>
                            {val}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {isFail && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-red-700">Defects Found</label>
                        <textarea {...register(`results.${i}.defects`)} rows={2} className="block w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400" placeholder="Describe the defect…" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">Corrective Action</label>
                        <textarea {...register(`results.${i}.corrective_action`)} rows={2} className={inputClass} placeholder="Action taken or scheduled…" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <div className="px-5 py-3 bg-slate-50 flex items-center gap-4 text-xs text-slate-600">
              <span className="text-green-700 font-semibold">{resultsWatched.filter((r) => r.result === 'Pass').length} Pass</span>
              <span className="text-red-700 font-semibold">{resultsWatched.filter((r) => r.result === 'Fail').length} Fail</span>
              <span className="text-slate-500">{resultsWatched.filter((r) => r.result === 'N/A').length} N/A</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60">
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
