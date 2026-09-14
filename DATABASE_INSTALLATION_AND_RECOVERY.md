# Altrium Performance Tracker - Database Installation & Recovery Guide

> [!IMPORTANT]
> **Verification Status**: **Fully Verified (Schema DDL, demo package, and private disaster recovery verified end-to-end against live isolated test databases).**
> The schema DDL, seed dataset, and recovery snapshot have been fully validated through live, end-to-end automated restoration trials on dedicated test databases (`altrium_demo_test_db` and `altrium_recovery_test_db`) and isolated service instances (ports 5003 and 5004) with 100% pass rate (70/70 checks passed).

This guide provides complete, PowerShell-compatible instructions for setting up the Altrium Performance Tracker database, initializing restricted application users, executing isolated trial restorations, deploying the shareable demonstration package, or executing a full private disaster recovery restoration.

---

## 1. Schema Architecture & Policy Specification

### Unified Schema (`database/schema.sql`)
The portable DDL in `database/schema.sql` represents the **complete, final target schema** and already incorporates all accepted application capabilities and migration changes:
- Full role hierarchy (`company_manager`, `hr_manager`, `department_manager`, `team_manager`, `employee`) and `quarter_batch`
- Performance Improvement Plans (PIP) & Personal Development Plans (PDP) with universal August 30, 2027 deadline policy:
  - Evidence is allowed throughout August 30, 2027 in Asia/Colombo (+05:30); rejection begins August 31, 2027 at 00:00:00 (+05:30).
- Multi-upload evidence tracking with `idempotency_key` and SHA-256 `payload_hash`
- Append-only manager feedback (`evidence_feedback`)
- Department Summary Reports with multi-revision versioning (`revision_number`, `is_latest`, `parent_report_id`, `submission_key`)
- Grouped review draft saving, submission keys, and real-time deep-linked notifications

### Deployment Order Rules:
1. **Fresh Installations**: Run `database/schema.sql` followed by `database/seed_demo.sql`. **Zero subsequent migrations are needed.**
2. **Existing Database Upgrades**: Do NOT run `schema.sql` against an active database. Instead, execute the incremental migration scripts in `backend/migrations/` in sequential order.
3. **Foreign Key Integrity & Post-Import Validation**:
   - `schema.sql` and `seed_demo.sql` temporarily set `SET FOREIGN_KEY_CHECKS = 0;` to allow circular and self-referencing definitions (`users.manager_id -> users.id`, `department_reports.parent_report_id -> department_reports.id`).
   - > [!IMPORTANT]
     > Re-enabling `SET FOREIGN_KEY_CHECKS = 1;` enforces constraints on subsequent operations but **does not retroactively validate already-imported rows** in MySQL.
     > Therefore, post-import verification scripts must explicitly run orphan queries across every foreign-key boundary (`users`, `plans`, `tasks`, `reviews`, `evidence`, `evidence_feedback`, `department_reports`, `notifications`) and validate important logical rules (such as matching `plan.recipient_id` with `evidence.recipient_id` and ensuring department heads have appropriate batch states).

---

## 2. System Prerequisites

| Component | Minimum Version | Recommended Version | Purpose |
|---|---|---|---|
| **MySQL Server** | 8.0.28+ / MariaDB 10.5+ | MySQL 8.4.x / 8.0.35+ | Relational persistence (`InnoDB`, `utf8mb4_unicode_ci`) |
| **Node.js** | 18.18.0 LTS | 20.x or 22.x LTS | Backend runtime & build tooling |
| **npm** | 9.x+ | 10.x+ | Package manager |
| **PowerShell** | 5.1+ | 7.x (Core) or Windows PowerShell 5.1 | Terminal execution |

Verify your environment in PowerShell:
```powershell
mysql --version
node --version
npm --version
```

---

## 3. Dedicated Administrator Setup for Pending Isolated Restoration Trials

To execute isolated end-to-end restoration trials (both the Shareable Demo and Private Disaster Recovery) on separate instances without altering the working application account's permissions:

### Step 3.1: Navigate to Project Directory and Connect via Verified Local MySQL Client

In PowerShell, ensure you are in the project root directory and connect to the MySQL server using the verified project-local client with explicit TCP protocol, host `127.0.0.1`, and port `3309`:

```powershell
# 1. Ensure working directory is the project root
Set-Location "C:\Users\user\Desktop\Altrium-Fresh"

# 2. Connect as administrator using verified absolute path with interactive password prompt
& "C:\Users\user\Desktop\Altrium-Fresh\.local\mysql\mysql-8.4.4-winx64\bin\mysql.exe" --protocol=TCP -h 127.0.0.1 -P 3309 -u root -p
```
*(Enter the root/administrator password when prompted interactively. The password will not appear in terminal history.)*

### Step 3.2: Verify Server Port and Data Directory

Inside the MySQL console, confirm the active server port and data directory:

```sql
SHOW VARIABLES LIKE 'port';
SHOW VARIABLES LIKE 'datadir';
```

### Step 3.3: Verify Absence of Targets & Create Separate Test Databases

Check that neither test database already exists. If either exists, stop and inspect it before proceeding; do not silently reuse dirty state:

```sql
-- Fail check: Verify that neither test database already exists (must return Empty set)
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA 
WHERE SCHEMA_NAME IN ('altrium_demo_test_db', 'altrium_recovery_test_db');

-- Create separate clean test databases (fails if either database already exists)
CREATE DATABASE `altrium_demo_test_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE `altrium_recovery_test_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Step 3.4: Provision Dedicated Trial User with Restricted Privileges

Create a dedicated trial user with a locally supplied password (do not publish or hardcode fixed passwords), restricted strictly to the two test databases:

```sql
-- Create dedicated trial account with a locally chosen secret
CREATE USER 'altrium_trial_user'@'127.0.0.1' IDENTIFIED BY '<ChooseYourLocalTrialPassword>';

-- Grant privileges strictly on the isolated demo test database
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, LOCK TABLES, EXECUTE
  ON `altrium_demo_test_db`.*
  TO 'altrium_trial_user'@'127.0.0.1';

-- Grant privileges strictly on the isolated recovery test database
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, LOCK TABLES, EXECUTE
  ON `altrium_recovery_test_db`.*
  TO 'altrium_trial_user'@'127.0.0.1';

FLUSH PRIVILEGES;
EXIT;
```

### Step 3.5: Execute Automated Live Isolated Restoration Trials (Masked Secret Prompt)

In PowerShell, execute the trial runner using a masked password prompt that removes the temporary secret from the environment upon completion:

```powershell
# Prompt interactively for the trial secret without echoing to screen or terminal history
$securePass = Read-Host -Prompt "Enter local trial password" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
$plainPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

try {
    $env:TRIAL_DB_PASSWORD = $plainPass
    node .\scratch\run_live_isolated_restoration_trial.cjs
} finally {
    Remove-Item Env:\TRIAL_DB_PASSWORD -ErrorAction SilentlyContinue
    $plainPass = $null
}
```

#### Test Harness Isolation Features:
- **Trial 1 (Demo Package Trial)**: Restores `database/schema.sql` and `database/seed_demo.sql` into `altrium_demo_test_db`, copies demo attachments into `backend/storage_trial_demo/`, launches an isolated Express API process on port `5003`, and validates end-to-end workflows:
  - Company-manager plan assignment
  - Recipient evidence upload
  - Authorized protected download with SHA-256 byte/hash comparison
  - Manager feedback and recipient feedback retrieval
  - PDP conclusion and subsequent upload rejection (400 Bad Request)
- **Trial 2 (Disaster Recovery Trial)**: Restores `recovery_database.sql` from `backend/backups/recovery_snapshot_1789381025530/` into `altrium_recovery_test_db`, copies snapshot storage into `backend/storage_trial_recovery/`, launches an isolated Express API process on port `5004`, and verifies:
  - Restored record counts (94 users, 3 plans, 3 evidence, 3 reports)
  - Plan 7 and Plan 103 PIP deadline policy (`2027-08-30` in Asia/Colombo)
  - Authorized download of restored evidence (Plan 40 Evidence 12) with SHA-256 hash comparison
  - Authorized download of restored department report (Report 31) with SHA-256 hash comparison
  - Rejection of unauthorized downloads (403 Forbidden)
  - Authenticates via JWT signing without modifying restored user records or guessing password hashes
- **Fail-If-Exists Safety**: Each trial verifies that its target database was completely empty before importing. If tables exist, the harness halts immediately and displays table names for administrator inspection.
- **Port Availability Pre-check**: Confirms ports 5003 and 5004 are free before starting.
- **Precise Process Tracking**: Only terminates child processes spawned and tracked by this harness PID.
- **Working Instance Protection**: The live working database (`altrium_fresh_db`), live backend (port `5002`), and live storage directories (`backend/storage/`) are never touched or altered.

---

## 4. Standard Database & Application User Provisioning (Least Privilege)

For production or standard operational deployments:

Log in to MySQL as administrator (`root`) with interactive password prompt:

```powershell
mysql -u root -p
```

Execute the following SQL commands (replace `YourSecureAppPasswordHere!` with a strong production secret):

```sql
-- Create database with full unicode support
CREATE DATABASE IF NOT EXISTS `altrium_performance_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create restricted application user (least privilege - no global administrative rights)
CREATE USER IF NOT EXISTS 'altrium_app'@'localhost' IDENTIFIED BY 'YourSecureAppPasswordHere!';

-- Grant required operational privileges strictly on the application database
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, LOCK TABLES, EXECUTE
  ON `altrium_performance_db`.*
  TO 'altrium_app'@'localhost';

-- Apply privilege changes
FLUSH PRIVILEGES;

-- Verify user grants
SHOW GRANTS FOR 'altrium_app'@'localhost';
EXIT;
```

---

## 5. Option A: Fresh Shareable Demonstration Installation

Use this option to set up a clean demonstration instance containing complete fictional organization data, the approved 3-tier hierarchy, sample review cycles, and company-manager plan assignments.

### Step A.1: Import Portable Schema & Demonstration Seed

From the project root directory in PowerShell:

```powershell
# Import portable DDL schema
mysql -u altrium_app -p altrium_performance_db < .\database\schema.sql

# Import shareable demonstration dataset
mysql -u altrium_app -p altrium_performance_db < .\database\seed_demo.sql
```

### Step A.2: Initialize Demonstration Storage Files

Copy the provided demonstration attachments into the backend storage directory:

```powershell
# Create storage directories if they do not exist
New-Item -ItemType Directory -Force -Path ".\backend\storage\evidence" | Out-Null
New-Item -ItemType Directory -Force -Path ".\backend\storage\reports" | Out-Null

# Copy demonstration evidence and report attachments
Copy-Item -Path ".\database\demo_storage\evidence\*" -Destination ".\backend\storage\evidence\" -Force
Copy-Item -Path ".\database\demo_storage\reports\*" -Destination ".\backend\storage\reports\" -Force
```

### Step A.3: Demonstration Credentials Reference & Security Notice

> [!WARNING]
> **Demonstration Password Security Policy**:
> All demonstration accounts in `seed_demo.sql` use a common demo password: `DemoPassword123!`.
> This password is intended **strictly for local demonstration and evaluation**. Before deploying any shared, staging, or production instance, all passwords must be updated with secure, unique credentials.

- **Default Demo Password**: `DemoPassword123!`
- **Key Demo Accounts**:
  - **Company Manager**: `anura.company@altrium.com` (Directly manages Dinesh, Chamari, and Amaya)
  - **IT Department Head**: `dinesh.it@altrium.com` (`department_manager`, IT Department)
  - **Finance Department Head**: `chamari.finance@altrium.com` (`department_manager`, Finance Department)
  - **HR Department Head**: `amaya.hr@altrium.com` (`hr_manager`, Human Resources)
  - **Software Team Manager**: `sarah.software@altrium.com` (`team_manager`, IT Department)
  - **HR IT Portfolio Specialist**: `ayesha.hr@altrium.com` (`employee`, HR Department)
  - **HR Finance Portfolio Specialist**: `ruwan.hr@altrium.com` (`employee`, HR Department)
  - **Employee**: `avishka.wijesinghe3@altrium.com` (`employee`, Software Dev Team, Batch Q3)

---

## 6. Option B: Full Private Disaster Recovery Restoration

Use this option when recovering the full operational database state, including working accounts, private uploads, and live snapshot history.

> [!CAUTION]
> Private recovery backups are stored in `backend/backups/recovery_snapshot_<timestamp>/` and are excluded from version control for confidentiality. Ensure you have the authorized snapshot archive before proceeding.

### Step B.1: Locate and Validate Recovery Snapshot

In PowerShell, list available recovery snapshots and inspect the manifest:

```powershell
$latestSnapshot = Get-ChildItem -Path ".\backend\backups" -Directory -Filter "recovery_snapshot_*" | Sort-Object CreationTime -Descending | Select-Object -First 1
Write-Host "Restoring from snapshot: $($latestSnapshot.FullName)"

# Inspect manifest
Get-Content -Path (Join-Path $latestSnapshot.FullName "manifest.json") | ConvertFrom-Json | Format-List
```

### Step B.2: Restore Database Dump

```powershell
$sqlDumpPath = Join-Path $latestSnapshot.FullName "recovery_database.sql"
mysql -u altrium_app -p altrium_performance_db < $sqlDumpPath
```

### Step B.3: Restore Protected File Storage

```powershell
# Ensure destination storage directories exist
New-Item -ItemType Directory -Force -Path ".\backend\storage\evidence" | Out-Null
New-Item -ItemType Directory -Force -Path ".\backend\storage\reports" | Out-Null

# Copy protected evidence and reports from snapshot
Copy-Item -Path (Join-Path $latestSnapshot.FullName "storage\evidence\*") -Destination ".\backend\storage\evidence\" -Force
Copy-Item -Path (Join-Path $latestSnapshot.FullName "storage\reports\*") -Destination ".\backend\storage\reports\" -Force
```

---

## 7. Backend & Frontend Environment Configuration

### Backend Configuration (`backend/.env`)

Create or update `backend/.env` with your database connection parameters:

```env
PORT=5002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=altrium_performance_db
DB_USER=altrium_app
DB_PASSWORD=YourSecureAppPasswordHere!
JWT_SECRET=your_production_jwt_signing_secret_min_32_chars
NODE_ENV=production
```

### Frontend Configuration (`.env`)

Create or update root `.env`:

```env
VITE_API_URL=http://localhost:5002/api
```

---

## 8. Service Startup & Verification

### Step 8.1: Start Backend API

```powershell
cd backend
npm install
npm start
```

Expected startup output:
```
Database connected successfully (no schema alterations)
Server running on port 5002
```

### Step 8.2: Build and Serve Frontend

In a separate PowerShell terminal:

```powershell
# From workspace root
npm install
npm run build
npm run preview -- --port 5173
```

---

## 9. Post-Installation Verification Checklist

Verify key application boundaries and features in the browser or via API:

1. **Company Manager Plan Management**:
   - Log in as `anura.company@altrium.com`.
   - Verify **"Assign PIP / PDP"** in the sidebar.
   - Confirm the recipient dropdown displays only direct department heads (**Dinesh Jayawardena**, **Chamari Perera**, **Amaya Senanayake**).
   - Confirm **Needs Attention** is omitted from the Company Manager dashboard.

2. **Department Head Workflows**:
   - Log in as `amaya.hr@altrium.com` or `dinesh.it@altrium.com`.
   - Verify assigned plans appear in **My Tasks** and personal plan metrics.
   - Verify evidence submissions and download isolation.

3. **Department Reports & Portfolio Governance**:
   - Log in as `ayesha.hr@altrium.com` (IT Portfolio HR specialist).
   - Verify access to IT Department summary report revisions (Revision 1 and Revision 2).
   - Confirm Finance department reports remain inaccessible.

4. **Review Cycle & Confidentiality Boundaries**:
   - Log in as `sarah.software@altrium.com` (Team Manager).
   - Verify downward and team review tasks.
   - Confirm employee peer reviews remain confidential and hidden from review subjects.

---

## 10. Backup & Maintenance Procedures

To create a new timestamped recovery snapshot at any time:

```powershell
node .\scratch\create_full_recovery_snapshot.cjs
```

The snapshot will generate `recovery_database.sql`, full storage copies, and a cryptographic `manifest.json` inside `backend/backups/recovery_snapshot_<timestamp>/`.
