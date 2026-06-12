// ============================================================
// EMAIL NOTIFICATIONS (EmailJS)
// Include the EmailJS SDK in index.html:
// <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js"></script>
// ============================================================

const Notify = (() => {
  function init() {
    if (window.emailjs) {
      emailjs.init({ publicKey: CONFIG.EMAILJS.PUBLIC_KEY });
    }
  }

  async function send(templateId, params) {
    if (!window.emailjs) {
      console.warn("EmailJS not loaded; skipping email send.", templateId, params);
      return;
    }
    try {
      await emailjs.send(CONFIG.EMAILJS.SERVICE_ID, templateId, params);
    } catch (e) {
      console.error("Email send failed:", e);
    }
  }

  // Engineer submitted a revision -> notify admins + super admins
  function revisionSubmitted({ equipmentName, versionLabel, revisionLabel, submittedBy, timestamp }) {
    CONFIG.EMAILJS.ADMIN_EMAILS.forEach((to) =>
      send(CONFIG.EMAILJS.TEMPLATES.revisionSubmitted, {
        to_email: to,
        equipment_name: equipmentName,
        version_label: versionLabel,
        revision_label: revisionLabel,
        submitted_by: submittedBy,
        timestamp,
      })
    );
  }

  // Admin approved/rejected a revision -> notify the engineer
  function revisionDecision({ toEmail, equipmentName, versionLabel, revisionLabel, decision, decidedBy, comment }) {
    send(CONFIG.EMAILJS.TEMPLATES.revisionDecision, {
      to_email: toEmail,
      equipment_name: equipmentName,
      version_label: versionLabel,
      revision_label: revisionLabel,
      decision, // "approved" | "rejected"
      decided_by: decidedBy,
      comment: comment || "",
    });
  }

  // Someone exported files
  function fileExported({ toEmails, equipmentName, versionLabel, categories, exportedBy, timestamp }) {
    (toEmails || CONFIG.EMAILJS.ADMIN_EMAILS).forEach((to) =>
      send(CONFIG.EMAILJS.TEMPLATES.fileExported, {
        to_email: to,
        equipment_name: equipmentName,
        version_label: versionLabel,
        categories: categories.join(", "),
        exported_by: exportedBy,
        timestamp,
      })
    );
  }

  // Someone imported/uploaded files (e.g. while creating a revision)
  function fileImported({ toEmails, equipmentName, versionLabel, categories, importedBy, timestamp }) {
    (toEmails || CONFIG.EMAILJS.ADMIN_EMAILS).forEach((to) =>
      send(CONFIG.EMAILJS.TEMPLATES.fileImported, {
        to_email: to,
        equipment_name: equipmentName,
        version_label: versionLabel,
        categories: categories.join(", "),
        imported_by: importedBy,
        timestamp,
      })
    );
  }

  return { init, revisionSubmitted, revisionDecision, fileExported, fileImported };
})();
