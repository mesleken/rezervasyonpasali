import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/admin/units — Tüm birimleri getirir
export async function GET() {
  const { data, error } = await supabase
    .from('units')
    .select(`
      id, unit_number, label, is_active, category_id,
      category:categories(id, slug, label, icon, sort_order)
    `)
    .order('category_id')
    .order('unit_number')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/admin/units — Yeni birim veya toplu birimler ekler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category_id, label, unit_number, is_active = true } = body

    if (!category_id || !unit_number) {
      return NextResponse.json({ error: 'Kategori ve Birim Numarası zorunludur.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('units')
      .insert([
        {
          category_id: Number(category_id),
          unit_number: Number(unit_number),
          label: label || `Birim ${unit_number}`,
          is_active: Boolean(is_active)
        }
      ])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Birim eklenemedi.' }, { status: 500 })
  }
}

// PUT /api/admin/units — Birim durumunu günceller (Bakım modu: is_active = false/true)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, is_active, label } = body

    if (!id) {
      return NextResponse.json({ error: 'Birim ID zorunludur.' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof is_active === 'boolean') updateData.is_active = is_active
    if (label) updateData.label = label

    const { data, error } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Birim güncellenemedi.' }, { status: 500 })
  }
}

// DELETE /api/admin/units?id=X — Birimi siler
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Birim ID zorunludur.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
