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