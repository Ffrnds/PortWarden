import { listPorts, listProtectedPorts, killPort, protectPort, unprotectPort } from './api/portsApiClient.js';
import { renderPortRows, formatPortCountLabel, portKey } from './ui/renderPorts.js';
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
const errorBanner = document.getElementById('error-banner');
const portCountElement = document.getElementById('port-count');
const refreshIndicator = document.getElementById('refresh-indicator');
const hideButton = document.getElementById('hide-button');
const filterButton = document.getElementById('filter-button');
const filterPanel = document.getElementById('filter-panel');
const hideSystemToggle = document.getElementById('hide-system-toggle');
const hiddenProcessesList = document.getElementById('hidden-ports-list');
const noHiddenPorts = document.getElementById('no-hidden-ports');

let latestPorts = [];
let latestProtectedPorts = [];

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
      applyFiltersAndRender();
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

async function refresh() {
  refreshIndicator.classList.add('spinning');
  try {
    const [ports, protectedPorts] = await Promise.all([listPorts(apiBaseUrl), listProtectedPorts(apiBaseUrl)]);
    clearError();
    latestPorts = ports;
    latestProtectedPorts = protectedPorts;
    applyFiltersAndRender(protectedPorts);
  } catch (error) {
    showError(error.message);
  } finally {
    refreshIndicator.classList.remove('spinning');
  }
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
  applyFiltersAndRender();
});

renderHiddenProcessesList();

renderTwinkleField(
  document.getElementById('twinkle-field'),
  generateTwinkleSpecs(40),
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

refresh();
setInterval(refresh, 5000);
