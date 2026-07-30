import { isSystemPort } from './systemPorts.js';

export function filterVisiblePorts(ports, { hiddenProcessNames = [], hideSystemPorts = false } = {}) {
  const hiddenSet = new Set(hiddenProcessNames.map((name) => name.toLowerCase()));

  return ports.filter((port) => {
    if (hiddenSet.has(port.processName.toLowerCase())) {
      return false;
    }
    if (hideSystemPorts && isSystemPort(port)) {
      return false;
    }
    return true;
  });
}
