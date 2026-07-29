// Display preferences only (which ports to hide, the system-ports toggle) —
// nothing here is a business rule, so it lives in localStorage on the
// client instead of round-tripping to the API.
const HIDDEN_PORTS_KEY = 'portpulse:hiddenPorts';
const HIDE_SYSTEM_PORTS_KEY = 'portpulse:hideSystemPorts';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getHiddenPortKeys() {
  return readJson(HIDDEN_PORTS_KEY, []);
}

export function hidePortKey(key) {
  const keys = new Set(getHiddenPortKeys());
  keys.add(key);
  localStorage.setItem(HIDDEN_PORTS_KEY, JSON.stringify([...keys]));
}

export function unhidePortKey(key) {
  const keys = new Set(getHiddenPortKeys());
  keys.delete(key);
  localStorage.setItem(HIDDEN_PORTS_KEY, JSON.stringify([...keys]));
}

export function getHideSystemPorts() {
  return readJson(HIDE_SYSTEM_PORTS_KEY, false);
}

export function setHideSystemPorts(value) {
  localStorage.setItem(HIDE_SYSTEM_PORTS_KEY, JSON.stringify(value));
}
