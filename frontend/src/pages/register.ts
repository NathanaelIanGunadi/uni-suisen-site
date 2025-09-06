// frontend/src/pages/register.ts
import { API_BASE, authHeaders, getToken, flash } from "../main";

const form = document.getElementById("registerForm") as HTMLFormElement;
const msg = document.getElementById("message")!;

// If already logged in (and token is valid), redirect away from register
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

  if (!email || !password) {
    flash(msg, "danger", "Email and password are required.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 🔒 no role provided; backend forces STUDENT
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (res.ok) {
      flash(
        msg,
        "success",
        `Registered ${json.email} (role: ${json.role}). Redirecting to login…`
      );
      // redirect to login so they can sign in
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1200);
    } else {
      flash(msg, "danger", json.error || JSON.stringify(json));
    }
  } catch (err: any) {
    flash(msg, "danger", err?.message || "Network error");
  }
});
