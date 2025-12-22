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

function saveEdit() {
  document.getElementById("namaToko").innerText =
    document.getElementById("editNama").value;

  document.getElementById("alamatToko").innerText =
    document.getElementById("editAlamat").value;

  document.getElementById("teleponToko").innerText =
    document.getElementById("editTelepon").value;

  closeModal();
}
