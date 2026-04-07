import Link from 'next/link'

interface Props {
  column: string
  label: string
  sort: string
  dir: string
  params: Record<string, string>
}

export default function SortLink({ column, label, sort, dir, params }: Props) {
  const isActive = sort === column
  const newDir = isActive && dir === 'asc' ? 'desc' : 'asc'
  const newParams = new URLSearchParams({ ...params, sort: column, dir: newDir })

  return (
    <Link
      href={`?${newParams}`}
      className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors select-none"
    >
      {label}
      <span className={`text-xs ${isActive ? 'text-orange-500' : 'text-slate-300'}`}>
        {isActive ? (dir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </Link>
  )
}
