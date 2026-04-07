'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

// ─── Schema ───────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0]

const schema = z.object({
  site_id: z.string().uuid('Please select a site'),
  test_date: z.string().min(1, 'Test date is required'),
  test_type: z.enum(['Monthly Functional', 'Annual Duration']),
  notes: z.string().optional(),
  results: z.array(z.object({
    light_id: z.string().uuid(),
    result: z.enum(['Pass', 'Fail', 'N/A']),
    defects: z.string().optional(),
    corrective_action: z.string().optional(),
  })),
})

type FormValues = z.infer<typeof schema>

interface Site { id: string; name: string }
interface Light { id: string; identifier: string; location: string | null; fitting_type: string | null }

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewEmergencyLightTestPage() {
  const router = useRouter()
  const supabase = createClient()

  const [sites, setSites] = useState<Site[]>([])
  const [lights, setLights] = useState<Light[]>([])
  const [loadingLights, setLoadingLights] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { test_date: today, test_type: 'Monthly Functional', results: [] },
    })

  const siteIdWatched = useWatch({ control, name: 'site_id' })
  const resultsWatched = watch('results')

  // Load sites on mount
  useEffect(() => {
    supabase.from('sites').select('id, name').order('name').then(({ data }) => setSites(data ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When site changes, load its active lights
  useEffect(() => {
    if (!siteIdWatched) { setLights([]); setValue('results', []); return }
    setLoadingLights(true)
    supabase
      .from('emergency_lights')
      .select('id, identifier, location, fitting_type')
      .eq('site_id', siteIdWatched)
      .eq('is_active', true)
      .order('identifier')
      .then(({ data }) => {
        const ls = (data ?? []) as Light[]
        setLights(ls)
        setValue('results', ls.map((l) => ({ light_id: l.id, result: 'Pass', defects: '', corrective_action: '' })))
        setLoadingLights(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteIdWatched])

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setServerError('You must be logged in.'); return }

    const hasFailure = values.results.some((r) => r.result === 'Fail')

    // Insert test session
    const { data: testData, error: testError } = await supabase
      .from('emergency_light_tests')
      .insert({
        site_id: values.site_id,
        test_date: values.test_date,
        test_type: values.test_type,
        tested_by: user.id,
        overall_result: hasFailure ? 'Fail' : 'Pass',
        notes: values.notes || null,
      })
      .select('id')
      .single()

    if (testError || !testData) { setServerError(testError?.message ?? 'Failed to create test.'); return }

    // Insert results
    const { error: resultsError } = await supabase
      .from('emergency_light_test_results')
      .insert(
        values.results.map((r) => ({
          test_id: testData.id,
          light_id: r.light_id,
          result: r.result,
          defects: r.defects || null,
          corrective_action: r.corrective_action || null,
        }))
      )

    if (resultsError) { setServerError(resultsError.message); return }

    router.push(`/fire-safety/emergency-lighting/${testData.id}`)
  }

  const inputClass = 'block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500'
  const selectClass = 'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50'
  const labelClass = 'block text-sm font-medium text-slate-700'
  const errorClass = 'text-xs text-red-600'

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/fire-safety" className="hover:text-slate-700 hover:underline">Fire Safety</a>
          <span>/</span>
          <span className="font-medium text-slate-800">Log Emergency Lighting Test</span>
        </nav>
        <h1 className="text-2xl font-semibold text-slate-900">Log Emergency Lighting Test</h1>
        <p className="mt-1 text-sm text-slate-500">Select a site to load its registered emergency lights, then record the result for each unit.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {serverError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>}

        {/* Test header */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Test Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label htmlFor="site_id" className={labelClass}>Site <span className="text-red-500">*</span></label>
              <select id="site_id" {...register('site_id')} className={selectClass}>
                <option value="">Select a site…</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.site_id && <p className={errorClass}>{errors.site_id.message}</p>}
            </div>
            <div className="space-y-1">
              <label htmlFor="test_date" className={labelClass}>Test Date <span className="text-red-500">*</span></label>
              <input id="test_date" type="date" {...register('test_date')} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label htmlFor="test_type" className={labelClass}>Test Type <span className="text-red-500">*</span></label>
              <select id="test_type" {...register('test_type')} className={selectClass}>
                <option value="Monthly Functional">Monthly Functional</option>
                <option value="Annual Duration">Annual Duration (3hr)</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label htmlFor="notes" className={labelClass}>General Notes</label>
              <input id="notes" type="text" {...register('notes')} className={inputClass} placeholder="Optional overall notes…" />
            </div>
          </div>
        </div>

        {/* Light results */}
        {siteIdWatched && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Light Fittings</h2>
              {!loadingLights && lights.length > 0 && (
                <p className="text-xs text-slate-400">{lights.length} unit{lights.length !== 1 ? 's' : ''} registered for this site</p>
              )}
            </div>

            {loadingLights ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading lights…</div>
            ) : lights.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-500">No active emergency lights registered for this site.</p>
                <p className="mt-1 text-xs text-slate-400">
                  <a href="/settings/emergency-lights/new" className="text-orange-600 hover:underline">Add lights in Settings</a> before logging a test.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lights.map((light, i) => {
                  const resultVal = resultsWatched[i]?.result
                  const isFail = resultVal === 'Fail'
                  return (
                    <div key={light.id} className={`px-5 py-4 ${isFail ? 'bg-red-50' : ''}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        {/* Light info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{light.identifier}</p>
                          {light.location && <p className="text-xs text-slate-500">{light.location}</p>}
                          {light.fitting_type && <p className="text-xs text-slate-400">{light.fitting_type}</p>}
                        </div>

                        {/* Result buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {(['Pass', 'Fail', 'N/A'] as const).map((val) => (
                            <label key={val} className="cursor-pointer">
                              <input type="radio" {...register(`results.${i}.result`)} value={val} className="sr-only" />
                              <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                                resultsWatched[i]?.result === val
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

                      {/* Defects & corrective action — shown on Fail */}
                      {isFail && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-red-700">Defects Found</label>
                            <textarea
                              {...register(`results.${i}.defects`)}
                              rows={2}
                              className="block w-full rounded-lg border border-red-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                              placeholder="Describe the defect…"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-600">Corrective Action</label>
                            <textarea
                              {...register(`results.${i}.corrective_action`)}
                              rows={2}
                              className={inputClass}
                              placeholder="Action taken or scheduled…"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Summary bar */}
                <div className="px-5 py-3 bg-slate-50 flex items-center gap-4 text-xs text-slate-600">
                  <span className="text-green-700 font-semibold">{resultsWatched.filter((r) => r.result === 'Pass').length} Pass</span>
                  <span className="text-red-700 font-semibold">{resultsWatched.filter((r) => r.result === 'Fail').length} Fail</span>
                  <span className="text-slate-500">{resultsWatched.filter((r) => r.result === 'N/A').length} N/A</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting || lights.length === 0}
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Submit Test'}
          </button>
        </div>
      </form>
    </div>
  )
}
