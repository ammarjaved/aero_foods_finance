// Session version check.
//
// Login state lives entirely in localStorage, so there is no server session to
// expire. Instead the server publishes a "session version"; each browser stores
// the version it logged in with. When the server value changes (edit
// aero-foods/auth_version.txt), every browser clears its token on the next page
// load and the user has to log in again.

export const AUTH_VERSION_URL =
  "http://121.121.232.54:88/aero-foods/auth_version.php";

const VERSION_KEY = "auth_version";

// Fetch the version the server is currently on. Returns null if the server
// cannot be reached, so a network hiccup never logs anybody out.
export const fetchAuthVersion = async () => {
  try {
    const response = await fetch(AUTH_VERSION_URL, { cache: "no-store" });
    const data = await response.json();
    return data && data.version ? String(data.version) : null;
  } catch (error) {
    console.error("Error fetching auth version:", error);
    return null;
  }
};

export const storeAuthVersion = (version) => {
  if (version) {
    localStorage.setItem(VERSION_KEY, version);
  }
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("message");
  localStorage.removeItem("activeSidebarSection");
  localStorage.removeItem(VERSION_KEY);
};

// Returns true when the stored session is stale and was cleared.
export const enforceAuthVersion = async () => {
  if (!localStorage.getItem("token")) {
    return false;
  }

  const serverVersion = await fetchAuthVersion();
  if (!serverVersion) {
    return false;
  }

  if (localStorage.getItem(VERSION_KEY) !== serverVersion) {
    clearSession();
    return true;
  }

  return false;
};
