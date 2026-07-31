import { isSystemPort } from './systemPorts.js';

function matchesSearch(port, search, resolveAlias) {
  const haystack = [
    port.processName,
    resolveAlias(port),
    port.executablePath,
    port.port,
    port.localPort,
    port.remoteHost,
    port.remoteAddress,
    port.pid,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
}

export function filterVisiblePorts(
  ports,
  { hiddenProcessNames = [], hideSystemPorts = false, searchText = '', resolveAlias = () => '' } = {}
) {
  const hiddenSet = new Set(hiddenProcessNames.map((name) => name.toLowerCase()));
  const search = searchText.trim().toLowerCase();

  return ports.filter((port) => {
    if (hiddenSet.has(port.processName.toLowerCase())) {
      return false;
    }
    if (hideSystemPorts && isSystemPort(port)) {
      return false;
    }
    if (search && !matchesSearch(port, search, resolveAlias)) {
      return false;
    }
    return true;
  });
}
