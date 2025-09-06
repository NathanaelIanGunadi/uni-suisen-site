const form = document.getElementById("registerForm") as HTMLFormElement;
const msg = document.getElementById("message")!;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = (document.getElementById("email") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement)
    .value;

  const res = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role: "ADMIN" }),
  });
  const json = await res.json();
  if (res.ok) {
    msg.innerHTML = `<div class="alert alert-success">Registered: ${json.email}</div>`;
  } else {
    msg.innerHTML = `<div class="alert alert-danger">${
      json.error || JSON.stringify(json)
    }</div>`;
  }
});
