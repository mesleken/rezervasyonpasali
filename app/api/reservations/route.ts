import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/reservations?categorySlug=bungalov&year=2026&month=8
// Belirli ay ve kategorideki tüm aktif/pending rezervasyonları döner
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categorySlug = searchParams.get('categorySlug')
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const search = searchParams.get('search')

  let query = supabase
    .from('reservations')
    .select(`
      *,
      unit:units(
        id, unit_number, label,
        category:categories(id, slug, label, icon)
      )
    `)
    .neq('status', 'cancelled')
    .order('check_in', { ascending: true })

  if (categorySlug) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (cat) {
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .eq('category_id', cat.id)
        .eq('is_active', true)
      
      const unitIds = (units || []).map((u: { id: number }) => u.id)
      if (unitIds.length > 0) {
        query = query.in('unit_id', unitIds)
      } else {
        return NextResponse.json({ data: [] })
      }
    }
  }

  if (year && month) {
    const m = month.padStart(2, '0')
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate()
    const monthStart = `${year}-${m}-01`
    const monthEnd = `${year}-${m}-${String(daysInMonth).padStart(2, '0')}`
    query = query.lte('check_in', monthEnd).gte('check_out', monthStart)
  }

  if (search) {
    query = query.or(`guest_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/reservations — Yeni rezervasyon oluştur
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { unit_id, guest_name, phone, notes, status, check_in, check_out, price_type, price, deposit } = body

  // Zorunlu alan kontrolü
  if (!unit_id || !guest_name?.trim() || !check_in || !check_out) {
    return NextResponse.json(
      { error: 'unit_id, guest_name, check_in ve check_out alanları zorunludur.' },
      { status: 400 }
    )
  }

  if (check_out <= check_in) {
    return NextResponse.json(
      { error: 'Çıkış tarihi giriş tarihinden sonra olmalıdır.' },
      { status: 400 }
    )
  }

  // Yazılım seviyesinde çakışma kontrolü (GIST kısıtlaması DB seviyesinde de var)
  const { data: overlap } = await supabase
    .from('reservations')
    .select('id, guest_name, check_in, check_out')
    .eq('unit_id', unit_id)
    .in('status', ['active', 'pending'])
    .lt('check_in', check_out)
    .gt('check_out', check_in)

  if (overlap && overlap.length > 0) {
    const existing = overlap[0] as { guest_name: string; check_in: string; check_out: string }
    return NextResponse.json(
      {
        error: `ÇAKIŞMA: Bu birim "${existing.guest_name}" adına ${existing.check_in} – ${existing.check_out} tarihleri arasında zaten rezerve.`
      },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      unit_id,
      guest_name: guest_name.trim(),
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      status: status || 'active',
      check_in,
      check_out,
      price_type: price_type || 'daily',
      price: Number(price) || 0,
      deposit: Number(deposit) || 0,
    })
    .select()
    .single()

  if (error) {
    // GIST çakışma hatası
    if (error.code === '23P01') {
      return NextResponse.json({ error: 'Bu tarihler arasında çakışan bir rezervasyon mevcut.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
