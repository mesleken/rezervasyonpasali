import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/units — Tüm birimleri kategorileriyle birlikte getirir
export async function GET() {
  const { data, error } = await supabase
    .from('units')
    .select(`
      id, unit_number, label, is_active, category_id,
      category:categories(id, slug, label, icon, sort_order)
    `)
    .eq('is_active', true)
    .order('category_id')
    .order('unit_number')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
