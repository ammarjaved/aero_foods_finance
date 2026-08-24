// Global write guard for view-only ("manager") accounts.
//
// Buttons are hidden on the screens a view-only user is most likely to reach,
// but the app has well over a hundred forms spread across the per-cafe folders.
// Rather than trust that every one of them was covered, this wraps window.fetch
// once and refuses any request that would change data. That way a view-only
// account cannot write even through a screen whose buttons were missed, or by
// replaying a request from the browser console.
//
// The rule: GET/HEAD pass, anything else is blocked, with two lists on top -
// report endpoints that are POSTed only because they take a filter body are
// allowed, and the handful of endpoints that write over GET are blocked.

import { isViewOnly, VIEW_ONLY_MESSAGE } from "./roles";

// Endpoint file names that only read, even when called with POST. Plain GET
// endpoints do not need to be listed - GET is always allowed.
const READ_ONLY_ENDPOINTS =
  /^(fetch|get|mon-sum|mss|salary_summary|stockbot_api|check_ph|auth_version|login-web)/i;

// The few endpoints that change data over GET. reconsole.php is the Daily Sheet
// Updater behind the Re-Calculate screen: it rewrites records even though it is
// called with a query string.
const WRITE_OVER_GET_ENDPOINTS = /^(reconsole)/i;

const fileNameOf = (url) => {
  const path = String(url).split("?")[0];
  return path.substring(path.lastIndexOf("/") + 1);
};

const isBlocked = (method, url) => {
  let file;
  try {
    file = fileNameOf(url);
  } catch (error) {
    // Unparseable URL: err on the side of blocking anything that is not a read.
    return method !== "GET" && method !== "HEAD";
  }

  if (WRITE_OVER_GET_ENDPOINTS.test(file)) {
    return true;
  }
  if (method === "GET" || method === "HEAD") {
    return false;
  }
  return !READ_ONLY_ENDPOINTS.test(file);
};

const methodOf = (input, init) => {
  const method =
    (init && init.method) ||
    (typeof Request !== "undefined" && input instanceof Request && input.method) ||
    "GET";
  return String(method).toUpperCase();
};

const urlOf = (input) =>
  typeof Request !== "undefined" && input instanceof Request
    ? input.url
    : String(input);

let installed = false;

export const installWriteGuard = () => {
  if (installed || typeof window === "undefined" || !window.fetch) {
    return;
  }
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const method = methodOf(input, init);

    if (isViewOnly() && isBlocked(method, urlOf(input))) {
      window.alert(VIEW_ONLY_MESSAGE);
      return Promise.reject(new Error(VIEW_ONLY_MESSAGE));
    }

    return originalFetch(input, init);
  };
};
