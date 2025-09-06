// Run with: npm run rebuild
// Flags:
//   --clean-locks  remove package-lock.json before install
//   --reset-db     prisma migrate reset (dev only), then migrate dev

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const APPS = [
  { name: "backend", dir: path.join(ROOT, "backend") },
  { name: "frontend", dir: path.join(ROOT, "frontend") },
];

const args = process.argv.slice(2);
const CLEAN_LOCKS = args.includes("--clean-locks");
const RESET_DB = args.includes("--reset-db");

function log(section, msg) {
  console.log(`\n[${section}] ${msg}`);
}

function rm(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {}
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, argv, cwd) {
  const r = spawnSync(cmd, argv, {
    stdio: "inherit",
    cwd,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    throw new Error(`Command failed (${cmd} ${argv.join(" ")}) in ${cwd}`);
  }
}

(async () => {
  // Clean & install each app
  for (const app of APPS) {
    log(app.name.toUpperCase(), "Cleaning node_modules and build output…");
    rm(path.join(app.dir, "node_modules"));
    rm(path.join(app.dir, "dist"));

    if (CLEAN_LOCKS) {
      log(app.name.toUpperCase(), "Removing package-lock.json…");
      rm(path.join(app.dir, "package-lock.json"));
    }

    log(app.name.toUpperCase(), "Installing dependencies…");
    const lockExists = exists(path.join(app.dir, "package-lock.json"));
    if (lockExists) run("npm", ["ci"], app.dir);
    else run("npm", ["install"], app.dir);
  }

  // Backend post-install steps
  const backend = APPS.find((a) => a.name === "backend");
  if (backend) {
    const prismaSchema = path.join(backend.dir, "prisma", "schema.prisma");
    if (exists(prismaSchema)) {
      log("BACKEND", "Generating Prisma client…");
      run("npx", ["prisma", "generate"], backend.dir);

      if (RESET_DB) {
        log("BACKEND", "Resetting dev DB (prisma migrate reset)…");
        run("npx", ["prisma", "migrate", "reset", "--force"], backend.dir);
        log("BACKEND", "Applying migrations (prisma migrate dev)…");
        run(
          "npx",
          ["prisma", "migrate", "dev", "--name", "rebuild-sync"],
          backend.dir
        );
      }
    }

    // Build backend if script exists
    const backendPkg = require(path.join(backend.dir, "package.json"));
    if (backendPkg.scripts && backendPkg.scripts.build) {
      log("BACKEND", "Building TypeScript…");
      run("npm", ["run", "build"], backend.dir);
    } else {
      log("BACKEND", "No build script found; skipping build.");
    }
  }

  // Frontend build
  const frontend = APPS.find((a) => a.name === "frontend");
  if (frontend) {
    const frontPkg = require(path.join(frontend.dir, "package.json"));
    if (frontPkg.scripts && frontPkg.scripts.build) {
      log("FRONTEND", "Building frontend (Vite)…");
      run("npm", ["run", "build"], frontend.dir);
    } else {
      log("FRONTEND", "No build script found; skipping build.");
    }
  }

  log("DONE", "Rebuild finished successfully.");
})().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
