const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pasali_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// Otomatik tablo kontrolü ve ilklendirme fonksiyonu
async function initDb() {
  try {
    const client = await pool.connect();
    console.log('🐘 PostgreSQL bağlantısı başarılı!');
    
    // Tablo var mı kontrol et
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
          id              SERIAL PRIMARY KEY,
          item_type       VARCHAR(30) NOT NULL,
          unit_number     INTEGER NOT NULL,
          guest_name      VARCHAR(100) NOT NULL,
          phone           VARCHAR(20),
          tc_no           VARCHAR(11),
          guest_count     INTEGER DEFAULT 1,
          check_in        DATE NOT NULL,
          check_out       DATE NOT NULL,
          price_per_night NUMERIC(10,2) DEFAULT 0.00,
          total_price     NUMERIC(10,2) DEFAULT 0.00,
          notes           TEXT,
          status          VARCHAR(20) DEFAULT 'active',
          created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // GIST veya index kurulumunu güvenli şekilde sağla
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS btree_gist;`);
      await client.query(`
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
            WHEN OTHERS THEN NULL;
        END $$;
      `);
    } catch (e) {
      console.warn('⚠️ GIST kısıtlaması kurulamadı (opsiyonel), yazılım seviyesinde çakışma kontrolü yapılacak.');
    }

    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL bağlantı hatası:', err.message);
    console.warn('💡 İpucu: .env dosyasındaki DB şifrenizi ve pasali_db veritabanının pgAdmin 4 üzerinde oluşturulduğunu kontrol edin.');
  }
}

initDb();

module.exports = pool;
