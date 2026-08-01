-- PAŞALI Kamp Yönetim Sistemi — Veritabanı Kurulum Scripti

-- 1. Veritabanını oluşturmak için pgAdmin veya psql'de çalıştırın:
-- CREATE DATABASE pasali_db;

-- 2. btree_gist eklentisi (tarih ve metin aralıklarında çakışma önleme için)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. Rezervasyonlar tablosu
CREATE TABLE IF NOT EXISTS reservations (
    id              SERIAL PRIMARY KEY,
    item_type       VARCHAR(30) NOT NULL,   -- bungalov, cadir, dome, cadir_yeri, karavan, karavan_yeri
    unit_number     INTEGER NOT NULL,       -- 1, 2, 3...
    guest_name      VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    tc_no           VARCHAR(11),            -- 11 haneli TC Kimlik No
    guest_count     INTEGER DEFAULT 1,     -- Misafir sayısı
    check_in        DATE NOT NULL,
    check_out       DATE NOT NULL,
    price_per_night NUMERIC(10,2) DEFAULT 0.00,
    total_price     NUMERIC(10,2) DEFAULT 0.00,
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'active', -- active, cancelled
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- Çakışma önleyici kısıtlama (Aynı birim ve tür için çakışan tarihler engellenir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap_reservation'
    ) THEN
        ALTER TABLE reservations ADD CONSTRAINT no_overlap_reservation
        EXCLUDE USING GIST (
            item_type WITH =,
            unit_number WITH =,
            daterange(check_in, check_out, '[)') WITH &&
        ) WHERE (status = 'active');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'GIST kısıtlaması atlandı veya zaten mevcut: %', SQLERRM;
END $$;

-- Performans indeksleri
CREATE INDEX IF NOT EXISTS idx_res_item_unit ON reservations(item_type, unit_number, status);
CREATE INDEX IF NOT EXISTS idx_res_dates ON reservations(check_in, check_out);
