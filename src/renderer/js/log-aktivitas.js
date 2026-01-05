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

function parseApiTimeToUTC(isoString) {
  if (!isoString) return null;

  // jika tidak ada Z / offset → anggap UTC
  if (!isoString.includes("Z") && !isoString.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(isoString + "Z");
  }

  return new Date(isoString);
}


// --- Konversi ISO UTC -> Date WIT (UTC+9) ---
function toWITDate(isoString) {
  if (!isoString) return null;
  const utcDate = new Date(isoString);
  // WIT = UTC + 9 jam
  return new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
}


// --- Format waktu "x menit/jam lalu" ---
// --- Format waktu "x menit/jam lalu" (WIT) ---
// --- Format waktu "x menit/jam lalu" (AKURAT & ZONE-SAFE) ---
function formatRelativeTime(isoString) {
  if (!isoString) return "-";

  const apiTime = new Date(isoString);
  const now = new Date();

  // selisih awal (menit)
  let diffMs = now - apiTime;
  let diffMin = Math.floor(diffMs / 60000);

  // 🚑 AUTO FIX: kalau selisih absurd (>= 90 menit), koreksi 2 jam
  if (diffMin >= 90 && diffMin <= 180) {
    // asumsi backend ketinggalan 2 jam
    diffMs = diffMs - (2 * 60 * 60 * 1000);
    diffMin = Math.floor(diffMs / 60000);
  }

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}




function formatDateTimeWIT(isoString) {
  const d = parseApiTimeToUTC(isoString);
  if (!d) return "-";

  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jayapura",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
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
  pagDiv.style = 'display:flex;justify-content:center;align-items:center;margin:0 0 0 0;gap:8px;';
  pagDiv.innerHTML = `
    <button id="log-prev" class="previous-page"${logPage <= 1 ? 'disabled' : ''}><span class="material-symbols-outlined">arrow_back_ios_new</span></button>
    <span>${logPage} - ${logPages} (${logTotal})</span>
    <button id="log-next" class="next-page" ${logPage >= logPages ? 'disabled' : ''}><span class="material-symbols-outlined">arrow_forward_ios</span></button>
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