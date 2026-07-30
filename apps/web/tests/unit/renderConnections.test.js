import { buildConnectionRow, renderConnectionRows, formatConnectionCountLabel } from '../../src/ui/renderConnections.js';

function buildConnection(overrides = {}) {
  return {
    localPort: 51234,
    protocol: 'TCP',
    remoteAddress: '142.250.72.14',
    remotePort: 443,
    remoteHost: null,
    pid: 4112,
    processName: 'msedge.exe',
    executablePath: null,
    ...overrides,
  };
}

describe('formatConnectionCountLabel', () => {
  it('uses singular for exactly one connection', () => {
    expect(formatConnectionCountLabel(1)).toBe('1 conexão ativa');
  });

  it('uses plural otherwise', () => {
    expect(formatConnectionCountLabel(0)).toBe('0 conexões ativas');
    expect(formatConnectionCountLabel(2)).toBe('2 conexões ativas');
  });
});

describe('buildConnectionRow', () => {
  it('shows the raw remote address when there is no resolved hostname', () => {
    const row = buildConnectionRow(buildConnection(), { onKill: () => {} });

    expect(row.querySelector('.connection-remote').textContent).toBe('142.250.72.14');
    expect(row.querySelector('.connection-remote').title).toBe('');
  });

  it('prefers the resolved hostname over the raw IP, keeping the IP as a tooltip', () => {
    const row = buildConnectionRow(buildConnection({ remoteHost: 'google.com' }), { onKill: () => {} });

    expect(row.querySelector('.connection-remote').textContent).toBe('google.com');
    expect(row.querySelector('.connection-remote').title).toBe('142.250.72.14');
  });

  it('shows process name, PID, and local port', () => {
    const row = buildConnectionRow(buildConnection(), { onKill: () => {} });

    expect(row.querySelector('.port-process').textContent).toBe('msedge.exe · PID 4112 · porta local 51234');
  });

  it('calls onKill with the connection and row when the kill button is clicked', () => {
    const onKill = vi.fn();
    const connection = buildConnection();
    const row = buildConnectionRow(connection, { onKill });

    row.querySelector('.kill-btn').click();

    expect(onKill).toHaveBeenCalledWith(connection, row);
  });
});

describe('renderConnectionRows', () => {
  it('renders one row per connection', () => {
    const list = document.createElement('ul');

    renderConnectionRows(list, [buildConnection(), buildConnection({ localPort: 51235 })], { onKill: () => {} });

    expect(list.children).toHaveLength(2);
  });

  it('clears previous rows before rendering new ones', () => {
    const list = document.createElement('ul');
    list.innerHTML = '<li>stale</li>';

    renderConnectionRows(list, [], { onKill: () => {} });

    expect(list.children).toHaveLength(0);
  });
});
