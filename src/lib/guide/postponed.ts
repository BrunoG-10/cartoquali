// "Continuar depois" means "next login", not "next F5": remember it for this browser session only
// (sessionStorage is cleared when the tab closes; sign-in and sign-out clear it too). The tour
// progress itself lives in the database.
const POSTPONED_KEY = "cq-guide-postponed";

export function markGuidePostponed() {
  try {
    window.sessionStorage.setItem(POSTPONED_KEY, "1");
  } catch {
    // Storage unavailable (private mode): the tour simply reopens on reload.
  }
}

export function isGuidePostponed() {
  try {
    return window.sessionStorage.getItem(POSTPONED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearGuidePostponed() {
  try {
    window.sessionStorage.removeItem(POSTPONED_KEY);
  } catch {
    // ignore
  }
}
