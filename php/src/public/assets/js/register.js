document.addEventListener("DOMContentLoaded", () => {
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const form = document.querySelector("form");
  const toggleBtns = document.querySelectorAll(".toggle-password");

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  toggleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const type = input.type === "password" ? "text" : "password";
      input.type = type;
      btn.textContent = type === "password" ? "Show" : "Hide";
    });
  });

  form.addEventListener("submit", (e) => {
    if (!passwordRegex.test(password.value)) {
      e.preventDefault();
      alert("Password harus minimal 8 karakter, mengandung huruf besar, huruf kecil, angka, dan simbol.");
      return;
    }

    if (password.value !== confirmPassword.value) {
      e.preventDefault();
      alert("Konfirmasi password tidak cocok!");
      return;
    }
  });
});
