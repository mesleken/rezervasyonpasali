# PAŞALI Kamp Yönetim Sistemi — Kurulum & Kullanım Rehberi

**PAŞALI Bungalow & Camping & Karavan** (Muğla Akbük / Gökova Körfezi) tesisi için doluluk takibi ve rezervasyon yönetimi uygulaması başarıyla tamamlanmıştır.

---

## 🌟 Öne Çıkan Özellikler

1. **6 Ayrı Kiralık Birim Sekmesi**:
   - 🏠 **Bungalov**: 3 Adet
   - ⛺ **Çadır**: 8 Adet
   - 🔵 **Dome Çadır**: 2 Adet
   - 📍 **Çadır Yeri**: 10 Adet
   - 🚐 **Karavan**: 3 Adet
   - 🅿️ **Karavan Yeri**: 10 Adet

2. **Dinamik Takvim Matrisi**:
   - Ayın tüm günleri (1..31) ve Türkçe gün isimleri (Pzt, Sal, Çar...)
   - Hafta sonu günleri ve içinde bulunulan gün için otomatik renk vurgusu
   - 🟢 **Yeşil**: Boş birim
   - 🔴 **Kırmızı**: Dolu birim
   - 📥 **Giriş Günü** & 📤 **Çıkış Günü** geçiş görselleri
   - Fare ile üzerine gelindiğinde (Hover) detaylı **Misafir Kartı Tooltip**'i

3. **Gelişmiş Rezervasyon Modalı**:
   - **Ad Soyad** (Zorunlu)
   - **Telefon Numarası**
   - **TC Kimlik No** (11 hane)
   - **Misafir Sayısı** (Kişi)
   - **Gecelik Ücret** & **Otomatik Hesaplanan Toplam Tutar** (`Gece Sayısı × Gecelik Ücret`)
   - **Özel Notlar & İstekler**
   - Veritabanı ve yazılım seviyesinde **Çakışma Kontrolü** (Aynı tarihlerde aynı birime iki rezervasyon engellenir)

4. **Çift Veri Modu (Hybrid Engine)**:
   - **Node.js + PostgreSQL (pgAdmin 4)** bağlantısı mevcutken doğrudan veritabanında saklanır.
   - Sunucu açık olmadığında dahi **tarayıcı yerel hafızası (localStorage)** devreye girer ve tarayıcıda doğrudan `index.html` dosyası açılarak internet olmadan kullanılabilir.

---

## 📂 Dosya Yapısı

```
paşalı_uygulama/pa-al-/
├── package.json               ← Node.js bağımlılıkları ve başlatma komutları
├── .env                       ← Veritabanı bağlantı parametreleri
├── PASALI_PLAN.md             ← Uygulama detaylı tasarım planı
├── KULLANIM_KILAVUZU.md       ← Bu rehber dosyası
├── backend/
│   ├── init-db.sql            ← PostgreSQL tablo ve GIST çakışma önleyici script'i
│   ├── db.js                  ← PostgreSQL havuz bağlantısı ve otomatik tablo kontrolcüsü
│   ├── server.js              ← Express.js REST API sunucusu
│   └── routes/
│       └── reservations.js    ← CRUD API
└── frontend/
    ├── index.html             ← Gökova temalı ana arayüz
    ├── style.css              ← Glassmorphism & Ege mavisi tasarım sistemi
    ├── calendar.js            ← Dinamik takvim grid render motoru
    ├── modal.js               ← Rezervasyon form modalı & otomatik tutar hesaplayıcı
    └── app.js                 ← Uygulama ana kontrolcüsü & hibrit veri yönetimi
```

---

## 🚀 Çalıştırma Yöntemleri

### Yöntem 1: Doğrudan Tarayıcıda Açma (Kurulumsuz / Hızlı Mod)
1. `C:\Users\maozk\Desktop\paşalı_uygulama\pa-al-\frontend\index.html` dosyasına çift tıklayın.
2. Uygulama tarayıcınızda doğrudan açılacak ve veriler yerel hafızada saklanacaktır.

---

### Yöntem 2: Node.js + PostgreSQL (pgAdmin 4) ile Çalıştırma

#### 1. pgAdmin 4 Veritabanı Kurulumu
1. **pgAdmin 4** uygulamasını açın.
2. `Databases` üzerine sağ tıklayıp **Create -> Database...** seçeneğini seçin.
3. Veritabanı adını `pasali_db` koyun ve kaydedin.
4. `.env` dosyasındaki `DB_PASSWORD` alanına pgAdmin 4 şifrenizi girin.

#### 2. Sunucuyu Başlatma
```powershell
cd C:\Users\maozk\Desktop\paşalı_uygulama\pa-al-
npm install
npm start
```
Tarayıcınızdan **`http://localhost:3001`** adresine girerek uygulamayı kullanabilirsiniz.
