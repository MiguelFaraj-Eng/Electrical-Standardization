// ============================================================
// GITHUB API LAYER
// Treats the configured GitHub repo as a database + file store.
// Every JSON "table" is a single file (equipment.json, users.json,
// notifications.json). Binary/document files live under files/...
// ============================================================

const GitHubAPI = (() => {
  const BASE = "https://api.github.com";

  function headers() {
    return {
      Authorization: `Bearer ${CONFIG.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  function repoUrl(path) {
    return `${BASE}/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/contents/${path}`;
  }

  // Read a file's content + sha (sha needed for updates)
  async function getFile(path) {
    const res = await fetch(`${repoUrl(path)}?ref=${CONFIG.GITHUB_BRANCH}`, {
      headers: headers(),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${path}`);
    const data = await res.json();
    const content = decodeURIComponent(
      escape(atob(data.content.replace(/\n/g, "")))
    );
    return { content, sha: data.sha, raw: data };
  }

  // Read + JSON.parse a "table" file
  async function getJSON(path) {
    const file = await getFile(path);
    if (!file) return { data: null, sha: null };
    return { data: JSON.parse(file.content), sha: file.sha };
  }

  // Create or update a text/JSON file
  async function putJSON(path, jsObject, message, sha = null) {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsObject, null, 2))));
    const body = {
      message,
      content,
      branch: CONFIG.GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(repoUrl(path), {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`GitHub write failed (${res.status}): ${err.message || path}`);
    }
    return res.json();
  }

  // Create or update a binary file (base64Data should NOT include the data: prefix)
  async function putBinary(path, base64Data, message, sha = null) {
    const body = {
      message,
      content: base64Data,
      branch: CONFIG.GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(repoUrl(path), {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`GitHub write failed (${res.status}): ${err.message || path}`);
    }
    return res.json();
  }

  // Get download URL for a binary file (for export)
  async function getDownloadUrl(path) {
    const file = await getFile(path);
    if (!file) return null;
    return file.raw.download_url;
  }

  // Helper: read-modify-write with automatic sha retrieval + retry on conflict
  async function updateJSON(path, mutatorFn, message) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, sha } = await getJSON(path);
      const current = data || mutatorFn.initialValue?.() || {};
      const updated = mutatorFn(current);
      try {
        return await putJSON(path, updated, message, sha);
      } catch (e) {
        if (attempt === 2) throw e;
        // sha mismatch (concurrent edit) -> retry
      }
    }
  }

  return { getFile, getJSON, putJSON, putBinary, getDownloadUrl, updateJSON };
})();
