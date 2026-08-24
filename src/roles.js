// Role helpers.
//
// A user's role is the `is_admin` column on the users table. login-web.php
// returns it and LoginForm stores it in localStorage under "role":
//
//   "yes"     Administrator  - sees every menu, can add/edit/delete
//   "manager" Manager (View Only) - sees exactly what an administrator sees,
//             but every add/edit/delete is blocked
//   "no"      Regular User   - the normal, non-admin menu
//
// Older sessions were logged in before the server returned the role, so when
// "role" is missing we fall back to the username check the app used before
// (the built-in "admin" account).

export const ROLE_ADMIN = "yes";
export const ROLE_VIEW_ONLY = "manager";
export const ROLE_USER = "no";

export const VIEW_ONLY_MESSAGE =
  "This is a view-only account. You do not have permission to add, edit or delete records.";

export const getRole = () => {
  const role = localStorage.getItem("role");
  if (role) {
    return role;
  }
  return localStorage.getItem("user") === "admin" ? ROLE_ADMIN : ROLE_USER;
};

// True for administrators and view-only managers alike - they share the menu.
export const canViewAdmin = () => {
  const role = getRole();
  return role === ROLE_ADMIN || role === ROLE_VIEW_ONLY;
};

// True only when the account is allowed to change data.
export const canEdit = () => getRole() !== ROLE_VIEW_ONLY;

export const isViewOnly = () => getRole() === ROLE_VIEW_ONLY;

// Human readable label for a stored is_admin value.
export const roleLabel = (value) => {
  if (value === ROLE_ADMIN) return "Administrator";
  if (value === ROLE_VIEW_ONLY) return "Manager (View Only)";
  return "Regular User";
};
