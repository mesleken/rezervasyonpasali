/* ==========================================================================
   PAŞALI KAMP SİSTEMİ — DİNAMİK TAKVİM RENDER MOTORU
   ========================================================================== */

class CalendarRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.turkishMonths = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    this.turkishDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  }

  // Ayın kaç gün olduğunu hesapla
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  // Tarih String'ini (YYYY-MM-DD) Date nesnesine çevir
  parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    return new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
  }

  // İki tarih eşit mi (YYYY-MM-DD)
  formatYMD(year, month, day) {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Takvimi çiz
  render(itemType, unitCount, year, month, reservations = [], onCellClick) {
    if (!this.container) return;

    const daysInMonth = this.getDaysInMonth(year, month);
    const today = new Date();
    const todayYMD = this.formatYMD(today.getFullYear(), today.getMonth() + 1, today.getDate());

    let html = `
      <table class="calendar-matrix">
        <thead>
          <tr>
            <th class="unit-col-header">Birim / Gün</th>
    `;

    // 1..31 Gün başlıkları
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0: Pazar, 6: Cmt
      const dayName = this.turkishDays[dayOfWeek];
      const dateYMD = this.formatYMD(year, month, day);

      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const isToday = (dateYMD === todayYMD);

      let thClass = isWeekend ? 'weekend' : '';
      if (isToday) thClass += ' today';

      html += `
        <th class="${thClass}" title="${day} ${this.turkishMonths[month - 1]} ${year} (${dayName})">
          <div style="font-size:11px; opacity:0.8;">${dayName}</div>
          <div style="font-size:14px; font-weight:700;">${day}</div>
        </th>
      `;
    }

    html += `
          </tr>
        </thead>
        <tbody>
    `;

    // Birim satırları (Bungalov 1, Bungalov 2...)
    const typeLabel = this.getUnitTypeLabel(itemType);

    for (let unit = 1; unit <= unitCount; unit++) {
      html += `<tr>`;
      html += `<td class="unit-label-cell">${typeLabel} ${unit}</td>`;

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDateYMD = this.formatYMD(year, month, day);
        const cellInfo = this.getReservationForDay(reservations, unit, currentDateYMD);

        let cellClass = 'day-cell empty';
        let cellContent = '';
        let tooltipHtml = '';

        if (cellInfo.reservation) {
          const res = cellInfo.reservation;
          const isCheckIn = (cellInfo.isCheckIn);
          const isCheckOut = (cellInfo.isCheckOut);

          if (isCheckIn && isCheckOut) {
            cellClass = 'day-cell transition-day';
            cellContent = '⚡';
          } else if (isCheckIn) {
            cellClass = 'day-cell checkin-day';
            cellContent = '📥';
          } else if (isCheckOut) {
            cellClass = 'day-cell checkout-day';
            cellContent = '📤';
          } else {
            cellClass = 'day-cell occupied';
            cellContent = '🔴';
          }

          tooltipHtml = `
            <div class="custom-tooltip">
              <div class="tooltip-title">👤 ${this.escapeHtml(res.guest_name)}</div>
              <div class="tooltip-line">📞 ${this.escapeHtml(res.phone || 'Telefon Yok')}</div>
              <div class="tooltip-line">🪪 TC: ${this.escapeHtml(res.tc_no || '-')} | Kişi: ${res.guest_count || 1}</div>
              <div class="tooltip-line">📅 ${res.check_in} ➔ ${res.check_out}</div>
              ${res.total_price ? `<div class="tooltip-price">💰 Toplam: ${parseFloat(res.total_price).toLocaleString('tr-TR')} ₺</div>` : ''}
              ${res.notes ? `<div class="tooltip-line" style="font-style:italic; margin-top:3px;">📝 ${this.escapeHtml(res.notes)}</div>` : ''}
            </div>
          `;
        }

        html += `
          <td class="${cellClass}" 
              data-type="${itemType}" 
              data-unit="${unit}" 
              data-date="${currentDateYMD}"
              data-res-id="${cellInfo.reservation ? cellInfo.reservation.id : ''}">
            <div class="cell-badge">${cellContent}</div>
            ${tooltipHtml}
          </td>
        `;
      }

      html += `</tr>`;
    }

    html += `
        </tbody>
      </table>
    `;

    this.container.innerHTML = html;

    // Tıklama olaylarını bağla
    this.container.querySelectorAll('.day-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const itemType = cell.dataset.type;
        const unit = parseInt(cell.dataset.unit);
        const date = cell.dataset.date;
        const resId = cell.dataset.resId;

        if (onCellClick) {
          onCellClick({ itemType, unit, date, resId });
        }
      });
    });
  }

  // Belirli bir gün için rezervasyon durumu ve detayını bul
  getReservationForDay(reservations, unitNumber, dateYMD) {
    const targetDate = new Date(dateYMD).getTime();

    for (const res of reservations) {
      if (parseInt(res.unit_number) !== parseInt(unitNumber)) continue;

      const checkInTime = new Date(res.check_in).getTime();
      const checkOutTime = new Date(res.check_out).getTime();

      // check_in <= targetDate < check_out (Giriş günü kapsanır, çıkış günü öğleyin teslim edildiği varsayılır)
      if (targetDate >= checkInTime && targetDate <= checkOutTime) {
        const isCheckIn = (targetDate === checkInTime);
        const isCheckOut = (targetDate === checkOutTime);
        return {
          reservation: res,
          isCheckIn,
          isCheckOut
        };
      }
    }

    return { reservation: null };
  }

  getUnitTypeLabel(type) {
    const labels = {
      'bungalov': '🏠 Bungalov',
      'cadir': '⛺ Çadır',
      'dome': '🔵 Dome Çadır',
      'cadir_yeri': '📍 Çadır Yeri',
      'karavan': '🚐 Karavan',
      'karavan_yeri': '🅿️ Karavan Yeri'
    };
    return labels[type] || type;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.CalendarRenderer = CalendarRenderer;
