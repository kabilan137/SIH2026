/**
 * Returns a persistent session ID for this browser.
 * Generated once as a UUID and stored in localStorage — replaces Clerk auth
 * for scoping analysis history to the current browser session.
 */
export function getSessionId() {
  const KEY = 'ms_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
