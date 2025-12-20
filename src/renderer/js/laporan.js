// Data
const produkTerlaris = [
  { rank: 1, nama: "Kopi Susu Gula Aren", terjual: 156, pendapatan: 3120000 },
  { rank: 2, nama: "Es Teh Manis", terjual: 142, pendapatan: 1420000 },
  { rank: 3, nama: "Nasi Goreng Spesial", terjual: 98, pendapatan: 2450000 },
  { rank: 4, nama: "Mie Ayam Bakso", terjual: 87, pendapatan: 1740000 },
  { rank: 5, nama: "Ayam Geprek", terjual: 76, pendapatan: 1900000 },
  { rank: 6, nama: "Es Jeruk", terjual: 68, pendapatan: 680000 },
  { rank: 7, nama: "Cappuccino", terjual: 54, pendapatan: 1350000 },
  { rank: 8, nama: "Americano", terjual: 48, pendapatan: 960000 },
  { rank: 9, nama: "Croissant", terjual: 42, pendapatan: 840000 },
  { rank: 10, nama: "Roti Bakar", terjual: 38, pendapatan: 570000 },
];

const produkMenipis = [
  { nama: "Kopi Arabika 250gr", stok: 5, minimum: 20 },
  { nama: "Gula Aren 1kg", stok: 8, minimum: 25 },
  { nama: "Susu Full Cream 1L", stok: 12, minimum: 30 },
  { nama: "Roti Tawar", stok: 3, minimum: 15 },
  { nama: "Telur Ayam", stok: 10, minimum: 50 },
];

const performaKaryawan = [
  { nama: "Budi Santoso", transaksi: 89, pendapatan: 4450000, rating: 4.8 },
  { nama: "Siti Rahayu", transaksi: 76, pendapatan: 3800000, rating: 4.6 },
  { nama: "Ahmad Yusuf", transaksi: 65, pendapatan: 3250000, rating: 4.5 },
  { nama: "Dewi Lestari", transaksi: 58, pendapatan: 2900000, rating: 4.4 },
  { nama: "Eko Prasetyo", transaksi: 45, pendapatan: 2250000, rating: 4.2 },
];

const penjualanKaryawan = [
  { nama: "Budi Santoso", transaksi: 89, pendapatan: 4450000 },
  { nama: "Siti Rahayu", transaksi: 76, pendapatan: 3800000 },
  { nama: "Ahmad Yusuf", transaksi: 65, pendapatan: 3250000 },
  { nama: "Dewi Lestari", transaksi: 58, pendapatan: 2900000 },
  { nama: "Eko Prasetyo", transaksi: 45, pendapatan: 2250000 },
  { nama: "Rina Wijaya", transaksi: 38, pendapatan: 1900000 },
  { nama: "Joko Susilo", transaksi: 32, pendapatan: 1600000 },
  { nama: "Maya Sari", transaksi: 28, pendapatan: 1400000 },
];

// Format Currency
function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value);
}

// Get Initials
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('');
}

// Tab Navigation + Hash Routes (laporan.html#dashboard, dst)
    const TAB_IDS = ['keuangan', 'dashboard', 'produk', 'karyawan'];

    function normalizeTabId(tabId) {
      return TAB_IDS.includes(tabId) ? tabId : 'keuangan';
    }

    function getTabFromHash() {
      const raw = (window.location.hash || '#keuangan').replace('#', '').trim();
      return normalizeTabId(raw);
    }

    function setActiveTab(tabId) {
      const activeId = normalizeTabId(tabId);

      document.querySelectorAll('.tab-btn').forEach((b) => {
        const isActive = b.getAttribute('data-tab') === activeId;
        b.classList.toggle('active', isActive);
        if (isActive) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });

      document.querySelectorAll('.tab-content').forEach((c) => {
        c.classList.toggle('active', c.id === activeId);
      });

      if (activeId === 'dashboard') {
        // Wait a tick so canvas size is correct when section just became visible
        setTimeout(initCharts, 50);
      }
    }

    function initTabNavigation() {
      document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          // Use hash as the "route" so it works on any website hosting this file
          e.preventDefault();
          const tabId = normalizeTabId(btn.getAttribute('data-tab') || 'keuangan');

          if (window.location.hash !== `#${tabId}`) {
            window.location.hash = tabId;
          } else {
            // If hash doesn't change, still update UI
            setActiveTab(tabId);
          }
        });
      });

      // Initial route
      const initialTab = getTabFromHash();
      if (!window.location.hash) {
        // Ensure a stable default URL for deep-linking
        history.replaceState(null, '', `#${initialTab}`);
      }
      setActiveTab(initialTab);

      // Listen for manual hash changes / back-forward
      window.addEventListener('hashchange', () => {
        setActiveTab(getTabFromHash());
        });
    }


// Filter Buttons - wrapped in function
function initFilterButtons() {
  document.querySelectorAll('.filter-buttons').forEach(group => {
    group.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
  });
}

// Render Product Lists
function renderProdukTerlaris() {
  const container = document.getElementById('produkTerlarisList');
  container.innerHTML = produkTerlaris.map(p => `
    <div class="list-item">
      <div class="list-item-left">
        <div class="rank-badge ${p.rank <= 3 ? 'top' : ''}">${p.rank}</div>
        <div class="list-item-info">
          <h4>${p.nama}</h4>
          <p>${p.terjual} terjual</p>
        </div>
      </div>
      <span class="list-item-value">${formatCurrency(p.pendapatan)}</span>
    </div>
  `).join('');
}

function renderProdukMenipis() {
  const container = document.getElementById('produkMenipisList');
  container.innerHTML = produkMenipis.map(p => `
    <div class="list-item">
      <div class="list-item-left">
        <span class="material-symbols-outlined" style="color: var(--primary-color);">inventory</span>
        <div class="list-item-info">
          <h4>${p.nama}</h4>
          <p>Min. stok: ${p.minimum}</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="list-item-value red">${p.stok}</span>
        <p style="font-size: 0.75rem; color: var(--paragraph-color);">tersisa</p>
      </div>
    </div>
  `).join('');
}

function renderPerformaKaryawan() {
  const container = document.getElementById('performaKaryawanList');
  container.innerHTML = performaKaryawan.map(k => `
    <div class="performance-card">
      <div class="performance-header">
        <div class="performance-left">
          <div class="avatar">${getInitials(k.nama)}</div>
          <div class="list-item-info">
            <h4>${k.nama}</h4>
            <p>${k.transaksi} transaksi</p>
          </div>
        </div>
        <div class="rating">
          <span class="material-symbols-outlined">star</span>
          <span>${k.rating}</span>
        </div>
      </div>
      <div class="performance-footer">
        <span style="font-size: 0.875rem; color: var(--paragraph-color);">Total Pendapatan</span>
        <span class="list-item-value">${formatCurrency(k.pendapatan)}</span>
      </div>
    </div>
  `).join('');
}

function renderPenjualanKaryawan() {
  const container = document.getElementById('penjualanKaryawanList');
  container.innerHTML = penjualanKaryawan.map((k, i) => `
    <div class="list-item">
      <div class="list-item-left">
        <div class="rank-badge ${i < 3 ? 'top' : ''}">${i + 1}</div>
        <div class="avatar green">${getInitials(k.nama)}</div>
        <div class="list-item-info">
          <h4>${k.nama}</h4>
          <p>${k.transaksi} transaksi</p>
        </div>
      </div>
      <span class="list-item-value">${formatCurrency(k.pendapatan)}</span>
    </div>
  `).join('');
}

// Initialize Charts
let charts = {};

function initCharts() {
  const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: '#3a2a2a' },
        ticks: { color: '#818386' }
      },
      y: {
        grid: { color: '#3a2a2a' },
        ticks: { color: '#818386' }
      }
    }
  };

  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  // Destroy existing charts
  Object.values(charts).forEach(chart => chart && chart.destroy());

  // Kas Keluar
  charts.kasKeluar = new Chart(document.getElementById('kasKeluarChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        data: [2500000, 1800000, 3200000, 2100000, 2800000, 4500000, 3100000],
        borderColor: '#E43636',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0
      }]
    },
    options: chartConfig
  });

  // Pie Chart
  charts.pie = new Chart(document.getElementById('pieChart'), {
    type: 'doughnut',
    data: {
      labels: ['Kas Masuk', 'Kas Keluar'],
      datasets: [{
        data: [45000000, 20000000],
        backgroundColor: ['#328E6E', '#E43636'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: '50%'
    }
  });

  // Saldo
  charts.saldo = new Chart(document.getElementById('saldoChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        data: [25000000, 28000000, 31000000, 34000000, 39000000, 44000000, 47000000],
        borderColor: '#328E6E',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0
      }]
    },
    options: chartConfig
  });

  // Kas Masuk
  charts.kasMasuk = new Chart(document.getElementById('kasMasukChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        data: [5500000, 4800000, 6200000, 5100000, 7800000, 9500000, 6100000],
        borderColor: '#328E6E',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0
      }]
    },
    options: chartConfig
  });

  // Penjualan Tertinggi
  charts.tertinggi = new Chart(document.getElementById('penjualanTertinggiChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        data: [1250000, 980000, 1450000, 1120000, 1680000, 2100000, 1350000],
        borderColor: '#328E6E',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0
      }]
    },
    options: chartConfig
  });

  // Penjualan Terendah
  charts.terendah = new Chart(document.getElementById('penjualanTerendahChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        data: [25000, 18000, 32000, 21000, 15000, 45000, 28000],
        borderColor: '#E43636',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0
      }]
    },
    options: chartConfig
  });

  // Rata-rata
  charts.rataRata = new Chart(document.getElementById('rataRataChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        data: [450000, 380000, 520000, 410000, 580000, 750000, 510000],
        borderColor: '#E43636',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0
      }]
    },
    options: chartConfig
  });
}

// Export Functions
function exportKeuanganPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(228, 54, 54);
  doc.text('Laporan Keuangan - PIPOS', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(129, 131, 134);
  doc.text('Tanggal: ' + new Date().toLocaleDateString('id-ID'), 14, 28);
  
  doc.autoTable({
    startY: 35,
    head: [['Kategori', 'Nilai', 'Keterangan']],
    body: [
      ['Total Pendapatan', 'Rp 18.500.000', '245 transaksi'],
      ['Diskon', 'Rp 850.000', 'Total diskon'],
      ['Pendapatan Bersih', 'Rp 17.650.000', 'Setelah diskon'],
      ['Modal / HPP', 'Rp 11.850.000', 'Estimasi biaya'],
      ['Laba Kotor', 'Rp 5.800.000', 'Pendapatan - Modal'],
      ['Laba Bersih', 'Rp 4.250.000', 'Margin 24.1%'],
      ['Rata-rata Transaksi', 'Rp 67.308', 'Per transaksi']
    ],
    headStyles: { fillColor: [228, 54, 54] },
    theme: 'grid'
  });
  
  doc.save('laporan-keuangan.pdf');
}

function exportKeuanganExcel() {
  const data = [
    ['Laporan Keuangan - PIPOS'],
    ['Tanggal: ' + new Date().toLocaleDateString('id-ID')],
    [],
    ['Kategori', 'Nilai', 'Keterangan'],
    ['Total Pendapatan', 'Rp 18.500.000', '245 transaksi'],
    ['Diskon', 'Rp 850.000', 'Total diskon'],
    ['Pendapatan Bersih', 'Rp 17.650.000', 'Setelah diskon'],
    ['Modal / HPP', 'Rp 11.850.000', 'Estimasi biaya'],
    ['Laba Kotor', 'Rp 5.800.000', 'Pendapatan - Modal'],
    ['Laba Bersih', 'Rp 4.250.000', 'Margin 24.1%'],
    ['Rata-rata Transaksi', 'Rp 67.308', 'Per transaksi']
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  XLSX.writeFile(wb, 'laporan-keuangan.xlsx');
}

function exportDashboardPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(228, 54, 54);
  doc.text('Dashboard - PIPOS', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(129, 131, 134);
  doc.text('Tanggal: ' + new Date().toLocaleDateString('id-ID'), 14, 28);
  
  doc.autoTable({
    startY: 35,
    head: [['Hari', 'Kas Masuk', 'Kas Keluar', 'Saldo']],
    body: [
      ['Senin', 'Rp 5.500.000', 'Rp 2.500.000', 'Rp 25.000.000'],
      ['Selasa', 'Rp 4.800.000', 'Rp 1.800.000', 'Rp 28.000.000'],
      ['Rabu', 'Rp 6.200.000', 'Rp 3.200.000', 'Rp 31.000.000'],
      ['Kamis', 'Rp 5.100.000', 'Rp 2.100.000', 'Rp 34.000.000'],
      ['Jumat', 'Rp 7.800.000', 'Rp 2.800.000', 'Rp 39.000.000'],
      ['Sabtu', 'Rp 9.500.000', 'Rp 4.500.000', 'Rp 44.000.000'],
      ['Minggu', 'Rp 6.100.000', 'Rp 3.100.000', 'Rp 47.000.000']
    ],
    headStyles: { fillColor: [228, 54, 54] },
    theme: 'grid'
  });
  
  doc.save('dashboard.pdf');
}

function exportDashboardExcel() {
  const data = [
    ['Dashboard - PIPOS'],
    ['Tanggal: ' + new Date().toLocaleDateString('id-ID')],
    [],
    ['Hari', 'Kas Masuk', 'Kas Keluar', 'Saldo'],
    ['Senin', 5500000, 2500000, 25000000],
    ['Selasa', 4800000, 1800000, 28000000],
    ['Rabu', 6200000, 3200000, 31000000],
    ['Kamis', 5100000, 2100000, 34000000],
    ['Jumat', 7800000, 2800000, 39000000],
    ['Sabtu', 9500000, 4500000, 44000000],
    ['Minggu', 6100000, 3100000, 47000000]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
  XLSX.writeFile(wb, 'dashboard.xlsx');
}

function exportProdukPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(228, 54, 54);
  doc.text('Laporan Produk - PIPOS', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(129, 131, 134);
  doc.text('Tanggal: ' + new Date().toLocaleDateString('id-ID'), 14, 28);
  
  doc.autoTable({
    startY: 35,
    head: [['Rank', 'Nama Produk', 'Terjual', 'Pendapatan']],
    body: produkTerlaris.map(p => [p.rank, p.nama, p.terjual, formatCurrency(p.pendapatan)]),
    headStyles: { fillColor: [228, 54, 54] },
    theme: 'grid'
  });
  
  doc.save('laporan-produk.pdf');
}

function exportProdukExcel() {
  const data = [
    ['Laporan Produk - PIPOS'],
    ['Tanggal: ' + new Date().toLocaleDateString('id-ID')],
    [],
    ['Rank', 'Nama Produk', 'Terjual', 'Pendapatan'],
    ...produkTerlaris.map(p => [p.rank, p.nama, p.terjual, p.pendapatan])
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produk');
  XLSX.writeFile(wb, 'laporan-produk.xlsx');
}

function exportKaryawanPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(228, 54, 54);
  doc.text('Laporan Karyawan - PIPOS', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(129, 131, 134);
  doc.text('Tanggal: ' + new Date().toLocaleDateString('id-ID'), 14, 28);
  
  doc.autoTable({
    startY: 35,
    head: [['Rank', 'Nama', 'Transaksi', 'Pendapatan', 'Rating']],
    body: penjualanKaryawan.map((k, i) => [
      i + 1,
      k.nama,
      k.transaksi,
      formatCurrency(k.pendapatan),
      performaKaryawan.find(p => p.nama === k.nama)?.rating || '-'
    ]),
    headStyles: { fillColor: [228, 54, 54] },
    theme: 'grid'
  });
  
  doc.save('laporan-karyawan.pdf');
}

function exportKaryawanExcel() {
  const data = [
    ['Laporan Karyawan - PIPOS'],
    ['Tanggal: ' + new Date().toLocaleDateString('id-ID')],
    [],
    ['Rank', 'Nama', 'Transaksi', 'Pendapatan', 'Rating'],
    ...penjualanKaryawan.map((k, i) => [
      i + 1,
      k.nama,
      k.transaksi,
      k.pendapatan,
      performaKaryawan.find(p => p.nama === k.nama)?.rating || '-'
    ])
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Karyawan');
  XLSX.writeFile(wb, 'laporan-karyawan.xlsx');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Initialize tab navigation first
  initTabNavigation();
  initFilterButtons();
  
  // Then render lists
  renderProdukTerlaris();
  renderProdukMenipis();
  renderPerformaKaryawan();
  renderPenjualanKaryawan();
});