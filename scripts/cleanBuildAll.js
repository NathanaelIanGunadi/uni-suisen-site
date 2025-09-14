const { spawnSync } = require("child_process");
const { rmSync, existsSync, writeFileSync } = require("fs");
const { join } = require("path");

const ROOT = process.cwd();
const BACKEND = join(ROOT, "backend");
const FRONTEND = join(ROOT, "frontend");
const isWin = process.platform === "win32";

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

function sh(cmd, args, cwd) {
  const pretty = `$ ${cmd} ${(args || []).join(" ")}`;
  log("RUN", `${pretty}${cwd ? `  (cwd=${cwd})` : ""}`);
  const r = spawnSync(cmd, args, {
    cwd: cwd || ROOT,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env },
  });
  if (r.status !== 0) {
    console.error(`✖ Command failed: ${pretty}`);
    process.exit(r.status ?? 1);
  }
}

function safeRm(p) {
  try {
    rmSync(p, { recursive: true, force: true });
  } catch {}
}

function ensureBackendEnv() {
  const envPath = join(BACKEND, ".env");
  if (!existsSync(envPath)) {
    const contents = `DATABASE_URL="file:./dev.db"
JWT_SECRET="${Math.random().toString(36).slice(2)}${Date.now()}"
APP_BASE_URL=http://localhost:5173
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM="Uni Recs <noreply@unirecs.local>"
`;
    writeFileSync(envPath, contents, "utf8");
    log("INIT", "Created backend/.env with sensible defaults.");
  }
}

function killDevProcesses() {
  log("KILL", "Closing dev Node processes (ts-node, nodemon, vite)…");
  const pid = process.pid;

  if (isWin) {
    const ps = [
      "Get-CimInstance Win32_Process |",
      `Where-Object { $_.Name -eq 'node.exe' -and $_.ProcessId -ne ${pid} -and ($_.CommandLine -match 'ts-node|nodemon|vite|dist\\\\index.js') } |`,
      "ForEach-Object { Stop-Process -Id $_.ProcessId -Force }",
    ].join(" ");
    spawnSync("powershell", ["-NoProfile", "-Command", ps], {
      stdio: "ignore",
    });
  } else {
    // Best-effort on *nix
    const script = `
      P=${pid};
      ps -eo pid,command | grep -E "node .* (ts-node|nodemon|vite|dist/index.js)" | grep -v grep | awk '{print $1}' | while read ID; do
        if [ "$ID" != "$P" ]; then kill -9 "$ID" 2>/dev/null || true; fi
      done
    `;
    spawnSync("bash", ["-lc", script], { stdio: "ignore" });
  }
}

(function main() {
  console.log("=== Clean Build & Initialize (all) ===");

  // 0) Stop dev processes that might lock Prisma DLLs
  killDevProcesses();

  // 1) Ensure backend/.env exists
  ensureBackendEnv();

  // 2) Clean installs & build outputs
  log("CLEAN", "Removing node_modules/dist…");
  safeRm(join(BACKEND, "node_modules", ".prisma", "client"));
  safeRm(join(BACKEND, "node_modules"));
  safeRm(join(BACKEND, "dist"));
  safeRm(join(FRONTEND, "node_modules"));
  safeRm(join(FRONTEND, "dist"));

  // 3) Install backend, then prisma init + build
  log("BACKEND", "Installing deps…");
  sh(
    "npm",
    [existsSync(join(BACKEND, "package-lock.json")) ? "ci" : "install"],
    BACKEND
  );

  log("BACKEND", "Prisma generate…");
  sh("npx", ["prisma", "generate"], BACKEND);

  // prefer migrations if you use them; else db push is fine for SQLite dev
  if (existsSync(join(BACKEND, "prisma", "migrations"))) {
    log("BACKEND", "Prisma migrate deploy…");
    sh("npx", ["prisma", "migrate", "deploy"], BACKEND);
  } else {
    log("BACKEND", "Prisma db push…");
    sh("npx", ["prisma", "db", "push"], BACKEND);
  }

  // Seed (creates test users)
  if (
    existsSync(join(BACKEND, "prisma", "seed.ts")) ||
    existsSync(join(BACKEND, "prisma", "seed.js"))
  ) {
    log("BACKEND", "Seeding database…");
    sh("npx", ["prisma", "db", "seed"], BACKEND);
  } else {
    log("BACKEND", "No seed file detected; skipping seed.");
  }

  // Build backend
  log("BACKEND", "Building TypeScript…");
  sh("npm", ["run", "build"], BACKEND);

  // 4) Install & build frontend
  log("FRONTEND", "Installing deps…");
  sh(
    "npm",
    [existsSync(join(FRONTEND, "package-lock.json")) ? "ci" : "install"],
    FRONTEND
  );

  log("FRONTEND", "Building (Vite)…");
  sh("npm", ["run", "build"], FRONTEND);

  console.log("\n✅ All set!");
  console.log("- Start dev servers:  npm run dev");
  console.log(
    "- Backend dev also launches MailDev (http://localhost:1080) if you kept that script."
  );
})();
