# Technica PDM (Product Data Management)

A GitHub Pages web app for managing equipment, versions, and revisions
(Layout / Electrical Drawing / Alarms Configuration / PLC Code) for
Technica International, with role-based approval workflow and email
notifications.

## How it works

- **This repo** = the app (static HTML/CSS/JS), deployed via GitHub Pages.
- **A second, private "data repo"** = acts as your database + file storage
  (equipment.json, users.json, notifications.json, plus uploaded files
  under `files/`). The app reads/writes to it via the GitHub Contents API.

## Setup checklist (what's missing before this runs)

1. **Create the data repo**
   - Create a new **private** GitHub repo (e.g. `technica-pdm-data`).
   - Copy the contents of `seed-data/` into a `data/` folder in that repo:
     - `data/equipment.json`
     - `data/users.json`
     - `data/notifications.json`
   - Create an empty `files/.gitkeep` so the `files/` folder exists.

2. **Create a GitHub token**
   - Generate a **fine-grained Personal Access Token** scoped to ONLY the
     data repo, with **Contents: Read and write** permission.
   - ⚠️ This token will be visible in client-side code (`js/config.js`).
     Anyone who can view this repo's source can use it. Keep the data repo
     private, and rotate the token if it ever leaks.

3. **Fill in `js/config.js`**
   - `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` (the data repo), `GITHUB_BRANCH`.

4. **Set real passwords**
   - Edit `data/users.json` in the data repo — replace `CHANGE_ME` with
     real passwords for each engineer/admin/super admin, and set real
     emails (used for notifications).

5. **Set up EmailJS** (https://www.emailjs.com)
   - Create a free account, an email service, and 4 templates:
     - Revision submitted (to admins)
     - Revision approved/rejected (to the engineer)
     - File exported (to admins)
     - File imported (to admins)
   - Fill in `CONFIG.EMAILJS` in `js/config.js` with your public key,
     service ID, and the 4 template IDs.
   - Suggested template variables (already sent by the app):
     `to_email`, `equipment_name`, `version_label`, `revision_label`,
     `submitted_by` / `exported_by` / `imported_by` / `decided_by`,
     `decision`, `comment`, `categories`, `timestamp`.

6. **Enable GitHub Pages** on this repo (Settings → Pages → deploy from
   `main` branch, root folder).

7. **Add real equipment** once logged in as admin (the seed data includes
   one example: "Drop Type Packer" with Version 01 / 1 infeed and
   Version 02 / 2 infeed, both with no revisions yet).

## Roles

| Role | Can do |
|---|---|
| Engineer | View equipment/versions/revisions, submit new revisions with files, export files |
| Admin | Everything engineers can + create equipment/versions, approve/reject revisions |
| Super Admin | Same as Admin (reserved for future permission splits, e.g. user management) |

## File size limits

GitHub's Contents API has a hard 100MB-per-file limit and becomes slow
above ~20MB (base64 overhead). The app warns/blocks uploads over
`CONFIG.MAX_FILE_SIZE_MB` (default 20MB). If your PLC exports or CAD
files routinely exceed this, consider moving file storage to Google
Drive or Firebase Storage later — the data model (`docs/DATA_MODEL.md`)
keeps file metadata separate from file content, so this swap wouldn't
require restructuring the equipment/version/revision data.

## Still to build / open questions

- **Login screen styling** — currently functional but plain; you said
  this is "left till the end," so it's minimal for now.
- **Edit/delete equipment, versions, revisions** — not yet implemented
  (only create + approve/reject).
- **Zipping multiple files on export** — currently the export view gives
  individual download links per file rather than a single zip. Can add
  JSZip if you want one-click zip downloads.
- **User management UI** — currently you'd edit `data/users.json` by hand
  in the data repo. Could add an in-app admin screen for this.
- **Notification "mark as read"** — data layer supports it
  (`Data.markNotificationRead`) but isn't wired into the UI yet.
- **Super Admin vs Admin distinction** — currently identical permissions;
  let me know what Super Admin should additionally control.

## File structure

```
index.html
css/styles.css
js/
  config.js        <- fill in credentials here
  github-api.js     <- GitHub Contents API wrapper
  notifications.js  <- EmailJS notification helpers
  auth.js           <- simple login/session
  data.js           <- equipment/version/revision/notification CRUD
  app.js            <- router + all views
seed-data/          <- copy these into your data repo's data/ folder
docs/DATA_MODEL.md  <- full schema reference
```
