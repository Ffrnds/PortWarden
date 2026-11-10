import { filterVisiblePorts } from '../../src/ui/filterPorts.js';

function buildPort(port, processName) {
  return { port, protocol: 'TCP', pid: 1234, processName };
}

describe('filterVisiblePorts', () => {
  it('returns everything when there are no filters', () => {
    const ports = [buildPort(8080, 'node.exe'), buildPort(445, 'System')];

    expect(filterVisiblePorts(ports)).toEqual(ports);
  });

  it('excludes ports whose process name is hidden', () => {
    const ports = [buildPort(8080, 'btweb.exe'), buildPort(3000, 'node.exe')];

    const visible = filterVisiblePorts(ports, { hiddenProcessNames: ['btweb.exe'] });

    expect(visible.map((p) => p.port)).toEqual([3000]);
  });

  it('hides every port from that process, even across different port numbers', () => {
    const ports = [buildPort(65425, 'btweb.exe'), buildPort(65426, 'btweb.exe'), buildPort(3000, 'node.exe')];

    const visible = filterVisiblePorts(ports, { hiddenProcessNames: ['btweb.exe'] });

    expect(visible.map((p) => p.port)).toEqual([3000]);
  });

  it('matches hidden process names case-insensitively', () => {
    const ports = [buildPort(8080, 'BTWeb.exe')];

    const visible = filterVisiblePorts(ports, { hiddenProcessNames: ['btweb.exe'] });

    expect(visible).toEqual([]);
  });

  it('excludes system ports when hideSystemPorts is on', () => {
    const ports = [buildPort(445, 'System'), buildPort(8080, 'node.exe')];

    const visible = filterVisiblePorts(ports, { hideSystemPorts: true });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });

  it('combines both filters', () => {
    const ports = [buildPort(445, 'System'), buildPort(8080, 'node.exe'), buildPort(3000, 'btweb.exe')];

    const visible = filterVisiblePorts(ports, { hiddenProcessNames: ['btweb.exe'], hideSystemPorts: true });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });

  it('matches search text against the process name', () => {
    const ports = [buildPort(8080, 'node.exe'), buildPort(5432, 'postgres.exe')];

    const visible = filterVisiblePorts(ports, { searchText: 'postgres' });

    expect(visible.map((p) => p.port)).toEqual([5432]);
  });

  it('matches search text against the port number', () => {
    const ports = [buildPort(8080, 'node.exe'), buildPort(5432, 'postgres.exe')];

    const visible = filterVisiblePorts(ports, { searchText: '5432' });

    expect(visible.map((p) => p.port)).toEqual([5432]);
  });

  it('matches search text against the executable path', () => {
    const ports = [
      { port: 8080, protocol: 'TCP', pid: 1, processName: 'helper.exe', executablePath: 'C:\\Discord\\helper.exe' },
      { port: 5432, protocol: 'TCP', pid: 2, processName: 'helper.exe', executablePath: 'C:\\Slack\\helper.exe' },
    ];

    const visible = filterVisiblePorts(ports, { searchText: 'discord' });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });

  it('matches search text against a resolved alias', () => {
    const ports = [buildPort(8080, 'helper.exe')];

    const visible = filterVisiblePorts(ports, {
      searchText: 'discord overlay',
      resolveAlias: (port) => (port.port === 8080 ? 'Discord Overlay' : ''),
    });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });

  it('is case-insensitive and ignores surrounding whitespace', () => {
    const ports = [buildPort(8080, 'Node.exe')];

    const visible = filterVisiblePorts(ports, { searchText: '  NODE  ' });

    expect(visible.map((p) => p.port)).toEqual([8080]);
  });

  it('excludes everything when the search text matches nothing', () => {
    const ports = [buildPort(8080, 'node.exe')];

    const visible = filterVisiblePorts(ports, { searchText: 'nonexistent' });

    expect(visible).toEqual([]);
  });
});
