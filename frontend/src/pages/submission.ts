import { API_BASE, authHeaders, getToken, flash } from "../main";

type Role = "STUDENT" | "REVIEWER" | "ADMIN";
type Status = "PENDING" | "APPROVED" | "REJECTED";

interface Me {
  id: number;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
}

interface FileLite {
  filename: string;
  originalName?: string | null;
}

interface ReviewerLite {
  id: number;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
}

interface ReviewRow {
  id: number;
  approved: boolean;
  comments?: string | null;
  reviewedAt: string | Date;
  reviewer?: ReviewerLite;
}

interface SubmissionDetail {
  id: number;
  title: string;
  status: Status;
  createdAt: string | Date;
  student?: {
    id: number;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  files?: FileLite[];
  filename?: string | null; // legacy
  reviews?: ReviewRow[];
}

// ---------- Helpers ----------
const msg = document.getElementById("message")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement | null;

const idParam = new URLSearchParams(window.location.search).get("id");
const submissionId = idParam ? Number(idParam) : NaN;

if (!getToken()) {
  window.location.href = "/login.html";
}

if (!submissionId || Number.isNaN(submissionId)) {
  window.location.href = "/dashboard.html";
}

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

function pick<T extends HTMLElement = HTMLElement>(...ids: string[]): T | null {
  for (const id of ids) {
    const el = document.getElementById(id) as T | null;
    if (el) return el;
  }
  return null;
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

function statusBadge(status: Status): string {
  const cls =
    status === "APPROVED"
      ? "text-bg-success"
      : status === "REJECTED"
      ? "text-bg-danger"
      : "text-bg-light";
  return `<span class="badge ${cls}">${status}</span>`;
}

// ---------- API ----------
async function loadMe(): Promise<Me | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

async function loadSubmission(id: number): Promise<SubmissionDetail | null> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    headers: authHeaders(),
  });

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    flash(
      msg,
      "danger",
      `Non-JSON response while loading submission (status ${
        res.status
      }). Check API_BASE. First bytes: ${text.slice(0, 120)}`
    );
    return null;
  }

  const data = await res.json();
  if (!res.ok) {
    flash(msg, "danger", data.error || "Failed to load submission");
    return null;
  }
  return data as SubmissionDetail;
}

async function submitReview(
  id: number,
  approved: boolean,
  comments?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // ✅ Match your backend route: POST /api/reviews/:id
    const res = await fetch(`${API_BASE}/api/reviews/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ approved, comments }),
    });

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      return {
        ok: false,
        error: `Non-JSON response (status ${
          res.status
        }). Check the backend route and API_BASE.\nFirst bytes: ${text.slice(
          0,
          200
        )}`,
      };
    }

    if (res.ok) return { ok: true };
    const j = await res.json();
    return { ok: false, error: j.error || "Failed to submit review" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

// ---------- Render ----------
function renderDetail(me: Me | null, sub: SubmissionDetail): void {
  const titleEl = pick("subj-title", "submission-title");
  if (titleEl) titleEl.textContent = sub.title;

  const statusEl = pick("subj-status", "submission-status");
  if (statusEl) statusEl.innerHTML = statusBadge(sub.status);

  const createdEl = pick("subj-created", "submission-created");
  if (createdEl)
    createdEl.textContent = new Date(sub.createdAt).toLocaleString();

  const studentEl = pick("subj-student", "submission-student");
  if (studentEl) {
    const name = [sub.student?.firstName, sub.student?.lastName]
      .filter(Boolean)
      .join(" ");
    studentEl.textContent =
      name || sub.student?.email || `User #${sub.student?.id ?? "-"}`;
  }

  const filesList =
    pick<HTMLUListElement>("files", "files-list", "attachments-list") ||
    pick<HTMLDivElement>("files", "files-list", "attachments-list");

  if (filesList) {
    const items: string[] = [];
    if (sub.files && sub.files.length) {
      for (const f of sub.files) {
        const label = esc(f.originalName || f.filename);
        items.push(
          `<li><a href="${API_BASE}/uploads/${encodeURIComponent(
            f.filename
          )}" target="_blank" rel="noopener">${label}</a></li>`
        );
      }
    } else if (sub.filename) {
      items.push(
        `<li><a href="${API_BASE}/uploads/${encodeURIComponent(
          sub.filename
        )}" target="_blank" rel="noopener">${esc(sub.filename)}</a></li>`
      );
    } else {
      items.push(`<li class="text-muted">No attachments</li>`);
    }

    if (filesList instanceof HTMLUListElement) {
      filesList.innerHTML = items.join("");
    } else {
      filesList.innerHTML = `<ul class="mb-0">${items.join("")}</ul>`;
    }
  }

  const reviewsBody = pick<HTMLTableSectionElement>("reviews-body");
  if (reviewsBody) {
    const rows = (sub.reviews || []).map((r) => {
      const reviewerName = [r.reviewer?.firstName, r.reviewer?.lastName]
        .filter(Boolean)
        .join(" ");
      const who =
        reviewerName || r.reviewer?.email || `User #${r.reviewer?.id ?? "-"}`;
      const when = new Date(r.reviewedAt).toLocaleString();
      return `<tr>
        <td>${r.approved ? "APPROVED" : "REJECTED"}</td>
        <td>${esc(r.comments || "")}</td>
        <td>${esc(who)}</td>
        <td>${when}</td>
      </tr>`;
    });
    reviewsBody.innerHTML =
      rows.join("") ||
      `<tr><td colspan="4" class="text-muted">No reviews</td></tr>`;
  }

  const reviewForm = pick<HTMLFormElement>("reviewForm");
  const reviewBox = pick<HTMLDivElement>("review-box");
  const isStaff = me?.role === "REVIEWER" || me?.role === "ADMIN";
  const canReview = isStaff && sub.status !== "APPROVED";

  if (reviewBox) reviewBox.classList.toggle("d-none", !canReview);
  if (reviewForm) {
    reviewForm.classList.toggle("d-none", !canReview);
    const approvedYes = document.getElementById(
      "approved-yes"
    ) as HTMLInputElement | null;
    const approvedNo = document.getElementById(
      "approved-no"
    ) as HTMLInputElement | null;
    const comments = document.getElementById(
      "comments"
    ) as HTMLTextAreaElement | null;

    reviewForm.onsubmit = async (e) => {
      e.preventDefault();
      if (!canReview) return;

      const approved = approvedYes?.checked
        ? true
        : approvedNo?.checked
        ? false
        : null;

      if (approved === null) {
        flash(msg, "danger", "Please choose approve/reject.");
        return;
      }

      const result = await submitReview(
        submissionId,
        approved,
        comments?.value || undefined
      );
      if (result.ok) {
        flash(msg, "success", "Review submitted.");
        await init();
      } else {
        flash(msg, "danger", result.error || "Failed to submit review");
      }
    };
  }
}

// ---------- Init ----------
async function init(): Promise<void> {
  const me = await loadMe();
  if (!me) {
    window.location.href = "/login.html";
    return;
  }

  const sub = await loadSubmission(submissionId);
  if (!sub) return;

  renderDetail(me, sub);
}

init().catch((err) => {
  console.error(err);
  flash(msg, "danger", "Failed to initialize submission page");
});
