export function formatConnectionCountLabel(count) {
  return `${count} ${count === 1 ? 'conexão ativa' : 'conexões ativas'}`;
}

export function buildConnectionRow(connection, { onKill }) {
  const row = document.createElement('li');
  row.className = 'port-row connection-row';

  const dot = document.createElement('span');
  dot.className = 'port-dot connection-dot';

  const info = document.createElement('span');
  info.className = 'port-info';

  const remoteLine = document.createElement('div');
  remoteLine.className = 'port-number connection-remote';
  remoteLine.textContent = connection.remoteHost || connection.remoteAddress;
  if (connection.remoteHost) {
    // The raw IP is still worth having on hand, just not as the headline.
    remoteLine.title = connection.remoteAddress;
  }

  const processLine = document.createElement('div');
  processLine.className = 'port-process';
  processLine.textContent = `${connection.processName} · PID ${connection.pid} · porta local ${connection.localPort}`;
  if (connection.executablePath) {
    processLine.title = connection.executablePath;
  }

  info.append(remoteLine, processLine);

  const killButton = document.createElement('button');
  killButton.className = 'kill-btn';
  killButton.textContent = 'Encerrar';
  killButton.addEventListener('click', () => onKill(connection, row));

  row.append(dot, info, killButton);
  return row;
}

export function renderConnectionRows(listElement, connections, handlers) {
  listElement.innerHTML = '';
  connections.forEach((connection) => {
    listElement.appendChild(buildConnectionRow(connection, handlers));
  });
}
