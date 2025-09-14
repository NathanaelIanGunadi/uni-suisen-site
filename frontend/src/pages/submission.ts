import { API_BASE, authHeaders, getToken, flash } from "../main";

type Role = "STUDENT" | "REVIEWER" | "ADMIN";
type Status = "PENDING" | "APPROVED" | "REJECTED";

interface Me {
  id: number;
  role: Role;
}
interface UserLite {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}
interface Review {
  id: number;
  approved: boolean;
  comments?: string | null;
  reviewedAt: string;
  reviewer: UserLite;
}
interface Submission {
  id: number;
  title: string;
  filename: string;
  status: Status;
  createdAt: string;
  student: UserLite;
  reviews: Review[];
}

const msg = document.getElementById("message")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement;
const details = document.getElementById("details")!;
const reviewsBody = document.getElementById("reviews-body")!;
const reviewForm = document.getElementById("reviewForm") as HTMLFormElement;
const approvedSel = document.getElementById("approved") as HTMLSelectElement;
const commentsInput = document.getElementById("comments") as HTMLInputElement;

if (!getToken()) window.location.href = "/login.html";

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

const params = new URLSearchParams(location.search);
const submissionId = Number(params.get("id"));

let me: Me | null = null;

function statusBadge(s: Status): string {
  const cls =
    s === "APPROVED"
      ? "text-bg-success"
      : s === "REJECTED"
      ? "text-bg-danger"
      : "text-bg-secondary";
  return `<span class="badge ${cls}">${s}</span>`;
}

function toggleReviewForm(canReview: boolean): void {
  reviewForm.style.display = canReview ? "" : "none";
  reviewForm
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
      "input,select,button"
    )
    .forEach((el) => {
      el.disabled = !canReview;
    });
}

function render(sub: Submission): void {
  const created = new Date(sub.createdAt).toLocaleString();
  const studentName =
    [sub.student.firstName, sub.student.lastName].filter(Boolean).join(" ") ||
    sub.student.email;

  details.innerHTML = `
    <div class="row">
      <div class="col-md-8">
        <div><strong>Title:</strong> ${sub.title}</div>
        <div><strong>Status:</strong> ${statusBadge(sub.status)}</div>
        <div><strong>Student:</strong> ${studentName} (${
    sub.student.email
  })</div>
        <div class="mt-2">
          <a href="${API_BASE}/uploads/${
    sub.filename
  }" target="_blank" class="btn btn-sm btn-outline-secondary">Open File</a>
        </div>
      </div>
      <div class="col-md-4 text-md-end">
        <div><strong>Created:</strong> ${created}</div>
        <div><strong>ID:</strong> ${sub.id}</div>
      </div>
    </div>
  `;

  // Who can review?
  const isStaff = me?.role === "REVIEWER" || me?.role === "ADMIN";
  const canReview = isStaff && sub.status !== "APPROVED";
  toggleReviewForm(canReview);

  if (!sub.reviews?.length) {
    reviewsBody.innerHTML = `<tr><td colspan="4" class="text-muted">No reviews yet</td></tr>`;
  } else {
    reviewsBody.innerHTML = sub.reviews
      .map((r) => {
        const when = new Date(r.reviewedAt).toLocaleString();
        const revName =
          [r.reviewer.firstName, r.reviewer.lastName]
            .filter(Boolean)
            .join(" ") || r.reviewer.email;
        return `<tr>
        <td>${r.approved ? "Approved" : "Rejected"}</td>
        <td>${revName}</td>
        <td>${r.comments ? r.comments : "—"}</td>
        <td>${when}</td>
      </tr>`;
      })
      .join("");
  }
}

async function load(): Promise<void> {
  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: authHeaders(),
    });
    me = await meRes.json();
    if (!meRes.ok) {
      flash(msg, "danger", (me as any)?.error || "Unauthorized");
      if (meRes.status === 401) window.location.href = "/login.html";
      return;
    }

    // fetch submission (backend enforces access: staff any, student only own)
    const res = await fetch(`${API_BASE}/api/submissions/${submissionId}`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(msg, "danger", data.error || "Failed to load submission");
      if (res.status === 403)
        setTimeout(() => (window.location.href = "/dashboard.html"), 800);
      return;
    }

    render(data as Submission);
  } catch (err: any) {
    flash(msg, "danger", err?.message || "Network error");
  }
}

reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const approved = approvedSel.value === "true";
  const comments = commentsInput.value.trim();

  try {
    const res = await fetch(`${API_BASE}/api/reviews/${submissionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ approved, comments }),
    });
    const json = await res.json();
    if (res.ok) {
      flash(msg, "success", "Review submitted.");
      commentsInput.value = "";
      await load(); // refresh + may disable form if approved
    } else {
      if (res.status === 409) {
        flash(msg, "warning", json.error || "Submission already approved.");
        await load();
      } else {
        flash(msg, "danger", json.error || "Failed to submit review");
      }
    }
  } catch (err: any) {
    flash(msg, "danger", err?.message || "Network error");
  }
});

load();
