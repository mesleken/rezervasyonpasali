import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/finance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('reservations')
    .select(`
      *,
      unit:units(
        id, unit_number, label,
        category:categories(id, slug, label, icon, sort_order)
      )
    `)
    .neq('status', 'cancelled')
    .order('check_in', { ascending: false })

  if (startDate && endDate) {
    query = query.gte('check_in', startDate).lte('check_in', endDate)
  }

  const { data: reservations, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = reservations || []

  // Toplam Hesaplamalar
  let totalRevenue = 0
  let totalDeposit = 0
  let remainingBalance = 0
  let totalNights = 0

  // Kategori Bazlı Dağılım
  const categoryStats: Record<string, {
    slug: string
    label: string
    icon: string
    count: number
    revenue: number
    deposit: number
    remaining: number
  }> = {}

  list.forEach(r => {
    const price = Number(r.price) || 0
    const deposit = Number(r.deposit) || 0
    
    // Gece hesaplama
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    totalNights += nights

    const isDaily = r.price_type !== 'total'
    const totalAmount = isDaily ? price * nights : price
    const rem = Math.max(0, totalAmount - deposit)

    totalRevenue += totalAmount
    totalDeposit += deposit
    remainingBalance += rem

    // Kategoriye ekle
    const cat = r.unit?.category
    const catSlug = cat?.slug || 'diger'
    const catLabel = cat?.label || 'Diğer'
    const catIcon = cat?.icon || '📍'

    if (!categoryStats[catSlug]) {
      categoryStats[catSlug] = {
        slug: catSlug,
        label: catLabel,
        icon: catIcon,
        count: 0,
        revenue: 0,
        deposit: 0,
        remaining: 0
      }
    }

    categoryStats[catSlug].count += 1
    categoryStats[catSlug].revenue += totalAmount
    categoryStats[catSlug].deposit += deposit
    categoryStats[catSlug].remaining += rem
  })

  return NextResponse.json({
    data: {
      summary: {
        totalReservations: list.length,
        totalRevenue,
        totalDeposit,
        remainingBalance,
        totalNights,
        avgPerNight: totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0
      },
      categoryStats: Object.values(categoryStats),
      reservations: list
    }
  })
}
