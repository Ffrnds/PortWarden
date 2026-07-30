import {
  listPorts,
  listProtectedPorts,
  killPort,
  protectPort,
  unprotectPort,
  listOutboundConnections,
} from './api/portsApiClient.js';
import { renderPortRows, formatPortCountLabel, portKey } from './ui/renderPorts.js';
import { renderConnectionRows, formatConnectionCountLabel } from './ui/renderConnections.js';
import { generateTwinkleSpecs, renderTwinkleField } from './ui/twinkleField.js';
import { filterVisiblePorts } from './ui/filterPorts.js';
import { disintegrateRow } from './ui/disintegrate.js';
import {
  getHiddenProcessNames,
  hideProcessName,
  unhideProcessName,
  getHideSystemPorts,
  setHideSystemPorts,
  getPortNote,
  setPortNote,
  getPortNotes,
} from './ui/preferences.js';

const apiPort = new URLSearchParams(location.search).get('apiPort');
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

const portsListElement = document.getElementById('ports-list');
const emptyState = document.getElementById('empty-state');
const connectionsListElement = document.getElementById('connections-list');
const connectionsEmptyState = document.getElementById('connections-empty-state');
const errorBanner = document.getElementById('error-banner');
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

let latestPorts = [];
let latestProtectedPorts = [];
let latestConnections = [];
let currentView = 'ports'; // 'ports' | 'connections'

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
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
  });

  renderPortRows(portsListElement, visiblePorts, protectedPorts, getPortNotes(), {
    onKill: handleKill,
    onProtect: handleProtect,
    onUnprotect: handleUnprotect,
    onHide: handleHide,
    onEditNote: handleEditNote,
  });

  emptyState.hidden = visiblePorts.length > 0;

  const hiddenCount = latestPorts.length - visiblePorts.length;
  portCountElement.textContent =
    formatPortCountLabel(visiblePorts.length) + (hiddenCount > 0 ? ` (${hiddenCount} ocultas)` : '');
}

function renderConnectionsView(connections) {
  // Same hidden-process-names/system-noise filters apply here too — a
  // browser alone can hold dozens of established connections.
  const visibleConnections = filterVisiblePorts(connections, {
    hiddenProcessNames: getHiddenProcessNames(),
    hideSystemPorts: getHideSystemPorts(),
  });

  renderConnectionRows(connectionsListElement, visibleConnections, { onKill: handleKillConnection });

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

async function refresh() {
  refreshIndicator.classList.add('spinning');
  try {
    if (currentView === 'ports') {
      await refreshPorts();
    } else {
      await refreshConnections();
    }
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
    await killPort(apiBaseUrl, port.port, port.protocol);
    clearError();
    await disintegrateRow(row);
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

async function handleKillConnection(connection, row) {
  try {
    await killPort(apiBaseUrl, connection.localPort, connection.protocol);
    clearError();
    await disintegrateRow(row);
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

async function handleProtect(port) {
  try {
    await protectPort(apiBaseUrl, port);
    clearError();
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

async function handleUnprotect(port) {
  try {
    await unprotectPort(apiBaseUrl, port);
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

renderHiddenProcessesList();

renderTwinkleField(
  document.getElementById('twinkle-field'),
  generateTwinkleSpecs(40),
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

refresh();
setInterval(refresh, 5000);
