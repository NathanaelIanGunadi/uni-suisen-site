// frontend/src/pages/application.ts
import { API_BASE, authHeaders, getToken, flash } from "../main";

type Status = "PENDING" | "APPROVED" | "REJECTED";

interface SubmissionRow {
  id: number;
  title: string;
  status: Status;
  filename: string;
  createdAt: string;
}

const msg = document.getElementById("message")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement;

const formBox = document.getElementById("form-box")!;
const pendingBox = document.getElementById("pending-box")!;
const historyBody = document.getElementById("history-body")!;

const applyForm = document.getElementById("applyForm") as HTMLFormElement;
const titleInput = document.getElementById("title") as HTMLInputElement;
const docInput = document.getElementById("document") as HTMLInputElement;

// Require login
if (!getToken()) {
  window.location.href = "/login.html";
}

// logout button
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

async function loadMySubmissions(): Promise<SubmissionRow[]> {
  const res = await fetch(`${API_BASE}/api/submissions/my-submissions`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    flash(msg, "danger", data.error || "Failed to load submissions");
    return [];
  }
  return data as SubmissionRow[];
}

function renderTable(subs: SubmissionRow[]): void {
  if (!subs.length) {
    historyBody.innerHTML = `<tr><td colspan="4" class="text-muted">No submissions yet</td></tr>`;
    return;
  }

  historyBody.innerHTML = subs
    .map((s) => {
      const created = new Date(s.createdAt).toLocaleString();
      const fileLink = s.filename
        ? `<a href="${API_BASE}/uploads/${s.filename}" target="_blank" class="btn btn-sm btn-outline-secondary">Open</a>`
        : "—";
      return `<tr>
      <td>${s.title}</td>
      <td><span class="badge text-bg-light">${s.status}</span></td>
      <td>${created}</td>
      <td>${fileLink}</td>
    </tr>`;
    })
    .join("");
}

async function refresh(): Promise<void> {
  const subs = await loadMySubmissions();

  // If user has a PENDING submission, show the pending message and hide the form
  const hasPending = subs.some((s) => s.status === "PENDING");
  if (hasPending) {
    pendingBox.classList.remove("d-none");
    formBox.classList.add("d-none");
  } else {
    formBox.classList.remove("d-none");
    pendingBox.classList.add("d-none");
  }

  renderTable(subs);
}

applyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const file = docInput.files?.[0];

  if (!title) {
    flash(msg, "danger", "Title is required.");
    return;
  }
  if (!file) {
    flash(msg, "danger", "Please attach a document.");
    return;
  }

  const fd = new FormData();
  fd.append("title", title);
  fd.append("document", file); // backend expects 'document'

  try {
    const res = await fetch(`${API_BASE}/api/submissions`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    const json = await res.json();

    if (res.ok) {
      flash(msg, "success", "Submission created and sent for review.");
      applyForm.reset();
      await refresh();
    } else if (res.status === 409) {
      flash(
        msg,
        "danger",
        json.error || "You already have a submission under review."
      );
      await refresh();
    } else {
      flash(msg, "danger", json.error || "Failed to create submission");
    }
  } catch (err: any) {
    flash(msg, "danger", err?.message || "Network error");
  }
});

refresh().catch(() => {
  // handled via flash
});
