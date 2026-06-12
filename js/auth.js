// ============================================================
// AUTH (simple shared-credential style, matching your other apps)
// Reads data/users.json from the GitHub data repo.
// Session is kept in sessionStorage (cleared on tab close).
// ============================================================

const Auth = (() => {
  const SESSION_KEY = "technica_pdm_session";

  async function login(username, password) {
    const { data } = await GitHubAPI.getJSON(CONFIG.PATHS.users);
    if (!data) throw new Error("User database not found.");

    const user = (data.users || []).find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user || user.password !== password) {
      throw new Error("Invalid username or password.");
    }

    const session = {
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function isAdmin(user = currentUser()) {
    return user && (user.role === CONFIG.ROLES.ADMIN || user.role === CONFIG.ROLES.SUPER_ADMIN);
  }

  function isSuperAdmin(user = currentUser()) {
    return user && user.role === CONFIG.ROLES.SUPER_ADMIN;
  }

  function isEngineer(user = currentUser()) {
    return user && user.role === CONFIG.ROLES.ENGINEER;
  }

  return { login, logout, currentUser, isAdmin, isSuperAdmin, isEngineer };
})();
