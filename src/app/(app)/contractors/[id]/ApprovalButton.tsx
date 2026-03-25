'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  contractorId: string
  isApproved: boolean
  userId: string
}

export default function ContractorApprovalButton({ contractorId, isApproved, userId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()

    const updates = isApproved
      ? { is_approved: false, approved_by: null, approved_at: null }
      : { is_approved: true, approved_by: userId, approved_at: new Date().toISOString() }

    await supabase.from('contractors').update(updates).eq('id', contractorId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        isApproved
          ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
          : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
      }`}
    >
      {loading ? '…' : isApproved ? 'Unapprove' : 'Approve'}
    </button>
  )
}
