import { API_BASE, getToken, flash } from "../main";

const form = document.getElementById("registerForm") as HTMLFormElement;
const msg = document.getElementById("message")!;

const firstNameEl = document.getElementById("firstName") as HTMLInputElement;
const lastNameEl = document.getElementById("lastName") as HTMLInputElement;
const emailEl = document.getElementById("email") as HTMLInputElement;
const passwordEl = document.getElementById("password") as HTMLInputElement;

// If already logged in (and token is valid), redirect away from register
(async function guardLoggedIn() {
  const t = getToken();
  if (!t) return;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) window.location.href = "/dashboard.html";
    else if (res.status === 401) localStorage.removeItem("token");
  } catch {
    // ignore; allow page
  }
})();

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!firstName || !lastName || !email || !password) {
    flash(
      msg,
      "danger",
      "Email, password, first name, and last name are required."
    );
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Backend forces role=STUDENT; we send names now
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    const json = await res.json();
    if (res.ok) {
      flash(
        msg,
        "success",
        `Registered ${json.email} (${json.firstName ?? ""} ${
          json.lastName ?? ""
        }). Redirecting to login…`
      );
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
