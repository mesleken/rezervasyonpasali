import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT /api/reservations/[id] — Güncelle (statü değiştir, veri düzelt)
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params
  const body = await req.json()
  const { guest_name, phone, notes, status, check_in, check_out, price_type, price, deposit } = body

  // Eğer tarihler değişiyorsa çakışma kontrolü yap
  if (check_in && check_out && status !== 'cancelled') {
    const { data: overlap } = await supabase
      .from('reservations')
      .select('id')
      .neq('id', id)
      .eq('unit_id', body.unit_id || 0) // unit değişmez, sadece tarih değişebilir
      .in('status', ['active', 'pending'])
      .lt('check_in', check_out)
      .gt('check_out', check_in)

    if (overlap && overlap.length > 0) {
      return NextResponse.json(
        { error: 'Tarih değişikliği başka bir rezervasyonla çakışıyor.' },
        { status: 409 }
      )
    }
  }

  const updatePayload: Record<string, unknown> = {}
  if (guest_name) updatePayload.guest_name = guest_name.trim()
  if (phone !== undefined) updatePayload.phone = phone?.trim() || null
  if (notes !== undefined) updatePayload.notes = notes?.trim() || null
  if (status) updatePayload.status = status
  if (check_in) updatePayload.check_in = check_in
  if (check_out) updatePayload.check_out = check_out
  if (price_type !== undefined) updatePayload.price_type = price_type
  if (price !== undefined) updatePayload.price = Number(price) || 0
  if (deposit !== undefined) updatePayload.deposit = Number(deposit) || 0

  const { data, error } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/reservations/[id] — Soft delete (status = 'cancelled')
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const { id } = params

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Rezervasyon iptal edildi.' })
}
