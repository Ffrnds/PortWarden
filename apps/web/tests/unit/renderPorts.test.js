import { buildPortRow, renderPortRows, formatPortCountLabel, portKey } from '../../src/ui/renderPorts.js';

function buildPort(overrides = {}) {
  return { port: 8080, protocol: 'TCP', pid: 1234, processName: 'node.exe', ...overrides };
}

describe('portKey', () => {
  it('combines port and protocol', () => {
    expect(portKey(buildPort())).toBe('8080/TCP');
  });
});

describe('formatPortCountLabel', () => {
  it('uses singular for exactly one port', () => {
    expect(formatPortCountLabel(1)).toBe('1 porta ativa');
  });

  it('uses plural for zero or many ports', () => {
    expect(formatPortCountLabel(0)).toBe('0 portas ativas');
    expect(formatPortCountLabel(3)).toBe('3 portas ativas');
  });
});

describe('buildPortRow', () => {
  it('renders the port number, protocol, and process name', () => {
    const row = buildPortRow(buildPort(), false, { onKill: () => {}, onProtect: () => {}, onHide: () => {} });

    expect(row.querySelector('.port-number').textContent).toBe('8080');
    expect(row.querySelector('.port-process').textContent).toBe('tcp · node.exe');
    expect(row.classList.contains('protected')).toBe(false);
  });

  it('marks a protected port and disables its dot', () => {
    const row = buildPortRow(buildPort(), true, { onKill: () => {}, onProtect: () => {}, onHide: () => {} });

    expect(row.classList.contains('protected')).toBe(true);
    expect(row.querySelector('.port-dot').disabled).toBe(true);
  });

  it('calls onKill with the port and row when the kill button is clicked', () => {
    const onKill = vi.fn();
    const port = buildPort();
    const row = buildPortRow(port, false, { onKill, onProtect: () => {}, onHide: () => {} });

    row.querySelector('.kill-btn').click();

    expect(onKill).toHaveBeenCalledWith(port, row);
  });

  it('calls onProtect with the port number when the dot is clicked', () => {
    const onProtect = vi.fn();
    const row = buildPortRow(buildPort({ port: 5432 }), false, { onKill: () => {}, onProtect, onHide: () => {} });

    row.querySelector('.port-dot').click();

    expect(onProtect).toHaveBeenCalledWith(5432);
  });

  it('calls onHide with the port when the hide button is clicked', () => {
    const onHide = vi.fn();
    const port = buildPort();
    const row = buildPortRow(port, false, { onKill: () => {}, onProtect: () => {}, onHide });

    row.querySelector('.row-hide-btn').click();

    expect(onHide).toHaveBeenCalledWith(port);
  });
});

describe('renderPortRows', () => {
  it('renders one row per port and marks protected ones', () => {
    const list = document.createElement('ul');
    const ports = [buildPort({ port: 8080 }), buildPort({ port: 5432 })];

    renderPortRows(list, ports, [5432], { onKill: () => {}, onProtect: () => {}, onHide: () => {} });

    expect(list.children).toHaveLength(2);
    expect(list.children[1].classList.contains('protected')).toBe(true);
  });

  it('clears previous rows before rendering new ones', () => {
    const list = document.createElement('ul');
    list.innerHTML = '<li>stale</li>';

    renderPortRows(list, [], [], { onKill: () => {}, onProtect: () => {}, onHide: () => {} });

    expect(list.children).toHaveLength(0);
  });
});
