// ============================================================
// TECHNICA PDM - CONFIGURATION
// ============================================================
// Fill in these values before deploying.
// WARNING: This token is visible to anyone who can view this
// repo or open browser dev tools. Use a FINE-GRAINED PAT scoped
// ONLY to this repository, with Contents: Read & Write permission
// and nothing else. Keep this repo PRIVATE if possible.
// ============================================================

const CONFIG = {
  // --- GitHub repo that acts as the database + file store ---
  GITHUB_TOKEN: "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",
  GITHUB_OWNER: "MiguelFaraj-Eng",
  GITHUB_REPO: "Electrical-Standardization",   // recommend a SEPARATE private repo for data
  GITHUB_BRANCH: "main",

  // --- Data paths inside that repo ---
  PATHS: {
    equipment:     "data/equipment.json",       // list of equipment + versions + revisions (metadata)
    users:         "data/users.json",           // usernames, roles, hashed passwords (simple)
    notifications: "data/notifications.json",   // pending approvals, history
    filesRoot:     "files",                     // files/{equipmentId}/{versionId}/{revisionId}/{category}/...
  },

  // --- Roles ---
  ROLES: {
    ENGINEER: "engineer",
    ADMIN: "admin",
    SUPER_ADMIN: "super_admin",
  },

  // --- The 4 deliverable categories every version/revision contains ---
  CATEGORIES: [
    { id: "layout",     label: "Layout" },
    { id: "electrical", label: "Electrical Drawing" },
    { id: "alarms",     label: "Alarms Configuration" },
    { id: "plc",        label: "PLC Code" },
  ],

  // --- EmailJS (https://www.emailjs.com) ---
  // Used to send notification emails for: revision submitted,
  // revision approved/rejected, export performed, import performed.
  EMAILJS: {
    PUBLIC_KEY: "PASTE_EMAILJS_PUBLIC_KEY",
    SERVICE_ID: "PASTE_EMAILJS_SERVICE_ID",
    TEMPLATES: {
      revisionSubmitted: "PASTE_TEMPLATE_ID_REVISION_SUBMITTED",
      revisionDecision:  "PASTE_TEMPLATE_ID_REVISION_DECISION",
      fileExported:      "PASTE_TEMPLATE_ID_FILE_EXPORTED",
      fileImported:      "PASTE_TEMPLATE_ID_FILE_IMPORTED",
    },
    // Admin / Super Admin recipients for approval notifications
    ADMIN_EMAILS: [
      "admin@technicainternational.example",
      "superadmin@technicainternational.example",
    ],
  },

  // --- Upload limits ---
  MAX_FILE_SIZE_MB: 20, // warn user above this; GitHub API struggles beyond ~20-25MB base64
};
