const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Statik frontend dosyalarını da yayınla
app.use(express.static(path.join(__dirname, '../frontend')));

// API Rotaları
app.use('/api/reservations', require('./routes/reservations'));

// Sunucu Durum / Sağlık Kontrolü
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'PAŞALI Kamp Yönetim Sistemi API',
    timestamp: new Date().toISOString()
  });
});

// SPA Fallback (Tüm diğer istekler frontend index.html'e yönlendirilir)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ======================================================
  🏕️  PAŞALI KAMP YÖNETİM SİSTEMİ ÇALIŞIYOR
  🌐  Uygulama Adresi : http://localhost:${PORT}
  🐘  Veritabanı      : PostgreSQL (pasali_db)
  ======================================================
  `);
});
