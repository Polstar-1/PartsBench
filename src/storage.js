const KEY = "partsbench.garage.v1";

export function loadGarage() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const g = JSON.parse(raw);
      if (g && Array.isArray(g.vehicles)) return { vehicles: g.vehicles, activeId: g.activeId || null };
    }
  } catch {
    // storage blocked or corrupted: start empty
  }
  return { vehicles: [], activeId: null };
}

export function saveGarage(garage) {
  try {
    localStorage.setItem(KEY, JSON.stringify(garage));
  } catch {
    // storage full or blocked: the app still works for this session
  }
}

export function newId() {
  return "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
