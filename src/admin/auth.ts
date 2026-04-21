const KEY = "supermoods.admin.auth";
const PASSWORD = "supermoods2025";

export function isAdminAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function tryLogin(pw: string): boolean {
  if (pw === PASSWORD) {
    window.localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}