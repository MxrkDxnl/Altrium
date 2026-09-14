# Vercel frontend deployment

Project: C:\Users\user\Desktop\Altrium-Fresh

Status: frontend configuration prepared and local build/lint verified. No deployment has been published.

## Vercel settings
- Framework: Vite
- Root directory: project root
- Build: node scripts/check-vercel-env.mjs && npm run build
- Output: dist
- Environment: VITE_API_URL must be the publicly reachable HTTPS backend address, ending in /api.
- Set the API URL for both Preview and Production as appropriate.
- Never put database credentials or JWT secrets in VITE_ variables.

vercel.json handles client-side route refreshes.
.vercelignore excludes the backend, database exports, private local database, uploads, backups, scratch files and environment files from frontend CLI uploads.
Profile image URLs follow the configured API server.
The local .env file is not a hosted configuration; a local production build can still use its local API address.

## Required before a working public release
The Express API and MySQL database currently run locally. A Vercel frontend cannot connect to the laptop's localhost services.
Provision a reachable backend and MySQL database, configure the allowed frontend origin, and transfer the approved dataset using a verified backup.
Evidence and report middleware writes files to local disk. It needs permanent hosted storage; a temporary serverless filesystem cannot preserve uploaded evidence.
If the backend is also deployed to Vercel, adapt uploads and authorized downloads to private object storage and handle the platform's request-size limits before release.
No database reset, migration, data upload, account provisioning or backend storage conversion has been performed by this preparation.

## Release verification
Check actual password login, role restrictions, direct navigation to History/Assigned Plans, plan assignment, evidence upload/download, report download and manager feedback against the hosted environment.
Verify backups and restoration for hosted data and files.
A successful frontend build alone does not verify the complete hosted application.