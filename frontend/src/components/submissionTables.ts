export type Role = "STUDENT" | "REVIEWER" | "ADMIN";
export type Status = "PENDING" | "APPROVED" | "REJECTED";

export interface StudentLite {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface ReviewLite {
  id: number;
  approved: boolean;
  comments?: string | null;
  reviewedAt: string;
}

export interface SubmissionRow {
  id: number;
  title: string;
  status: Status;
  filename: string;
  createdAt: string;
  student?: StudentLite | null;
  reviews?: ReviewLite[];
}

export const statusBadge = (s: Status): string => {
  const cls =
    s === "APPROVED"
      ? "text-bg-success"
      : s === "REJECTED"
      ? "text-bg-danger"
      : "text-bg-secondary";
  return `<span class="badge ${cls}">${s}</span>`;
};

export const studentName = (s?: StudentLite | null): string =>
  [s?.firstName, s?.lastName].filter(Boolean).join(" ") || s?.email || "—";

export function renderStaffRows(
  tbody: HTMLElement,
  rows: SubmissionRow[],
  apiBase: string
): void {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">No data</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((s) => {
      const created = new Date(s.createdAt).toLocaleString();
      return `<tr>
      <td><a href="/submission.html?id=${s.id}">${escapeHtml(s.title)}</a></td>
      <td>${statusBadge(s.status)}</td>
      <td>${escapeHtml(studentName(s.student))}</td>
      <td>${created}</td>
      <td>${
        s.filename
          ? `<a href="${apiBase}/uploads/${s.filename}" target="_blank" class="btn btn-sm btn-outline-secondary">Open</a>`
          : "—"
      }</td>
    </tr>`;
    })
    .join("");
}

export function renderStudentRows(
  tbody: HTMLElement,
  rows: SubmissionRow[],
  apiBase: string
): void {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">No data</td></tr>`;
    return;
  }
  tbody.innerHTML = rows
    .map((s) => {
      const created = new Date(s.createdAt).toLocaleString();
      return `<tr>
      <td><a href="/submission.html?id=${s.id}">${escapeHtml(s.title)}</a></td>
      <td>${statusBadge(s.status)}</td>
      <td>${created}</td>
      <td>${
        s.filename
          ? `<a href="${apiBase}/uploads/${s.filename}" target="_blank" class="btn btn-sm btn-outline-secondary">Open</a>`
          : "—"
      }</td>
    </tr>`;
    })
    .join("");
}

// Sorting
export type StaffSortKey = "title" | "status" | "student" | "createdAt";
export type StuSortKey = "title" | "status" | "createdAt";
export type SortDir = "asc" | "desc";

export function sortStaff(
  rows: SubmissionRow[],
  key: StaffSortKey,
  dir: SortDir
): SubmissionRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    let av = "",
      bv = "";
    if (key === "title") {
      av = a.title.toLowerCase();
      bv = b.title.toLowerCase();
    }
    if (key === "status") {
      av = a.status;
      bv = b.status;
    }
    if (key === "student") {
      av = studentName(a.student).toLowerCase();
      bv = studentName(b.student).toLowerCase();
    }
    if (key === "createdAt") {
      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();
      return dir === "asc" ? ad - bd : bd - ad;
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}

export function sortStudent(
  rows: SubmissionRow[],
  key: StuSortKey,
  dir: SortDir
): SubmissionRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    let av = "",
      bv = "";
    if (key === "title") {
      av = a.title.toLowerCase();
      bv = b.title.toLowerCase();
    }
    if (key === "status") {
      av = a.status;
      bv = b.status;
    }
    if (key === "createdAt") {
      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();
      return dir === "asc" ? ad - bd : bd - ad;
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}

export function wireSortable<T extends HTMLElement>(
  sectionRoot: T,
  onSort: (key: string) => void
): void {
  sectionRoot
    .querySelectorAll<HTMLTableCellElement>("th.sortable")
    .forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (!key) return;
        onSort(key);
      });
    });
}

// ---------- Helpers ----------
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
      ? "&lt;"
      : c === ">"
      ? "&gt;"
      : c === '"'
      ? "&quot;"
      : "&#39;"
  );
}
