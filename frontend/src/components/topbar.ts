(function initTopBar() {
  if (document.getElementById("global-topbar")) return;

  const bar = document.createElement("div");
  bar.id = "global-topbar";
  bar.className = "topbar";

  bar.innerHTML = `
    <div class="container py-2 d-flex align-items-center justify-content-between">
      <a href="/" class="d-flex align-items-center">
        <span class="fw-semibold">Uni Recommendation Portal</span>
      </a>
    </div>
  `;

  document.body.prepend(bar);
})();
