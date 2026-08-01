/* ==========================================================================
   PAŞALI KAMP SİSTEMİ — UYGULAMA ORKESTRASUYONU (HYBRID API + LOCALSTORAGE)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = '/api/reservations';
  const LOCAL_STORAGE_KEY = 'pasali_reservations_db';

  // Uygulama Durumu (State)
  const state = {
    activeItemType: 'bungalov',
    activeUnitCount: 3,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1, // 1..12
    reservations: [],
    isApiOnline: false
  };

  const turkishMonths = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // Modülleri Başlat
  const calendar = new CalendarRenderer('calendarContainer');

  const modal = new ReservationModalManager({
    onSave: async (payload, closeModalCb) => {
      await saveReservation(payload, closeModalCb);
    }
  });

  // UI Elementleri
  const tabsNav = document.getElementById('tabsNav');
  const currentMonthLabel = document.getElementById('currentMonthLabel');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const openNewResModalBtn = document.getElementById('openNewResModalBtn');
  const searchInput = document.getElementById('searchInput');
  const reservationsTableBody = document.getElementById('reservationsTableBody');

  // Stats Elementleri
  const statTodayOccupied = document.getElementById('statTodayOccupied');
  const statTodayGuests = document.getElementById('statTodayGuests');
  const statMonthlyRevenue = document.getElementById('statMonthlyRevenue');

  // ==========================================================================
  // LOCALSTORAGE YEREL DEPOLAMA DESTEĞİ (FALLBACK)
  // ==========================================================================

  function getLocalReservations() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : getInitialMockData();
    } catch (e) {
      return [];
    }
  }

  function saveLocalReservations(list) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('LocalStorage kaydetme hatası:', e);
    }
  }

  function getInitialMockData() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    
    return [
      {
        id: 101,
        item_type: 'bungalov',
        unit_number: 1,
        guest_name: 'Ahmet Yılmaz',
        phone: '0532 123 4567',
        tc_no: '12345678901',
        guest_count: 2,
        check_in: `${y}-${m}-10`,
        check_out: `${y}-${m}-14`,
        price_per_night: 2500,
        total_price: 10000,
        notes: 'Deniz manzaralı bungalov isteği.',
        status: 'active'
      },
      {
        id: 102,
        item_type: 'cadir',
        unit_number: 3,
        guest_name: 'Mehmet & Ayşe Kaya',
        phone: '0544 987 6543',
        tc_no: '98765432109',
        guest_count: 3,
        check_in: `${y}-${m}-05`,
        check_out: `${y}-${m}-08`,
        price_per_night: 800,
        total_price: 2400,
        notes: 'Gölge alanda çadır yeri.',
        status: 'active'
      }
    ];
  }

  // ==========================================================================
  // OLAY DİNLEYİCİLERİ
  // ==========================================================================

  // Sekme Değişikliği (6 Sekme)
  tabsNav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.activeItemType = btn.dataset.type;
      state.activeUnitCount = parseInt(btn.dataset.count);

      loadCalendarData();
    });
  });

  // Ay Navigasyonu (Önceki / Sonraki Ay)
  prevMonthBtn.addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    updateMonthLabel();
    loadCalendarData();
  });

  nextMonthBtn.addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    updateMonthLabel();
    loadCalendarData();
  });

  // Yeni Rezervasyon Butonu
  openNewResModalBtn.addEventListener('click', () => {
    modal.openNew(state.activeItemType, 1);
  });

  // Canlı Arama
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadReservationsList(e.target.value.trim());
    }, 250);
  });

  function updateMonthLabel() {
    currentMonthLabel.textContent = `${turkishMonths[state.currentMonth - 1]} ${state.currentYear}`;
  }

  // ==========================================================================
  // VERİ İŞLEMLERİ (HYBRID: API TRY -> LOCALSTORAGE FALLBACK)
  // ==========================================================================

  async function loadCalendarData() {
    updateMonthLabel();

    try {
      const url = `${API_BASE}/calendar?itemType=${state.activeItemType}&year=${state.currentYear}&month=${state.currentMonth}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          state.isApiOnline = true;
          state.reservations = result.data || [];
          renderView();
          loadStatsApi();
          loadReservationsListApi();
          return;
        }
      }
    } catch (err) {
      // API çevrimdışı veya hata verdi -> LocalStorage'a geç
      state.isApiOnline = false;
    }

    // LocalStorage Fallback modu
    loadFromLocalStorage();
  }

  function loadFromLocalStorage() {
    const all = getLocalReservations();
    
    // Aktif ay ve kiralık item tipine göre filtrele
    const filtered = all.filter(r => {
      if (r.status !== 'active') return false;
      if (r.item_type !== state.activeItemType) return false;

      const checkInDate = new Date(r.check_in);
      const checkOutDate = new Date(r.check_out);

      const monthStart = new Date(state.currentYear, state.currentMonth - 1, 1);
      const monthEnd = new Date(state.currentYear, state.currentMonth, 0);

      return (checkInDate <= monthEnd && checkOutDate >= monthStart);
    });

    state.reservations = filtered;
    renderView();
    updateLocalStorageStats(all);
    renderReservationsTable(all.filter(r => r.item_type === state.activeItemType));
  }

  function renderView() {
    calendar.render(
      state.activeItemType,
      state.activeUnitCount,
      state.currentYear,
      state.currentMonth,
      state.reservations,
      handleCellClick
    );
  }

  function handleCellClick({ itemType, unit, date, resId }) {
    if (resId) {
      const existingRes = state.reservations.find(r => String(r.id) === String(resId));
      if (existingRes) {
        modal.openEdit(existingRes);
      } else {
        modal.openNew(itemType, unit, date);
      }
    } else {
      modal.openNew(itemType, unit, date);
    }
  }

  // ==========================================================================
  // REZERVASYON KAYIT VE İPTAL İŞLEMLERİ
  // ==========================================================================

  async function saveReservation(payload, closeModalCb) {
    if (state.isApiOnline) {
      try {
        const isEdit = Boolean(payload.id);
        const url = isEdit ? `${API_BASE}/${payload.id}` : API_BASE;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          showToast(result.message || 'Rezervasyon kaydedilemedi.', 'error');
          return;
        }

        showToast(result.message || 'Rezervasyon kaydedildi! 🎉', 'success');
        closeModalCb();
        loadCalendarData();
        return;
      } catch (err) {
        console.warn('API hatası, çevrimdışı moda geçiliyor...');
      }
    }

    // LocalStorage Kayıt İşlemi
    const all = getLocalReservations();

    // Çakışma kontrolü
    const hasOverlap = all.some(r => {
      if (r.status !== 'active') return false;
      if (payload.id && String(r.id) === String(payload.id)) return false;
      if (r.item_type !== payload.item_type || parseInt(r.unit_number) !== parseInt(payload.unit_number)) return false;

      const newIn = new Date(payload.check_in).getTime();
      const newOut = new Date(payload.check_out).getTime();
      const existIn = new Date(r.check_in).getTime();
      const existOut = new Date(r.check_out).getTime();

      return (newIn < existOut && newOut > existIn);
    });

    if (hasOverlap) {
      showToast('ÇAKIŞMA HATASI: Seçilen tarihler arasında bu birim için başka bir aktif rezervasyon mevcuttur!', 'error');
      return;
    }

    if (payload.id) {
      // Güncelle
      const idx = all.findIndex(r => String(r.id) === String(payload.id));
      if (idx !== -1) {
        all[idx] = { ...all[idx], ...payload, status: 'active' };
      }
    } else {
      // Yeni Ekle
      payload.id = Date.now();
      payload.status = 'active';
      all.push(payload);
    }

    saveLocalReservations(all);
    showToast('Rezervasyon yerel hafızaya kaydedildi! 🎉', 'success');
    closeModalCb();
    loadCalendarData();
  }

  async function cancelReservation(id) {
    if (state.isApiOnline) {
      try {
        const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          showToast('Rezervasyon iptal edildi.', 'success');
          loadCalendarData();
          return;
        }
      } catch (e) {}
    }

    // LocalStorage İptal
    const all = getLocalReservations();
    const target = all.find(r => String(r.id) === String(id));
    if (target) {
      target.status = 'cancelled';
      saveLocalReservations(all);
      showToast('Rezervasyon başarıyla iptal edildi.', 'success');
      loadCalendarData();
    }
  }

  // ==========================================================================
  // İSTATİSTİKLER VE LİSTELEME
  // ==========================================================================

  async function loadStatsApi() {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const d = result.data;
          statTodayOccupied.textContent = `${d.todayOccupiedUnits} / 36`;
          statTodayGuests.textContent = d.todayActiveGuests;
          statMonthlyRevenue.textContent = `${parseFloat(d.monthlyRevenue || 0).toLocaleString('tr-TR')} ₺`;
        }
      }
    } catch (e) {}
  }

  function updateLocalStorageStats(all) {
    const todayYMD = new Date().toISOString().split('T')[0];
    const todayTime = new Date(todayYMD).getTime();

    let occupiedUnits = 0;
    let activeGuests = 0;
    let monthlyRevenue = 0;

    const currentYearMonthPrefix = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;

    all.forEach(r => {
      if (r.status !== 'active') return;

      const cIn = new Date(r.check_in).getTime();
      const cOut = new Date(r.check_out).getTime();

      if (todayTime >= cIn && todayTime < cOut) {
        occupiedUnits++;
        activeGuests += parseInt(r.guest_count || 1);
      }

      if (r.check_in.startsWith(currentYearMonthPrefix)) {
        monthlyRevenue += parseFloat(r.total_price || 0);
      }
    });

    statTodayOccupied.textContent = `${occupiedUnits} / 36`;
    statTodayGuests.textContent = activeGuests;
    statMonthlyRevenue.textContent = `${monthlyRevenue.toLocaleString('tr-TR')} ₺`;
  }

  async function loadReservationsListApi() {
    try {
      const url = `${API_BASE}?itemType=${state.activeItemType}&month=${state.currentMonth}&year=${state.currentYear}`;
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success) renderReservationsTable(result.data || []);
      }
    } catch (e) {}
  }

  function loadReservationsList(searchKeyword = '') {
    const all = getLocalReservations();
    let filtered = all;

    if (searchKeyword) {
      const q = searchKeyword.toLowerCase();
      filtered = all.filter(r => 
        (r.guest_name && r.guest_name.toLowerCase().includes(q)) ||
        (r.phone && r.phone.includes(q)) ||
        (r.tc_no && r.tc_no.includes(q))
      );
    } else {
      filtered = all.filter(r => r.item_type === state.activeItemType);
    }

    renderReservationsTable(filtered);
  }

  function renderReservationsTable(rows) {
    if (!reservationsTableBody) return;

    if (rows.length === 0) {
      reservationsTableBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center; padding:24px; color:var(--text-muted);">
            Kayıtlı rezervasyon bulunamadı.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    rows.forEach(r => {
      const typeLabel = calendar.getUnitTypeLabel(r.item_type);
      const isCancelled = (r.status === 'cancelled');

      html += `
        <tr style="${isCancelled ? 'opacity:0.5;' : ''}">
          <td><strong>#${r.id}</strong></td>
          <td>${typeLabel} No #${r.unit_number}</td>
          <td><strong>${calendar.escapeHtml(r.guest_name)}</strong></td>
          <td>${calendar.escapeHtml(r.phone || '-')}</td>
          <td>${calendar.escapeHtml(r.tc_no || '-')}</td>
          <td>${r.check_in} ➔ ${r.check_out}</td>
          <td>${r.guest_count || 1} Kişi</td>
          <td>${r.price_per_night ? parseFloat(r.price_per_night).toLocaleString('tr-TR') + ' ₺' : '-'}</td>
          <td style="color:var(--accent-gold); font-weight:700;">${r.total_price ? parseFloat(r.total_price).toLocaleString('tr-TR') + ' ₺' : '-'}</td>
          <td>
            <span class="badge-status ${r.status}">
              ${r.status === 'active' ? 'Aktif' : 'İptal'}
            </span>
          </td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn-secondary edit-res-btn" data-id="${r.id}" style="padding:4px 8px; font-size:12px;">✏️ Düzenle</button>
              ${!isCancelled ? `<button class="btn-secondary cancel-res-btn" data-id="${r.id}" style="padding:4px 8px; font-size:12px; color:var(--accent-red); border-color:var(--accent-red);">❌ İptal Et</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

    reservationsTableBody.innerHTML = html;

    reservationsTableBody.querySelectorAll('.edit-res-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const all = getLocalReservations();
        const res = all.find(x => String(x.id) === String(id)) || state.reservations.find(x => String(x.id) === String(id));
        if (res) modal.openEdit(res);
      });
    });

    reservationsTableBody.querySelectorAll('.cancel-res-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm(`#${id} numaralı rezervasyonu iptal etmek istediğinize emin misiniz?`)) {
          await cancelReservation(id);
        }
      });
    });
  }

  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
      <div>${message}</div>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // İlk Yükleme
  loadCalendarData();
});
