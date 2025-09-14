import { API_BASE, authHeaders, getToken, flash } from "../main";
import {
  type SubmissionRow,
  renderStaffRows,
  renderStudentRows,
  sortStaff,
  sortStudent,
  wireSortable,
  type StaffSortKey,
  type StuSortKey,
  type SortDir,
} from "../components/submissionTables";

type Role = "STUDENT" | "REVIEWER" | "ADMIN";

interface Me {
  id: number;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
}

const msg = document.getElementById("message")!;
const welcome = document.getElementById("welcome")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement;

const studentSection = document.getElementById("student-section")!;
const reviewerSection = document.getElementById("reviewer-section")!;
const adminSection = document.getElementById("admin-section")!;
const chkNotifyDecision = document.getElementById(
  "chk-notify-decision"
) as HTMLInputElement | null;
const chkNotifyNew = document.getElementById(
  "chk-notify-new"
) as HTMLInputElement | null;

type Prefs = {
  notifyOnNewSubmission: boolean;
  notifyOnReviewDecision: boolean;
  role: Role;
  email: string;
};

const staffBody = document.getElementById(
  "submissions-body"
) as HTMLElement | null;
const studentBody = document.getElementById(
  "student-subs-body"
) as HTMLElement | null;

// Admin user-management elements
const usersBody = document.getElementById("users-body") as HTMLElement | null;
const addForm = document.getElementById(
  "add-user-form"
) as HTMLFormElement | null;
const addFirstName = document.getElementById(
  "add-firstName"
) as HTMLInputElement | null;
const addLastName = document.getElementById(
  "add-lastName"
) as HTMLInputElement | null;
const addEmail = document.getElementById(
  "add-email"
) as HTMLInputElement | null;
const addRoleSel = document.getElementById(
  "add-role"
) as HTMLSelectElement | null;

if (!getToken()) window.location.href = "/login.html";

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

// Sort state
let staffRows: SubmissionRow[] = [];
let studentRows: SubmissionRow[] = [];

let staffSortKey: StaffSortKey = "createdAt";
let staffSortDir: SortDir = "desc";

let stuSortKey: StuSortKey = "createdAt";
let stuSortDir: SortDir = "desc";

// API
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

async function fetchStaffSubmissions(): Promise<SubmissionRow[]> {
  const res = await fetch(`${API_BASE}/api/submissions/all`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    flash(msg, "danger", data.error || "Failed to load submissions");
    return [];
  }
  return data as SubmissionRow[];
}

async function fetchMySubmissions(): Promise<SubmissionRow[]> {
  const res = await fetch(`${API_BASE}/api/submissions/my-submissions`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    flash(msg, "danger", data.error || "Failed to load your submissions");
    return [];
  }
  return data as SubmissionRow[];
}

// Render
function setWelcomeColor(role: Role): void {
  welcome.classList.remove("text-primary", "text-info", "text-success");
  if (role === "STUDENT") welcome.classList.add("text-primary");
  else if (role === "REVIEWER") welcome.classList.add("text-info");
  else welcome.classList.add("text-success"); // ADMIN
}

function renderStaffTable(): void {
  if (!staffBody) return;
  const sorted = sortStaff(staffRows, staffSortKey, staffSortDir);
  renderStaffRows(staffBody, sorted, API_BASE);
}

function renderStudentTable(): void {
  if (!studentBody) return;
  const sorted = sortStudent(studentRows, stuSortKey, stuSortDir);
  renderStudentRows(studentBody, sorted, API_BASE);
}

// Admin Users
type UserRow = {
  id: number;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  tempPassword?: string;
};

function userRowHtml(u: UserRow): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
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
    <td>${name}</td>
    <td>${u.email}</td>
    <td>${select}</td>
    <td><button class="btn btn-sm btn-primary" data-update="${u.id}">Update</button></td>
    <td><button class="btn btn-sm btn-warning" data-reset="${u.id}">Reset</button></td>
    <td data-temp-of="${u.id}">${temp}</td>
    <td><button class="btn btn-sm btn-outline-danger" data-delete="${u.id}">Delete</button></td>
  </tr>`;
}

async function loadUsers(): Promise<void> {
  if (!usersBody) return;
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    usersBody.innerHTML = `<tr><td colspan="8" class="text-danger">${
      data.error || "Failed to load users"
    }</td></tr>`;
    return;
  }
  const rows = (data as UserRow[]).map(userRowHtml);
  usersBody.innerHTML = rows.length
    ? rows.join("")
    : `<tr><td colspan="8" class="text-muted">No users</td></tr>`;
  wireUserTableActions();
}

function wireUserTableActions(): void {
  if (!usersBody) return;

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
      if (res.ok)
        flash(msg, "success", `Updated ${data.email} to ${data.role}`);
      else flash(msg, "danger", data.error || "Failed to update role");
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
        const cell = usersBody.querySelector<HTMLElement>(
          `[data-temp-of="${id}"]`
        );
        if (cell) cell.innerHTML = `<code>${data.tempPassword}</code>`;
        try {
          await navigator.clipboard.writeText(data.tempPassword);
          flash(msg, "success", `Temporary password copied to clipboard.`);
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
  if (!addForm || !addEmail || !addRoleSel) return;

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = addFirstName?.value.trim() || undefined;
    const lastName = addLastName?.value.trim() || undefined;
    const email = addEmail.value.trim();
    const role = addRoleSel.value as Role;

    if (!email) {
      flash(msg, "danger", "Email is required.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ email, role, firstName, lastName }),
    });
    const data = await res.json();

    if (res.ok && data.id) {
      if (!usersBody) return;
      const before = usersBody.innerHTML;
      const newRow = userRowHtml(data as UserRow);
      usersBody.innerHTML = before.includes("No users")
        ? newRow
        : before + newRow;

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

  const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ");
  welcome.textContent = `Welcome, ${fullName || me.email} (${me.role})`;
  setWelcomeColor(me.role);

  // Student view
  if (me.role === "STUDENT") {
    const prefs = await loadPrefs();
    if (prefs && chkNotifyDecision) {
      chkNotifyDecision.checked = !!prefs.notifyOnReviewDecision;
      chkNotifyDecision.addEventListener("change", async () => {
        await updatePrefs({
          notifyOnReviewDecision: chkNotifyDecision.checked,
        });
        flash(msg, "success", "Saved preference.");
      });
    }

    studentSection.classList.remove("d-none");
    reviewerSection.classList.add("d-none");
    adminSection.classList.add("d-none");

    if (studentBody) {
      studentRows = await fetchMySubmissions();
      renderStudentTable();
      wireSortable(studentSection, (key) => {
        const k = key as StuSortKey;
        if (stuSortKey === k)
          stuSortDir = stuSortDir === "asc" ? "desc" : "asc";
        else {
          stuSortKey = k;
          stuSortDir = k === "createdAt" ? "desc" : "asc";
        }
        renderStudentTable();
      });
    }
    return;
  }

  // Reviewer view
  if (me.role === "REVIEWER") {
    const prefs = await loadPrefs();
    if (prefs && chkNotifyNew) {
      chkNotifyNew.checked = !!prefs.notifyOnNewSubmission;
      chkNotifyNew.addEventListener("change", async () => {
        await updatePrefs({ notifyOnNewSubmission: chkNotifyNew.checked });
        flash(msg, "success", "Saved preference.");
      });
    }

    reviewerSection.classList.remove("d-none");
    studentSection.classList.add("d-none");
    adminSection.classList.add("d-none");

    staffRows = await fetchStaffSubmissions();
    renderStaffTable();
    wireSortable(reviewerSection, (key) => {
      const k = key as StaffSortKey;
      if (staffSortKey === k)
        staffSortDir = staffSortDir === "asc" ? "desc" : "asc";
      else {
        staffSortKey = k;
        staffSortDir = k === "createdAt" ? "desc" : "asc";
      }
      renderStaffTable();
    });
    return;
  }

  // Admin view
  if (me.role === "ADMIN") {
    const prefs = await loadPrefs();
    if (prefs) {
      if (chkNotifyDecision) {
        chkNotifyDecision.checked = !!prefs.notifyOnReviewDecision;
        chkNotifyDecision.addEventListener("change", async () => {
          await updatePrefs({
            notifyOnReviewDecision: chkNotifyDecision.checked,
          });
          flash(msg, "success", "Saved preference.");
        });
      }
      if (chkNotifyNew) {
        chkNotifyNew.checked = !!prefs.notifyOnNewSubmission;
        chkNotifyNew.addEventListener("change", async () => {
          await updatePrefs({ notifyOnNewSubmission: chkNotifyNew.checked });
          flash(msg, "success", "Saved preference.");
        });
      }
    }

    studentSection.classList.remove("d-none");
    reviewerSection.classList.remove("d-none");
    adminSection.classList.remove("d-none");

    if (studentBody) {
      studentRows = await fetchMySubmissions();
      renderStudentTable();
      wireSortable(studentSection, (key) => {
        const k = key as StuSortKey;
        if (stuSortKey === k)
          stuSortDir = stuSortDir === "asc" ? "desc" : "asc";
        else {
          stuSortKey = k;
          stuSortDir = k === "createdAt" ? "desc" : "asc";
        }
        renderStudentTable();
      });
    }

    staffRows = await fetchStaffSubmissions();
    renderStaffTable();
    wireSortable(reviewerSection, (key) => {
      const k = key as StaffSortKey;
      if (staffSortKey === k)
        staffSortDir = staffSortDir === "asc" ? "desc" : "asc";
      else {
        staffSortKey = k;
        staffSortDir = k === "createdAt" ? "desc" : "asc";
      }
      renderStaffTable();
    });

    wireAddUserForm();
    await loadUsers();
  }
}

async function loadPrefs(): Promise<Prefs | null> {
  const r = await fetch(`${API_BASE}/api/user/preferences`, {
    headers: authHeaders(),
  });
  try {
    return (await r.json()) as Prefs;
  } catch {
    return null;
  }
}

async function updatePrefs(p: Partial<Prefs>): Promise<void> {
  await fetch(`${API_BASE}/api/user/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(p),
  });
}

init().catch((err) => {
  console.error(err);
  flash(msg, "danger", "Failed to initialize dashboard");
});
