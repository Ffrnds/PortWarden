// Display preferences only (which processes to hide, the system-ports
// toggle) — nothing here is a business rule, so it lives in localStorage on
// the client instead of round-tripping to the API.
const HIDDEN_PROCESSES_KEY = 'portpulse:hiddenProcesses';
const HIDE_SYSTEM_PORTS_KEY = 'portpulse:hideSystemPorts';
const PORT_NOTES_KEY = 'portpulse:portNotes';
const PORT_ALIASES_KEY = 'portpulse:portAliases';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Hiding by process name, not by port/protocol, is deliberate: background
// processes (Bluetooth services, cloud-sync clients, browsers) tend to
// rotate through different ports on every launch, so a port-keyed hide list
// would silently stop matching. The name is stable.
export function getHiddenProcessNames() {
  return readJson(HIDDEN_PROCESSES_KEY, []);
}

export function hideProcessName(name) {
  const names = new Set(getHiddenProcessNames());
  names.add(name.toLowerCase());
  localStorage.setItem(HIDDEN_PROCESSES_KEY, JSON.stringify([...names]));
}

export function unhideProcessName(name) {
  const names = new Set(getHiddenProcessNames());
  names.delete(name.toLowerCase());
  localStorage.setItem(HIDDEN_PROCESSES_KEY, JSON.stringify([...names]));
}

export function getHideSystemPorts() {
  return readJson(HIDE_SYSTEM_PORTS_KEY, false);
}

export function setHideSystemPorts(value) {
  localStorage.setItem(HIDE_SYSTEM_PORTS_KEY, JSON.stringify(value));
}

// Notes are keyed by port+protocol (not process name): unlike background
// noise (Bluetooth, browsers), the ports a developer deliberately runs
// tend to be stable across restarts (5432 is always Postgres, 3000 is
// always this project's API) — so "what is this port for" is a question
// about the port, not the executable.
export function getPortNotes() {
  return readJson(PORT_NOTES_KEY, {});
}

export function getPortNote(key) {
  return getPortNotes()[key] || '';
}

export function setPortNote(key, note) {
  const notes = getPortNotes();
  const trimmed = note.trim();

  if (trimmed) {
    notes[key] = trimmed;
  } else {
    delete notes[key];
  }

  localStorage.setItem(PORT_NOTES_KEY, JSON.stringify(notes));
}

// Aliases are keyed by port+protocol, same reasoning as notes above — NOT by
// process name. That was the original design (mirroring the hidden-processes
// list), but it meant renaming one row silently renamed every other row that
// happened to share the same executable (several node.exe or svchost.exe
// entries on different ports, for example), which isn't what "rename this
// one" should do.
export function getPortAliases() {
  return readJson(PORT_ALIASES_KEY, {});
}

export function getPortAlias(key) {
  return getPortAliases()[key] || '';
}

export function setPortAlias(key, alias) {
  const aliases = getPortAliases();
  const trimmed = alias.trim();

  if (trimmed) {
    aliases[key] = trimmed;
  } else {
    delete aliases[key];
  }

  localStorage.setItem(PORT_ALIASES_KEY, JSON.stringify(aliases));
}
