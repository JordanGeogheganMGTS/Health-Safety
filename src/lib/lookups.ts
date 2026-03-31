import { createClient } from '@/lib/supabase/server'

export interface LookupValue {
  id: string
  value: string
  label: string
  sort_order: number
  is_default: boolean
}

export async function getLookupValues(categoryKey: string): Promise<LookupValue[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lookup_values')
    .select('id, value, label, sort_order, is_default, lookup_categories!inner(key)')
    .eq('lookup_categories.key', categoryKey)
    .eq('is_active', true)
    .order('sort_order')

  return (data ?? []) as unknown as LookupValue[]
}

export async function getLookupValueById(id: string): Promise<LookupValue | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lookup_values')
    .select('id, value, label, sort_order, is_default')
    .eq('id', id)
    .single()

  return data as LookupValue | null
}
