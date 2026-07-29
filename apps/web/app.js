const apiPort = new URLSearchParams(location.search).get('apiPort');
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

const portsList = document.getElementById('ports-list');
const emptyState = document.getElementById('empty-state');
const errorBanner = document.getElementById('error-banner');
const portCount = document.getElementById('port-count');
const refreshIndicator = document.getElementById('refresh-indicator');
const hideButton = document.getElementById('hide-button');

const FRIENDLY_ERRORS = {
  400: 'Porta inválida.',
  403: 'Essa porta está protegida e não pode ser encerrada.',
  404: 'Nenhum processo está usando essa porta.',
  409: 'Sem privilégio suficiente para encerrar esse processo.',
  500: 'Algo deu errado no Port Manager.',
};

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function clearError() {
  errorBanner.hidden = true;
  errorBanner.textContent = '';
}

async function friendlyErrorFor(response, fallback) {
  const body = await response.json().catch(() => ({}));
  return FRIENDLY_ERRORS[response.status] || body.error || fallback;
}

function portKey(port) {
  return `${port.port}/${port.protocol}`;
}

function buildRow(port, isProtected) {
  const row = document.createElement('li');
  row.className = 'port-row' + (isProtected ? ' protected' : '');
  row.dataset.portKey = portKey(port);

  const dot = document.createElement('button');
  dot.className = 'port-dot';
  dot.title = isProtected ? 'Porta protegida' : 'Proteger porta';
  dot.disabled = isProtected;
  dot.addEventListener('click', () => protectPort(port.port));

  const info = document.createElement('span');
  info.className = 'port-info';

  const number = document.createElement('div');
  number.className = 'port-number';
  number.textContent = port.port;

  const process_ = document.createElement('div');
  process_.className = 'port-process';
  process_.textContent = `${port.protocol.toLowerCase()} · ${port.processName}`;

  info.append(number, process_);

  const killButton = document.createElement('button');
  killButton.className = 'kill-btn';
  killButton.textContent = 'Encerrar';
  killButton.addEventListener('click', () => killPort(port, row));

  row.append(dot, info, killButton);
  return row;
}

function renderPorts(ports, protectedPorts) {
  const protectedSet = new Set(protectedPorts);

  portsList.innerHTML = '';
  ports.forEach((port) => {
    portsList.appendChild(buildRow(port, protectedSet.has(port.port)));
  });

  emptyState.hidden = ports.length > 0;
  portCount.textContent = `${ports.length} ${ports.length === 1 ? 'porta ativa' : 'portas ativas'}`;
}

async function fetchJson(path, fallbackMessage) {
  const response = await fetch(`${apiBaseUrl}${path}`);
  if (!response.ok) {
    throw new Error(await friendlyErrorFor(response, fallbackMessage));
  }
  return response.json();
}

async function refresh() {
  refreshIndicator.classList.add('spinning');
  try {
    const [ports, protectedPorts] = await Promise.all([
      fetchJson('/ports', 'Não foi possível listar as portas.'),
      fetchJson('/protection', 'Não foi possível carregar as portas protegidas.'),
    ]);
    clearError();
    renderPorts(ports, protectedPorts);
  } catch (error) {
    showError(error.message);
  } finally {
    refreshIndicator.classList.remove('spinning');
  }
}

async function killPort(port, row) {
  try {
    const response = await fetch(`${apiBaseUrl}/ports/${port.port}?protocol=${port.protocol}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(await friendlyErrorFor(response, 'Não foi possível encerrar o processo.'));
    }

    clearError();
    row.classList.add('falling');
    row.addEventListener('animationend', () => refresh(), { once: true });
  } catch (error) {
    showError(error.message);
  }
}

async function protectPort(port) {
  try {
    const response = await fetch(`${apiBaseUrl}/protection/${port}`, { method: 'PUT' });
    if (!response.ok) {
      throw new Error(await friendlyErrorFor(response, 'Não foi possível proteger a porta.'));
    }
    clearError();
    await refresh();
  } catch (error) {
    showError(error.message);
  }
}

function buildTwinkleField() {
  const field = document.getElementById('twinkle-field');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = 40;
  const parts = [];

  for (let i = 0; i < count; i += 1) {
    const top = (Math.random() * 100).toFixed(1);
    const left = (Math.random() * 100).toFixed(1);
    const size = (Math.random() * 1.6 + 1).toFixed(1);
    const duration = (Math.random() * 2.5 + 2.2).toFixed(1);
    const delay = (Math.random() * 5).toFixed(1);
    const style =
      `top:${top}%; left:${left}%; width:${size}px; height:${size}px;` +
      (reduceMotion ? 'opacity:.6;' : `animation-duration:${duration}s; animation-delay:${delay}s;`);
    parts.push(`<span class="widget-twinkle" style="${style}"></span>`);
  }

  field.innerHTML = parts.join('');
}

hideButton.addEventListener('click', () => window.portManager?.hideWindow());

buildTwinkleField();
refresh();
setInterval(refresh, 5000);
