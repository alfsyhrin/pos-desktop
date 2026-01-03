// --- Icon mapping sesuai action ---
const actionIconMap = {
  login: "login",
  logout: "logout",
  add_product: "library_add",
  edit_product: "edit",
  delete_product: "delete",
  transaction: "receipt_long",
  delete_transaction: "receipt",
  add_user: "person_add",
  edit_user: "person_edit",
  delete_user: "person_remove",
  update_setting: "settings",
  backup_data: "cloud_download",
  import_data: "cloud_upload",
  reset_data: "refresh",
  update_owner: "person_edit",
  add_store: "store",
  delete_store: "store",
  update_business_profile: "business_center",
  update_subscription: "star",
  generate_daily_report: "add_task",
};

function getIconForAction(action) {
  return actionIconMap[action] || "info";
}

// --- Format waktu "x menit/jam lalu" ---
function formatRelativeTime(isoString) {
  const now = new Date();
  const time = new Date(isoString);
  const diffMs = now - time;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

let logPage = 1;
const logLimit = 10;
let logPages = 1;
let logTotal = 0;

// --- Render log aktivitas ke UI ---
window.renderActivityLogs = async function renderActivityLogs(page = 1) {
  const storeId = localStorage.getItem("store_id");
  const token = localStorage.getItem("token");
  const container = document.querySelector(".container-card-log");
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;color:#888;">Memuat log aktivitas...</div>';
  try {
    const res = await fetch(`http://103.126.116.119:8001/api/stores/${storeId}/activity-logs?page=${page}&limit=${logLimit}`, {
      headers: { Authorization: "Bearer " + token }
    });
    const json = await res.json();
    const logs = json.data?.items || [];
    logPage = json.data?.page || 1;
    logPages = json.data?.pages || 1;
    logTotal = json.data?.total || 0;

    if (!json.success || !logs.length) {
      container.innerHTML = '<div style="text-align:center;color:#888;">Belum ada log aktivitas.</div>';
      renderPagination(container);
      return;
    }
    logs.sort((a, b) => new Date(b.time) - new Date(a.time));
    container.innerHTML = logs.map(log => `
      <div class="card-log">
        <span class="material-symbols-outlined">${getIconForAction(log.action)}</span>
        <div class="info-log">
          <h3>${log.title}</h3>
          <p>${log.detail}</p>
        </div>
        <div class="waktu-log">
          <p>${log.user ?? '-'}</p>
          <p>${formatRelativeTime(log.time)}</p>
        </div>
      </div>
    `).join('');
    renderPagination(container);
  } catch (err) {
    container.innerHTML = '<div style="text-align:center;color:#E43636;">Gagal memuat log aktivitas.</div>';
  }
};

// --- Render tombol pagination ---
function renderPagination(container) {
  const pagDiv = document.createElement('div');
  pagDiv.className = 'pagination-log';
  pagDiv.style = 'display:flex;justify-content:center;align-items:center;margin:18px 0 0 0;gap:8px;';
  pagDiv.innerHTML = `
    <button id="log-prev" ${logPage <= 1 ? 'disabled' : ''} style="padding:4px 12px;">&laquo; Sebelumnya</button>
    <span>Halaman ${logPage} dari ${logPages} (${logTotal} log)</span>
    <button id="log-next" ${logPage >= logPages ? 'disabled' : ''} style="padding:4px 12px;">Berikutnya &raquo;</button>
  `;
  container.appendChild(pagDiv);

  pagDiv.querySelector('#log-prev').onclick = () => {
    if (logPage > 1) window.renderActivityLogs(logPage - 1);
  };
  pagDiv.querySelector('#log-next').onclick = () => {
    if (logPage < logPages) window.renderActivityLogs(logPage + 1);
  };
}

// --- SPA: panggil renderActivityLogs saat navigasi ke halaman log aktivitas ---