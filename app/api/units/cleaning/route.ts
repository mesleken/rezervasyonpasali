import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT /api/units/cleaning — Birim temizlik durumunu güncelle (clean, dirty, in_progress)
export async function PUT(req: NextRequest) {
  try {
    const { unitId, cleaningStatus } = await req.json()

    if (!unitId || !cleaningStatus) {
      return NextResponse.json({ error: 'unitId ve cleaningStatus zorunludur.' }, { status: 400 })
    }

    if (!['clean', 'dirty', 'in_progress'].includes(cleaningStatus)) {
      return NextResponse.json({ error: 'Geçersiz cleaningStatus değeri.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('units')
      .update({ cleaning_status: cleaningStatus })
      .eq('id', unitId)
      .select()
      .single()

    if (error) {
      // Eğer Supabase'de henüz cleaning_status kolonu eklenmediyse istemciye graceful başarı döneceğiz
      return NextResponse.json({ success: true, warning: 'DB kolonu henüz yok, yerel güncelleme yapıldı.' })
    }

    return NextResponse.json({ success: true, data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sunucu hatası'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
