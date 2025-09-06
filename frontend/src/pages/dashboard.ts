// frontend/src/pages/dashboard.ts
import { API_BASE, authHeaders, getToken, flash } from "../main";

type Role = "STUDENT" | "REVIEWER" | "ADMIN";

interface Me {
  id: number;
  email: string;
  role: Role;
}

interface SubmissionRow {
  id: number;
  title: string;
  status: string;
  filename: string;
  createdAt: string;
  student?: { id: number; email: string } | null;
}

interface UserRow {
  id: number;
  email: string;
  role: Role;
  tempPassword?: string; // only present when just created/reset
}

const msg = document.getElementById("message")!;
const welcome = document.getElementById("welcome")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement;

const studentSection = document.getElementById("student-section")!;
const reviewerSection = document.getElementById("reviewer-section")!;
const adminSection = document.getElementById("admin-section")!;

const submissionsBody = document.getElementById("submissions-body")!;
const usersBody = document.getElementById("users-body")!;

// Add User form elements
const addForm = document.getElementById(
  "add-user-form"
) as HTMLFormElement | null;
const addEmail = document.getElementById(
  "add-email"
) as HTMLInputElement | null;
const addRole = document.getElementById("add-role") as HTMLSelectElement | null;

// Redirect to login if not authenticated
if (!getToken()) {
  window.location.href = "/login.html";
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

async function loadMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    flash(msg, "danger", data.error || "Unauthorized");
    if (res.status === 401) window.location.href = "/login.html";
    return null;
  }
  return data as Me;
}

async function loadAllSubmissions(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/dashboard/submissions`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    submissionsBody.innerHTML = `<tr><td colspan="5" class="text-danger">${
      data.error || "Failed to load submissions"
    }</td></tr>`;
    return;
  }

  const rows = (data as SubmissionRow[]).map((s) => {
    const created = new Date(s.createdAt).toLocaleString();
    const owner = s.student?.email ?? "—";
    return `<tr>
      <td>${s.title}</td>
      <td><span class="badge text-bg-light">${s.status}</span></td>
      <td>${owner}</td>
      <td>${created}</td>
      <td><a href="${API_BASE}/uploads/${s.filename}" target="_blank" class="btn btn-sm btn-outline-secondary">Open</a></td>
    </tr>`;
  });

  submissionsBody.innerHTML = rows.length
    ? rows.join("")
    : `<tr><td colspan="5" class="text-muted">No submissions</td></tr>`;
}

function userRowHtml(u: UserRow): string {
  const select = `
    <select class="form-select form-select-sm" data-role-of="${u.id}">
      <option value="STUDENT"${
        u.role === "STUDENT" ? " selected" : ""
      }>STUDENT</option>
      <option value="REVIEWER"${
        u.role === "REVIEWER" ? " selected" : ""
      }>REVIEWER</option>
      <option value="ADMIN"${
        u.role === "ADMIN" ? " selected" : ""
      }>ADMIN</option>
    </select>
  `;
  const temp = u.tempPassword ? `<code>${u.tempPassword}</code>` : "";
  return `<tr data-user="${u.id}">
    <td>${u.id}</td>
    <td>${u.email}</td>
    <td>${select}</td>
    <td><button class="btn btn-sm btn-primary" data-update="${u.id}">Update</button></td>
    <td><button class="btn btn-sm btn-warning" data-reset="${u.id}">Reset Password</button></td>
    <td data-temp-of="${u.id}">${temp}</td>
    <td><button class="btn btn-sm btn-outline-danger" data-delete="${u.id}">Delete</button></td>
  </tr>`;
}

async function loadUsers(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    usersBody.innerHTML = `<tr><td colspan="7" class="text-danger">${
      data.error || "Failed to load users"
    }</td></tr>`;
    return;
  }

  const rows = (data as UserRow[]).map(userRowHtml);
  usersBody.innerHTML = rows.length
    ? rows.join("")
    : `<tr><td colspan="7" class="text-muted">No users</td></tr>`;

  wireUserTableActions();
}

function wireUserTableActions(): void {
  // Role update
  usersBody.querySelectorAll("button[data-update]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = Number((e.currentTarget as HTMLButtonElement).dataset.update);
      const roleSel = usersBody.querySelector<HTMLSelectElement>(
        `select[data-role-of="${id}"]`
      );
      const newRole = roleSel?.value as Role | undefined;

      if (!newRole) return;

      const res = await fetch(`${API_BASE}/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        flash(msg, "success", `Updated user ${data.email} to ${data.role}`);
      } else {
        flash(msg, "danger", data.error || "Failed to update role");
      }
    });
  });

  // Reset password
  usersBody.querySelectorAll("button[data-reset]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = Number((e.currentTarget as HTMLButtonElement).dataset.reset);
      if (!confirm(`Reset password for user ID ${id}?`)) return;

      const res = await fetch(
        `${API_BASE}/api/admin/users/${id}/reset-password`,
        {
          method: "POST",
          headers: { ...authHeaders() },
        }
      );
      const data = await res.json();

      if (res.ok && data.tempPassword) {
        // Put temp password into the row cell for this session
        const cell = usersBody.querySelector<HTMLElement>(
          `[data-temp-of="${id}"]`
        );
        if (cell) cell.innerHTML = `<code>${data.tempPassword}</code>`;
        try {
          await navigator.clipboard.writeText(data.tempPassword);
          flash(
            msg,
            "success",
            `Temporary password generated and copied to clipboard.`
          );
        } catch {
          flash(msg, "success", `Temporary password: ${data.tempPassword}`);
        }
      } else {
        flash(msg, "danger", data.error || "Failed to reset password");
      }
    });
  });

  // Delete user
  usersBody.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = Number((e.currentTarget as HTMLButtonElement).dataset.delete);
      if (
        !confirm(
          `Delete user ID ${id}? This removes their submissions and reviews.`
        )
      )
        return;

      const res = await fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      const data = await res.json();

      if (res.ok && data.deleted) {
        const row = usersBody.querySelector<HTMLElement>(
          `tr[data-user="${id}"]`
        );
        if (row) row.remove();
        flash(msg, "success", `Deleted user ${id}.`);
      } else {
        flash(msg, "danger", data.error || "Failed to delete user");
      }
    });
  });
}

function wireAddUserForm(): void {
  if (!addForm || !addEmail || !addRole) return;

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = addEmail.value.trim();
    const role = addRole.value as Role;

    if (!email) {
      flash(msg, "danger", "Email is required.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();

    if (res.ok && data.id) {
      // Add to table with temp password visible for this session
      const before = usersBody.innerHTML;
      const newRow = userRowHtml(data as UserRow);
      usersBody.innerHTML = before.includes("No users")
        ? newRow
        : before + newRow;

      // Copy temp password if present
      if ((data as UserRow).tempPassword) {
        try {
          await navigator.clipboard.writeText((data as UserRow).tempPassword!);
          flash(
            msg,
            "success",
            `User created. Temp password copied to clipboard.`
          );
        } catch {
          flash(
            msg,
            "success",
            `User created. Temp password: ${(data as UserRow).tempPassword}`
          );
        }
      } else {
        flash(msg, "success", `User created.`);
      }

      // Clear form and re-wire actions so new row buttons work
      addForm.reset();
      wireUserTableActions();
    } else {
      flash(msg, "danger", data.error || "Failed to add user");
    }
  });
}

async function init(): Promise<void> {
  const me = await loadMe();
  if (!me) return;

  welcome.textContent = `Welcome, ${me.role} (${me.email})`;

  // STUDENT: only student section
  if (me.role === "STUDENT") {
    studentSection.classList.remove("d-none");
    reviewerSection.classList.add("d-none");
    adminSection.classList.add("d-none");
    return;
  }

  // REVIEWER: reviewer-only section
  if (me.role === "REVIEWER") {
    reviewerSection.classList.remove("d-none");
    studentSection.classList.add("d-none");
    adminSection.classList.add("d-none");
    await loadAllSubmissions();
    return;
  }

  // ADMIN: all sections
  if (me.role === "ADMIN") {
    studentSection.classList.remove("d-none");
    reviewerSection.classList.remove("d-none");
    adminSection.classList.remove("d-none");
    wireAddUserForm();
    await Promise.all([loadAllSubmissions(), loadUsers()]);
    return;
  }
}

init().catch((err) => {
  console.error(err);
  flash(msg, "danger", "Failed to initialize dashboard");
});
