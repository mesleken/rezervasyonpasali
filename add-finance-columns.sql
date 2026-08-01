-- ============================================================
-- PAŞALI Kamp Yönetim Sistemi — Finans & Kapora Sütunları Migration SQL
-- Supabase Dashboard -> SQL Editor -> New Query -> Yapıştır -> Run
-- ============================================================

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';
