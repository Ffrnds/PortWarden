export function portKey(port) {
  return `${port.port}/${port.protocol}`;
}

export function formatPortCountLabel(count) {
  return `${count} ${count === 1 ? 'porta ativa' : 'portas ativas'}`;
}

export function buildPortRow(port, isProtected, { onKill, onProtect, onHide }) {
  const row = document.createElement('li');
  row.className = 'port-row' + (isProtected ? ' protected' : '');
  row.dataset.portKey = portKey(port);

  const dot = document.createElement('button');
  dot.className = 'port-dot';
  dot.title = isProtected ? 'Porta protegida' : 'Proteger porta';
  dot.disabled = isProtected;
  dot.addEventListener('click', () => onProtect(port.port));

  const info = document.createElement('span');
  info.className = 'port-info';

  const number = document.createElement('div');
  number.className = 'port-number';
  number.textContent = port.port;

  const processLine = document.createElement('div');
  processLine.className = 'port-process';
  processLine.textContent = `${port.protocol.toLowerCase()} · ${port.processName}`;

  info.append(number, processLine);

  const hideButton = document.createElement('button');
  hideButton.className = 'row-hide-btn';
  hideButton.title = 'Ocultar da lista';
  hideButton.textContent = '×';
  hideButton.addEventListener('click', () => onHide(port));

  const killButton = document.createElement('button');
  killButton.className = 'kill-btn';
  killButton.textContent = 'Encerrar';
  killButton.addEventListener('click', () => onKill(port, row));

  row.append(dot, info, hideButton, killButton);
  return row;
}

export function renderPortRows(listElement, ports, protectedPorts, handlers) {
  const protectedSet = new Set(protectedPorts);

  listElement.innerHTML = '';
  ports.forEach((port) => {
    listElement.appendChild(buildPortRow(port, protectedSet.has(port.port), handlers));
  });
}
