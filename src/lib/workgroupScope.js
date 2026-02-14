const STORAGE_KEY = "wotlwedu_browser_active_workgroup";

export function getActiveWorkgroupId() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setActiveWorkgroupId(id) {
  if (!id) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, id);
}

