import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// Verilen tarih aralığında MÜSAİT olan tüm birimleri döner
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')

  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: 'checkIn ve checkOut parametreleri zorunludur.' }, { status: 400 })
  }

  if (checkOut <= checkIn) {
    return NextResponse.json({ error: 'Çıkış tarihi giriş tarihinden sonra olmalıdır.' }, { status: 400 })
  }

  // Bu tarihlerde DOLU olan birim ID'lerini bul (Aktif, Kapora Bekleyen veya Ödemesi Tamamlanmış)
  const { data: busyReservations } = await supabase
    .from('reservations')
    .select('unit_id')
    .in('status', ['active', 'pending', 'completed'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  const busyUnitIds = (busyReservations || []).map((r: { unit_id: number }) => r.unit_id)

  // Dolu olmayan tüm aktif birimleri getir
  let unitsQuery = supabase
    .from('units')
    .select(`
      id, unit_number, label, is_active,
      category:categories(id, slug, label, icon, sort_order)
    `)
    .eq('is_active', true)
    .order('category_id')
    .order('unit_number')

  if (busyUnitIds.length > 0) {
    unitsQuery = unitsQuery.not('id', 'in', `(${busyUnitIds.join(',')})`)
  }

  const { data: availableUnits, error } = await unitsQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: availableUnits,
    checkIn,
    checkOut,
    totalAvailable: availableUnits?.length || 0,
    totalUnits: 36
  })
}
