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

## Deploy to GitHub Pages

This repository is configured for GitHub Pages at:

```text
https://nonchxlantdev.github.io/airportauthorityproj/
```

In the GitHub repository, open `Settings > Pages` and set `Build and deployment > Source` to `GitHub Actions`. Every push to the `main` branch will run `.github/workflows/deploy.yml`, build the Vite app, and publish the `dist` folder.

## Supabase Backend

The app now connects to Supabase for shared login, users, jobs, and job history. For local environment overrides, copy `.env.example` to `.env.local` and set:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The public anon key is safe for browser use when Row Level Security policies are enabled. Never put the Supabase `service_role` key in this frontend app.

## MVP Build Steps

1. Keep this demo frontend as the visual prototype.
2. Add a backend API with `Users`, `Roles`, `Permissions`, `Departments`, `Areas`, `Jobs`, `JobAssignments`, `JobStatusHistory`, `JobComments`, `JobAttachments`, `Notifications`, `Announcements`, and `AuditLogs`.
3. Replace the mocked login with email/password authentication.
4. Replace local browser storage with API calls for users, dashboard metrics, jobs, charts, and alerts.
5. Add role-based route guards for administrator, senior manager, department manager, supervisor, staff, and auditor access.
6. Add create/edit job screens, attachment uploads, approval workflow, export reports, and audit history.

