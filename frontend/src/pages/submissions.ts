import { API_BASE, authHeaders, getToken, flash } from "../main";
import {
  type SubmissionRow,
  renderStaffRows,
  sortStaff,
  type StaffSortKey,
  type SortDir,
} from "../components/submissionTables";

type Role = "STUDENT" | "REVIEWER" | "ADMIN";

interface Me {
  id: number;
  role: Role;
}

const msg = document.getElementById("message")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement;
const searchInput = document.getElementById("search") as HTMLInputElement;
const bodyEl = document.getElementById("subs-body") as HTMLElement;

if (!getToken()) window.location.href = "/login.html";

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

let rows: SubmissionRow[] = [];
let index: string[] = [];

let sortKey: StaffSortKey = "createdAt";
let sortDir: SortDir = "desc";

const indexText = (s: SubmissionRow): string => {
  const student =
    [s.student?.firstName, s.student?.lastName].filter(Boolean).join(" ") ||
    s.student?.email ||
    "";
  const latest = s.reviews?.[0];
  const reviewBits = latest ? [latest.comments || ""].join(" ") : "";
  return [s.id, s.title, s.status, s.filename, s.createdAt, student, reviewBits]
    .join(" ")
    .toLowerCase();
};

async function guardRole(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  const me: Me = await res.json();
  if (!res.ok || (me.role !== "ADMIN" && me.role !== "REVIEWER")) {
    window.location.href = "/dashboard.html";
  }
}

function render(list: SubmissionRow[]): void {
  const sorted = sortStaff(list, sortKey, sortDir);
  renderStaffRows(bodyEl, sorted, API_BASE);
}

async function load(): Promise<void> {
  try {
    await guardRole();
    const res = await fetch(`${API_BASE}/api/submissions/all`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(msg, "danger", data.error || "Failed to load submissions");
      return;
    }
    rows = data as SubmissionRow[];
    index = rows.map(indexText);
    render(rows);
  } catch (err: any) {
    flash(msg, "danger", err?.message || "Network error");
  }
}

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const list = q ? rows.filter((_s, i) => index[i].includes(q)) : rows;
  render(list);
});

document.querySelectorAll<HTMLTableCellElement>("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort as StaffSortKey | undefined;
    if (!key) return;
    if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
    else {
      sortKey = key;
      sortDir = key === "createdAt" ? "desc" : "asc";
    }
    const q = searchInput.value.trim().toLowerCase();
    const list = q ? rows.filter((_s, i) => index[i].includes(q)) : rows;
    render(list);
  });
});

load();
