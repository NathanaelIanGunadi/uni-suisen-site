const form = document.getElementById("loginForm") as HTMLFormElement;
const msg = document.getElementById("message")!;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = (document.getElementById("email") as HTMLInputElement).value;
  const password = (document.getElementById("password") as HTMLInputElement)
    .value;

  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (res.ok && json.token) {
    localStorage.setItem("token", json.token);
    msg.innerHTML = `<div class="alert alert-success">Logged in! Token saved.</div>`;
  } else {
    msg.innerHTML = `<div class="alert alert-danger">${
      json.error || JSON.stringify(json)
    }</div>`;
  }
});
