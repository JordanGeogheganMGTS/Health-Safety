'use client'

import { useRef, useTransition } from 'react'

interface Props {
  addValue: (formData: FormData) => Promise<void>
}

export default function AddLookupValueForm({ addValue }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addValue(formData)
      formRef.current?.reset()
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Add New Value</h3>
      <form ref={formRef} action={handleSubmit}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-36">
            <label htmlFor="label" className="block text-xs font-medium text-slate-600 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="label"
              name="label"
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Display label"
            />
          </div>
          <div className="flex-1 min-w-36">
            <label htmlFor="value" className="block text-xs font-medium text-slate-600 mb-1">
              Value <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="value"
              name="value"
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Internal value"
            />
          </div>
          <div className="w-28">
            <label htmlFor="sort_order" className="block text-xs font-medium text-slate-600 mb-1">
              Sort Order
            </label>
            <input
              type="number"
              id="sort_order"
              name="sort_order"
              defaultValue={0}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isPending ? 'Adding…' : '+ Add Value'}
          </button>
        </div>
      </form>
    </div>
  )
}
