const KEY = "supermoods.guest";

type Listener = () => void;
const listeners = new Set<Listener>();

export const guestMode = {
  isGuest(): boolean {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(KEY) === "1";
  },
  enable() {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(KEY, "1");
    listeners.forEach((l) => l());
  },
  disable() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(KEY);
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
