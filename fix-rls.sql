-- ============================================================
-- PAŞALI Kamp Yönetim Sistemi — Supabase RLS (Güvenlik) İzinleri
-- Supabase Dashboard → SQL Editor → New Query → Yapıştır → Run
-- ============================================================

-- 1. Reservations tablosunda RLS politikalarını sıfırla/kaldır ya da tam izin ver
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.units        DISABLE ROW LEVEL SECURITY;

-- 2. Schema Cache Yenileme Bildirimi
NOTIFY pgrst, 'reload schema';
