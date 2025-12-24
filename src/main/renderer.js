console.log("window.printer =", window.printer);

function cetak() {
  if (!window.printer) {
    alert("❌ PRELOAD TIDAK AKTIF");
    return;
  }

  window.printer.test()
    .then(res => {
      console.log("HASIL:", res);
      alert(res.success ? "Cetak OK" : res.message);
    })
    .catch(err => {
      console.error(err);
      alert("IPC Error");
    });
}
