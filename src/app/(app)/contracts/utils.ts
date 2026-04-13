export type ContractStatus = 'Active' | 'Expiring Soon' | 'Expired'

export function computeContractStatus(
  renewalDate: string | null,
  noticePeriodDays: number
): ContractStatus {
  if (!renewalDate) return 'Active'

  const today = new Date().toISOString().split('T')[0]
  if (renewalDate < today) return 'Expired'

  // Notice cutoff = renewal_date minus notice_period_days
  const d = new Date(renewalDate + 'T12:00:00')
  d.setDate(d.getDate() - noticePeriodDays)
  const noticeCutoff = d.toISOString().split('T')[0]

  if (noticeCutoff <= today) return 'Expiring Soon'
  return 'Active'
}
