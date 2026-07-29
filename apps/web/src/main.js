import { listPorts, listProtectedPorts, killPort, protectPort } from './api/portsApiClient.js';
import { renderPortRows, formatPortCountLabel, portKey } from './ui/renderPorts.js';
import { generateTwinkleSpecs, renderTwinkleField } from './ui/twinkleField.js';
import { filterVisiblePorts } from './ui/filterPorts.js';
import { disintegrateRow } from './ui/disintegrate.js';
import {
  getHiddenPortKeys,
  hidePortKey,
  unhidePortKey,
  getHideSystemPorts,
  setHideSystemPorts,
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
const hiddenPortsList = document.getElementById('hidden-ports-list');
const noHiddenPorts = document.getElementById('no-hidden-ports');

let latestPorts = [];

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

function renderHiddenPortsList() {
  const hiddenKeys = getHiddenPortKeys();
  hiddenPortsList.innerHTML = '';
  noHiddenPorts.hidden = hiddenKeys.length > 0;

  hiddenKeys.forEach((key) => {
    const item = document.createElement('li');
    item.className = 'hidden-port-item';

    const label = document.createElement('span');
    label.textContent = key;

    const unhideButton = document.createElement('button');
    unhideButton.className = 'unhide-btn';
    unhideButton.textContent = 'Mostrar';
    unhideButton.addEventListener('click', () => {
      unhidePortKey(key);
      renderHiddenPortsList();
      applyFiltersAndRender();
    });

    item.append(label, unhideButton);
    hiddenPortsList.appendChild(item);
  });
}

function applyFiltersAndRender(protectedPorts = []) {
  const visiblePorts = filterVisiblePorts(latestPorts, {
    hiddenKeys: getHiddenPortKeys(),
    hideSystemPorts: getHideSystemPorts(),
  });

  renderPortRows(portsListElement, visiblePorts, protectedPorts, {
    onKill: handleKill,
    onProtect: handleProtect,
    onHide: handleHide,
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

function handleHide(port) {
  hidePortKey(portKey(port));
  renderHiddenPortsList();
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

renderHiddenPortsList();

renderTwinkleField(
  document.getElementById('twinkle-field'),
  generateTwinkleSpecs(40),
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

refresh();
setInterval(refresh, 5000);
