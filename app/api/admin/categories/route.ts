import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/admin/categories — Tüm kategorileri getirir
export async function GET() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// POST /api/admin/categories — Yeni birim türü (kategori) ekler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { label, icon, slug, sort_order } = body

    if (!label || !icon) {
      return NextResponse.json({ error: 'Kategori adı ve ikonu zorunludur.' }, { status: 400 })
    }

    const generatedSlug = slug || label.toLowerCase().replace(/[^a-z0-9]/g, '_')

    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          slug: generatedSlug,
          label,
          icon,
          sort_order: sort_order || 99
        }
      ])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Kategori eklenemedi.' }, { status: 500 })
  }
}

// DELETE /api/admin/categories?id=X — Birim türünü ve bağlı birimlerini siler
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Kategori ID zorunludur.' }, { status: 400 })
  }

  // Kategoriyi sil
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
