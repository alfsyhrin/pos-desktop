// =====================
// IMPORT DATA HANDLER
// =====================

const API_BASE = "http://103.126.116.119:8001/api/backup/import";
const token = localStorage.getItem('token');

// Elements
const fileInput = document.getElementById('fileInput');
const importBtn = document.getElementById('importBtn');
const filePreview = document.getElementById('filePreview');
const fileList = document.getElementById('fileList');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const progressStatus = document.getElementById('progressStatus');

// Stats Elements
const totalFilesEl = document.getElementById('totalFiles');
const successCountEl = document.getElementById('successCount');
const totalSizeEl = document.getElementById('totalSize');
const lastImportEl = document.getElementById('lastImport');

// History Elements
const historyBody = document.getElementById('historyBody');

let uploadedFiles = [];

// ========== FILE UPLOAD LOGIC ==========
fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  for (let file of files) {
    if (!uploadedFiles.find(f => f.name === file.name)) {
      uploadedFiles.push(file);
    }
  }
  updateFilePreview();
  updateImportButton();
}

function updateFilePreview() {
  if (uploadedFiles.length > 0) {
    filePreview.classList.add('show');
    fileList.innerHTML = uploadedFiles.map((file, index) => `
      <div class="file-item">
        <span class="material-symbols-outlined">description</span>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${formatFileSize(file.size)}</div>
        </div>
        <button class="remove-file" onclick="window.removeFile(${index})">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    `).join('');
  } else {
    filePreview.classList.remove('show');
  }
}

window.removeFile = function(index) {
  uploadedFiles.splice(index, 1);
  updateFilePreview();
  updateImportButton();
};

function updateImportButton() {
  importBtn.disabled = uploadedFiles.length === 0;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ========== IMPORT BUTTON ==========
importBtn.addEventListener('click', async () => {
  if (uploadedFiles.length === 0) return;
  importBtn.classList.add('loading');
  importBtn.disabled = true;
  progressContainer.classList.add('show');
  progressStatus.textContent = "Mengimport...";
  progressPercent.textContent = "0%";
  progressFill.style.width = "0%";

  // Upload file ke backend
  for (let i = 0; i < uploadedFiles.length; i++) {
    const file = uploadedFiles[i];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`File ${file.name} berhasil diimport!`, 'success');
      } else {
        showToast(data.message || `Import ${file.name} gagal`, 'error');
      }
    } catch (err) {
      showToast(`Gagal import ${file.name}: ${err.message}`, 'error');
    }

    // Progress bar
    let percent = Math.round(((i + 1) / uploadedFiles.length) * 100);
    progressFill.style.width = percent + '%';
    progressPercent.textContent = percent + '%';
  }

  // Selesai
  progressStatus.textContent = "Selesai";
  setTimeout(() => {
    importBtn.classList.remove('loading');
    progressContainer.classList.remove('show');
    progressFill.style.width = '0%';
    uploadedFiles = [];
    updateFilePreview();
    updateImportButton();
    fetchImportStats();
    fetchImportHistory();
  }, 500);
});

// ========== TOAST ==========
function showToast(message, type) {
  toast.className = 'toast ' + type;
  toastMessage.textContent = message;
  toast.querySelector('.material-symbols-outlined').textContent =
    type === 'success' ? 'check_circle' : 'error';
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ========== GET IMPORT STATS ==========
async function fetchImportStats() {
  try {
    const res = await fetch(API_BASE + "/stats", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stats = await res.json();
    totalFilesEl.textContent = stats.total_files || 0;
    successCountEl.textContent = stats.success_count || 0;
    totalSizeEl.textContent = formatFileSize(stats.total_size || 0);
    lastImportEl.textContent = stats.last_import
      ? new Date(stats.last_import).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : "-";
  } catch (err) {
    totalFilesEl.textContent = "0";
    successCountEl.textContent = "0";
    totalSizeEl.textContent = "0 KB";
    lastImportEl.textContent = "-";
  }
}

// ========== GET IMPORT HISTORY ==========
async function fetchImportHistory() {
  try {
    const res = await fetch(API_BASE + "/history", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const history = await res.json();
    historyBody.innerHTML = "";
    history.forEach(item => {
      const dateStr = item.date
        ? new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        : "-";
      const statusClass = item.status === "success"
        ? "status-success"
        : (item.status === "pending" ? "status-pending" : "status-error");
      const statusIcon = item.status === "success"
        ? "check"
        : (item.status === "pending" ? "hourglass_empty" : "error");
      const statusText = item.status === "success"
        ? "Berhasil"
        : (item.status === "pending" ? "Pending" : "Gagal");
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.filename}</td>
        <td>${formatFileSize(item.size)}</td>
        <td>${dateStr}</td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="material-symbols-outlined">${statusIcon}</span>
            ${statusText}
          </span>
        </td>
      `;
      historyBody.appendChild(row);
    });
  } catch (err) {
    historyBody.innerHTML = `<tr><td colspan="4">Gagal memuat riwayat import</td></tr>`;
  }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  fetchImportStats();
  fetchImportHistory();
  updateImportButton();
});