const apiPort = new URLSearchParams(location.search).get('apiPort');
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

const portsBody = document.getElementById('ports-body');
const emptyState = document.getElementById('empty-state');
const errorBanner = document.getElementById('error-banner');
const refreshButton = document.getElementById('refresh-button');

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

function buildCell(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function renderPorts(ports) {
  portsBody.innerHTML = '';
  emptyState.hidden = ports.length > 0;

  ports.forEach((port) => {
    const row = document.createElement('tr');
    row.append(buildCell(port.port), buildCell(port.protocol), buildCell(port.pid), buildCell(port.processName));

    const actionsCell = document.createElement('td');

    const protectButton = document.createElement('button');
    protectButton.textContent = 'Protect';
    protectButton.addEventListener('click', () => protectPort(port.port));

    const killButton = document.createElement('button');
    killButton.textContent = 'Kill';
    killButton.className = 'kill-button';
    killButton.addEventListener('click', () => killPort(port));

    actionsCell.append(protectButton, killButton);
    row.appendChild(actionsCell);
    portsBody.appendChild(row);
  });
}

async function readErrorMessage(response, fallback) {
  const body = await response.json().catch(() => ({}));
  return body.error || fallback;
}

async function fetchPorts() {
  const response = await fetch(`${apiBaseUrl}/ports`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Failed to list ports (${response.status})`));
  }
  return response.json();
}

async function refresh() {
  try {
    const ports = await fetchPorts();
    clearError();
    renderPorts(ports);
  } catch (error) {
    showError(error.message);
  }
}

async function killPort(port) {
  const confirmed = window.confirm(`Kill ${port.processName} (PID ${port.pid}) on port ${port.port}/${port.protocol}?`);
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/ports/${port.port}?protocol=${port.protocol}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, `Failed to kill process (${response.status})`));
    }
    clearError();
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

async function protectPort(port) {
  try {
    const response = await fetch(`${apiBaseUrl}/protection/${port}`, { method: 'PUT' });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, `Failed to protect port (${response.status})`));
    }
    clearError();
  } catch (error) {
    showError(error.message);
  }
}

refreshButton.addEventListener('click', refresh);
refresh();
setInterval(refresh, 5000);
