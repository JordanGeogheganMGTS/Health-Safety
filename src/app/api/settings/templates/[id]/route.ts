import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, description, site_id, is_active, items } = body

  // Update template header
  const { error: templateError } = await supabase
    .from('inspection_templates')
    .update({ name, description, site_id, is_active })
    .eq('id', id)

  if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 })

  // Replace items: delete then re-insert
  const { error: deleteError } = await supabase
    .from('inspection_template_items')
    .delete()
    .eq('template_id', id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  if (items && items.length > 0) {
    const { error: insertError } = await supabase
      .from('inspection_template_items')
      .insert(
        items.map((item: Record<string, unknown>) => ({ ...item, template_id: id }))
      )

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
