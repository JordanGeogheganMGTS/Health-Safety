import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

type SettingValue = string | number | boolean

export const getSettings = cache(async (): Promise<Record<string, SettingValue>> => {
  const supabase = await createClient()
  const { data } = await supabase.from('system_settings').select('key, value, data_type')

  if (!data) return {}

  return Object.fromEntries(
    data.map((row) => {
      let value: SettingValue = row.value
      if (row.data_type === 'integer') value = parseInt(row.value, 10)
      if (row.data_type === 'boolean') value = row.value === 'true'
      return [row.key, value]
    })
  )
})

export async function getSetting(key: string): Promise<SettingValue> {
  const settings = await getSettings()
  return settings[key]
}
