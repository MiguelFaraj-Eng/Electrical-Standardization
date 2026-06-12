# Data Model

All "tables" are JSON files living in the **data repo** (see `js/config.js`).
Binary deliverables live under `files/...` in the same repo.

## `data/equipment.json`

```json
{
  "equipment": [
    {
      "id": "drop-type-packer",
      "name": "Drop Type Packer",
      "category": "Packing Equipment",
      "createdBy": "admin",
      "createdAt": "2026-01-10T10:00:00Z",
      "versions": [
        {
          "id": "v01",
          "label": "Version 01",
          "description": "1 infeed configuration",
          "notes": "Initial release for Line A",
          "createdBy": "admin",
          "createdAt": "2026-01-10T10:00:00Z",
          "status": "approved",
          "revisions": [
            {
              "id": "rev01",
              "label": "Revision 01",
              "notes": "Initial PLC code and layout",
              "submittedBy": "engineer_jad",
              "submittedAt": "2026-01-10T10:00:00Z",
              "approvedBy": "admin_marc",
              "approvedAt": "2026-01-11T08:30:00Z",
              "status": "approved",
              "files": {
                "layout":     [{ "name": "layout_v01_rev01.dwg", "path": "files/drop-type-packer/v01/rev01/layout/layout_v01_rev01.dwg", "size": 1834213 }],
                "electrical": [{ "name": "electrical_v01_rev01.pdf", "path": "files/drop-type-packer/v01/rev01/electrical/electrical_v01_rev01.pdf", "size": 982341 }],
                "alarms":     [{ "name": "alarms_v01_rev01.csv", "path": "files/drop-type-packer/v01/rev01/alarms/alarms_v01_rev01.csv", "size": 5421 }],
                "plc":        [{ "name": "plc_v01_rev01.zip", "path": "files/drop-type-packer/v01/rev01/plc/plc_v01_rev01.zip", "size": 4521233 }]
              }
            },
            {
              "id": "rev02",
              "label": "Revision 02",
              "notes": "Fixed alarm thresholds, updated PLC tags",
              "submittedBy": "engineer_jad",
              "submittedAt": "2026-02-01T14:00:00Z",
              "status": "pending",
              "files": { "layout": [], "electrical": [], "alarms": [], "plc": [] }
            }
          ]
        },
        {
          "id": "v02",
          "label": "Version 02",
          "description": "2 infeed configuration",
          "notes": "Used on Line B and C",
          "createdBy": "admin",
          "createdAt": "2026-03-01T09:00:00Z",
          "status": "approved",
          "revisions": [
            {
              "id": "rev01",
              "label": "Revision 01",
              "notes": "Initial release",
              "submittedBy": "engineer_lina",
              "submittedAt": "2026-03-01T09:00:00Z",
              "approvedBy": "superadmin_karim",
              "approvedAt": "2026-03-02T09:00:00Z",
              "status": "approved",
              "files": { "layout": [], "electrical": [], "alarms": [], "plc": [] }
            }
          ]
        }
      ]
    }
  ]
}
```

### Status values
- Version `status`: `approved` (only admins/super admins create versions; could also allow `pending` if engineers can propose new versions)
- Revision `status`: `pending` | `approved` | `rejected`

## `data/users.json`

```json
{
  "users": [
    { "username": "engineer_jad", "name": "Jad K.", "email": "jad@technicainternational.example", "role": "engineer", "password": "CHANGE_ME" },
    { "username": "admin_marc",   "name": "Marc S.", "email": "marc@technicainternational.example", "role": "admin", "password": "CHANGE_ME" },
    { "username": "superadmin_karim", "name": "Karim H.", "email": "karim@technicainternational.example", "role": "super_admin", "password": "CHANGE_ME" }
  ]
}
```

> Simple shared-password style auth as used in your other apps. Passwords stored in plaintext in a **private** repo — acceptable only because this matches your existing pattern; for real security, move to Firebase Auth later.

## `data/notifications.json`

```json
{
  "notifications": [
    {
      "id": "n001",
      "type": "revision_submitted",
      "equipmentId": "drop-type-packer",
      "versionId": "v01",
      "revisionId": "rev02",
      "message": "Jad K. submitted Revision 02 for Drop Type Packer - Version 01",
      "createdAt": "2026-02-01T14:00:00Z",
      "read": false,
      "targetRoles": ["admin", "super_admin"]
    }
  ]
}
```

## File storage layout

```
files/
  {equipmentId}/
    {versionId}/
      {revisionId}/
        layout/
        electrical/
        alarms/
        plc/
```

## Export flow

"Export" = read all files for the selected equipment/version/revision across
the 4 categories, fetch their `download_url` from GitHub, and either:
- zip them client-side (e.g. with JSZip) and trigger a browser download, or
- offer per-category download links.

Then send `Notify.fileExported(...)`.

## Create-revision flow

1. Engineer selects equipment → version → "New Revision".
2. Engineer fills notes + uploads files per category (Layout / Electrical / Alarms / PLC).
3. Files are committed to `files/{equipmentId}/{versionId}/{newRevisionId}/{category}/...` with status `pending`.
4. A notification entry is appended to `notifications.json` targeting `admin` + `super_admin`.
5. `Notify.revisionSubmitted(...)` fires.
6. Admin/Super Admin reviews in their dashboard → approve/reject → updates revision `status`, sets `approvedBy`/`approvedAt`.
7. `Notify.revisionDecision(...)` fires back to the engineer.
