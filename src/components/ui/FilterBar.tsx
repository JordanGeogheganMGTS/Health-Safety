'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  param: string
  label: string
  options: FilterOption[]
  /** Allow multiple selections. Defaults to true. */
  multi?: boolean
}

// ─── Single dropdown ──────────────────────────────────────────────────────────

function FilterDropdown({
  config,
  values,
  onChange,
}: {
  config: FilterConfig
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMulti = config.multi !== false

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isActive = values.length > 0
  let buttonLabel: string
  if (!isActive) {
    buttonLabel = config.label
  } else if (values.length === 1) {
    buttonLabel = config.options.find((o) => o.value === values[0])?.label ?? values[0]
  } else {
    buttonLabel = `${config.label} (${values.length})`
  }

  function toggle(value: string) {
    if (!isMulti) {
      onChange(values[0] === value ? [] : [value])
      setOpen(false)
    } else if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
          isActive
            ? 'border-orange-300 bg-orange-50 text-orange-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {isActive && (
          <span
            role="button"
            onClick={clear}
            className="rounded-full p-0.5 hover:bg-orange-200 transition-colors"
            aria-label={`Clear ${config.label}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </span>
        )}
        <span>{buttonLabel}</span>
        <svg
          className={`h-4 w-4 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[190px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {config.options.map((option) => {
            const checked = values.includes(option.value)
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={config.param}
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="h-3.5 w-3.5 accent-orange-500"
                />
                {option.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

export default function FilterBar({ filters }: { filters: FilterConfig[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function getValues(param: string): string[] {
    const val = searchParams.get(param)
    return val ? val.split(',').filter(Boolean) : []
  }

  function handleChange(param: string, values: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    if (values.length === 0) {
      params.delete(param)
    } else {
      params.set(param, values.join(','))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const hasAny = filters.some((f) => getValues(f.param).length > 0)

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    filters.forEach((f) => params.delete(f.param))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <FilterDropdown
          key={f.param}
          config={f}
          values={getValues(f.param)}
          onChange={(values) => handleChange(f.param, values)}
        />
      ))}
      {hasAny && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
