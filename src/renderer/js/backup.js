/**
 * Backup/Export Data Handler
 * Mendukung filter tanggal sesuai dokumentasi backend terbaru.
 */

function showExportToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  if (!toast || !toastMessage) return alert(message);
  toastMessage.textContent = message;
  toast.querySelector('.material-symbols-outlined').textContent = isError ? 'error' : 'check_circle';
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function exportData({ dataTypes, fileType, dateRanges, useZip }) {
  if (!Array.isArray(dataTypes) || !fileType) return;

  const token = localStorage.getItem('token');
  if (!token) {
    showExportToast('Token tidak ditemukan', true);
    return;
  }

  // Gabungkan dataTypes jadi string koma (multi-data)
  const dataParam = dataTypes.join(',');
  // Jika lebih dari satu data, hasil otomatis ZIP (type tetap dari user)
  let url = `http://103.126.116.119:8001/api/backup/export?data=${dataParam}&type=${fileType}`;

  // Tambahkan filter tanggal jika ada (hanya untuk satu data, misal transaksi)
  if (dataTypes.length === 1 && dateRanges && dateRanges[dataTypes[0]]) {
    const { start, end } = dateRanges[dataTypes[0]];
    if (start) url += `&start_date=${encodeURIComponent(start)}`;
    if (end) url += `&end_date=${encodeURIComponent(end)}`;
  }

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Export gagal');
    const blob = await res.blob();
    // Penamaan file: jika multi-data, pasti ZIP
    let ext = dataTypes.length > 1 || dataTypes[0] === 'all' ? 'zip' : (fileType === 'excel' ? 'xlsx' : fileType);
    let filename = `export_${dataParam.replace(/,/g, '_')}_${new Date().toISOString().slice(0,10)}.${ext}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showExportToast(`Export ${dataParam} berhasil diunduh!`);
  } catch (err) {
    showExportToast(`Export ${dataParam} gagal: ${err.message}`, true);
  }
}

// Integrasi dengan UI export_data.html
window.setupExportDataPage = function() {
  let selectedData = [];
  let selectedFileType = 'csv';
  let isExporting = false;

  const exportCards = document.querySelectorAll('.export-card');
  const fileTypeBtns = document.querySelectorAll('.file-type-btn');
  const exportBtn = document.getElementById('exportBtn');
  const exportHint = document.getElementById('exportHint');
  const selectedCount = document.getElementById('selectedCount');
  const zipCheckbox = document.getElementById('zipExport');

  exportCards.forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT') return;
      const dataId = this.dataset.id;
      if (selectedData.includes(dataId)) {
        selectedData = selectedData.filter(id => id !== dataId);
        this.classList.remove('selected');
      } else {
        selectedData.push(dataId);
        this.classList.add('selected');
      }
      updateUI();
    });
  });

  document.querySelectorAll('.date-range input').forEach(input => {
    input.addEventListener('click', function(e) { e.stopPropagation(); });
  });

  fileTypeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      fileTypeBtns.forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      selectedFileType = this.dataset.type;
    });
  });

  exportBtn.addEventListener('click', async function() {
    if (selectedData.length === 0 || isExporting) return;
    isExporting = true;
    exportBtn.classList.add('loading');
    exportBtn.innerHTML = `
      <span class="material-symbols-outlined">progress_activity</span>
      <span>Mengekspor...</span>
    `;

    // Jika user pilih "all", abaikan pilihan lain
    let exportDataTypes = selectedData.includes('all') ? ['all'] : selectedData;

    // Ambil date range per data (hanya dipakai jika satu data)
    const dateRanges = {};
    selectedData.forEach(id => {
      const startInput = document.getElementById(`${id}-start`);
      const endInput = document.getElementById(`${id}-end`);
      if (startInput || endInput) {
        dateRanges[id] = {
          start: startInput?.value || '',
          end: endInput?.value || ''
        };
      }
    });

    await exportData({
      dataTypes: exportDataTypes,
      fileType: selectedFileType,
      dateRanges,
      useZip: false // Sudah otomatis ZIP jika multi-data
    });

    isExporting = false;
    exportBtn.classList.remove('loading');
    exportBtn.innerHTML = `
      <span class="material-symbols-outlined">backup</span>
      <span>Export / Backup Data</span>
    `;
  });

  function updateUI() {
    const count = selectedData.length;
    selectedCount.textContent = count > 0 ? `${count} dipilih` : '';
    exportBtn.disabled = count === 0;
    exportHint.style.display = count === 0 ? 'block' : 'none';
  }

  updateUI();
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.querySelector('.main-wrapper')) {
    window.setupExportDataPage();
  }
});