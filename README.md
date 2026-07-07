# PSMS Travel Advance & Bill Summary

A small internal tool for the Bio-Medical Engineering department to:

- Submit **Travel Advance Requests** before a service trip
- Submit **Summary of Bills** after returning
- Auto-generate reference numbers in the format `PSMS/BM/[Initials]/YY/XXX` (bills)
  and `PSMS/ADV/[Initials]/YY/XXX` (advance requests), per-engineer, resetting each year
- Route each form through **Prepared by → Checked by → Approved by**
- Download/print a PDF that matches your original paper form, with both company logos

Built with Next.js (App Router), stored in **Neon Postgres**, deployed on **Vercel**.

---

## 1. Create your Neon database

1. Go to https://neon.tech, create a free project.
2. Copy the connection string it gives you (starts with `postgres://...`). It will look like:
   `postgres://user:password@ep-xxxx.neon.tech/neondb?sslmode=require`

## 2. Push this code to GitHub

```bash
cd psms-travel
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 3. Deploy to Vercel

1. Go to https://vercel.com/new and import the GitHub repo.
2. Before the first deploy, add these **Environment Variables** in Vercel (Project Settings → Environment Variables):
   - `DATABASE_URL` — your Neon connection string from step 1
   - `SESSION_SECRET` — any long random string (generate one with `openssl rand -base64 32`)
3. Click Deploy.

## 4. Initialize the database (one-time)

Run this once from your own computer (with Node.js installed) to create the tables and
your first admin login. It uses the same `DATABASE_URL` as Vercel.

```bash
npm install
DATABASE_URL="postgres://...your neon url..." \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD=ChangeMe123! \
ADMIN_NAME="System Admin" \
npm run seed
```

This prints confirmation once the tables are created and the admin user exists.
Log in at your deployed URL with that username/password, then **immediately go to
Manage Users → Reset Password** to set a real password (or just remember your own).

## 5. Add engineers and approvers

Log in as the admin user, go to **Users** in the top nav:

- **Engineers**: give each one a username/password and their **initials** (e.g. "AH" for
  Ali Hyder). Initials are what get used in reference numbers.
- **Approvers**: same, but set role to "Approver". Tick **"Can give final approval"** for
  people who should be able to do the final Approve step (e.g. BD Director, MD). Approvers
  without that tick can still do the "Checked by" step but not final approval — matching
  your SOP where checking and approving can be different people.
- You can add more admins the same way if needed.

## 6. Day-to-day use

- Engineers log in, click **New Advance Request** before travel, fill in the team/expense
  table (same fields as your paper form), and submit. A reference number like
  `PSMS/ADV/AH/26/01` is generated automatically.
- After the trip, they click **New Bill Summary**, optionally link it to the original
  advance request (auto-fills the advance amount), fill in actual expenses, and submit.
  This gets its own reference number, e.g. `PSMS/BM/AH/26/01`, following the exact format
  from your SOP.
- Approvers see everything on their dashboard and can **Mark Checked**, then **Approve**
  (or **Reject** with a reason) directly from the form's detail page.
- Anyone can click **Download PDF** or **Print** on a submitted form — it's laid out like
  your original paper form, with both logos, ready to attach to physical bills or file
  for records.

## Notes & things you may want to extend later

- **Original bill photos/receipts**: this MVP stores the numeric summary only, not
  scanned receipts. If you want engineers to upload photos of receipts too, the
  cleanest low-cost option is adding **Vercel Blob** storage — ask and this can be added.
- **Password reset by engineers themselves**: currently only the admin can reset a
  password (Manage Users → Reset Password). Self-service "forgot password" isn't wired
  up since there's no email sending configured yet.
- **Notifications**: approvers currently have to check the dashboard themselves; email/
  SMS notification when something needs checking or approving could be added later.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your own DATABASE_URL and SESSION_SECRET
npm run seed                 # one-time: creates tables + admin user
npm run dev                  # http://localhost:3000
```
