import { API_BASE, authHeaders, getToken, flash } from "../main";

type Status = "PENDING" | "APPROVED" | "REJECTED";

interface FileLite {
  filename: string;
  originalName?: string;
}

interface SubmissionRow {
  id: number;
  title: string;
  status: Status;
  createdAt: string;
  // New (for completeness; not shown in the table anymore)
  files?: FileLite[];
  // Legacy single filename (older rows)
  filename?: string | null;
}

const msg = document.getElementById("message")!;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement;

const formBox = document.getElementById("form-box")!;
const pendingBox = document.getElementById("pending-box")!;
const historyBody = document.getElementById("history-body")!;

const applyForm = document.getElementById("applyForm") as HTMLFormElement;
const titleInput = document.getElementById("title") as HTMLInputElement;

// Dynamic attachments UI
const attachments = document.getElementById(
  "attachments"
) as HTMLDivElement | null;
const addFileBtn = document.getElementById(
  "add-file"
) as HTMLButtonElement | null;

// Require login
if (!getToken()) {
  window.location.href = "/login.html";
}

// logout button
logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
});

function addAttachmentInput(opts?: { required?: boolean }): void {
  if (!attachments) return;

  const id = `documents-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

  const row = document.createElement("div");
  row.className = "input-group";

  const input = document.createElement("input");
  input.type = "file";
  input.name = "documents"; // backend expects 'documents' for multi-file
  input.id = id;
  input.className = "form-control";
  if (opts?.required) input.required = true;

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-outline-danger";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => {
    // Ensure at least one input remains
    const inputs = attachments.querySelectorAll(
      'input[type="file"][name="documents"]'
    );
    if (inputs.length <= 1) {
      (inputs[0] as HTMLInputElement).value = "";
      return;
    }
    row.remove();
  });

  row.appendChild(input);
  row.appendChild(removeBtn);
  attachments.appendChild(row);
}

// Ensure at least one input on load (required)
if (attachments && !attachments.querySelector('input[type="file"]')) {
  addAttachmentInput({ required: true });
}
addFileBtn?.addEventListener("click", () => addAttachmentInput());

// ---------- API ----------
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

function statusBadge(status: Status): string {
  const cls =
    status === "APPROVED"
      ? "text-bg-success"
      : status === "REJECTED"
      ? "text-bg-danger"
      : "text-bg-light";
  return `<span class="badge ${cls}">${status}</span>`;
}

function renderTable(subs: SubmissionRow[]): void {
  // NOTE: Table no longer shows file links (policy). Click Title to open the detail page.
  if (!subs.length) {
    historyBody.innerHTML = `<tr><td colspan="3" class="text-muted">No submissions yet</td></tr>`;
    return;
  }

  historyBody.innerHTML = subs
    .map((s) => {
      const created = new Date(s.createdAt).toLocaleString();
      return `<tr>
        <td><a href="/submission.html?id=${s.id}">${escapeHtml(
        s.title
      )}</a></td>
        <td>${statusBadge(s.status)}</td>
        <td>${created}</td>
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

  // Gather all files from all "documents" inputs
  const files: File[] = [];
  if (attachments) {
    const inputs = Array.from(
      attachments.querySelectorAll<HTMLInputElement>(
        'input[type="file"][name="documents"]'
      )
    );
    for (const input of inputs) {
      if (input.files && input.files.length) {
        for (const f of Array.from(input.files)) files.push(f);
      }
    }
  }

  if (!title) {
    flash(msg, "danger", "Title is required.");
    return;
  }
  if (!files.length) {
    flash(msg, "danger", "Please attach at least one document.");
    return;
  }

  const fd = new FormData();
  fd.append("title", title);
  // Append each file under the same field name 'documents'
  for (const f of files) {
    fd.append("documents", f, f.name);
  }

  try {
    const res = await fetch(`${API_BASE}/api/submissions`, {
      method: "POST",
      headers: authHeaders(), // do not set Content-Type manually
      body: fd,
    });
    const json = await res.json();

    if (res.ok) {
      flash(msg, "success", "Submission created and sent for review.");
      applyForm.reset();

      // Recreate a single empty required input after reset
      if (attachments) {
        attachments.innerHTML = "";
        addAttachmentInput({ required: true });
      }

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

refresh().catch(() => {
  // handled via flash
});
