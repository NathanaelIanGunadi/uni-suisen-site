# Uni Suisen Site (MVP)

A TypeScript-based **university recommendation submission and review system** with role-based access control (RBAC).  
Roles: **Student**, **Reviewer**, **Administrator**.

- Students submit documents and track statuses.
- Reviewers evaluate submissions (approve/reject) with comments.
- Administrators manage users, roles, and have full visibility.

---

## 1) Quick Start

```bash
# From the repository root
npm run cleanBuild:all   # installs, initializes DB, seeds test users, builds both apps
npm run dev             # starts backend (with MailDev) and frontend together
```

- Frontend (Vite): http://localhost:5173/
- Backend (Express): http://localhost:3000/
- MailDev (email viewer): http://localhost:1080/ (SMTP on 1025)

**Pre-seeded test users** (password: `test`):

- Student: `teststudent@example.com`
- Reviewer: `testreviewer@example.com`
- Admin: `testadmin@example.com`

> The `cleanBuild:all` script also creates `backend/.env` with sensible defaults if it is missing.

---

## 2) Prerequisites

- Node.js **18+** (or 20+)
- npm **9+**
- Windows, macOS, or Linux

---

## 3) Repository Structure

```
uni-suisen-site/
├─ backend/
│ ├─ prisma/ # Prisma schema, migrations, seed.ts
│ ├─ src/
│ │ ├─ controllers/ # auth, submissions, reviews, admin, user preferences
│ │ ├─ middleware/ # JWT auth, role guard
│ │ ├─ routes/ # /api/* routers
│ │ ├─ services/ # mailer (Nodemailer)
│ │ ├─ types/ # Express Request augmentation
│ │ └─ index.ts # server bootstrap
│ └─ uploads/ # uploaded files (gitignored)
├─ frontend/
│ ├─ public/ # multi-page HTML (login, register, dashboard, etc.)
│ ├─ src/
│ │ ├─ pages/ # page scripts (TS)
│ │ ├─ components/ # reusable UI/logic (tables, top bar)
│ │ ├─ styles/ # Bootstrap theme overrides
│ │ └─ main.ts # shared helpers (API base, auth headers, flash)
│ └─ index.html # root: redirects to dashboard or login
└─ scripts/
└─ cleanBuildAll.js # one-command clean + install + init DB + build
```

---

## 4) Technology Stack

**Backend**

- Node.js, **Express** (TypeScript)
- **Prisma** ORM with **SQLite** (development)
- **JWT** authentication + RBAC middleware
- **Multer** for file uploads (disk storage)
- **Nodemailer** with **MailDev** for local email testing

**Frontend**

- **Vite** (vanilla) + TypeScript
- **Bootstrap 5**
- Global theme (primary **#57998D**, link color **#24907e**)

---

## 5) Configuration

The backend reads configuration from `backend/.env`.  
The root script creates a default file if missing:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-long-random-string"
APP_BASE_URL=http://localhost:5173

# Local email testing (MailDev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM="Uni Recs <noreply@unirecs.local>"
```

> For production, switch `DATABASE_URL` to Postgres/MySQL and configure a real SMTP provider.

---

## 6) Scripts

### Root

```json
{
  "scripts": {
    "cleanBuild:all": "node scripts/cleanBuildAll.js",
    "dev": "concurrently -n BACKEND,FRONTEND -c auto \"npm:dev:backend\" \"npm:dev:frontend\"",
    "dev:backend": "npm --prefix backend run dev",
    "dev:frontend": "npm --prefix frontend run dev"
  }
}
```

- **cleanBuild:all** — stops dev Node processes, creates `.env` if needed, cleans, installs, applies Prisma schema, seeds users, and builds backend and frontend.
- **dev** — runs backend dev (which also starts MailDev) and frontend dev concurrently.

### Backend

- `npm run dev` — nodemon + ts-node; starts the API and MailDev for emails.
- `npm run build` — TypeScript compile to `dist/`.
- `npm run start` — run compiled server (`node dist/index.js`).
- Prisma seed (`backend/prisma/seed.ts`) ensures the three test users exist.

### Frontend

- `npm run dev` — Vite development server on port 5173.
- `npm run build` — Type-check + Vite production build to `dist/`.
- `npm run preview` — preview the production build.

---

## 7) Application Flow

1. The **frontend** serves multiple HTML pages via Vite.  
   The root (`/`) page checks for a valid token:
   - Valid → redirect to **/dashboard.html**
   - Invalid/none → redirect to **/login.html**
2. Users authenticate via **JWT** (stored in `localStorage`).  
   All API requests include `Authorization: Bearer <token>`.
3. **Students/Admins** can create submissions (one **PENDING** at a time).
4. **Reviewers/Admins** list and review submissions; once **APPROVED**, further reviews on that submission are blocked.
5. **Notifications** (opt-in):
   - Reviewers/Admins may receive an email when a new submission is created.
   - Students may receive an email when a review decision is made.
   - Emails are captured by MailDev in development.

---

## 8) Key API Endpoints (Summary)

**Auth**

- `POST /api/auth/register` — registers a **STUDENT**. Body: `{ email, password, firstName, lastName }`
- `POST /api/auth/login` — returns `{ token }`
- `GET /api/auth/me` — returns current user `{ id, email, role, firstName, lastName }`

**Submissions**

- `POST /api/submissions` — create submission (multipart: `title`, `document`)
- `GET /api/submissions/my-submissions` — current user’s submissions
- `GET /api/submissions/all` — staff view (reviewers/admins)
- `GET /api/submissions/:id` — submission details (with reviews)

**Reviews** (reviewers/admins)

- `POST /api/reviews/:id/review` — `{ approved: boolean, comments?: string }`  
  _(No further reviews allowed after approval.)_

**Admin**

- `GET /api/admin/users` — list users
- `POST /api/admin/users` — create user (shows temp password)
- `PATCH /api/admin/users/:id/role` — update role
- `POST /api/admin/users/:id/reset-password` — reset to temp password
- `DELETE /api/admin/users/:id` — delete user and related data

**User Preferences**

- `GET /api/user/preferences`
- `PATCH /api/user/preferences` — `{ notifyOnNewSubmission?, notifyOnReviewDecision? }`

**Utility**

- `GET /api` — HTML index of registered routes

---

## 9) Frontend Pages

- `/index.html` — root router (redirects to dashboard or login)
- `/login.html` — authentication (email + password)
- `/register.html` — self-registration (student role)
- `/dashboard.html` — role-aware landing page
  - Students: welcome + “Apply” link + recent submissions (max 5)
  - Reviewers: submissions table
  - Admins: both + user management
- `/application.html` — submit application (students/admins)
- `/submissions.html` — submissions list with search and sorting (staff)
- `/submission.html?id=…` — individual submission details and review UI

---

## 10) Troubleshooting

- **Windows EPERM rename (Prisma DLL)**:  
  Caused by locked files from running node processes.  
  Use `npm run cleanBuild:all` or stop all `node/vite/nodemon` processes and retry.

- **No emails in dev**:  
  MailDev should be running (started by the backend dev script). Check http://localhost:1080/.

- **Empty database**:  
  Re-run `npm run cleanBuild:all`, or:
  ```bash
  cd backend
  npx prisma db push
  npx prisma db seed
  ```

---

## 11) Production Notes

- Replace SQLite with Postgres/MySQL and run `prisma migrate deploy`.
- Store uploads in an object store (e.g., S3/Cloud Storage) rather than local disk.
- Serve the built frontend via a static host (e.g., Nginx, Vercel, Netlify).
- Harden CORS, JWT handling, logging, and error reporting.

---
