# Air Authority Project Trial Dashboard

This trial build is a React/Vite demo for an airport job and task management dashboard. It includes a mocked login page, role-aware administrator view, empty live dashboard metrics, job creation, job viewing, user creation with passwords, user login, assigned-task views, department/location/status charts, overdue jobs, quick actions, and announcements.

## Folder Structure

```text
air-authority-project/
  index.html
  package.json
  README.md
  src/
    main.jsx
    mockData.js
    styles.css
```

The demo starts with empty jobs, users, and announcements. The only configured area is `Philip S. W. Goldson Int Airport`.

## Run the Demo

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. The trial login uses:

```text
Email: admin@belizeairport.bz
Password: demo1234
```

Created users can also log in with the email and password entered on the `Users` page. After login, they will see `My Tasks`, which shows jobs assigned to their user account.

## Deploy to GitHub Pages (production)

Published URL:

```text
https://nonchxlantdev.github.io/airportauthorityproj/
```

### 1. GitHub Pages

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.

### 2. GitHub repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://hnwgqvoybzmsdqbpngjx.supabase.co` (or your project URL) |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon public** key from **Project Settings → API** |

These are baked into the static build at deploy time. A local `.env` file is **not** used by GitHub Actions.

`VITE_STAFF_POSITIONS_TABLE=staff_positions` is set in the workflow after you create that table with `supabase/staff_positions.sql`.

### 3. Supabase Auth URLs (required for login)

In **Supabase Dashboard → Authentication → URL configuration**, set:

- **Site URL:** `https://nonchxlantdev.github.io/airportauthorityproj/`
- **Redirect URLs:** add the same URL (and `http://localhost:5173` for local dev if needed)

Password reset emails use this redirect target.

### 4. Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, builds with your secrets, and publishes `dist/`.

You can also trigger a deploy manually from **Actions → Deploy to GitHub Pages → Run workflow**.

## Supabase Backend (local development)

Copy `.env.example` to `.env` in the project root and set:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STAFF_POSITIONS_TABLE=staff_positions
```

Restart `npm run dev` after editing `.env`.

The public anon key is safe in the browser when Row Level Security is enabled. Never put the Supabase `service_role` key in this frontend app.

### Supabase security SQL (run before public demo)

In **SQL Editor**, run these in order:

1. `supabase/staff_positions.sql` — GPS table (if not already applied)
2. `supabase/rls_policies.sql` — Row Level Security on all tables + storage
3. `supabase/enable_realtime.sql` — live dashboard updates on `jobs` and `job_history`

Ensure the **job-attachments** storage bucket exists in **Storage** before applying storage policies.

## MVP Build Steps

1. Keep this demo frontend as the visual prototype.
2. Add a backend API with `Users`, `Roles`, `Permissions`, `Departments`, `Areas`, `Jobs`, `JobAssignments`, `JobStatusHistory`, `JobComments`, `JobAttachments`, `Notifications`, `Announcements`, and `AuditLogs`.
3. Replace the mocked login with email/password authentication.
4. Replace local browser storage with API calls for users, dashboard metrics, jobs, charts, and alerts.
5. Add role-based route guards for administrator, senior manager, department manager, supervisor, staff, and auditor access.
6. Add create/edit job screens, attachment uploads, approval workflow, export reports, and audit history.

