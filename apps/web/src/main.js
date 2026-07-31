import {
  login,
  listPorts,
  listProtectedPorts,
  killPort,
  protectPort,
  unprotectPort,
  listOutboundConnections,
  listAlerts,
} from './api/portsApiClient.js';
import { renderPortRows, formatPortCountLabel, portKey } from './ui/renderPorts.js';
import { renderConnectionRows, formatConnectionCountLabel } from './ui/renderConnections.js';
import { generateTwinkleSpecs, renderTwinkleField } from './ui/twinkleField.js';
import { filterVisiblePorts } from './ui/filterPorts.js';
import { disintegrateRow } from './ui/disintegrate.js';
import { connectPortsSocket } from './realtime/portsSocket.js';
import {
  getHiddenProcessNames,
  hideProcessName,
  unhideProcessName,
  getHideSystemPorts,
  setHideSystemPorts,
  getPortNote,
  setPortNote,
  getPortNotes,
  getProcessAlias,
  setProcessAlias,
  getProcessAliases,
} from './ui/preferences.js';

const urlParams = new URLSearchParams(location.search);
const apiPort = urlParams.get('apiPort');
const accessKey = urlParams.get('accessKey');
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

const portsListElement = document.getElementById('ports-list');
const emptyState = document.getElementById('empty-state');
const connectionsListElement = document.getElementById('connections-list');
const connectionsEmptyState = document.getElementById('connections-empty-state');
const errorBanner = document.getElementById('error-banner');
const alertBanner = document.getElementById('alert-banner');
const portCountElement = document.getElementById('port-count');
const refreshIndicator = document.getElementById('refresh-indicator');
const hideButton = document.getElementById('hide-button');
const filterButton = document.getElementById('filter-button');
const filterPanel = document.getElementById('filter-panel');
const hideSystemToggle = document.getElementById('hide-system-toggle');
const hiddenProcessesList = document.getElementById('hidden-ports-list');
const noHiddenPorts = document.getElementById('no-hidden-ports');
const tabPorts = document.getElementById('tab-ports');
const tabConnections = document.getElementById('tab-connections');
const searchButton = document.getElementById('search-button');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');

let latestPorts = [];
let latestProtectedPorts = [];
let latestConnections = [];
let currentView = 'ports'; // 'ports' | 'connections'
let searchText = '';
// Only kill/protect/unprotect need this (see createAuthGuard.js on the API
// side) — listing ports/connections/history stays open, so a failed login
// shouldn't stop the widget from showing anything, just from mutating.
let authToken = null;

async function authenticate() {
  try {
    authToken = await login(apiBaseUrl, accessKey);
  } catch (error) {
    showError(error.message);
  }
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

function renderAlerts(alerts) {
  if (alerts.length === 0) {
    alertBanner.hidden = true;
    return;
  }

  alertBanner.hidden = false;
  alertBanner.textContent =
    alerts.length === 1 ? '⚠ 1 alerta de atividade suspeita' : `⚠ ${alerts.length} alertas de atividade suspeita`;
  alertBanner.title = alerts.map((alert) => alert.reasons.join(' ')).join('\n');
}

// Best-effort and non-blocking: this is a "nice to notice" heuristic check,
// not core functionality — a failure here should never surface the main
// error banner or interrupt the ports/connections refresh.
async function refreshAlerts() {
  try {
    renderAlerts(await listAlerts(apiBaseUrl));
  } catch {
    // Swallowed on purpose.
  }
}

function renderHiddenProcessesList() {
  const hiddenNames = getHiddenProcessNames();
  hiddenProcessesList.innerHTML = '';
  noHiddenPorts.hidden = hiddenNames.length > 0;

  hiddenNames.forEach((name) => {
    const item = document.createElement('li');
    item.className = 'hidden-port-item';

    const label = document.createElement('span');
    label.textContent = name;

    const unhideButton = document.createElement('button');
    unhideButton.className = 'unhide-btn';
    unhideButton.textContent = 'Mostrar';
    unhideButton.addEventListener('click', () => {
      unhideProcessName(name);
      renderHiddenProcessesList();
      rerenderCurrentView();
    });

    item.append(label, unhideButton);
    hiddenProcessesList.appendChild(item);
  });
}

function applyFiltersAndRender(protectedPorts = latestProtectedPorts) {
  const visiblePorts = filterVisiblePorts(latestPorts, {
    hiddenProcessNames: getHiddenProcessNames(),
    hideSystemPorts: getHideSystemPorts(),
    searchText,
    resolveAlias: getProcessAlias,
  });

  renderPortRows(portsListElement, visiblePorts, protectedPorts, getPortNotes(), getProcessAliases(), {
    onKill: handleKill,
    onProtect: handleProtect,
    onUnprotect: handleUnprotect,
    onHide: handleHide,
    onEditNote: handleEditNote,
    onRename: handleRename,
  });

  emptyState.hidden = visiblePorts.length > 0;

  const hiddenCount = latestPorts.length - visiblePorts.length;
  portCountElement.textContent =
    formatPortCountLabel(visiblePorts.length) + (hiddenCount > 0 ? ` (${hiddenCount} ocultas)` : '');
}

function renderConnectionsView(connections) {
  // Same hidden-process-names/system-noise/search filters apply here too —
  // a browser alone can hold dozens of established connections.
  const visibleConnections = filterVisiblePorts(connections, {
    hiddenProcessNames: getHiddenProcessNames(),
    hideSystemPorts: getHideSystemPorts(),
    searchText,
    resolveAlias: getProcessAlias,
  });

  renderConnectionRows(connectionsListElement, visibleConnections, getProcessAliases(), { onKill: handleKillConnection });

  connectionsEmptyState.hidden = visibleConnections.length > 0;

  const hiddenCount = connections.length - visibleConnections.length;
  portCountElement.textContent =
    formatConnectionCountLabel(visibleConnections.length) + (hiddenCount > 0 ? ` (${hiddenCount} ocultas)` : '');
}

async function refreshPorts() {
  const [ports, protectedPorts] = await Promise.all([listPorts(apiBaseUrl), listProtectedPorts(apiBaseUrl)]);
  latestPorts = ports;
  latestProtectedPorts = protectedPorts;
  applyFiltersAndRender(protectedPorts);
}

async function refreshConnections() {
  const connections = await listOutboundConnections(apiBaseUrl);
  latestConnections = connections;
  renderConnectionsView(connections);
}

function rerenderCurrentView() {
  if (currentView === 'ports') {
    applyFiltersAndRender();
  } else {
    renderConnectionsView(latestConnections);
  }
}

// While the WebSocket is open, snapshots arrive pushed from the server and
// the polling loop below is paused — no reason to also hammer the API on a
// timer when it's already telling us when things change. If the socket
// drops, polling resumes automatically as a fallback (see connectPortsSocket
// below).
let pollTimer = null;
let socketOpen = false;
// A snapshot push is driven by the server's own timer, independent of
// anything the user is doing — without this, a snapshot arriving mid-kill
// can fully rebuild #ports-list (the port's already gone from netstat by
// then) and rip the row out from under the disintegrate animation before a
// single shard has had a chance to render. Manual actions that show their
// own transient visual state hold this while they're in flight; their own
// refresh() call at the end re-syncs from the freshest data regardless.
let suspendSnapshots = false;

function startPolling() {
  if (pollTimer || socketOpen) {
    return;
  }
  pollTimer = setInterval(refresh, 5000);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

function applySnapshot(snapshot) {
  if (suspendSnapshots) {
    return;
  }

  latestPorts = snapshot.ports;
  latestConnections = snapshot.connections;
  latestProtectedPorts = snapshot.protectedPorts;
  rerenderCurrentView();
  renderAlerts(snapshot.alerts);
  clearError();
}

async function refresh() {
  refreshIndicator.classList.add('spinning');
  try {
    if (currentView === 'ports') {
      await refreshPorts();
    } else {
      await refreshConnections();
    }
    await refreshAlerts();
    clearError();
  } catch (error) {
    showError(error.message);
  } finally {
    refreshIndicator.classList.remove('spinning');
  }
}

function switchView(view) {
  if (view === currentView) {
    return;
  }

  currentView = view;
  tabPorts.classList.toggle('active', view === 'ports');
  tabConnections.classList.toggle('active', view === 'connections');
  portsListElement.hidden = view !== 'ports';
  emptyState.hidden = view !== 'ports' || portsListElement.children.length > 0;
  connectionsListElement.hidden = view !== 'connections';
  connectionsEmptyState.hidden = view !== 'connections' || connectionsListElement.children.length > 0;

  refresh();
}

async function handleKill(port, row) {
  try {
    suspendSnapshots = true;
    await killPort(apiBaseUrl, port.port, port.protocol, authToken);
    clearError();
    await disintegrateRow(row);
    await refresh();
  } catch (error) {
    showError(error.message);
  } finally {
    suspendSnapshots = false;
  }
}

async function handleKillConnection(connection, row) {
  try {
    suspendSnapshots = true;
    await killPort(apiBaseUrl, connection.localPort, connection.protocol, authToken);
    clearError();
    await disintegrateRow(row);
    await refresh();
  } catch (error) {
    showError(error.message);
  } finally {
    suspendSnapshots = false;
  }
}

async function handleProtect(port) {
  try {
    await protectPort(apiBaseUrl, port, authToken);
    clearError();
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

async function handleUnprotect(port) {
  try {
    await unprotectPort(apiBaseUrl, port, authToken);
    clearError();
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

function handleHide(port) {
  hideProcessName(port.processName);
  renderHiddenProcessesList();
  applyFiltersAndRender();
}

function handleRename(port) {
  const current = getProcessAlias(port.processName);
  const next = window.prompt(`Apelido para "${port.processName}" (deixe em branco para remover):`, current);

  if (next === null) {
    return; // cancelled
  }

  setProcessAlias(port.processName, next);
  rerenderCurrentView();
}

function handleEditNote(port) {
  const key = portKey(port);
  const current = getPortNote(key);
  // window.prompt is blunt, but this is a personal desktop widget, not a
  // web app aiming for polish on every corner — a custom modal for one
  // occasional text field isn't worth the extra UI surface right now.
  const next = window.prompt(`Observação para a porta ${port.port} (${port.processName}):`, current);

  if (next === null) {
    return; // cancelled
  }

  setPortNote(key, next);
  applyFiltersAndRender();
}

hideButton.addEventListener('click', () => window.portManager?.hideWindow());

filterButton.addEventListener('click', () => {
  filterPanel.hidden = !filterPanel.hidden;
  filterButton.classList.toggle('active', !filterPanel.hidden);
});

hideSystemToggle.checked = getHideSystemPorts();
hideSystemToggle.addEventListener('change', () => {
  setHideSystemPorts(hideSystemToggle.checked);
  rerenderCurrentView();
});

tabPorts.addEventListener('click', () => switchView('ports'));
tabConnections.addEventListener('click', () => switchView('connections'));

searchButton.addEventListener('click', () => {
  searchBar.hidden = !searchBar.hidden;
  searchButton.classList.toggle('active', !searchBar.hidden);
  if (!searchBar.hidden) {
    searchInput.focus();
  }
});

searchInput.addEventListener('input', () => {
  searchText = searchInput.value;
  rerenderCurrentView();
});

renderHiddenProcessesList();

renderTwinkleField(
  document.getElementById('twinkle-field'),
  generateTwinkleSpecs(40),
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

connectPortsSocket(apiBaseUrl, {
  onOpen: () => {
    socketOpen = true;
    stopPolling();
  },
  onClose: () => {
    socketOpen = false;
    startPolling();
  },
  onSnapshot: applySnapshot,
});

authenticate().then(refresh); // immediate first paint over HTTP, before the socket necessarily connects
startPolling(); // fallback until/unless the socket takes over (a no-op if it already has)
