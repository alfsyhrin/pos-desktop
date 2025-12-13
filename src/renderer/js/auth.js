function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // DUMMY LOGIN (sementara)
  if (email && password) {
    alert('Login berhasil (dummy)');
    window.location.href = 'dashboard.html';
  } else {
    alert('Email dan password wajib diisi');
  }
}
