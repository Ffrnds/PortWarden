export function formatConnectionCountLabel(count) {
  return `${count} ${count === 1 ? 'conexão ativa' : 'conexões ativas'}`;
}

export function buildConnectionRow(connection, alias, { onKill }) {
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

  info.append(remoteLine);

  if (connection.remoteCountry) {
    const geoLine = document.createElement('div');
    geoLine.className = 'connection-geo';
    geoLine.textContent = connection.remoteCity
      ? `${connection.remoteCity}, ${connection.remoteCountry}`
      : connection.remoteCountry;
    info.append(geoLine);
  }

  const processLine = document.createElement('div');
  processLine.className = 'port-process';
  const displayName = alias || connection.processName;
  processLine.textContent = `${displayName} · PID ${connection.pid} · porta local ${connection.localPort}`;
  // Aliases are edited from the Ports tab (see renderPorts.js) — this tab
  // just reflects them, so the tooltip surfaces the real name alongside
  // the executable path rather than offering an edit action here too.
  const tooltipParts = [];
  if (alias) {
    tooltipParts.push(connection.processName);
  }
  if (connection.executablePath) {
    tooltipParts.push(connection.executablePath);
  }
  if (tooltipParts.length > 0) {
    processLine.title = tooltipParts.join(' — ');
  }

  info.append(processLine);

  const killButton = document.createElement('button');
  killButton.className = 'kill-btn';
  killButton.textContent = 'Encerrar';
  killButton.addEventListener('click', () => onKill(connection, row));

  row.append(dot, info, killButton);
  return row;
}

export function renderConnectionRows(listElement, connections, aliases, handlers) {
  listElement.innerHTML = '';
  connections.forEach((connection) => {
    const alias = aliases[connection.processName.toLowerCase()] || '';
    listElement.appendChild(buildConnectionRow(connection, alias, handlers));
  });
}
