function openModal() {
  document.getElementById("modalEditToko").classList.add("active");

  // isi form dari data lama
  document.getElementById("editNama").value =
    document.getElementById("namaToko").innerText;

  document.getElementById("editAlamat").value =
    document.getElementById("alamatToko").innerText;

  document.getElementById("editTelepon").value =
    document.getElementById("teleponToko").innerText;
}

function closeModal() {
  document.getElementById("modalEditToko").classList.remove("active");
}

async function saveEdit() {
  const storeId = localStorage.getItem('store_id');
  const token = localStorage.getItem('token');
  const name = document.getElementById("editNama").value;
  const address = document.getElementById("editAlamat").value;
  const phone = document.getElementById("editTelepon").value;

  try {
    const res = await fetch(`http://103.126.116.119:5000/api/stores/${storeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, address, phone })
    });
    const data = await res.json();
    if (data.success) {
      if (window.showToast) showToast('Informasi toko berhasil diupdate', 'success');
      // update tampilan
      document.getElementById("namaToko").innerText = name;
      document.getElementById("alamatToko").innerText = address;
      document.getElementById("teleponToko").innerText = phone;
      closeModal();
    } else {
      if (window.showToast) showToast('Gagal update toko: ' + (data.message || ''), 'error');
    }
  } catch (e) {
    if (window.showToast) showToast('Gagal update toko: ' + e.message, 'error');
  }
}
