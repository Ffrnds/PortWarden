export function portKey(port) {
  return `${port.port}/${port.protocol}`;
}

export function formatPortCountLabel(count) {
  return `${count} ${count === 1 ? 'porta ativa' : 'portas ativas'}`;
}

export function buildPortRow(port, isProtected, note, { onKill, onProtect, onUnprotect, onHide, onEditNote }) {
  const row = document.createElement('li');
  row.className = 'port-row' + (isProtected ? ' protected' : '');
  row.dataset.portKey = portKey(port);

  const dot = document.createElement('button');
  dot.className = 'port-dot';
  dot.title = isProtected ? 'Clique para desproteger' : 'Proteger porta';
  dot.addEventListener('click', () => (isProtected ? onUnprotect(port.port) : onProtect(port.port)));

  const info = document.createElement('span');
  info.className = 'port-info';
  info.title = note ? 'Clique para editar a observação' : 'Clique para adicionar uma observação';
  info.addEventListener('click', () => onEditNote(port));

  const number = document.createElement('div');
  number.className = 'port-number';
  number.textContent = port.port;

  const processLine = document.createElement('div');
  processLine.className = 'port-process';
  processLine.textContent = `${port.protocol.toLowerCase()} · ${port.processName} · PID ${port.pid}`;
  if (port.executablePath) {
    // Full path in a native tooltip — the compact row has no room to show
    // it inline, but it's exactly what tells apart generic names like
    // "helper.exe" that several unrelated apps all happen to use.
    processLine.title = port.executablePath;
  }

  info.append(number, processLine);

  if (note) {
    const noteLine = document.createElement('div');
    noteLine.className = 'port-note';
    noteLine.textContent = note;
    info.append(noteLine);
  }

  const hideButton = document.createElement('button');
  hideButton.className = 'row-hide-btn';
  hideButton.title = `Ocultar todas as portas de "${port.processName}"`;
  hideButton.textContent = '×';
  hideButton.addEventListener('click', () => onHide(port));

  const killButton = document.createElement('button');
  killButton.className = 'kill-btn';
  killButton.textContent = 'Encerrar';
  killButton.addEventListener('click', () => onKill(port, row));

  row.append(dot, info, hideButton, killButton);
  return row;
}

export function renderPortRows(listElement, ports, protectedPorts, notes, handlers) {
  const protectedSet = new Set(protectedPorts);

  listElement.innerHTML = '';
  ports.forEach((port) => {
    const note = notes[portKey(port)] || '';
    listElement.appendChild(buildPortRow(port, protectedSet.has(port.port), note, handlers));
  });
}
