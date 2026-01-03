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

function getStats() {
  const total = tenantsData.length;
  const active = tenantsData.filter(t => t.subscriptionStatus === "active").length;
  const suspended = tenantsData.filter(t => t.subscriptionStatus === "suspended").length;
  const expired = tenantsData.filter(t => t.subscriptionStatus === "expired").length;
  const expiringSoon = tenantsData.filter(t => t.remainingDays > 0 && t.remainingDays <= 30).length;
  return { total, active, suspended, expired, expiringSoon };
}

function getExpiringSoonTenants() {
  return tenantsData
    .filter(t => t.remainingDays > 0 && t.remainingDays <= 30)
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, 5);
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

function createStatCard(title, value, icon, variant) {
  const card = document.createElement("div");
  let variantClass = "border-l-4 border-l-muted-foreground";
  let iconClass = "stat-card-icon bg-muted text-muted-foreground";

  if (variant === "success") {
    variantClass = "border-l-4 border-l-success";
    iconClass = "stat-card-icon bg-success-bg text-success";
  } else if (variant === "warning") {
    variantClass = "border-l-4 border-l-warning";
    iconClass = "stat-card-icon bg-warning/10 text-warning";
  } else if (variant === "danger") {
    variantClass = "border-l-4 border-l-primary";
    iconClass = "stat-card-icon bg-primary/10 text-primary";
  }

  card.className = "stat-card transition-theme " + variantClass;
  card.innerHTML = `
    <div class="stat-card-inner">
      <div>
        <p class="text-muted-foreground text-sm mb-1">${title}</p>
        <p class="text-3xl font-bold">${value.toLocaleString()}</p>
      </div>
      <div class="${iconClass}">
        <span class="material-symbols-outlined" style="font-size:22px;">${icon}</span>
      </div>
    </div>
  `;
  return card;
}

function navigateToDetail(id) {
  // Sesuaikan nama file detail jika berbeda
  window.location.href = "detail_penyewa.html?id=" + encodeURIComponent(id);
}

function renderTenantsTable(tenants, title, compact) {
  const wrapper = document.createElement("div");
  wrapper.className = "bg-card rounded-lg p-5 transition-theme";

  if (title) {
    const header = document.createElement("div");
    header.className = "flex items-center gap-2 mb-4";
    header.innerHTML = `
      <span class="material-symbols-outlined ${compact ? "text-warning" : "text-primary"}" style="font-size:20px;">
        ${compact ? "schedule" : "group"}
      </span>
      <h3 class="text-lg font-semibold">${title}</h3>
    `;
    wrapper.appendChild(header);
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "overflow-x-auto";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  if (compact) {
    thead.innerHTML = `
      <tr>
        <th class="text-muted-foreground text-sm font-medium">Nama Bisnis</th>
        <th class="text-muted-foreground text-sm font-medium">Plan</th>
        <th class="text-muted-foreground text-sm font-medium">Sisa Hari</th>
        <th class="text-muted-foreground text-sm font-medium">Aksi</th>
      </tr>
    `;
    tenants.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-3 px-4 text-sm font-medium">${t.businessName}</td>
        <td class="py-3 px-4"></td>
        <td class="py-3 px-4">
          <span class="text-sm font-semibold ${
            t.remainingDays <= 7 ? "text-primary" : "text-warning"
          }">${t.remainingDays} hari</span>
        </td>
        <td class="py-3 px-4"></td>
      `;
      const planCell = tr.children[1];
      planCell.appendChild(createPlanBadge(t.plan));

      const actionCell = tr.children[3];
      const btn = document.createElement("button");
      btn.className = "btn btn-soft-primary";
      btn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
        Detail
      `;
      btn.addEventListener("click", () => navigateToDetail(t.id));
      actionCell.appendChild(btn);

      tbody.appendChild(tr);
    });
  } else {
    thead.innerHTML = `
      <tr>
        <th class="text-muted-foreground text-sm font-medium">Nama Bisnis</th>
        <th class="text-muted-foreground text-sm font-medium">Plan</th>
        <th class="text-muted-foreground text-sm font-medium">Status Langganan</th>
        <th class="text-muted-foreground text-sm font-medium">Sisa Hari</th>
        <th class="text-muted-foreground text-sm font-medium">Total User</th>
        <th class="text-muted-foreground text-sm font-medium">Status Database</th>
        <th class="text-muted-foreground text-sm font-medium">Status Owner</th>
        <th class="text-muted-foreground text-sm font-medium">Aksi</th>
      </tr>
    `;
    tenants.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-4 px-4 font-medium">${t.businessName}</td>
        <td class="py-4 px-4"></td>
        <td class="py-4 px-4"></td>
        <td class="py-4 px-4">
          <span class="font-semibold">${t.remainingDays} hari</span>
        </td>
        <td class="py-4 px-4">
          <div class="flex items-center gap-1">
            <span class="material-symbols-outlined text-muted-foreground" style="font-size:16px;">person</span>
            <span>${t.totalUsers}</span>
          </div>
        </td>
        <td class="py-4 px-4"></td>
        <td class="py-4 px-4"></td>
        <td class="py-4 px-4"></td>
      `;

      const remainSpan = tr.querySelector("td:nth-child(4) span");
      if (t.remainingDays === 0) {
        remainSpan.classList.add("text-muted-foreground");
      } else if (t.remainingDays <= 7) {
        remainSpan.classList.add("text-primary");
      } else if (t.remainingDays <= 30) {
        remainSpan.classList.add("text-warning");
      } else {
        remainSpan.classList.add("text-success");
      }

      tr.children[1].appendChild(createPlanBadge(t.plan));
      tr.children[2].appendChild(createStatusBadge(t.subscriptionStatus));
      tr.children[5].appendChild(createStatusBadge(t.databaseStatus));
      tr.children[6].appendChild(createStatusBadge(t.ownerStatus));

      const actionCell = tr.children[7];
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:16px;">visibility</span>
        Detail
      `;
      btn.addEventListener("click", () => navigateToDetail(t.id));
      actionCell.appendChild(btn);

      tbody.appendChild(tr);
    });
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrapper.appendChild(tableWrap);
  return wrapper;
}

function renderDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const root = document.createElement("div");
  root.className = "min-h-screen bg-background transition-theme";

  const header = document.createElement("header");
  header.className = "bg-card border-border transition-theme";
  header.innerHTML = `
    <div class="container">
      <div class="inner">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary/10 rounded-lg">
            <span class="material-symbols-outlined text-primary" style="font-size:24px;">dashboard</span>
          </div>
          <div>
            <h1 class="text-xl font-bold">Admin Dashboard</h1>
            <p class="text-sm text-muted-foreground">POS Kasir Management</p>
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

  const statsSection = document.createElement("section");
  statsSection.className = "mb-8";
  statsSection.innerHTML = `
    <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
      <span class="material-symbols-outlined text-primary" style="font-size:20px;">analytics</span>
      Ringkasan Penyewa
    </h2>
  `;
  const statsGrid = document.createElement("div");
  statsGrid.className = "grid sm-grid-cols-2 lg-grid-cols-5 gap-4";

  const stats = getStats();
  statsGrid.appendChild(createStatCard("Total Penyewa", stats.total, "groups", "default"));
  statsGrid.appendChild(createStatCard("Penyewa Aktif", stats.active, "check_circle", "success"));
  statsGrid.appendChild(createStatCard("Penyewa Suspend", stats.suspended, "block", "danger"));
  statsGrid.appendChild(createStatCard("Penyewa Expired", stats.expired, "event_busy", "default"));
  statsGrid.appendChild(createStatCard("Akan Expired", stats.expiringSoon, "schedule", "warning"));

  statsSection.appendChild(statsGrid);
  main.appendChild(statsSection);

  const tableSection = document.createElement("section");
  tableSection.className = "mb-8";
  tableSection.appendChild(renderTenantsTable(tenantsData, "Daftar Semua Penyewa", false));
  main.appendChild(tableSection);

  const expiringSoon = getExpiringSoonTenants();
  if (expiringSoon.length > 0) {
    const expSection = document.createElement("section");
    expSection.appendChild(
      renderTenantsTable(expiringSoon, "Penyewa Akan Expired (5 Teratas)", true)
    );
    main.appendChild(expSection);
  }

  root.appendChild(main);
  app.appendChild(root);

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
}

renderDashboard();