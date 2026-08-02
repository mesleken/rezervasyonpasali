const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1. Tüm aktif veya filtrelenmiş rezervasyonları getir
router.get('/', async (req, res) => {
  try {
    const { itemType, unitNumber, status = 'active', search, month, year } = req.query;
    let query = 'SELECT * FROM reservations WHERE 1=1';
    const params = [];

    if (status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (itemType) {
      params.push(itemType);
      query += ` AND item_type = $${params.length}`;
    }

    if (unitNumber) {
      params.push(parseInt(unitNumber));
      query += ` AND unit_number = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (guest_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR tc_no ILIKE $${params.length})`;
    }

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      // Ayın son günü
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      params.push(startDate, endDate);
      query += ` AND check_in <= ${params.length} AND check_out >= ${params.length - 1}`;
    }

    query += ' ORDER BY check_in ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /reservations Hata:', err);
    res.status(500).json({ success: false, message: 'Rezervasyonlar yüklenirken bir hata oluştu: ' + err.message });
  }
});

// 2. Takvim görünümü için hafifletilmiş veri (Belirli ay ve sekme için dolu günler)
router.get('/calendar', async (req, res) => {
  try {
    const { itemType, year, month } = req.query;
    if (!itemType || !year || !month) {
      return res.status(400).json({ success: false, message: 'itemType, year ve month parametreleri zorunludur.' });
    }

    const y = parseInt(year);
    const m = parseInt(month);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const query = `
      SELECT id, item_type, unit_number, guest_name, phone, tc_no, guest_count,
             TO_CHAR(check_in, 'YYYY-MM-DD') as check_in,
             TO_CHAR(check_out, 'YYYY-MM-DD') as check_out,
             price_per_night, total_price, notes, status
      FROM reservations
      WHERE item_type = $1
        AND status = 'active'
        AND check_in < $3
        AND check_out > $2
      ORDER BY unit_number, check_in
    `;

    const result = await pool.query(query, [itemType, startDate, endDate]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('GET /calendar Hata:', err);
    res.status(500).json({ success: false, message: 'Takvim verileri çekilemedi: ' + err.message });
  }
});

// 3. Genel istatistikler (Özet bilgi paneli için)
router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Bugünkü toplam aktif doluluk
    const todayOccupiedQuery = `
      SELECT COUNT(DISTINCT (item_type || '_' || unit_number)) as occupied_count,
             COUNT(*) as active_guests
      FROM reservations
      WHERE status = 'active'
        AND check_in <= $1 AND check_out > $1
    `;

    // Toplam rezervasyon sayısı ve bu ayki toplam ciro
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const totalStatsQuery = `
      SELECT COUNT(*) as total_reservations,
             COALESCE(SUM(total_price), 0) as monthly_revenue
      FROM reservations
      WHERE status = 'active' AND check_in >= $1
    `;

    const todayRes = await pool.query(todayOccupiedQuery, [today]);
    const totalRes = await pool.query(totalStatsQuery, [firstDayOfMonth]);

    res.json({
      success: true,
      data: {
        todayOccupiedUnits: parseInt(todayRes.rows[0].occupied_count || 0),
        todayActiveGuests: parseInt(todayRes.rows[0].active_guests || 0),
        totalMonthlyReservations: parseInt(totalRes.rows[0].total_reservations || 0),
        monthlyRevenue: parseFloat(totalRes.rows[0].monthly_revenue || 0)
      }
    });
  } catch (err) {
    console.error('GET /stats Hata:', err);
    res.status(500).json({ success: false, message: 'İstatistikler alınamadı: ' + err.message });
  }
});

// 4. Yeni Rezervasyon Oluştur
router.post('/', async (req, res) => {
  try {
    const {
      item_type,
      unit_number,
      guest_name,
      phone,
      tc_no,
      guest_count = 1,
      check_in,
      check_out,
      price_per_night = 0,
      total_price = 0,
      notes = ''
    } = req.body;

    // Temel alan validasyonu
    if (!item_type || !unit_number || !guest_name || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen zorunlu alanları doldurun: Konaklama türü, birim no, ad soyad, giriş ve çıkış tarihi.'
      });
    }

    if (new Date(check_out) <= new Date(check_in)) {
      return res.status(400).json({
        success: false,
        message: 'Çıkış tarihi, giriş tarihinden sonraki bir gün olmalıdır!'
      });
    }

    // Yazılım Seviyesinde Çakışma Kontrolü (Güvenlik ağı)
    const overlapCheckQuery = `
      SELECT id, guest_name, TO_CHAR(check_in, 'YYYY-MM-DD') as check_in, TO_CHAR(check_out, 'YYYY-MM-DD') as check_out
      FROM reservations
      WHERE item_type = $1
        AND unit_number = $2
        AND status = 'active'
        AND (check_in < $4 AND check_out > $3)
    `;
    const overlapResult = await pool.query(overlapCheckQuery, [item_type, parseInt(unit_number), check_in, check_out]);

    if (overlapResult.rows.length > 0) {
      const existing = overlapResult.rows[0];
      return res.status(409).json({
        success: false,
        message: `ÇAKIŞMA UYARISI: Bu birim (${existing.check_in} — ${existing.check_out}) tarihleri arasında "${existing.guest_name}" adına halihazırda doludur!`
      });
    }

    // Kaydetme işlemi
    const insertQuery = `
      INSERT INTO reservations
        (item_type, unit_number, guest_name, phone, tc_no, guest_count, check_in, check_out, price_per_night, total_price, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
      RETURNING *, TO_CHAR(check_in, 'YYYY-MM-DD') as check_in, TO_CHAR(check_out, 'YYYY-MM-DD') as check_out
    `;

    const values = [
      item_type,
      parseInt(unit_number),
      guest_name.trim(),
      phone ? phone.trim() : '',
      tc_no ? tc_no.trim() : '',
      parseInt(guest_count) || 1,
      check_in,
      check_out,
      parseFloat(price_per_night) || 0,
      parseFloat(total_price) || 0,
      notes ? notes.trim() : ''
    ];

    const result = await pool.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Rezervasyon başarıyla kaydedildi!',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('POST /reservations Hata:', err);

    if (err.code === '23P01' || err.message.includes('overlap')) {
      return res.status(409).json({
        success: false,
        message: 'Seçilen tarihler arasında bu birim için başka bir aktif rezervasyon mevcuttur!'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Rezervasyon kaydedilirken sunucu hatası oluştu: ' + err.message
    });
  }
});

// 5. Rezervasyon Güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      guest_name,
      phone,
      tc_no,
      guest_count,
      check_in,
      check_out,
      price_per_night,
      total_price,
      notes,
      status
    } = req.body;

    // Güncellenecek kaydı kontrol et
    const checkQuery = `SELECT * FROM reservations WHERE id = $1`;
    const checkRes = await pool.query(checkQuery, [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Güncellenecek rezervasyon bulunamadı.' });
    }

    const target = checkRes.rows[0];
    const newCheckIn = check_in || target.check_in;
    const newCheckOut = check_out || target.check_out;

    // Çakışma kontrolü (Kendi ID'si hariç)
    if (status !== 'cancelled') {
      const overlapQuery = `
        SELECT id, guest_name FROM reservations
        WHERE item_type = $1 AND unit_number = $2 AND status = 'active' AND id != $3
          AND (check_in < $5 AND check_out > $4)
      `;
      const overlapRes = await pool.query(overlapQuery, [target.item_type, target.unit_number, id, newCheckIn, newCheckOut]);
      if (overlapRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Tarih değişikliği yapılamadı. Başka bir rezervasyon (${overlapRes.rows[0].guest_name}) ile çakışıyor.`
        });
      }
    }

    const updateQuery = `
      UPDATE reservations
      SET guest_name = $1, phone = $2, tc_no = $3, guest_count = $4,
          check_in = $5, check_out = $6, price_per_night = $7, total_price = $8,
          notes = $9, status = $10
      WHERE id = $11
      RETURNING *, TO_CHAR(check_in, 'YYYY-MM-DD') as check_in, TO_CHAR(check_out, 'YYYY-MM-DD') as check_out
    `;

    const values = [
      guest_name || target.guest_name,
      phone !== undefined ? phone : target.phone,
      tc_no !== undefined ? tc_no : target.tc_no,
      guest_count ? parseInt(guest_count) : target.guest_count,
      newCheckIn,
      newCheckOut,
      price_per_night !== undefined ? parseFloat(price_per_night) : target.price_per_night,
      total_price !== undefined ? parseFloat(total_price) : target.total_price,
      notes !== undefined ? notes : target.notes,
      status || target.status,
      id
    ];

    const result = await pool.query(updateQuery, values);
    res.json({ success: true, message: 'Rezervasyon güncellendi.', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /reservations Hata:', err);
    res.status(500).json({ success: false, message: 'Güncelleme hatası: ' + err.message });
  }
});

// 6. Rezervasyon Sil / İptal Et
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hardDelete } = req.query;

    if (hardDelete === 'true') {
      await pool.query('DELETE FROM reservations WHERE id = $1', [id]);
    } else {
      // İptal durumuna al (Soft delete)
      await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [id]);
    }

    res.json({ success: true, message: 'Rezervasyon başarıyla iptal edildi/silindi.' });
  } catch (err) {
    console.error('DELETE /reservations Hata:', err);
    res.status(500).json({ success: false, message: 'İptal işlemi başarısız: ' + err.message });
  }
});

module.exports = router;
