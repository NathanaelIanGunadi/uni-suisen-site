# Uni Suisen Site — MVP

A TypeScript-first **university submission & review system** with role-based access.
Students upload Word files, reviewers approve/reject them, and admins oversee the process.

## Tech Stack

**Backend**

- Node.js + **Express 5** (TypeScript)
- **Prisma** ORM + **SQLite** (dev)
- **JWT** authentication, **RBAC** middleware
- **Multer** for file uploads
- **express-list-endpoints** for auto-listing endpoints

**Frontend**

- **Vite** (vanilla) + **TypeScript**
- **Bootstrap 5** for quick UI

---

## Repository Structure

```
uni-suisen-site-main/
├─ backend/
│ ├─ prisma/
│ │ ├─ migrations/
│ │ └─ schema.prisma
│ ├─ src/
│ │ ├─ controllers/
│ │ ├─ middleware/
│ │ ├─ routes/
│ │ ├─ types/
│ │ ├─ utils/
│ │ └─ index.ts
│ ├─ package.json
│ └─ tsconfig.json
├─ frontend/
│ ├─ public/
│ │ ├─ login.html
│ │ ├─ register.html
│ │ └─ vite.svg
│ ├─ src/
│ │ ├─ login.ts
│ │ ├─ register.ts
│ │ ├─ typescript.svg
│ │ └─ vite-env.d.ts
│ ├─ .gitignore
│ ├─ package.json
│ ├─ tsconfig.json
│ └─ vite.config.ts
└─ .gitignore
```

**Key folders**

- `backend/` — Express API, Prisma schema & migrations, uploads, middleware, routes.
- `frontend/` — Vite dev server, static HTML pages in `public/`, TS modules in `src/`.

---

## How the pieces connect

1. The **frontend** (served by Vite at `http://localhost:5173`) renders HTML pages (`public/*.html`).
2. Each page loads a matching TS module from `frontend/src` (e.g., `register.ts`, `login.ts`).
3. These scripts call the **backend API** at `http://localhost:3000` using `fetch()`.
4. The **backend** authenticates users via JWT (`Authorization: Bearer <token>`),
   applies **role-based authorization** for Reviewer/Admin routes,
   persists data via **Prisma** into a local **SQLite** DB (`dev.db`),
   and stores uploaded files in `backend/uploads/` via **Multer**.
5. `GET /api` lists available API endpoints dynamically.

---

## Backend — Setup & Run

> Requirements: Node.js 18+ (or 20+), npm

1. **Install deps**

```bash
cd backend
npm install
```

2. **Environment**
   Create `backend/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change_me_to_a_long_random_string"
```

3. **Prisma DB**

```bash
npx prisma migrate dev --name init
# optional: inspect data with Prisma Studio
npx prisma studio
```

4. **Dev server**

```bash
npm run dev
# Express API at http://localhost:3000
```

5. **Build (optional)**

```bash
npm run build      # tsc → dist/
node dist/index.js # production-like run
```

### API Endpoints (as implemented)

```
-         apiRoutes.ts  GET    /api
-        authRoutes.ts  POST   /login
-        authRoutes.ts  POST   /register
-      reviewRoutes.ts  GET    /pending
-      reviewRoutes.ts  POST   /:id/review
-  submissionRoutes.ts  POST   /
```

> Also, `GET /api` returns a simple HTML page listing everything registered on the server.

**Auth flow**

- `POST /api/auth/register` – body: `{ email, password, role }`.
  - Handles duplicate email (`P2002`) and returns `400` JSON.
- `POST /api/auth/login` – body: `{ email, password }` → returns `{ token }`.
- **Use the token** in `Authorization: Bearer <token>` for other routes.

**Submissions**

- `POST /api/submissions` – multipart form-data with fields:
  - `title` (text), `document` (file). Requires auth (student).

**Review (Reviewer/Admin)**

- `GET /api/reviews/pending`
- `POST /api/reviews/:id/review` – body: `{ approved: boolean, comments?: string }`.

Uploads are saved to `backend/uploads/` (served statically at `/uploads`).

---

## Frontend — Setup & Run

1. **Install deps**

```bash
cd frontend
npm install
```

2. **Dev server**

```bash
npm run dev
# Vite on http://localhost:5173
```

3. **Open pages**

- `http://localhost:5173/register.html`
- `http://localhost:5173/login.html`

> These pages POST to `http://localhost:3000/api/auth/...` and display success/errors.

4. **Build (optional)**

```bash
npm run build
# Bundled assets into frontend/dist/
npm run preview
```

### Notes about current frontend config

- Your `vite.config.ts` currently references `resolve(__dirname, "frontend/public/...")`.
  Since the file itself lives **inside `frontend/`**, change those to just `resolve(__dirname, "public/...")`,
  and remove any input that points to files that don’t exist (e.g., `index.html`).

- In `public/*.html`, prefer absolute script imports:

```html
<script type="module" src="/src/register.ts"></script>
```

(instead of `../src/...`) so paths are stable.

---

## Prisma Schema (excerpt)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  role      Role
  submissions Submission[]
  reviews   Review[]
}

model Submission {
  id          Int      @id @default(autoincrement())
  title       String
  filename    String
  status      Status   @default(PENDING)
  studentId   Int
  reviews     Review[]
  createdAt   DateTime @default(now())

  student     User     @relation(fields: [studentId], references: [id])
}

model Review {
  id            Int      @id @default(autoincrement())
  submissionId  Int
  reviewerId    Int
  approved      Boolean
  comments      String?
  revie
...
```

---

## Why these tools?

- **TypeScript** – safer, maintainable code with types shared across front/back.
- **Express 5** – minimal, flexible HTTP server with huge ecosystem.
- **Prisma** – type-safe DB access, easy migrations, great DX for SQLite dev.
- **SQLite** (dev) – zero-setup DB for local development (swap to Postgres/MySQL in prod).
- **JWT** – stateless auth tokens ideal for SPAs/vanilla frontends.
- **Multer** – straightforward file uploads to disk (can switch to S3 in prod).
- **Vite** – fast dev server and build pipeline for simple multi-page TS apps.
- **Bootstrap** – instant, responsive UI without heavy frameworks.

---

## Common pitfalls & tips

- **“Unable to open database file”** → verify `DATABASE_URL="file:./dev.db"` and run the server from `backend/`, not the repo root. Then `npx prisma migrate dev`.
- **Duplicate email returns 500 HTML** → this code already maps Prisma `P2002` to a JSON `400` (“user already exists”).
- **`req.user` type missing** → see `backend/src/types/express.d.ts` and `tsconfig.json` `typeRoots`/`types`.
- **CORS** in dev is wide-open; restrict in production.
- **Roles** – submission route currently enforces auth; you may additionally require `STUDENT` role via
  `authorizeRole(['STUDENT'])` if desired.

---

## Next steps (suggested)

- Add `GET /api/auth/me` to return `{ id, role, email }` of the current user.
- Add `GET /api/submissions/my-submissions` so students can see status history.
- Create additional frontend pages (`dashboard.html`, `submissions.html`, `review.html`) and TS scripts.
- Fix `vite.config.ts` inputs as noted above.
- Add request validation (e.g., zod) and a global error handler middleware.
- Consider moving file storage to S3 (or equivalent) for production deployments.
- Deploy: separate pipelines for `backend` and `frontend` (e.g., Render + Netlify).

---

## Scripts (as of now)

**backend/package.json**

```json
{
  "test": "echo \"Error: no test specified\" && exit 1",
  "dev": "nodemon --exec ts-node --files ./src/index.ts",
  "build": "tsc --project tsconfig.json",
  "clean": "rimraf dist"
}
```

**frontend/package.json**

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview"
}
```
