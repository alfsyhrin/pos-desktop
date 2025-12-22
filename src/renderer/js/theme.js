document.addEventListener("DOMContentLoaded", () => {
  const btnDark = document.getElementById("btn-dark");
  const btnLight = document.getElementById("btn-light");

  // 1. Terapkan tema saat halaman dibuka
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "light") {
    document.body.classList.add("theme-light");
  } else {
    document.body.classList.remove("theme-light");
  }

  // 2. Tombol DARK
  if (btnDark) {
    btnDark.addEventListener("click", () => {
      document.body.classList.remove("theme-light");
      localStorage.setItem("theme", "dark");
    });
  }

  // 3. Tombol LIGHT
  if (btnLight) {
    btnLight.addEventListener("click", () => {
      document.body.classList.add("theme-light");
      localStorage.setItem("theme", "light");
    });
  }
});
