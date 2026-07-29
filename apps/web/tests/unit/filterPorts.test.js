import { filterVisiblePorts } from '../../src/ui/filterPorts.js';

function buildPort(port, processName) {
  return { port, protocol: 'TCP', pid: 1234, processName };
}

describe('filterVisiblePorts', () => {
  it('returns everything when there are no filters', () => {
    const ports = [buildPort(8080, 'node.exe'), buildPort(445, 'System')];

    expect(filterVisiblePorts(ports)).toEqual(ports);
  });

  it('excludes manually hidden ports by key', () => {
    const ports = [buildPort(8080, 'node.exe'), buildPort(3000, 'node.exe')];

    const visible = filterVisiblePorts(ports, { hiddenKeys: ['8080/TCP'] });

    expect(visible.map((p) => p.port)).toEqual([3000]);
  });

  it('excludes system ports when hideSystemPorts is on', () => {
    const ports = [buildPort(445, 'System'), buildPort(8080, 'node.exe')];

    const visible = filterVisiblePorts(ports, { hideSystemPorts: true });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });

  it('combines both filters', () => {
    const ports = [buildPort(445, 'System'), buildPort(8080, 'node.exe'), buildPort(3000, 'node.exe')];

    const visible = filterVisiblePorts(ports, { hiddenKeys: ['3000/TCP'], hideSystemPorts: true });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });
});
