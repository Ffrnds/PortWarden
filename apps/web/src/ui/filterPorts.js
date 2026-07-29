import { portKey } from './renderPorts.js';
import { isSystemPort } from './systemPorts.js';

export function filterVisiblePorts(ports, { hiddenKeys = [], hideSystemPorts = false } = {}) {
  const hiddenSet = new Set(hiddenKeys);

  return ports.filter((port) => {
    if (hiddenSet.has(portKey(port))) {
      return false;
    }
    if (hideSystemPorts && isSystemPort(port)) {
      return false;
    }
    return true;
  });
}
