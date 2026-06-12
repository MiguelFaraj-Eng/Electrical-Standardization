// ============================================================
// APP — Router + Views
// Hash-based routing:
//   #/login
//   #/dashboard
//   #/equipment/:equipmentId
//   #/equipment/:equipmentId/version/:versionId
//   #/equipment/:equipmentId/version/:versionId/revision/:revisionId
//   #/equipment/:equipmentId/version/:versionId/revision/:revisionId/export
//   #/equipment/:equipmentId/version/:versionId/new-revision
//   #/admin/pending
//   #/admin/new-equipment
//   #/admin/new-version/:equipmentId
// ============================================================

const App = (() => {
  const root = document.getElementById("app");

  function toast(message, type = "") {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.className = "show " + type;
    setTimeout(() => (el.className = ""), 3000);
  }

  // ---------- Router ----------

  function navigate(hash) {
    window.location.hash = hash;
  }

  async function route() {
    const hash = window.location.hash || "#/login";
    const user = Auth.currentUser();

    if (!user && hash !== "#/login") {
      return render(loginView());
    }
    if (user && hash === "#/login") {
      return navigate("#/dashboard");
    }

    const parts = hash.replace(/^#\//, "").split("/");

    try {
      if (hash === "#/login") return render(await loginViewAsync());
      if (parts[0] === "dashboard") return render(await dashboardView());
      if (parts[0] === "equipment" && parts.length === 2)
        return render(await equipmentDetailView(parts[1]));
      if (parts[0] === "equipment" && parts[2] === "version" && parts.length === 4)
        return render(await versionDetailView(parts[1], parts[3]));
      if (parts[0] === "equipment" && parts[2] === "version" && parts[4] === "revision" && parts.length === 6)
        return render(await revisionDetailView(parts[1], parts[3], parts[5]));
      if (parts[0] === "equipment" && parts[2] === "version" && parts[4] === "revision" && parts[6] === "export")
        return render(await exportView(parts[1], parts[3], parts[5]));
      if (parts[0] === "equipment" && parts[2] === "version" && parts[4] === "new-revision")
        return render(await newRevisionView(parts[1], parts[3]));
      if (parts[0] === "admin" && parts[1] === "pending") return render(await pendingApprovalsView());
      if (parts[0] === "admin" && parts[1] === "new-equipment") return render(newEquipmentView());
      if (parts[0] === "admin" && parts[1] === "new-version") return render(await newVersionView(parts[2]));

      return render(notFoundView());
    } catch (err) {
      console.error(err);
      return render(errorView(err));
    }
  }

  function render(viewHtmlOrNode) {
    if (window.location.hash === "#/login" || !window.location.hash) {
      root.innerHTML = "";
      root.appendChild(viewHtmlOrNode);
      return;
    }
    root.innerHTML = "";
    root.appendChild(layout(viewHtmlOrNode));
  }

  // ---------- Shared layout (topbar + breadcrumb) ----------

  function layout(viewNode) {
    const user = Auth.currentUser();
    const wrap = document.createElement("div");
    wrap.style.display = "contents";

    const topbar = document.createElement("div");
    topbar.className = "topbar";
    topbar.innerHTML = `
      <div class="brand" style="cursor:pointer">
        TECHNICA <span class="tag">PDM</span>
      </div>
      <div class="user-info">
        <span>${escapeHtml(user.name)}</span>
        <span class="role-badge">${roleLabel(user.role)}</span>
        <button class="icon-btn" id="notifBtn" title="Notifications">
          &#128276;
          <span class="notif-dot" id="notifDot" style="display:none"></span>
        </button>
        <button class="btn btn-ghost btn-sm" id="logoutBtn">Sign out</button>
      </div>
    `;
    topbar.querySelector(".brand").onclick = () => navigate("#/dashboard");
    topbar.querySelector("#logoutBtn").onclick = () => {
      Auth.logout();
      navigate("#/login");
    };
    topbar.querySelector("#notifBtn").onclick = (e) => toggleNotifPanel(e, user);

    wrap.appendChild(topbar);
    wrap.appendChild(viewNode);

    const toastEl = document.createElement("div");
    toastEl.id = "toast";
    wrap.appendChild(toastEl);

    refreshNotifDot(user);
    return wrap;
  }

  async function refreshNotifDot(user) {
    try {
      const notifs = await Data.getNotifications();
      const relevant = notifs.filter((n) => !n.read && (n.targetRoles || []).includes(user.role));
      const dot = document.getElementById("notifDot");
      if (dot) dot.style.display = relevant.length ? "block" : "none";
    } catch (e) {
      /* non-fatal */
    }
  }

  async function toggleNotifPanel(e, user) {
    const existing = document.querySelector(".notif-panel");
    if (existing) {
      existing.remove();
      return;
    }
    const notifs = await Data.getNotifications();
    const relevant = notifs
      .filter((n) => (n.targetRoles || []).includes(user.role))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const panel = document.createElement("div");
    panel.className = "notif-panel";
    if (!relevant.length) {
      panel.innerHTML = `<div class="notif-item">No notifications yet.</div>`;
    } else {
      panel.innerHTML = relevant
        .map(
          (n) => `
        <div class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
          <div>${escapeHtml(n.message)}</div>
          <div class="time">${formatDate(n.createdAt)}</div>
        </div>`
        )
        .join("");
    }
    document.body.appendChild(panel);

    setTimeout(() => {
      document.addEventListener(
        "click",
        function handler(ev) {
          if (!panel.contains(ev.target) && ev.target.id !== "notifBtn") {
            panel.remove();
            document.removeEventListener("click", handler);
          }
        },
        { once: false }
      );
    }, 0);
  }

  function breadcrumb(items) {
    const div = document.createElement("div");
    div.className = "breadcrumb";
    div.innerHTML = items
      .map((item, i) => {
        const isLast = i === items.length - 1;
        if (isLast) return `<span class="current">${escapeHtml(item.label)}</span>`;
        return `<a href="${item.href}">${escapeHtml(item.label)}</a><span class="sep">/</span>`;
      })
      .join("");
    return div;
  }

  // ---------- LOGIN VIEW ----------

  async function loginViewAsync() {
    return loginView();
  }

  function loginView() {
    const wrap = document.createElement("div");
    wrap.className = "login-screen";
    wrap.innerHTML = `
      <div class="login-card">
        <h1>Technica PDM</h1>
        <div class="subtitle">Product Data Management — Sign in</div>
        <div class="error" id="loginError"></div>
        <input type="text" id="username" placeholder="Username" autocomplete="username" />
        <input type="password" id="password" placeholder="Password" autocomplete="current-password" />
        <button class="btn btn-primary btn-block" id="loginBtn">Sign in</button>
      </div>
    `;
    const errorEl = wrap.querySelector("#loginError");
    const doLogin = async () => {
      const username = wrap.querySelector("#username").value;
      const password = wrap.querySelector("#password").value;
      errorEl.textContent = "";
      try {
        await Auth.login(username, password);
        navigate("#/dashboard");
      } catch (e) {
        errorEl.textContent = e.message;
      }
    };
    wrap.querySelector("#loginBtn").onclick = doLogin;
    wrap.querySelectorAll("input").forEach((inp) =>
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doLogin();
      })
    );
    return wrap;
  }

  // ---------- DASHBOARD ----------

  async function dashboardView() {
    const user = Auth.currentUser();
    const equipment = await Data.getEquipmentList();

    const container = document.createElement("div");
    container.appendChild(breadcrumb([{ label: "Dashboard", href: "#/dashboard" }]));

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.flexWrap = "wrap";
    header.style.gap = "10px";
    header.innerHTML = `
      <div>
        <h2 class="section-title">Equipment</h2>
        <p class="section-sub">Select an equipment to view its versions and revisions.</p>
      </div>
    `;
    if (Auth.isAdmin(user)) {
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      actions.innerHTML = `
        <button class="btn btn-secondary" id="pendingBtn">Pending Approvals</button>
        <button class="btn btn-primary" id="newEquipBtn">+ New Equipment</button>
      `;
      actions.querySelector("#pendingBtn").onclick = () => navigate("#/admin/pending");
      actions.querySelector("#newEquipBtn").onclick = () => navigate("#/admin/new-equipment");
      header.appendChild(actions);
    }
    container.appendChild(header);

    if (!equipment.length) {
      container.appendChild(
        emptyState(
          "No equipment yet",
          Auth.isAdmin(user)
            ? "Use \u201c+ New Equipment\u201d to add the first piece of equipment."
            : "An admin needs to add equipment before you can create revisions."
        )
      );
      return container;
    }

    const grid = document.createElement("div");
    grid.className = "grid";
    equipment.forEach((eq) => {
      const card = document.createElement("div");
      card.className = "card";
      const totalRevisions = eq.versions.reduce((sum, v) => sum + v.revisions.length, 0);
      card.innerHTML = `
        <div class="eyebrow">${escapeHtml(eq.category || "Equipment")}</div>
        <h3>${escapeHtml(eq.name)}</h3>
        <div class="meta">${eq.versions.length} version${eq.versions.length === 1 ? "" : "s"} · ${totalRevisions} revision${totalRevisions === 1 ? "" : "s"}</div>
      `;
      card.onclick = () => navigate(`#/equipment/${eq.id}`);
      grid.appendChild(card);
    });
    container.appendChild(grid);
    return container;
  }

  // ---------- EQUIPMENT DETAIL (list of versions) ----------

  async function equipmentDetailView(equipmentId) {
    const user = Auth.currentUser();
    const equipment = await Data.getEquipment(equipmentId);
    if (!equipment) return notFoundView();

    const container = document.createElement("div");
    container.appendChild(
      breadcrumb([
        { label: "Dashboard", href: "#/dashboard" },
        { label: equipment.name, href: `#/equipment/${equipmentId}` },
      ])
    );

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.flexWrap = "wrap";
    header.style.gap = "10px";
    header.innerHTML = `
      <div>
        <h2 class="section-title">${escapeHtml(equipment.name)}</h2>
        <p class="section-sub">Versions and their revisions. Select a version to view details, export files, or submit a new revision.</p>
      </div>
    `;
    if (Auth.isAdmin(user)) {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "+ New Version";
      btn.onclick = () => navigate(`#/admin/new-version/${equipmentId}`);
      header.appendChild(btn);
    }
    container.appendChild(header);

    if (!equipment.versions.length) {
      container.appendChild(emptyState("No versions yet", "An admin can add the first version (e.g. \u201cVersion 01 \u2014 1 infeed\u201d)."));
      return container;
    }

    equipment.versions.forEach((ver) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.style.flexDirection = "column";
      item.style.alignItems = "stretch";

      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.alignItems = "center";
      top.style.flexWrap = "wrap";
      top.style.gap = "10px";
      top.innerHTML = `
        <div class="info">
          <h4>${escapeHtml(ver.label)}${ver.description ? ` — ${escapeHtml(ver.description)}` : ""}</h4>
          <p>${escapeHtml(ver.notes || "No notes.")}</p>
          <p>${ver.revisions.length} revision${ver.revisions.length === 1 ? "" : "s"}</p>
        </div>
      `;
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      const viewBtn = document.createElement("button");
      viewBtn.className = "btn btn-secondary btn-sm";
      viewBtn.textContent = "View revisions";
      viewBtn.onclick = () => navigate(`#/equipment/${equipmentId}/version/${ver.id}`);
      actions.appendChild(viewBtn);

      if (Auth.isEngineer(user) || Auth.isAdmin(user)) {
        const newRevBtn = document.createElement("button");
        newRevBtn.className = "btn btn-primary btn-sm";
        newRevBtn.textContent = "+ New Revision";
        newRevBtn.onclick = () => navigate(`#/equipment/${equipmentId}/version/${ver.id}/new-revision`);
        actions.appendChild(newRevBtn);
      }
      top.appendChild(actions);
      item.appendChild(top);
      container.appendChild(item);
    });

    return container;
  }

  // ---------- VERSION DETAIL (list of revisions) ----------

  async function versionDetailView(equipmentId, versionId) {
    const equipment = await Data.getEquipment(equipmentId);
    const version = await Data.getVersion(equipmentId, versionId);
    if (!equipment || !version) return notFoundView();

    const container = document.createElement("div");
    container.appendChild(
      breadcrumb([
        { label: "Dashboard", href: "#/dashboard" },
        { label: equipment.name, href: `#/equipment/${equipmentId}` },
        { label: version.label, href: `#/equipment/${equipmentId}/version/${versionId}` },
      ])
    );

    container.innerHTML += `
      <h2 class="section-title">${escapeHtml(version.label)}</h2>
      <p class="section-sub">${escapeHtml(version.description || "")}${version.notes ? " — " + escapeHtml(version.notes) : ""}</p>
    `;

    if (!version.revisions.length) {
      container.appendChild(emptyState("No revisions yet", "Use \u201c+ New Revision\u201d from the equipment page to submit the first one."));
      return container;
    }

    const sorted = [...version.revisions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    sorted.forEach((rev) => {
      const row = document.createElement("div");
      row.className = `revision-row status-${rev.status}`;
      const fileCount = CONFIG.CATEGORIES.reduce((sum, c) => sum + (rev.files[c.id] || []).length, 0);
      row.innerHTML = `
        <div class="list-item" style="border:none; margin:0; padding:10px 0;">
          <div class="info">
            <h4>${escapeHtml(rev.label)} <span class="status-pill status-${rev.status}">${rev.status}</span></h4>
            <p>${escapeHtml(rev.notes || "No notes.")}</p>
            <p>Submitted by ${escapeHtml(rev.submittedBy)} on ${formatDate(rev.submittedAt)}${rev.approvedBy ? ` · Approved by ${escapeHtml(rev.approvedBy)} on ${formatDate(rev.approvedAt)}` : ""}${rev.rejectedBy ? ` · Rejected by ${escapeHtml(rev.rejectedBy)} on ${formatDate(rev.rejectedAt)}` : ""}</p>
            <p>${fileCount} file${fileCount === 1 ? "" : "s"} attached</p>
          </div>
        </div>
      `;
      const btn = document.createElement("button");
      btn.className = "btn btn-secondary btn-sm";
      btn.textContent = "Open";
      btn.onclick = () => navigate(`#/equipment/${equipmentId}/version/${versionId}/revision/${rev.id}`);
      row.querySelector(".list-item").appendChild(btn);
      container.appendChild(row);
    });

    return container;
  }

  // ---------- REVISION DETAIL (the 4-step path: Layout / Electrical / Alarms / PLC) ----------

  async function revisionDetailView(equipmentId, versionId, revisionId) {
    const equipment = await Data.getEquipment(equipmentId);
    const version = await Data.getVersion(equipmentId, versionId);
    const revision = await Data.getRevision(equipmentId, versionId, revisionId);
    if (!equipment || !version || !revision) return notFoundView();

    const user = Auth.currentUser();
    const container = document.createElement("div");
    container.appendChild(
      breadcrumb([
        { label: "Dashboard", href: "#/dashboard" },
        { label: equipment.name, href: `#/equipment/${equipmentId}` },
        { label: version.label, href: `#/equipment/${equipmentId}/version/${versionId}` },
        { label: revision.label, href: `#/equipment/${equipmentId}/version/${versionId}/revision/${revisionId}` },
      ])
    );

    container.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 class="section-title">${escapeHtml(revision.label)} <span class="status-pill status-${revision.status}">${revision.status}</span></h2>
          <p class="section-sub">${escapeHtml(revision.notes || "No notes.")}</p>
          <p class="section-sub">Submitted by ${escapeHtml(revision.submittedBy)} on ${formatDate(revision.submittedAt)}</p>
        </div>
      </div>
    `;

    // Admin approval actions for pending revisions
    if (Auth.isAdmin(user) && revision.status === "pending") {
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      actions.style.marginBottom = "20px";
      actions.innerHTML = `
        <button class="btn btn-success" id="approveBtn">Approve</button>
        <button class="btn btn-danger" id="rejectBtn">Reject</button>
      `;
      actions.querySelector("#approveBtn").onclick = async () => {
        await Data.decideRevision(equipmentId, versionId, revisionId, { decision: "approved", decidedBy: user.username });
        const engineer = await findUserByUsername(revision.submittedBy);
        Notify.revisionDecision({
          toEmail: engineer?.email,
          equipmentName: equipment.name,
          versionLabel: version.label,
          revisionLabel: revision.label,
          decision: "approved",
          decidedBy: user.name,
        });
        toast("Revision approved.", "success");
        route();
      };
      actions.querySelector("#rejectBtn").onclick = async () => {
        const comment = prompt("Reason for rejection (optional):") || "";
        await Data.decideRevision(equipmentId, versionId, revisionId, { decision: "rejected", decidedBy: user.username, comment });
        const engineer = await findUserByUsername(revision.submittedBy);
        Notify.revisionDecision({
          toEmail: engineer?.email,
          equipmentName: equipment.name,
          versionLabel: version.label,
          revisionLabel: revision.label,
          decision: "rejected",
          decidedBy: user.name,
          comment,
        });
        toast("Revision rejected.", "");
        route();
      };
      container.appendChild(actions);
    }

    // The 4-step path: Layout / Electrical / Alarms / PLC
    const pathDiv = document.createElement("div");
    pathDiv.className = "path-steps";
    CONFIG.CATEGORIES.forEach((cat, idx) => {
      const files = revision.files[cat.id] || [];
      const step = document.createElement("div");
      step.className = "path-step";
      step.innerHTML = `
        <div class="num">0${idx + 1}</div>
        <h4>${escapeHtml(cat.label)}</h4>
        <ul class="file-list">
          ${
            files.length
              ? files.map((f) => `<li><span class="fname">${escapeHtml(f.name)}</span><span>${formatSize(f.size)}</span></li>`).join("")
              : `<li style="color:var(--steel-500)">No files</li>`
          }
        </ul>
      `;
      pathDiv.appendChild(step);
    });
    container.appendChild(pathDiv);

    // Export button
    const exportBtn = document.createElement("button");
    exportBtn.className = "btn btn-primary";
    exportBtn.textContent = "Export files";
    exportBtn.onclick = () => navigate(`#/equipment/${equipmentId}/version/${versionId}/revision/${revisionId}/export`);
    container.appendChild(exportBtn);

    return container;
  }

  // ---------- EXPORT VIEW ----------

  async function exportView(equipmentId, versionId, revisionId) {
    const equipment = await Data.getEquipment(equipmentId);
    const version = await Data.getVersion(equipmentId, versionId);
    const revision = await Data.getRevision(equipmentId, versionId, revisionId);
    if (!equipment || !version || !revision) return notFoundView();

    const user = Auth.currentUser();
    const container = document.createElement("div");
    container.appendChild(
      breadcrumb([
        { label: "Dashboard", href: "#/dashboard" },
        { label: equipment.name, href: `#/equipment/${equipmentId}` },
        { label: version.label, href: `#/equipment/${equipmentId}/version/${versionId}` },
        { label: revision.label, href: `#/equipment/${equipmentId}/version/${versionId}/revision/${revisionId}` },
        { label: "Export", href: "#" },
      ])
    );

    container.innerHTML += `
      <h2 class="section-title">Export — ${escapeHtml(equipment.name)} / ${escapeHtml(version.label)} / ${escapeHtml(revision.label)}</h2>
      <p class="section-sub">Download the files for each category below. An email notification will be sent once you export.</p>
    `;

    const loading = document.createElement("p");
    loading.textContent = "Loading download links\u2026";
    container.appendChild(loading);

    Data.getExportLinks(equipmentId, versionId, revisionId).then((links) => {
      loading.remove();
      if (!links.length) {
        container.appendChild(emptyState("No files to export", "This revision has no files attached yet."));
        return;
      }
      CONFIG.CATEGORIES.forEach((cat) => {
        const catLinks = links.filter((l) => l.category === cat.id);
        if (!catLinks.length) return;
        const step = document.createElement("div");
        step.className = "path-step";
        step.style.marginBottom = "12px";
        step.innerHTML = `<h4>${escapeHtml(cat.label)}</h4>`;
        const ul = document.createElement("ul");
        ul.className = "file-list";
        catLinks.forEach((l) => {
          const li = document.createElement("li");
          li.innerHTML = `<span class="fname">${escapeHtml(l.name)}</span>`;
          const a = document.createElement("a");
          a.href = l.downloadUrl;
          a.textContent = "Download";
          a.target = "_blank";
          li.appendChild(a);
          ul.appendChild(li);
        });
        step.appendChild(ul);
        container.appendChild(step);
      });

      const confirmBtn = document.createElement("button");
      confirmBtn.className = "btn btn-primary";
      confirmBtn.textContent = "Notify team that I exported this";
      confirmBtn.onclick = () => {
        Notify.fileExported({
          equipmentName: equipment.name,
          versionLabel: version.label,
          categories: [...new Set(links.map((l) => l.categoryLabel))],
          exportedBy: user.name,
          timestamp: new Date().toISOString(),
        });
        toast("Export notification sent.", "success");
      };
      container.appendChild(confirmBtn);
    });

    return container;
  }

  // ---------- NEW REVISION VIEW (engineer submits, with file upload per category) ----------

  async function newRevisionView(equipmentId, versionId) {
    const equipment = await Data.getEquipment(equipmentId);
    const version = await Data.getVersion(equipmentId, versionId);
    if (!equipment || !version) return notFoundView();

    const user = Auth.currentUser();
    const container = document.createElement("div");
    container.appendChild(
      breadcrumb([
        { label: "Dashboard", href: "#/dashboard" },
        { label: equipment.name, href: `#/equipment/${equipmentId}` },
        { label: version.label, href: `#/equipment/${equipmentId}/version/${versionId}` },
        { label: "New Revision", href: "#" },
      ])
    );

    const nextNum = version.revisions.length + 1;
    const suggestedId = "rev" + String(nextNum).padStart(2, "0");
    const suggestedLabel = "Revision " + String(nextNum).padStart(2, "0");

    container.innerHTML += `
      <h2 class="section-title">New Revision — ${escapeHtml(equipment.name)} / ${escapeHtml(version.label)}</h2>
      <p class="section-sub">Fill in the revision notes and attach files for each step below. Files are saved immediately; the revision will be marked <strong>pending</strong> until an admin approves it.</p>
      <div class="form-group">
        <label>Revision label</label>
        <input type="text" id="revLabel" value="${escapeHtml(suggestedLabel)}" />
      </div>
      <div class="form-group">
        <label>Notes / what changed in this revision</label>
        <textarea id="revNotes" placeholder="Describe what was changed, fixed, or added..."></textarea>
      </div>
    `;

    const pathDiv = document.createElement("div");
    pathDiv.className = "path-steps";
    CONFIG.CATEGORIES.forEach((cat, idx) => {
      const step = document.createElement("div");
      step.className = "path-step";
      step.innerHTML = `
        <div class="num">0${idx + 1}</div>
        <h4>${escapeHtml(cat.label)}</h4>
        <input type="file" multiple data-cat="${cat.id}" />
        <div class="form-hint">Max ${CONFIG.MAX_FILE_SIZE_MB}MB per file.</div>
      `;
      pathDiv.appendChild(step);
    });
    container.appendChild(pathDiv);

    const submitBtn = document.createElement("button");
    submitBtn.className = "btn btn-primary";
    submitBtn.textContent = "Submit revision for approval";
    submitBtn.onclick = async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting\u2026";
      try {
        const label = container.querySelector("#revLabel").value.trim() || suggestedLabel;
        const notes = container.querySelector("#revNotes").value.trim();

        await Data.submitRevision(equipmentId, versionId, {
          id: suggestedId,
          label,
          notes,
          submittedBy: user.username,
        });

        // Upload files per category
        const fileInputs = container.querySelectorAll('input[type="file"]');
        const usedCategories = [];
        for (const input of fileInputs) {
          const cat = input.dataset.cat;
          for (const file of input.files) {
            await Data.uploadFile(equipmentId, versionId, suggestedId, cat, file);
            if (!usedCategories.includes(cat)) usedCategories.push(cat);
          }
        }

        // Notify admins
        await Data.addNotification({
          type: "revision_submitted",
          equipmentId,
          versionId,
          revisionId: suggestedId,
          message: `${user.name} submitted ${label} for ${equipment.name} / ${version.label}`,
          targetRoles: [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPER_ADMIN],
        });
        Notify.revisionSubmitted({
          equipmentName: equipment.name,
          versionLabel: version.label,
          revisionLabel: label,
          submittedBy: user.name,
          timestamp: new Date().toISOString(),
        });
        if (usedCategories.length) {
          Notify.fileImported({
            equipmentName: equipment.name,
            versionLabel: version.label,
            categories: usedCategories.map((c) => CONFIG.CATEGORIES.find((x) => x.id === c).label),
            importedBy: user.name,
            timestamp: new Date().toISOString(),
          });
        }

        toast("Revision submitted for approval.", "success");
        navigate(`#/equipment/${equipmentId}/version/${versionId}`);
      } catch (e) {
        toast(e.message, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit revision for approval";
      }
    };
    container.appendChild(submitBtn);

    return container;
  }

  // ---------- ADMIN: PENDING APPROVALS ----------

  async function pendingApprovalsView() {
    const equipment = await Data.getEquipmentList();
    const container = document.createElement("div");
    container.appendChild(breadcrumb([{ label: "Dashboard", href: "#/dashboard" }, { label: "Pending Approvals", href: "#/admin/pending" }]));
    container.innerHTML += `<h2 class="section-title">Pending Approvals</h2><p class="section-sub">Revisions awaiting admin or super admin review.</p>`;

    const pending = [];
    equipment.forEach((eq) =>
      eq.versions.forEach((ver) =>
        ver.revisions
          .filter((r) => r.status === "pending")
          .forEach((rev) => pending.push({ eq, ver, rev }))
      )
    );

    if (!pending.length) {
      container.appendChild(emptyState("Nothing pending", "All revisions have been reviewed."));
      return container;
    }

    pending.forEach(({ eq, ver, rev }) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <div class="info">
          <h4>${escapeHtml(eq.name)} / ${escapeHtml(ver.label)} / ${escapeHtml(rev.label)}</h4>
          <p>${escapeHtml(rev.notes || "No notes.")}</p>
          <p>Submitted by ${escapeHtml(rev.submittedBy)} on ${formatDate(rev.submittedAt)}</p>
        </div>
      `;
      const btn = document.createElement("button");
      btn.className = "btn btn-secondary btn-sm";
      btn.textContent = "Review";
      btn.onclick = () => navigate(`#/equipment/${eq.id}/version/${ver.id}/revision/${rev.id}`);
      item.appendChild(btn);
      container.appendChild(item);
    });

    return container;
  }

  // ---------- ADMIN: NEW EQUIPMENT ----------

  function newEquipmentView() {
    const user = Auth.currentUser();
    const container = document.createElement("div");
    container.appendChild(breadcrumb([{ label: "Dashboard", href: "#/dashboard" }, { label: "New Equipment", href: "#/admin/new-equipment" }]));
    container.innerHTML += `
      <h2 class="section-title">New Equipment</h2>
      <p class="section-sub">Add a new piece of equipment to the catalog.</p>
      <div class="form-group">
        <label>Equipment name</label>
        <input type="text" id="eqName" placeholder="e.g. Drop Type Packer" />
      </div>
      <div class="form-group">
        <label>Category (optional)</label>
        <input type="text" id="eqCategory" placeholder="e.g. Packing Equipment" />
      </div>
    `;
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "Create equipment";
    btn.onclick = async () => {
      const name = container.querySelector("#eqName").value.trim();
      if (!name) return toast("Enter an equipment name.", "error");
      const id = slugify(name);
      btn.disabled = true;
      try {
        await Data.createEquipment({
          id,
          name,
          category: container.querySelector("#eqCategory").value.trim(),
          createdBy: user.username,
        });
        toast("Equipment created.", "success");
        navigate(`#/equipment/${id}`);
      } catch (e) {
        toast(e.message, "error");
        btn.disabled = false;
      }
    };
    container.appendChild(btn);
    return container;
  }

  // ---------- ADMIN: NEW VERSION ----------

  async function newVersionView(equipmentId) {
    const user = Auth.currentUser();
    const equipment = await Data.getEquipment(equipmentId);
    if (!equipment) return notFoundView();

    const container = document.createElement("div");
    container.appendChild(
      breadcrumb([
        { label: "Dashboard", href: "#/dashboard" },
        { label: equipment.name, href: `#/equipment/${equipmentId}` },
        { label: "New Version", href: "#" },
      ])
    );

    const nextNum = equipment.versions.length + 1;
    const suggestedId = "v" + String(nextNum).padStart(2, "0");
    const suggestedLabel = "Version " + String(nextNum).padStart(2, "0");

    container.innerHTML += `
      <h2 class="section-title">New Version — ${escapeHtml(equipment.name)}</h2>
      <div class="form-group">
        <label>Version label</label>
        <input type="text" id="verLabel" value="${escapeHtml(suggestedLabel)}" />
      </div>
      <div class="form-group">
        <label>Description (e.g. infeed configuration)</label>
        <input type="text" id="verDesc" placeholder="e.g. 2 infeed configuration" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="verNotes" placeholder="Optional notes about this version..."></textarea>
      </div>
    `;

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.textContent = "Create version";
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await Data.createVersion(equipmentId, {
          id: suggestedId,
          label: container.querySelector("#verLabel").value.trim() || suggestedLabel,
          description: container.querySelector("#verDesc").value.trim(),
          notes: container.querySelector("#verNotes").value.trim(),
          createdBy: user.username,
        });
        toast("Version created.", "success");
        navigate(`#/equipment/${equipmentId}`);
      } catch (e) {
        toast(e.message, "error");
        btn.disabled = false;
      }
    };
    container.appendChild(btn);
    return container;
  }

  // ---------- Helpers ----------

  function emptyState(title, body) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>`;
    return div;
  }

  function notFoundView() {
    return emptyState("Not found", "That page doesn't exist or the item has been removed.");
  }

  function errorView(err) {
    return emptyState("Something went wrong", err.message || String(err));
  }

  function roleLabel(role) {
    return { engineer: "Engineer", admin: "Admin", super_admin: "Super Admin" }[role] || role;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + " KB";
    return (kb / 1024).toFixed(1) + " MB";
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function findUserByUsername(username) {
    const { data } = await GitHubAPI.getJSON(CONFIG.PATHS.users);
    return (data?.users || []).find((u) => u.username === username);
  }

  function init() {
    Notify.init();
    window.addEventListener("hashchange", route);
    route();
  }

  return { init, navigate };
})();

document.addEventListener("DOMContentLoaded", App.init);
