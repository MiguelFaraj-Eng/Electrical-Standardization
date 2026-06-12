// ============================================================
// DATA LAYER
// CRUD operations over data/equipment.json and data/notifications.json
// All writes are commits to the GitHub data repo.
// ============================================================

const Data = (() => {
  // ---------- Equipment ----------

  async function getEquipmentList() {
    const { data } = await GitHubAPI.getJSON(CONFIG.PATHS.equipment);
    return (data && data.equipment) || [];
  }

  async function getEquipment(equipmentId) {
    const list = await getEquipmentList();
    return list.find((e) => e.id === equipmentId) || null;
  }

  async function getVersion(equipmentId, versionId) {
    const equipment = await getEquipment(equipmentId);
    if (!equipment) return null;
    return equipment.versions.find((v) => v.id === versionId) || null;
  }

  async function getRevision(equipmentId, versionId, revisionId) {
    const version = await getVersion(equipmentId, versionId);
    if (!version) return null;
    return version.revisions.find((r) => r.id === revisionId) || null;
  }

  // Admin/Super Admin: create new equipment
  async function createEquipment({ id, name, category, createdBy }) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.equipment,
      (current) => {
        current.equipment = current.equipment || [];
        current.equipment.push({
          id,
          name,
          category,
          createdBy,
          createdAt: new Date().toISOString(),
          versions: [],
        });
        return current;
      },
      `Add equipment: ${name}`
    );
  }

  // Admin/Super Admin: create new version under an equipment
  async function createVersion(equipmentId, { id, label, description, notes, createdBy }) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.equipment,
      (current) => {
        const eq = current.equipment.find((e) => e.id === equipmentId);
        if (!eq) throw new Error("Equipment not found.");
        eq.versions.push({
          id,
          label,
          description,
          notes,
          createdBy,
          createdAt: new Date().toISOString(),
          status: "approved",
          revisions: [],
        });
        return current;
      },
      `Add version ${label} to ${equipmentId}`
    );
  }

  // Engineer: submit a new revision (status = pending)
  async function submitRevision(equipmentId, versionId, { id, label, notes, submittedBy }) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.equipment,
      (current) => {
        const eq = current.equipment.find((e) => e.id === equipmentId);
        const ver = eq.versions.find((v) => v.id === versionId);
        ver.revisions.push({
          id,
          label,
          notes,
          submittedBy,
          submittedAt: new Date().toISOString(),
          status: "pending",
          files: { layout: [], electrical: [], alarms: [], plc: [] },
        });
        return current;
      },
      `Submit revision ${label} for ${equipmentId}/${versionId}`
    );
  }

  // Attach an uploaded file's metadata to a revision's category list
  async function attachFile(equipmentId, versionId, revisionId, category, fileMeta) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.equipment,
      (current) => {
        const eq = current.equipment.find((e) => e.id === equipmentId);
        const ver = eq.versions.find((v) => v.id === versionId);
        const rev = ver.revisions.find((r) => r.id === revisionId);
        rev.files[category] = rev.files[category] || [];
        rev.files[category].push(fileMeta);
        return current;
      },
      `Attach ${category} file to ${equipmentId}/${versionId}/${revisionId}`
    );
  }

  // Admin/Super Admin: approve or reject a revision
  async function decideRevision(equipmentId, versionId, revisionId, { decision, decidedBy, comment }) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.equipment,
      (current) => {
        const eq = current.equipment.find((e) => e.id === equipmentId);
        const ver = eq.versions.find((v) => v.id === versionId);
        const rev = ver.revisions.find((r) => r.id === revisionId);
        rev.status = decision; // "approved" | "rejected"
        if (decision === "approved") {
          rev.approvedBy = decidedBy;
          rev.approvedAt = new Date().toISOString();
        } else {
          rev.rejectedBy = decidedBy;
          rev.rejectedAt = new Date().toISOString();
          rev.rejectionComment = comment || "";
        }
        return current;
      },
      `${decision} revision ${revisionId} for ${equipmentId}/${versionId}`
    );
  }

  // ---------- File upload (binary -> GitHub) ----------

  // file: a browser File object. Returns the fileMeta { name, path, size }.
  async function uploadFile(equipmentId, versionId, revisionId, category, file) {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > CONFIG.MAX_FILE_SIZE_MB) {
      throw new Error(
        `File "${file.name}" is ${sizeMB.toFixed(1)}MB, which exceeds the ${CONFIG.MAX_FILE_SIZE_MB}MB limit for GitHub-based storage.`
      );
    }

    const base64 = await fileToBase64(file);
    const path = `${CONFIG.PATHS.filesRoot}/${equipmentId}/${versionId}/${revisionId}/${category}/${file.name}`;

    await GitHubAPI.putBinary(path, base64, `Upload ${category} file for ${equipmentId}/${versionId}/${revisionId}`);

    const fileMeta = { name: file.name, path, size: file.size };
    await attachFile(equipmentId, versionId, revisionId, category, fileMeta);
    return fileMeta;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- Export ----------

  // Returns array of { category, name, downloadUrl } for a revision
  async function getExportLinks(equipmentId, versionId, revisionId) {
    const revision = await getRevision(equipmentId, versionId, revisionId);
    if (!revision) return [];
    const links = [];
    for (const cat of CONFIG.CATEGORIES) {
      const files = revision.files[cat.id] || [];
      for (const f of files) {
        const url = await GitHubAPI.getDownloadUrl(f.path);
        links.push({ category: cat.id, categoryLabel: cat.label, name: f.name, downloadUrl: url });
      }
    }
    return links;
  }

  // ---------- Notifications ----------

  async function getNotifications() {
    const { data } = await GitHubAPI.getJSON(CONFIG.PATHS.notifications);
    return (data && data.notifications) || [];
  }

  async function addNotification({ type, equipmentId, versionId, revisionId, message, targetRoles }) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.notifications,
      (current) => {
        current.notifications = current.notifications || [];
        current.notifications.push({
          id: "n" + Date.now(),
          type,
          equipmentId,
          versionId,
          revisionId,
          message,
          createdAt: new Date().toISOString(),
          read: false,
          targetRoles,
        });
        return current;
      },
      `Add notification: ${type}`
    );
  }

  async function markNotificationRead(notificationId) {
    await GitHubAPI.updateJSON(
      CONFIG.PATHS.notifications,
      (current) => {
        const n = (current.notifications || []).find((x) => x.id === notificationId);
        if (n) n.read = true;
        return current;
      },
      `Mark notification read: ${notificationId}`
    );
  }

  return {
    getEquipmentList,
    getEquipment,
    getVersion,
    getRevision,
    createEquipment,
    createVersion,
    submitRevision,
    attachFile,
    decideRevision,
    uploadFile,
    getExportLinks,
    getNotifications,
    addNotification,
    markNotificationRead,
  };
})();
