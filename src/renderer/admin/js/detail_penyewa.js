const tenantsData = [
  {
    id: "1",
    businessName: "Toko Berkah Jaya",
    email: "berkah.jaya@email.com",
    phone: "+62 812 3456 7890",
    ownerStatus: "active",
    createdAt: "2024-01-15",
    plan: "pro",
    subscriptionStatus: "active",
    startDate: "2024-01-15",
    endDate: "2025-01-15",
    remainingDays: 180,
    paymentStatus: "paid",
    autoRenew: true,
    totalUsers: 5,
    activeUsers: 4,
    databaseName: "db_berkah_jaya",
    databaseStatus: "active",
  },
  {
    id: "2",
    businessName: "Warung Makan Sederhana",
    email: "warung.sederhana@email.com",
    phone: "+62 813 9876 5432",
    ownerStatus: "active",
    createdAt: "2024-02-20",
    plan: "standar",
    subscriptionStatus: "active",
    startDate: "2024-02-20",
    endDate: "2025-02-20",
    remainingDays: 215,
    paymentStatus: "paid",
    autoRenew: false,
    totalUsers: 2,
    activeUsers: 2,
    databaseName: "db_warung_sederhana",
    databaseStatus: "active",
  },
  {
    id: "3",
    businessName: "Apotek Sehat Selalu",
    email: "apotek.sehat@email.com",
    phone: "+62 814 1122 3344",
    ownerStatus: "suspended",
    createdAt: "2023-06-10",
    plan: "eksklusif",
    subscriptionStatus: "suspended",
    startDate: "2023-06-10",
    endDate: "2024-06-10",
    remainingDays: 0,
    paymentStatus: "unpaid",
    autoRenew: false,
    totalUsers: 10,
    activeUsers: 0,
    databaseName: "db_apotek_sehat",
    databaseStatus: "suspended",
  },
  {
    id: "4",
    businessName: "Butik Fashion Trendy",
    email: "butik.trendy@email.com",
    phone: "+62 815 5566 7788",
    ownerStatus: "active",
    createdAt: "2024-03-01",
    plan: "pro",
    subscriptionStatus: "active",
    startDate: "2024-03-01",
    endDate: "2025-01-05",
    remainingDays: 3,
    paymentStatus: "paid",
    autoRenew: true,
    totalUsers: 3,
    activeUsers: 3,
    databaseName: "db_butik_trendy",
    databaseStatus: "active",
  },
  {
    id: "5",
    businessName: "Cafe Kopi Nikmat",
    email: "kopi.nikmat@email.com",
    phone: "+62 816 9988 7766",
    ownerStatus: "active",
    createdAt: "2024-04-15",
    plan: "standar",
    subscriptionStatus: "active",
    startDate: "2024-04-15",
    endDate: "2025-01-10",
    remainingDays: 8,
    paymentStatus: "paid",
    autoRenew: false,
    totalUsers: 4,
    activeUsers: 3,
    databaseName: "db_kopi_nikmat",
    databaseStatus: "active",
  },
  {
    id: "6",
    businessName: "Toko Elektronik Modern",
    email: "elektronik.modern@email.com",
    phone: "+62 817 1234 5678",
    ownerStatus: "active",
    createdAt: "2023-12-01",
    plan: "eksklusif",
    subscriptionStatus: "expired",
    startDate: "2023-12-01",
    endDate: "2024-12-01",
    remainingDays: 0,
    paymentStatus: "unpaid",
    autoRenew: false,
    totalUsers: 8,
    activeUsers: 0,
    databaseName: "db_elektronik_modern",
    databaseStatus: "suspended",
  },
  {
    id: "7",
    businessName: "Restoran Padang Raya",
    email: "padang.raya@email.com",
    phone: "+62 818 8765 4321",
    ownerStatus: "active",
    createdAt: "2024-05-20",
    plan: "pro",
    subscriptionStatus: "active",
    startDate: "2024-05-20",
    endDate: "2025-01-08",
    remainingDays: 6,
    paymentStatus: "paid",
    autoRenew: true,
    totalUsers: 6,
    activeUsers: 5,
    databaseName: "db_padang_raya",
    databaseStatus: "active",
  },
  {
    id: "8",
    businessName: "Salon Cantik Alami",
    email: "salon.cantik@email.com",
    phone: "+62 819 2468 1357",
    ownerStatus: "active",
    createdAt: "2024-06-01",
    plan: "standar",
    subscriptionStatus: "active",
    startDate: "2024-06-01",
    endDate: "2025-01-12",
    remainingDays: 10,
    paymentStatus: "paid",
    autoRenew: true,
    totalUsers: 2,
    activeUsers: 2,
    databaseName: "db_salon_cantik",
    databaseStatus: "active",
  },
];

function getTenantById(id) {
  return tenantsData.find(function (t) {
    return t.id === id;
  });
}

function formatDateID(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function createStatusBadge(status) {
  const span = document.createElement("span");
  span.className =
    "badge badge-status " +
    (status === "active" || status === "paid"
      ? "badge-active"
      : status === "suspended" || status === "unpaid"
      ? "badge-suspended"
      : status === "expired"
      ? "badge-expired"
      : status === "pending"
      ? "badge-pending"
      : "");
  span.textContent =
    status === "active"
      ? "Aktif"
      : status === "suspended"
      ? "Suspend"
      : status === "expired"
      ? "Expired"
      : status === "pending"
      ? "Pending"
      : status === "paid"
      ? "Lunas"
      : status === "unpaid"
      ? "Belum Bayar"
      : status;
  return span;
}

function createPlanBadge(plan) {
  const span = document.createElement("span");
  span.className =
    "badge " +
    (plan === "eksklusif"
      ? "badge-plan-eksklusif"
      : plan === "pro"
      ? "badge-plan-pro"
      : "badge-plan-standar");
  span.textContent =
    plan === "eksklusif" ? "Eksklusif" : plan === "pro" ? "Pro" : "Standar";
  return span;
}

function showToast(title, desc) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-title").textContent = title;
  document.getElementById("toast-desc").textContent = desc;
  toast.classList.add("show");
  setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

function renderNotFound() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "not-found";
  wrapper.innerHTML = `
    <div class="not-found-inner">
      <span class="material-symbols-outlined" style="font-size:3rem;color:var(--muted-foreground);margin-bottom:1rem;">error</span>
      <div class="not-found-title">Penyewa Tidak Ditemukan</div>
      <button class="btn btn-primary mt-4" id="btn-back">
        Kembali ke Dashboard
      </button>
    </div>
  `;
  app.appendChild(wrapper);

  document.getElementById("btn-back").addEventListener("click", function () {
    window.location.href = "admin_dashboard.html";
  });
}

function renderTenantDetail(tenant) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const root = document.createElement("div");
  root.className = "min-h-screen bg-background transition-theme";

  const header = document.createElement("header");
  header.className = "bg-card border-border transition-theme";
  header.innerHTML = `
    <div class="container">
      <div class="inner">
        <div class="flex items-center gap-4">
          <button class="p-2 rounded-lg hover-bg-accent" id="btn-back-header">
            <span class="material-symbols-outlined" style="font-size:20px;">arrow_back</span>
          </button>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg" style="background:rgba(99,102,241,0.14);">
              <span class="material-symbols-outlined text-primary" style="font-size:24px;">store</span>
            </div>
            <div>
              <h1>${tenant.businessName}</h1>
              <p class="text-sm text-muted-foreground">Detail Penyewa</p>
            </div>
          </div>
        </div>
        <button class="theme-toggle" id="theme-toggle-btn">
          <span class="material-symbols-outlined" id="theme-icon">dark_mode</span>
          <span class="text-sm font-medium" id="theme-label">Mode Gelap</span>
        </button>
      </div>
    </div>
  `;
  root.appendChild(header);

  const main = document.createElement("main");
  main.className = "container";

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-2";

  const infoUmum = document.createElement("div");
  infoUmum.className = "info-card bg-card transition-theme";
  infoUmum.innerHTML = `
    <div class="info-card-header">
      <span class="material-symbols-outlined text-primary" style="font-size:20px;">info</span>
      <h3>Info Umum</h3>
    </div>
    <div class="info-row">
      <span class="info-row-label">Nama Bisnis</span>
      <span class="font-medium">${tenant.businessName}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Email</span>
      <span class="font-medium">${tenant.email}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Nomor HP</span>
      <span class="font-medium">${tenant.phone}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Status Owner</span>
      <span id="owner-status-container"></span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Dibuat Pada</span>
      <span class="font-medium">${formatDateID(tenant.createdAt)}</span>
    </div>
  `;

  const langganan = document.createElement("div");
  langganan.className = "info-card bg-card transition-theme";
  langganan.innerHTML = `
    <div class="info-card-header">
      <span class="material-symbols-outlined text-primary" style="font-size:20px;">card_membership</span>
      <h3>Langganan</h3>
    </div>
    <div class="info-row">
      <span class="info-row-label">Plan</span>
      <span id="plan-container"></span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Dimulai Pada</span>
      <span class="font-medium">${formatDateID(tenant.startDate)}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Diakhiri Pada</span>
      <span class="font-medium">${formatDateID(tenant.endDate)}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Sisa Hari</span>
      <span id="remaining-days" class="font-bold">${tenant.remainingDays} hari</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Status Pembayaran</span>
      <span id="payment-status-container"></span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Auto Renew</span>
      <span id="auto-renew" class="flex items-center gap-2 font-medium"></span>
    </div>
  `;

  const dbCard = document.createElement("div");
  dbCard.className = "info-card bg-card transition-theme";
  dbCard.innerHTML = `
    <div class="info-card-header">
      <span class="material-symbols-outlined text-primary" style="font-size:20px;">database</span>
      <h3>Database Penyewa</h3>
    </div>
    <div class="info-row">
      <span class="info-row-label">Nama Database</span>
      <span class="font-medium">${tenant.databaseName}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Status Database</span>
      <span id="db-status-container"></span>
    </div>
  `;

  const userCard = document.createElement("div");
  userCard.className = "info-card bg-card transition-theme";
  const percent = Math.round((tenant.activeUsers / tenant.totalUsers) * 100);
  userCard.innerHTML = `
    <div class="info-card-header">
      <span class="material-symbols-outlined text-primary" style="font-size:20px;">group</span>
      <h3>Pengguna</h3>
    </div>
    <div class="info-row">
      <span class="info-row-label">Total Pengguna</span>
      <span class="font-medium">${tenant.totalUsers}</span>
    </div>
    <div class="info-row">
      <span class="info-row-label">Pengguna Aktif</span>
      <span class="flex items-center gap-2">
        <span class="font-medium">${tenant.activeUsers}</span>
        <span class="text-xs text-muted-foreground">(${percent}%)</span>
      </span>
    </div>
  `;

  grid.appendChild(infoUmum);
  grid.appendChild(langganan);
  grid.appendChild(dbCard);
  grid.appendChild(userCard);
  main.appendChild(grid);

  const admin = document.createElement("div");
  admin.className = "admin-actions bg-card transition-theme";
  admin.innerHTML = `
    <div class="admin-actions-header">
      <span class="material-symbols-outlined text-primary" style="font-size:20px;">admin_panel_settings</span>
      <h3>Aksi Admin</h3>
    </div>
    <div class="admin-buttons">
      ${
        tenant.subscriptionStatus === "active"
          ? `
        <button class="btn btn-primary" id="btn-suspend">
          <span class="material-symbols-outlined" style="font-size:18px;">block</span>
          Suspend Penyewa
        </button>
      `
          : `
        <button class="btn btn-success" id="btn-activate">
          <span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>
          Aktifkan Penyewa
        </button>
      `
      }
      <button class="btn btn-outline-accent" id="btn-extend">
        <span class="material-symbols-outlined" style="font-size:18px;">event_repeat</span>
        Extend Subscription
      </button>
    </div>
  `;
  main.appendChild(admin);

  root.appendChild(main);
  app.appendChild(root);

  document
    .getElementById("owner-status-container")
    .appendChild(createStatusBadge(tenant.ownerStatus));
  document
    .getElementById("plan-container")
    .appendChild(createPlanBadge(tenant.plan));
  document
    .getElementById("payment-status-container")
    .appendChild(createStatusBadge(tenant.paymentStatus));
  document
    .getElementById("db-status-container")
    .appendChild(createStatusBadge(tenant.databaseStatus));

  const remainingEl = document.getElementById("remaining-days");
  if (tenant.remainingDays === 0) {
    remainingEl.style.color = "var(--muted-foreground)";
  } else if (tenant.remainingDays <= 7) {
    remainingEl.style.color = "var(--primary)";
  } else if (tenant.remainingDays <= 30) {
    remainingEl.style.color = "var(--warning)";
  } else {
    remainingEl.style.color = "var(--success)";
  }

  const autoRenewEl = document.getElementById("auto-renew");
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined";
  icon.style.fontSize = "16px";
  const text = document.createElement("span");
  if (tenant.autoRenew) {
    icon.textContent = "check_circle";
    autoRenewEl.style.color = "var(--success)";
    text.textContent = "Aktif";
  } else {
    icon.textContent = "cancel";
    autoRenewEl.style.color = "var(--muted-foreground)";
    text.textContent = "Tidak Aktif";
  }
  autoRenewEl.appendChild(icon);
  autoRenewEl.appendChild(text);

  document
    .getElementById("btn-back-header")
    .addEventListener("click", function () {
      window.location.href = "admin_dashboard.html";
    });

  const themeBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");
  const themeLabel = document.getElementById("theme-label");
  let isDark = true;

  function applyTheme() {
    if (isDark) {
      document.documentElement.classList.remove("light");
      themeIcon.textContent = "dark_mode";
      themeLabel.textContent = "Mode Gelap";
    } else {
      document.documentElement.classList.add("light");
      themeIcon.textContent = "light_mode";
      themeLabel.textContent = "Mode Terang";
    }
  }

  themeBtn.addEventListener("click", function () {
    isDark = !isDark;
    applyTheme();
  });

  applyTheme();

  const name = tenant.businessName;

  const btnSuspend = document.getElementById("btn-suspend");
  if (btnSuspend) {
    btnSuspend.addEventListener("click", function () {
      showToast("Aksi: Suspend Penyewa", "Suspend Penyewa berhasil dilakukan untuk " + name);
    });
  }

  const btnActivate = document.getElementById("btn-activate");
  if (btnActivate) {
    btnActivate.addEventListener("click", function () {
      showToast("Aksi: Aktifkan Penyewa", "Aktifkan Penyewa berhasil dilakukan untuk " + name);
    });
  }

  document.getElementById("btn-extend").addEventListener("click", function () {
    showToast("Aksi: Extend Subscription", "Extend Subscription berhasil dilakukan untuk " + name);
  });
}

(function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || "1";
  const tenant = getTenantById(id);
  if (!tenant) {
    renderNotFound();
  } else {
    renderTenantDetail(tenant);
  }
})();