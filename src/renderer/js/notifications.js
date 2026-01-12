// ...new file...
(function(){
  if (window.showToast) return;
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = 'position:fixed;top:18px;right:18px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(container));
  function makeToast(msg, type='info') {
    const t = document.createElement('div');
    t.className = 'app-toast ' + type;
    t.style.cssText = [
      'pointer-events:auto',
      'min-width:220px',
      'max-width:420px',
      'background:#222',
      'color:#fff',
      'padding:10px 14px',
      'border-radius:8px',
      'box-shadow:0 6px 20px rgba(0,0,0,0.4)',
      'font-family:Inter, system-ui, sans-serif',
      'font-size:13px',
      'opacity:0',
      'transform:translateY(-8px)',
      'transition:opacity .18s ease,transform .18s ease'
    ].join(';');
    if (type === 'success') t.style.background = '#0f9d58';
    if (type === 'error') t.style.background = '#d32f2f';
    if (type === 'warn') t.style.background = '#f39c12';
    t.textContent = msg;
    return t;
  }
  window.showToast = function(msg, type='info', duration=2600) {
    if (!document.body.contains(container)) document.body.appendChild(container);
    const t = makeToast(msg, type);
    container.appendChild(t);
    // enter
    requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateY(0)'; });
    return new Promise(resolve=>{
      const hide = () => {
        t.style.opacity='0'; t.style.transform='translateY(-8px)';
        setTimeout(()=>{ try{ container.removeChild(t); }catch(e){} resolve(); }, 220);
      };
      setTimeout(hide, duration);
      t.addEventListener('click', hide);
    });
  };
})();

window.showConfirm = function(msg, opts = {}) {
  return new Promise(resolve => {
    // Hapus modal lama jika ada
    let old = document.getElementById('app-confirm-modal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-confirm-modal';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:100000;
      background:rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;
      animation:fadein .18s;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:#fff;min-width:320px;max-width:90vw;padding:28px 22px 18px 22px;
      border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);
      font-family:Inter,system-ui,sans-serif;text-align:center;position:relative;
      animation:popin .18s;
    `;

    box.innerHTML = `
      <div style="font-size:18px;font-weight:600;color:#222;margin-bottom:10px;">
        Konfirmasi Logout
      </div>
      <div style="font-size:15px;color:#444;margin-bottom:22px;">
        ${msg || 'Yakin ingin logout dari aplikasi?'}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;">
        <button id="btn-cancel-logout" style="
          padding:8px 22px;border:none;border-radius:7px;
          background:#eee;color:#333;font-weight:500;font-size:14px;cursor:pointer;
          transition:background .15s;
        ">Batal</button>
        <button id="btn-ok-logout" style="
          padding:8px 22px;border:none;border-radius:7px;
          background:#d32f2f;color:#fff;font-weight:600;font-size:14px;cursor:pointer;
          transition:background .15s;
        ">Logout</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('btn-cancel-logout').onclick = () => {
      overlay.remove();
      resolve(false);
    };
    document.getElementById('btn-ok-logout').onclick = () => {
      overlay.remove();
      resolve(true);
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    };
  });
};

// Optional: animasi
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadein { from { opacity:0 } to { opacity:1 } }
@keyframes popin { from { transform:scale(.95);opacity:0 } to { transform:scale(1);opacity:1 } }
`;
document.head.appendChild(style);