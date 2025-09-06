// frontend/src/pages/login.ts
import { API_BASE, authHeaders, getToken, flash } from "../main";

const form = document.getElementById("loginForm") as HTMLFormElement;
const msg = document.getElementById("message")!;

// If already logged in (and token is valid), redirect away from login
(async function guardLoggedIn() {
  const t = getToken();
  if (!t) return;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      window.location.href = "/dashboard.html";
    } else if (res.status === 401) {
      localStorage.removeItem("token"); // invalid/expired
    }
  } catch {
    // ignore network errors; allow page
  }
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = (
    document.getElementById("email") as HTMLInputElement
  ).value.trim();
  const password = (document.getElementById("password") as HTMLInputElement)
    .value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (res.ok && json.token) {
      localStorage.setItem("token", json.token);
      window.location.href = "/dashboard.html";
    } else {
      flash(msg, "danger", json.error || JSON.stringify(json));
    }
  } catch (err: any) {
    flash(msg, "danger", err?.message || "Network error");
  }
});
