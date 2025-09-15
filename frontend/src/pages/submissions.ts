import { API_BASE, authHeaders, getToken, flash } from "../main";
import {
  type SubmissionRow,
  type Role,
  type StaffSortKey,
  type SortDir,
  renderStaffRows,
  sortStaff,
  wireSortable,
  filterRows,
} from "../components/submissionTables";

interface Me {
  id: number;
  email: string;
  role: Role;
}

const msg = document.getElementById("message") as HTMLElement | null;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
const tableBody = document.getElementById("subs-body") as HTMLElement;
const search = document.getElementById("search") as HTMLInputElement;

// Guard
if (!getToken()) window.location.href = "/login.html";
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

let me: Me | null = null;
let rows: SubmissionRow[] = [];
let filtered: SubmissionRow[] = [];

let sortKey: StaffSortKey = "createdAt";
let sortDir: SortDir = "desc";

async function loadMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    msg && flash(msg, "danger", data.error || "Unauthorized");
    if (res.status === 401) window.location.href = "/login.html";
    return null;
  }
  return data as Me;
}

async function loadAll(): Promise<SubmissionRow[]> {
  const res = await fetch(`${API_BASE}/api/submissions/all`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    msg && flash(msg, "danger", data.error || "Failed to load submissions");
    return [];
  }
  return data as SubmissionRow[];
}

function render(): void {
  const sorted = sortStaff(filtered, sortKey, sortDir);
  renderStaffRows(tableBody, sorted);
}

async function init(): Promise<void> {
  me = await loadMe();
  if (!me) return;

  // Client-side role gate (server already enforces)
  if (me.role !== "REVIEWER" && me.role !== "ADMIN") {
    window.location.href = "/dashboard.html";
    return;
  }

  rows = await loadAll();
  filtered = rows;
  render();

  // Sort headers
  wireSortable(document.body, (key) => {
    const k = key as StaffSortKey;
    if (sortKey === k) sortDir = sortDir === "asc" ? "desc" : "asc";
    else {
      sortKey = k;
      sortDir = k === "createdAt" ? "desc" : "asc";
    }
    render();
  });

  // Search
  search?.addEventListener("input", () => {
    filtered = filterRows(rows, search.value);
    render();
  });
}

init().catch((err) => {
  console.error(err);
  msg && flash(msg, "danger", "Failed to initialize submissions page");
});
