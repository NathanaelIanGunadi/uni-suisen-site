export type Role = "STUDENT" | "REVIEWER" | "ADMIN";
export type Status = "PENDING" | "APPROVED" | "REJECTED";
export type SortDir = "asc" | "desc";

export type StaffSortKey = "id" | "title" | "status" | "student" | "createdAt";
export type StuSortKey = "title" | "status" | "createdAt";

export interface StudentLite {
  id?: number;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface SubmissionRow {
  id: number;
  title: string;
  status: Status;
  createdAt: string | Date;
  student?: StudentLite; // present in staff lists
  // files?: { filename: string; originalName?: string }[];  // intentionally unused in table
  // filename?: string | null;                               // legacy: intentionally ignored in table
}

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function statusBadge(status: Status): string {
  const cls =
    status === "APPROVED"
      ? "text-bg-success"
      : status === "REJECTED"
      ? "text-bg-danger"
      : "text-bg-light";
  return `<span class="badge ${cls}">${status}</span>`;
}

function studentLabel(s?: StudentLite): string {
  if (!s) return "—";
  const name = [s.firstName, s.lastName].filter(Boolean).join(" ");
  return name || s.email || "—";
}

function esc(s: string): string {
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

// ---------- Sorting ----------
export function sortStaff(
  rows: SubmissionRow[],
  key: StaffSortKey,
  dir: SortDir
): SubmissionRow[] {
  const a = [...rows];
  a.sort((r1, r2) => {
    let v1: string | number | Date = "";
    let v2: string | number | Date = "";
    switch (key) {
      case "id":
        v1 = r1.id;
        v2 = r2.id;
        break;
      case "title":
        v1 = (r1.title || "").toLowerCase();
        v2 = (r2.title || "").toLowerCase();
        break;
      case "status":
        v1 = (r1.status || "").toLowerCase();
        v2 = (r2.status || "").toLowerCase();
        break;
      case "student":
        v1 = studentLabel(r1.student).toLowerCase();
        v2 = studentLabel(r2.student).toLowerCase();
        break;
      case "createdAt":
        v1 = toDate(r1.createdAt).getTime();
        v2 = toDate(r2.createdAt).getTime();
        break;
    }
    if (v1 < (v2 as any)) return dir === "asc" ? -1 : 1;
    if (v1 > (v2 as any)) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return a;
}

export function sortStudent(
  rows: SubmissionRow[],
  key: StuSortKey,
  dir: SortDir
): SubmissionRow[] {
  const a = [...rows];
  a.sort((r1, r2) => {
    let v1: string | number = "";
    let v2: string | number = "";
    switch (key) {
      case "title":
        v1 = (r1.title || "").toLowerCase();
        v2 = (r2.title || "").toLowerCase();
        break;
      case "status":
        v1 = (r1.status || "").toLowerCase();
        v2 = (r2.status || "").toLowerCase();
        break;
      case "createdAt":
        v1 = toDate(r1.createdAt).getTime();
        v2 = toDate(r2.createdAt).getTime();
        break;
    }
    if (v1 < (v2 as any)) return dir === "asc" ? -1 : 1;
    if (v1 > (v2 as any)) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return a;
}

// ---------- Search ----------
export function filterRows(
  rows: SubmissionRow[],
  query: string
): SubmissionRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => {
    const fields: string[] = [
      r.title || "",
      r.status || "",
      studentLabel(r.student),
      String(r.id),
      new Date(r.createdAt).toLocaleString(),
    ];
    return fields.some((f) => f.toLowerCase().includes(q));
  });
}

// ---------- Rendering ----------
export function renderStaffRows(
  tbody: HTMLElement,
  rows: SubmissionRow[],
  _apiBase?: string, // kept for backward compatibility; not used
  opts?: { role?: Role; meId?: number; limit?: number }
): void {
  const { limit } = opts || {};
  const r = limit ? rows.slice(0, limit) : rows;

  tbody.innerHTML =
    r
      .map((s) => {
        const created = new Date(s.createdAt).toLocaleString();
        // Permission: staff can navigate to any submission (server still enforces auth)
        const title = `<a href="/submission.html?id=${s.id}">${esc(
          s.title
        )}</a>`;
        return `<tr data-id="${s.id}">
        <td>${title}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${esc(studentLabel(s.student))}</td>
        <td>${created}</td>
      </tr>`;
      })
      .join("") || `<tr><td colspan="4" class="text-muted">No data</td></tr>`;
}

export function renderStudentRows(
  tbody: HTMLElement,
  rows: SubmissionRow[],
  _apiBase?: string,
  opts?: { role?: Role; meId?: number; limit?: number }
): void {
  const { limit, meId } = opts || {};
  // Permission guard: if studentId present (some APIs include it), limit to own
  const filtered = rows.filter((s: any) =>
    typeof s.student?.id === "number" && typeof meId === "number"
      ? s.student!.id === meId
      : true
  );

  const r = limit ? filtered.slice(0, limit) : filtered;

  tbody.innerHTML =
    r
      .map((s) => {
        const created = new Date(s.createdAt).toLocaleString();
        const title = `<a href="/submission.html?id=${s.id}">${esc(
          s.title
        )}</a>`;
        return `<tr data-id="${s.id}">
        <td>${title}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${created}</td>
      </tr>`;
      })
      .join("") || `<tr><td colspan="3" class="text-muted">No data</td></tr>`;
}

// ---------- Sort wiring (shared) ----------
export function wireSortable(
  sectionEl: HTMLElement,
  onSortKey: (key: string) => void
): void {
  sectionEl
    .querySelectorAll<HTMLTableCellElement>("th.sortable")
    .forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort || "";
        if (!key) return;
        onSortKey(key);
      });
    });
}
