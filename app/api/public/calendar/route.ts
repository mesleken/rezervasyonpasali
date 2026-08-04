import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getMonthDateRange } from '@/lib/dateUtils'

// GET /api/public/calendar?categorySlug=bungalov&year=2026&month=8
// Kamusal Müşteri Takvimi için Güvenli (Zero PII) Endpoint
// Müşteri adı, telefon, fiyat KESİNLİKLE DÖNMEZ! Sadece unit_number, check_in, check_out, status döner.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorySlug = searchParams.get('categorySlug')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!categorySlug || !year || !month) {
      return NextResponse.json({ error: 'categorySlug, year ve month parametreleri zorunludur.' }, { status: 400 })
    }

    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (!cat) return NextResponse.json({ data: [] })

    const { data: units } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('category_id', cat.id)

    const unitMap = new Map((units || []).map(u => [u.id, u.unit_number]))
    const unitIds = Array.from(unitMap.keys())

    if (unitIds.length === 0) return NextResponse.json({ data: [] })

    const { monthStart, monthEnd } = getMonthDateRange(year, month)

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, unit_id, check_in, check_out, status')
      .in('unit_id', unitIds)
      .neq('status', 'cancelled')
      .lte('check_in', monthEnd)
      .gte('check_out', monthStart)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // PII içermeyen güvenli yanıt oluştur
    const safeData = (reservations || []).map(r => ({
      id: r.id,
      unit_id: r.unit_id,
      unit_number: unitMap.get(r.unit_id) || 1,
      check_in: r.check_in,
      check_out: r.check_out,
      status: r.status === 'maintenance' ? 'maintenance' : 'active' // Sadece active veya maintenance görünür
    }))

    return NextResponse.json({ data: safeData })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sunucu hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
