import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/tracking — Günlük Operasyon & Takip Verisi
export async function GET(req: NextRequest) {
  try {
    const todayStr = new Date().toISOString().split('T')[0]

    // 1. Tüm Birimleri Getir (Veritabanında cleaning_status kolonu olup olmamasına karşı esnek sorgu)
    let unitsData: any[] = []
    const firstTry = await supabase
      .from('units')
      .select(`
        id, unit_number, label, is_active, cleaning_status,
        category:categories(id, slug, label, icon)
      `)
      .order('category_id')
      .order('unit_number')

    if (firstTry.error) {
      // Eğer cleaning_status kolonu veritabanında henüz yoksa, o kolon olmadan sorgula
      const secondTry = await supabase
        .from('units')
        .select(`
          id, unit_number, label, is_active,
          category:categories(id, slug, label, icon)
        `)
        .order('category_id')
        .order('unit_number')

      if (secondTry.error) {
        return NextResponse.json({ error: secondTry.error.message }, { status: 500 })
      }
      unitsData = secondTry.data || []
    } else {
      unitsData = firstTry.data || []
    }

    // 2. Bugün Giriş Yapanlar (check_in === todayStr)
    const { data: todayCheckIns } = await supabase
      .from('reservations')
      .select(`
        *,
        unit:units(
          id, unit_number, label,
          category:categories(id, slug, label, icon)
        )
      `)
      .neq('status', 'cancelled')
      .eq('check_in', todayStr)

    // 3. Bugün Çıkış Yapanlar (check_out === todayStr)
    const { data: todayCheckOuts } = await supabase
      .from('reservations')
      .select(`
        *,
        unit:units(
          id, unit_number, label,
          category:categories(id, slug, label, icon)
        )
      `)
      .neq('status', 'cancelled')
      .eq('check_out', todayStr)

    // 4. Şu An Konaklayanlar (check_in <= todayStr && check_out > todayStr)
    const { data: currentlyInHouse } = await supabase
      .from('reservations')
      .select('*')
      .neq('status', 'cancelled')
      .neq('status', 'maintenance')
      .lte('check_in', todayStr)
      .gt('check_out', todayStr)

    // Toplam Misafir Sayısı Hesaplama (guest_count yoksa varsayılan 2 kişi)
    const totalGuests = (currentlyInHouse || []).reduce((sum, r) => {
      const count = Number((r as { guest_count?: number }).guest_count) || 2
      return sum + count
    }, 0)

    // Back-to-Back (Aynı gün çıkıp yeni giriş yapılan) Birim ID'leri
    const checkOutUnitIds = new Set((todayCheckOuts || []).map(r => r.unit_id))
    const checkInUnitIds = new Set((todayCheckIns || []).map(r => r.unit_id))
    
    const turnoverUnitIds = Array.from(checkOutUnitIds).filter(id => checkInUnitIds.has(id))

    return NextResponse.json({
      todayDate: todayStr,
      totalInHouseGuests: totalGuests,
      todayCheckInsCount: (todayCheckIns || []).length,
      todayCheckOutsCount: (todayCheckOuts || []).length,
      turnoverCount: turnoverUnitIds.length,
      todayCheckIns: todayCheckIns || [],
      todayCheckOuts: todayCheckOuts || [],
      turnoverUnitIds,
      units: unitsData
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sunucu hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
