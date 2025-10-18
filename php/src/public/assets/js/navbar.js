document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.querySelector(".dropdown-toggle");
  const dropdownMenu = document.querySelector(".dropdown-content");

  if (!toggleBtn || !dropdownMenu) return;

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (!dropdownMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdownMenu.classList.remove("show");
    }
  });
});
