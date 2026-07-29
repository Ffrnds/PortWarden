import { listPorts, listProtectedPorts, killPort, protectPort } from './api/portsApiClient.js';
import { renderPortRows, formatPortCountLabel } from './ui/renderPorts.js';
import { generateTwinkleSpecs, renderTwinkleField } from './ui/twinkleField.js';

const apiPort = new URLSearchParams(location.search).get('apiPort');
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

const portsListElement = document.getElementById('ports-list');
const emptyState = document.getElementById('empty-state');
const errorBanner = document.getElementById('error-banner');
const portCountElement = document.getElementById('port-count');
const refreshIndicator = document.getElementById('refresh-indicator');
const hideButton = document.getElementById('hide-button');

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

async function refresh() {
  refreshIndicator.classList.add('spinning');
  try {
    const [ports, protectedPorts] = await Promise.all([listPorts(apiBaseUrl), listProtectedPorts(apiBaseUrl)]);
    clearError();
    renderPortRows(portsListElement, ports, protectedPorts, { onKill: handleKill, onProtect: handleProtect });
    emptyState.hidden = ports.length > 0;
    portCountElement.textContent = formatPortCountLabel(ports.length);
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
    row.classList.add('falling');
    row.addEventListener('animationend', () => refresh(), { once: true });
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

hideButton.addEventListener('click', () => window.portManager?.hideWindow());

renderTwinkleField(
  document.getElementById('twinkle-field'),
  generateTwinkleSpecs(40),
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

refresh();
setInterval(refresh, 5000);
