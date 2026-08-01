/* ==========================================================================
   PAŞALI KAMP SİSTEMİ — REZERVASYON MODAL & FORM YÖNETİMİ
   ========================================================================== */

class ReservationModalManager {
  constructor(options = {}) {
    this.modalEl = document.getElementById('reservationModal');
    this.formEl = document.getElementById('reservationForm');
    this.titleEl = document.getElementById('modalTitle');
    this.closeBtn = document.getElementById('closeModalBtn');
    this.cancelBtn = document.getElementById('cancelModalBtn');

    this.itemTypeEl = document.getElementById('formItemType');
    this.unitNumberEl = document.getElementById('formUnitNumber');
    this.checkInEl = document.getElementById('formCheckIn');
    this.checkOutEl = document.getElementById('formCheckOut');
    this.guestNameEl = document.getElementById('formGuestName');
    this.phoneEl = document.getElementById('formPhone');
    this.tcNoEl = document.getElementById('formTcNo');
    this.guestCountEl = document.getElementById('formGuestCount');
    this.pricePerNightEl = document.getElementById('formPricePerNight');
    this.calculatedNightsEl = document.getElementById('calculatedNights');
    this.calculatedTotalPriceEl = document.getElementById('calculatedTotalPrice');
    this.notesEl = document.getElementById('formNotes');
    this.resIdEl = document.getElementById('formResId');

    this.unitCounts = {
      'bungalov': 3,
      'cadir': 8,
      'dome': 2,
      'cadir_yeri': 10,
      'karavan': 3,
      'karavan_yeri': 10
    };

    this.onSave = options.onSave || null;
    this.initEvents();
  }

  initEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());

    // Birim Türü değişince Birim Numarası dropdown'ını güncelle
    this.itemTypeEl.addEventListener('change', () => {
      this.populateUnitNumbers(this.itemTypeEl.value);
    });

    // Otomatik Gece & Fiyat Hesaplama dinleyicileri
    const recalc = () => this.calculateTotal();
    this.checkInEl.addEventListener('change', recalc);
    this.checkOutEl.addEventListener('change', recalc);
    this.pricePerNightEl.addEventListener('input', recalc);

    // Form Gönderimi
    this.formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  // Birim numarası dropdown seçeneklerini oluştur (1..Count)
  populateUnitNumbers(type, selectedUnit = 1) {
    const count = this.unitCounts[type] || 10;
    let optionsHtml = '';
    for (let i = 1; i <= count; i++) {
      optionsHtml += `<option value="${i}" ${i === parseInt(selectedUnit) ? 'selected' : ''}>No #${i}</option>`;
    }
    this.unitNumberEl.innerHTML = optionsHtml;
  }

  // Gece ve Toplam Tutar Hesapla
  calculateTotal() {
    const checkIn = this.checkInEl.value;
    const checkOut = this.checkOutEl.value;
    const pricePerNight = parseFloat(this.pricePerNightEl.value) || 0;

    if (!checkIn || !checkOut) {
      this.calculatedNightsEl.textContent = '0';
      this.calculatedTotalPriceEl.textContent = '0.00 ₺';
      return { nights: 0, totalPrice: 0 };
    }

    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      this.calculatedNightsEl.textContent = 'Geçersiz (Çıkış > Giriş Olmalı)';
      this.calculatedTotalPriceEl.textContent = '0.00 ₺';
      return { nights: 0, totalPrice: 0 };
    }

    const totalPrice = diffDays * pricePerNight;
    this.calculatedNightsEl.textContent = diffDays;
    this.calculatedTotalPriceEl.textContent = `${totalPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`;

    return { nights: diffDays, totalPrice };
  }

  // Modalı Yeni Rezervasyon İçin Aç
  openNew(itemType = 'bungalov', unitNumber = 1, checkInDate = '') {
    this.formEl.reset();
    this.resIdEl.value = '';
    this.titleEl.textContent = '🏕️ Yeni Rezervasyon Oluştur';

    this.itemTypeEl.value = itemType;
    this.populateUnitNumbers(itemType, unitNumber);

    if (checkInDate) {
      this.checkInEl.value = checkInDate;
      // Ertesi günü varsayılan çıkış yap
      const nextDay = new Date(checkInDate);
      nextDay.setDate(nextDay.getDate() + 1);
      this.checkOutEl.value = nextDay.toISOString().split('T')[0];
    } else {
      const today = new Date().toISOString().split('T')[0];
      this.checkInEl.value = today;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      this.checkOutEl.value = tomorrow.toISOString().split('T')[0];
    }

    this.guestCountEl.value = '2';
    this.pricePerNightEl.value = '';
    this.calculateTotal();

    this.modalEl.classList.add('active');
  }

  // Modalı Düzenleme İçin Aç
  openEdit(resData) {
    this.formEl.reset();
    this.resIdEl.value = resData.id;
    this.titleEl.textContent = `📝 Rezervasyon Düzenle (#${resData.id})`;

    this.itemTypeEl.value = resData.item_type;
    this.populateUnitNumbers(resData.item_type, resData.unit_number);

    this.checkInEl.value = resData.check_in;
    this.checkOutEl.value = resData.check_out;
    this.guestNameEl.value = resData.guest_name || '';
    this.phoneEl.value = resData.phone || '';
    this.tcNoEl.value = resData.tc_no || '';
    this.guestCountEl.value = resData.guest_count || 1;
    this.pricePerNightEl.value = resData.price_per_night || '';
    this.notesEl.value = resData.notes || '';

    this.calculateTotal();
    this.modalEl.classList.add('active');
  }

  close() {
    this.modalEl.classList.remove('active');
  }

  // Form submit
  handleSubmit() {
    const { nights, totalPrice } = this.calculateTotal();

    if (nights <= 0) {
      alert('Lütfen geçerli giriş ve çıkış tarihleri seçin! Çıkış tarihi giriş tarihinden sonra olmalıdır.');
      return;
    }

    const payload = {
      id: this.resIdEl.value || null,
      item_type: this.itemTypeEl.value,
      unit_number: parseInt(this.unitNumberEl.value),
      check_in: this.checkInEl.value,
      check_out: this.checkOutEl.value,
      guest_name: this.guestNameEl.value.trim(),
      phone: this.phoneEl.value.trim(),
      tc_no: this.tcNoEl.value.trim(),
      guest_count: parseInt(this.guestCountEl.value) || 1,
      price_per_night: parseFloat(this.pricePerNightEl.value) || 0,
      total_price: totalPrice,
      notes: this.notesEl.value.trim()
    };

    if (this.onSave) {
      this.onSave(payload, () => this.close());
    }
  }
}

window.ReservationModalManager = ReservationModalManager;
