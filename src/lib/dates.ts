import { addMonths, isAfter, isBefore, differenceInDays, format } from 'date-fns'

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  return isBefore(d, new Date())
}

export function isDueWithin(date: Date | string | null | undefined, days: number): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  const threshold = addMonths(new Date(), 0) // now
  const future = new Date()
  future.setDate(future.getDate() + days)
  return isAfter(d, threshold) && isBefore(d, future)
}

export function addMonthsToDate(date: Date | string, months: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return addMonths(d, months)
}

export function daysOverdue(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.max(0, differenceInDays(new Date(), d))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy HH:mm')
}
