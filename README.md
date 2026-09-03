# Mini ERP + CRM Operations Portal

An internal operations portal for a wholesale/distribution company: customer CRM, product & inventory management, and sales challans (delivery notes) with stock-safe confirmation. Built for four roles — Admin, Sales, Warehouse, Accounts.

## Live deployment

| | |
|---|---|
| **Frontend** | https://d3i9zqel4cra9v.cloudfront.net |
| **Backend API** | https://d3iqgyhmlqxdcf.cloudfront.net (health: `/health`) |

Log in with any of the [seeded users](#seeded-users) — e.g. `admin@example.com` / `Password123!`.

Deployed on AWS: the backend runs as a Docker container on EC2 (`t3.micro`) behind CloudFront for HTTPS; the frontend is a static build in a private S3 bucket served through a second CloudFront distribution via Origin Access Control; the database is PostgreSQL on Neon. Everything sits inside the AWS free tier. See [Deploying to AWS](#deploying-to-aws) for how it was set up.

## Tech stack

- **Backend:** Node.js + TypeScript, Express 5, PostgreSQL, Prisma ORM
- **Frontend:** React + TypeScript, Vite, React Router
- **Auth:** JWT, role-based access control (Admin / Sales / Warehouse / Accounts)
- **Validation:** Zod on every endpoint
- **Bonus:** Docker + Docker Compose, GitHub Actions (CI + deploy), PDF challan export, product image upload to S3

## Repo structure

```
server/   Express API, Prisma schema + migrations, seed script, Dockerfile
client/   React SPA (Vite), Dockerfile + nginx config
.github/workflows/   CI (lint/build) and deploy (EC2 + S3/CloudFront) pipelines
docker-compose.yml   Runs both apps in containers for local/demo use
render.yaml, client/vercel.json   Config for the simpler free-tier fallback deploy path
```

## Architecture

- **Client** (React + Vite) talks to the API only via JSON over HTTPS. The JWT returned by login is kept in `localStorage` and attached to every request as a Bearer header by an axios interceptor. Routing is client-side (React Router); role-based nav/action visibility is a UI convenience only — every permission is re-enforced server-side.
- **Server** (Express + TypeScript): `routes → role-guard middleware → controllers → Prisma`. Business rules that must be atomic (challan confirm/cancel, manual stock movements) run inside a single Prisma `$transaction`. The "stock never goes negative" guarantee is implemented as one conditional `UPDATE ... WHERE currentStock >= quantity` rather than a read-then-write, so it holds under genuinely concurrent requests, not just in the common case (verified with a script that fires 5 concurrent confirmations against 10 units of stock — exactly the number that can be satisfied succeed, the rest are rejected, final stock is never negative).
- **Database**: PostgreSQL, one schema, migrated via Prisma Migrate. Foreign keys default to `RESTRICT`, so deleting a customer/product still referenced by a challan or stock movement is rejected by the database itself (surfaced as a 409 by the global error handler), not by ad hoc application checks.
- **Cross-cutting**: Zod validates every request body/query and normalizes failures to `{ error, details }`; a single Express error-handling middleware maps everything else (Prisma errors, malformed JSON, unmatched routes, unexpected exceptions) to a consistent `{ error }` shape and status code.

## Local setup

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance (local or hosted — this project was developed against both local Postgres and [Neon](https://neon.tech))

### 1. Database

Create an empty database, e.g.:

```bash
createdb mini_erp_crm
```

### 2. Backend

```bash
cd server
cp .env.example .env   # then edit DATABASE_URL / JWT_SECRET as needed
npm install
npm run prisma:migrate   # applies all migrations
npm run prisma:seed      # creates one user per role
npm run dev               # http://localhost:4000
```

### 3. Frontend

```bash
cd client
cp .env.example .env   # VITE_API_URL should point at the backend
npm install
npm run dev               # http://localhost:5173
```

### Running with Docker instead

```bash
cp server/.env.example server/.env   # fill in DATABASE_URL / JWT_SECRET
docker compose up --build
# backend:  http://localhost:4000
# frontend: http://localhost:8080
```

`docker compose exec server npm run prisma:seed` seeds the four role users the same way `npm run prisma:seed` does locally.

> **Don't wrap `.env` values in quotes** (`DATABASE_URL=postgresql://...`, not `DATABASE_URL="postgresql://..."`). Node's `dotenv` strips quotes, but Docker's `--env-file`/`env_file:` parser does not — a quoted value passed to the container keeps its literal quote characters and Prisma fails to parse the URL. `server/.env.example` is already quote-free for this reason.

### Seeded users

`npm run prisma:seed` creates one user per role, all with password `Password123!`:

| Email | Role |
|---|---|
| admin@example.com | ADMIN |
| sales@example.com | SALES |
| warehouse@example.com | WAREHOUSE |
| accounts@example.com | ACCOUNTS |

## Environment variables

### `server/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `8h`) |
| `PORT` | Port the API listens on (default `4000`) |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` | Optional — only needed for the product-image-upload bonus feature. `POST /uploads/presign` returns `501` until these are set; everything else works fine without them. |
| `S3_PUBLIC_BASE_URL` | Optional override for the public URL prefix of uploaded images (e.g. a CloudFront domain in front of the bucket). Defaults to the bucket's own S3 URL. |

### `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## Available scripts

**server/**
- `npm run dev` — run the API with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run pending migrations, then start the compiled server (used in production/Docker)
- `npm run prisma:migrate` — create/apply a migration in development
- `npm run prisma:seed` — seed one user per role
- `npm run lint` — ESLint

**client/**
- `npm run dev` — Vite dev server
- `npm run build` — type-check and build for production
- `npm run lint` — ESLint

## Modules

- **Auth & roles** — JWT login, `authenticate` + `requireRole` middleware.
- **Customer CRM** — customer CRUD, search, pagination, and a follow-up log sub-resource.
- **Product & Inventory** — product CRUD, low-stock alerts, an optional product image, and an append-only stock movement log (every stock change — manual or via a challan — is recorded).
- **Sales Challans** — draft → confirmed → cancelled lifecycle, an auto-generated challan number, and a `totalQuantity`/`totalAmount` computed from line items. Each line item snapshots the product's name/SKU/price at the time the challan was created, so historical challans stay accurate even if the product master data changes later. Confirming a challan decrements stock atomically per item and rejects the whole confirmation if any item lacks sufficient stock; cancelling a confirmed challan restocks the items. A challan can also be downloaded as a PDF.

### Role permissions (assumption)

The spec didn't prescribe exact permission boundaries per role, so the following was assumed and implemented as role-guard middleware:

| Action | Allowed roles |
|---|---|
| View customers / products / challans / stock log | All authenticated roles (nav visibility per role is a UI convenience only — enforcement is server-side) |
| Create/edit/delete customers, add follow-ups | Admin, Sales |
| Create/edit/delete products, record stock movements, upload product images | Admin, Warehouse |
| Create/edit/delete draft challans | Admin, Sales |
| Confirm / cancel challans, download challan PDF | Admin, Warehouse for confirm/cancel (mirrors that confirming is itself a stock-out event); PDF download is open to any authenticated role |

## Bonus features implemented

- **Docker** — `server/Dockerfile` (multi-stage: install → `prisma generate` → `tsc` build → run) and `client/Dockerfile` (multi-stage: Vite build → served by nginx with an SPA fallback). `docker-compose.yml` at the repo root runs both together for local/demo use.
- **GitHub Actions** — `.github/workflows/ci.yml` lints, type-checks, and builds both apps on every push/PR. `.github/workflows/deploy.yml` redeploys the backend to EC2 over SSH and syncs the frontend build to S3 + invalidates CloudFront (manual trigger by default — see [Continuous deployment](#6--continuous-deployment-optional) for the secrets it needs to run automatically).
- **Challan PDF export** — `GET /challans/:id/pdf` streams a PDF (via `pdfkit`, no headless browser needed) with the customer, line items, and totals. There's no separate "Invoice" entity in the required data model, so this generates a PDF of the Challan — the closest existing document. A "Download PDF" button is on the challan detail page.
- **Product image upload to S3** — `POST /uploads/presign` returns a short-lived presigned S3 PUT URL; the browser uploads the file directly to S3 (never through the Node server), then the returned public URL is saved as the product's `imageUrl`. Requires the `AWS_*`/`S3_BUCKET_NAME` env vars above; without them the endpoint responds `501` and the rest of the app is unaffected.

## Deploying to AWS

This is the primary deployment path (AWS is a bonus per the brief, but free-tier eligible end-to-end). Architecture:

- **EC2** (free tier, `t2.micro`/`t3.micro`) runs the backend as a Docker container.
- **CloudFront in front of that EC2 instance** gives the API a stable `https://…cloudfront.net` URL without needing your own domain or TLS certificate.
- **S3 + a second CloudFront distribution** hosts the built React app as a static site.
- **Database** stays on Neon (already set up and working) rather than moving to RDS — one less moving part, and it's already free.

### 1. Launch the backend EC2 instance

1. EC2 console → **Launch instance**. AMI: **Ubuntu 22.04 LTS** (free-tier eligible). Instance type: `t2.micro` or `t3.micro` (whichever your account's free tier covers).
2. Create a new key pair, download the `.pem` — you'll need it for SSH and for the `EC2_SSH_KEY` GitHub secret.
3. Security group: allow inbound **SSH (22)** from your IP, and **custom TCP 4000** from anywhere (`0.0.0.0/0`) so CloudFront can reach the API.
4. Launch, wait for "Running", note the public IPv4 address.
5. (Recommended) Allocate an **Elastic IP** and associate it with the instance, so the address is stable across stop/start. It's free while attached — release it when you tear the instance down.

### 2. Install Docker and deploy the backend

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git
sudo usermod -aG docker ubuntu   # log out/in again for this to apply

git clone <your-repo-url> mini-erp-crm-portal
cd mini-erp-crm-portal/server
cp .env.example .env
nano .env   # DATABASE_URL (your Neon URL), JWT_SECRET, and the S3 vars if you want image upload
cd ..
docker compose up -d --build server
curl http://localhost:4000/health   # should print {"status":"ok"}
```

### 3. Put CloudFront in front of the API

1. CloudFront console → **Create distribution**.
2. Origin domain: the EC2 instance's public DNS, origin port **4000**, protocol **HTTP only**.
3. Viewer protocol policy: **Redirect HTTP to HTTPS**.
4. Cache policy: **CachingDisabled** (this is a dynamic API, not static content).
5. Allowed methods: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**.
6. Origin request policy: **AllViewer** — this is the setting that's easy to miss; without it CloudFront strips the `Authorization` header and login silently breaks.
7. Deploy (takes 5–15 min). Your API is now at `https://<this-distribution>.cloudfront.net` — this is your **live backend API URL**.

### 4. Host the frontend on S3 + CloudFront

1. S3 → **Create bucket** with **Block all public access** left ON (CloudFront reaches it via Origin Access Control, not a public bucket policy).
2. CloudFront → **Create distribution** → Origin: that bucket → choose **Origin access control (recommended)**, create a new OAC. CloudFront will show you a bucket policy — paste it into the bucket's permissions when prompted.
3. Default root object: `index.html`.
4. Add a **custom error response**: for HTTP error codes **403** and **404**, response page path `/index.html`, response code `200`. This is the CloudFront equivalent of the SPA rewrite `client/vercel.json` does for Vercel — without it, refreshing on `/customers/123` 404s.
5. Note the distribution domain, e.g. `https://d123abc.cloudfront.net` — this is your **live frontend URL**.

### 5. Build and publish the frontend

```bash
cd client
VITE_API_URL=https://<api-distribution-domain> npm run build
aws s3 sync dist/ s3://<your-bucket-name> --delete
aws cloudfront create-invalidation --distribution-id <frontend-distribution-id> --paths "/*"
```

### 6. Continuous deployment (optional)

`.github/workflows/deploy.yml` automates steps 2 and 5. It ships as **manual-trigger only** (Actions → Deploy → Run workflow) so it doesn't fail on every push while its secrets are unset.

To enable it, add these repository secrets (Settings → Secrets and variables → Actions), then uncomment the `push` trigger at the top of the workflow:

| Secret | Value for this deployment |
|---|---|
| `EC2_HOST` | `52.66.162.177` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | full contents of `~/.ssh/mini-erp-key.pem` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | the `deploy-admin` IAM keys |
| `AWS_REGION` | `ap-south-1` |
| `S3_BUCKET_NAME` | `mini-erp-crm-frontend-881424867129` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E3K3MIGG90S5MZ` (frontend distribution) |
| `VITE_API_URL` | `https://d3iqgyhmlqxdcf.cloudfront.net` |

Note that this grants GitHub Actions the `deploy-admin` credentials, which currently carry `AdministratorAccess` — worth narrowing that IAM policy to just S3 + CloudFront before enabling automatic deploys.

### Redeploying by hand

Backend (after pushing code changes):

```bash
ssh -i ~/.ssh/mini-erp-key.pem ubuntu@52.66.162.177
cd ~/mini-erp-crm-portal && git pull origin main && docker compose up -d --build server
```

Frontend:

```bash
cd client
VITE_API_URL=https://d3iqgyhmlqxdcf.cloudfront.net npm run build
aws s3 sync dist/ s3://mini-erp-crm-frontend-881424867129 --delete --exclude index.html --cache-control "public,max-age=31536000,immutable"
aws s3 cp dist/index.html s3://mini-erp-crm-frontend-881424867129/index.html --cache-control "no-cache,no-store,must-revalidate" --content-type text/html
aws cloudfront create-invalidation --distribution-id E3K3MIGG90S5MZ --paths "/*"
```

### Cost/safety notes

The brief explicitly says not to spend money on this — stay inside the free tier:

- EC2's 750 free hours/month of `t2.micro`/`t3.micro` only applies for a new AWS account's **first 12 months**. On an older account, running EC2 costs a small hourly amount — stop the instance when you're not actively demoing.
- CloudFront's free tier (1TB out, 10M requests/month) and S3's free tier comfortably cover a demo/grading load.
- Release any Elastic IP once you're done — an allocated-but-unattached Elastic IP is billed.

### Simpler fallback: Vercel + Render + Neon

If AWS setup risks the deadline, this free-tier path needs no AWS account at all:

- **Frontend:** [Vercel](https://vercel.com) — project root `client/`, build command `npm run build`, output directory `dist`. `client/vercel.json` (SPA rewrite) is already included.
- **Backend:** [Render](https://render.com) — `render.yaml` at the repo root is a ready-to-use blueprint (root directory `server/`); it runs migrations on boot via `npm run start`.
- **Database:** Neon or Supabase (persistent free tier; Render's own free Postgres expires after 90 days).

Either path: after deploying, set the frontend's `VITE_API_URL` to the deployed backend URL, and tighten the backend's currently-open CORS to the deployed frontend's origin.

## Postman collection

`postman_collection.json` at the repo root covers every endpoint (Auth, Customers + Follow-ups, Products + image upload, Stock Movements, Challans + PDF export). Import it, set the `baseUrl` collection variable, and run **Auth → Login** first — its test script stores the returned JWT into the `token` variable automatically, and subsequent requests use it via Bearer auth. `Create customer` / `Create product` / `Create challan (draft)` similarly populate `customerId` / `productId` / `challanId` for the requests that follow. Verified with a full top-to-bottom Newman run against a live server — every request returns exactly the status code its description promises.

## Assumptions

- Challan numbers (`CH-000001`, ...) are generated from the current row count inside the creation transaction. This is simple and correct for a single-instance deployment; it is not designed to survive multiple concurrent app instances writing to the same database (a proper sequence would be needed at that scale).
- The low-stock filter (`GET /products?lowStock=true`) compares two columns (`currentStock <= minStockQty`), which Prisma cannot push down into a single `WHERE` clause — it's done in memory after fetching matching rows. Fine at the scale this app targets; would need a raw query or a generated column for a large catalog.
- Seeded demo users share one placeholder password (`Password123!`) — for local/demo use only.
- Deleting a customer with existing challans, or a product referenced by any challan item or stock movement, is rejected by the database's foreign-key constraints (surfaced as a 409 through the global error handler) rather than by application logic — this is intentional, not a gap.
- No refresh-token flow: JWTs are stateless and simply expire after `JWT_EXPIRES_IN`; there's no server-side revocation/blacklist.
- "Export invoice as PDF" is implemented as a Challan PDF — the spec's data model has no separate Invoice entity (it's mentioned only in the business-context paragraph, not in the required Challan fields), so the challan is the closest real document to export.
- The S3 image-upload flow uses a presigned URL so the browser uploads directly to S3; this requires the bucket's CORS configuration to allow `PUT` from your frontend's origin, which is on you to set on the actual bucket (not something this repo's code can configure).

## Known limitations

- No automated test suite — all functional and concurrency behavior (including the "stock never goes negative" guarantee) was verified manually and via ad hoc scripts during development, not via a committed test suite.
- No rate limiting or security headers (e.g. `helmet`) — acceptable for an internal tool behind auth, but worth adding before any public-facing deployment.
- The frontend doesn't expose UI for editing or deleting a draft challan, even though the backend supports both (`PUT`/`DELETE /challans/:id`) — only create, confirm, cancel, and PDF download are wired up in the UI.
- CORS is fully open on the backend (`cors()` with no origin restriction); tighten it to the deployed frontend's origin for anything beyond local development/demo use.
- The production Docker image for the server ships the full `node_modules` (including devDependencies) rather than a pruned production-only install, because `prisma migrate deploy` needs the `prisma` CLI at container start. A leaner image would run migrations as a separate one-off step instead of inside the app container's start command.
- The runtime AWS/S3 credentials for image upload aren't scoped down to a minimal IAM policy in this repo (that has to be created in your own AWS account) — for anything beyond a demo, scope the IAM user/role to `s3:PutObject` on just the one bucket/prefix.

## Submission checklist

Per the case study's submission requirements:

1. GitHub repository link — https://github.com/Anuj12Gupta-dev/mini-erp-crm-portal
2. **Live frontend URL — https://d3i9zqel4cra9v.cloudfront.net**
3. **Live backend API URL — https://d3iqgyhmlqxdcf.cloudfront.net** (health check: `/health`)
4. Test login credentials for all roles — see [Seeded users](#seeded-users)
5. Postman collection — `postman_collection.json` (verified against a live server, see above)
6. README with setup and deployment instructions — this file
7. Short explanation of architecture — see [Architecture](#architecture)
8. Known limitations or incomplete parts — see [Known limitations](#known-limitations)
