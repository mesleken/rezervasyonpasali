# PAŞALI Kamp Yönetim Sistemi — Uygulama Planı

## Hedef

**PAŞALI Bungalow & Camping & Karavan** (Muğla, Gökova Körfezi) kamp alanı için doluluk takibi ve rezervasyon yönetimi yapabilen bir web uygulaması geliştirmek. Frontend: saf HTML + CSS + JavaScript. Backend: Node.js (Express) + PostgreSQL (pgAdmin 4 ile yönetilen). Uygulama lokalde çalışacak, tüm veriler PostgreSQL veritabanında kalıcı olarak saklanacak.

---

## Onaylanan Gereksinimler

### Misafir Alanları ✅
- ✅ Ad - Soyad (zorunlu)
- ✅ Telefon numarası
- ✅ TC Kimlik No
- ✅ Misafir Sayısı (kaç kişi)
- ✅ Gecelik ücret / Toplam tutar (otomatik hesaplanır)
- ✅ Notlar (isteğe bağlı)
- ❌ Araç plakası — şimdilik eklenmeyecek

### Kiralık Birimler ✅
| Tür | Adet |
|-----|------|
| 🏠 Bungalov | 3 |
| ⛺ Çadır | 8 |
| 🔵 Dome Çadır | 2 |
| 📍 Çadır Yeri | 10 |
| 🚐 Karavan | 3 |
| 🅿️ Karavan Yeri | 10 |

---

## Açık Sorular (Yanıt Bekleniyor)

> **Rezervasyon İptali**: Silinince veritabanından tamamen kalkacak, yoksa "iptal" durumuna mı geçecek?

> **Geçmiş Rezervasyonlar**: Çıkış tarihi geçmiş rezervasyonlar takvimde soluk renkte mi gösterilsin, yoksa gizlensin mi?

> **PostgreSQL versiyonu**: pgAdmin 4 ile hangi PostgreSQL sürümü kurulu? (14, 15, 16...)

---

## Teknik Stack

| Katman | Teknoloji | Neden |
|--------|-----------|-------|
| **Frontend** | Vanilla HTML5 + CSS + JS | Kurulum gerektirmez, sade |
| **Stil** | Vanilla CSS + CSS Variables | Glassmorphism, animasyonlar, tam kontrol |
| **Backend** | Node.js + Express.js | Hafif, hızlı REST API |
| **Veritabanı** | PostgreSQL (pgAdmin 4) | Kalıcı, güvenilir, ilişkisel veri |
| **ORM/Query** | `pg` (node-postgres) | Doğrudan SQL, basit kurulum |
| **Font** | Google Fonts — Inter | Modern Türkçe karakter desteği |
| **Takvim** | Özel CSS Grid takvim | Dışa bağımlılık yok |

---

## Uygulama Mimarisi

```
Tarayıcı (index.html)
       ↕ fetch/HTTP
Node.js + Express API  (localhost:3001)
       ↕ pg query
PostgreSQL (pasali_db)
```

---

## Dosya Yapısı

```
paşalı_uygulama/
└── pa-al-/
    ├── frontend/
    │   ├── index.html          ← Ana uygulama (tek sayfa)
    │   ├── style.css           ← Gökova teması, animasyonlar
    │   ├── app.js              ← Sekme yönetimi + API çağrıları
    │   ├── calendar.js         ← Takvim render motoru
    │   └── modal.js            ← Rezervasyon formu / modal
    ├── backend/
    │   ├── server.js           ← Express app, CORS, route'lar
    │   ├── db.js               ← PostgreSQL bağlantısı (pg Pool)
    │   ├── routes/
    │   │   └── reservations.js ← CRUD endpoint'leri
    │   └── init-db.sql         ← Tablo oluşturma script'i
    ├── package.json
    ├── .env                    ← DB credentials
    └── PASALI_PLAN.md          ← Bu dosya
```

---

## Veritabanı Şeması

```sql
CREATE TABLE reservations (
    id              SERIAL PRIMARY KEY,
    item_type       VARCHAR(20) NOT NULL,   -- bungalov, cadır, dome, cadır_yeri, karavan, karavan_yeri
    unit_number     INTEGER NOT NULL,       -- 1, 2, 3 ...
    guest_name      VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    tc_no           VARCHAR(11),            -- 11 haneli TC Kimlik No
    guest_count     INTEGER,               -- Misafir sayısı
    check_in        DATE NOT NULL,
    check_out       DATE NOT NULL,
    price_per_night NUMERIC(10,2),         -- Gecelik ücret (TL)
    total_price     NUMERIC(10,2),         -- Toplam tutar
    notes           TEXT,
    status          VARCHAR(10) DEFAULT 'active',  -- active | cancelled
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoint'leri

```
GET    /api/reservations                          → Tüm aktif rezervasyonlar
GET    /api/reservations/:id                      → Tek rezervasyon
GET    /api/reservations/calendar                 → Takvim için dolu tarihler
       ?itemType=bungalov&unit=1&year=2026&month=8
POST   /api/reservations                          → Yeni rezervasyon oluştur
PUT    /api/reservations/:id                      → Rezervasyon güncelle
DELETE /api/reservations/:id                      → Rezervasyon iptal et
```

---

## Tasarım Teması

**Gökova Körfezi ilhamı** — koyu gece mavisi + turkuaz + kavuniçi + zeytin yeşili

```css
:root {
  --color-bg:       #0a1628;   /* Koyu gece mavisi */
  --color-accent:   #00b4d8;   /* Turkuaz — Gökova körfezi */
  --color-accent2:  #f4a261;   /* Kavuniçi/kum rengi */
  --color-accent3:  #52b788;   /* Zeytin yeşili */
  --color-occupied: #e63946;   /* Kırmızı — dolu */
  --color-empty:    #52b788;   /* Yeşil — boş */
}
```

---

## Rezervasyon Formu

```
┌──────────────────────────────────────────────┐
│  🏕️ Yeni Rezervasyon — Bungalov 1            │
├──────────────────────────────────────────────┤
│  Giriş Tarihi:    [ 10 Ağustos 2026 ]   ★   │
│  Çıkış Tarihi:    [ ____/____/____ ]    ★   │
│  Ad Soyad:        [ _________________ ] ★   │
│  Telefon:         [ 0___ ___ __ __ ]        │
│  TC Kimlik No:    [ ___________ ]           │
│  Misafir Sayısı:  [ _ ]                     │
│  Gecelik Ücret:   [ _______ ] ₺            │
│  Toplam Tutar:    [ _______ ] ₺ (otomatik) │
│  Notlar:          [ _________________ ]     │
├──────────────────────────────────────────────┤
│           [İPTAL]        [KAYDET]            │
└──────────────────────────────────────────────┘
★ = Zorunlu alan
```

---

## Kurulum (Geliştirme tamamlandığında)

```powershell
# 1. Bağımlılıkları kur
cd C:\Users\maozk\Desktop\paşalı_uygulama\pa-al-
npm install

# 2. .env dosyasını düzenle (DB şifreni gir)
notepad .env

# 3. pgAdmin 4'te "pasali_db" veritabanını oluştur
# Ardından tabloyu kur:
psql -U postgres -d pasali_db -f backend/init-db.sql

# 4. Backend'i başlat
npm start

# 5. Tarayıcıda aç
start frontend/index.html
```

---

## Geliştirme Tahmini

| Aşama | Bileşen | Süre |
|-------|---------|------|
| 1 | `init-db.sql` + PostgreSQL şeması | ~20 dk |
| 2 | `backend/` — Express API, CRUD | ~60 dk |
| 3 | `frontend/style.css` — Gökova teması | ~45 dk |
| 4 | `frontend/index.html` — Yapı, sekmeler | ~20 dk |
| 5 | `frontend/calendar.js` — Takvim motoru | ~60 dk |
| 6 | `frontend/modal.js` — Rezervasyon formu | ~30 dk |
| 7 | `frontend/app.js` — API entegrasyonu | ~30 dk |
| 8 | Test & hata düzeltme | ~30 dk |
| **Toplam** | | **~5 saat** |
