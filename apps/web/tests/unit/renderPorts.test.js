import { buildPortRow, renderPortRows, formatPortCountLabel, portKey } from '../../src/ui/renderPorts.js';

function buildPort(overrides = {}) {
  return { port: 8080, protocol: 'TCP', pid: 1234, processName: 'node.exe', ...overrides };
}

function buildHandlers(overrides = {}) {
  return {
    onKill: () => {},
    onProtect: () => {},
    onUnprotect: () => {},
    onHide: () => {},
    onEditNote: () => {},
    ...overrides,
  };
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
    const row = buildPortRow(buildPort(), false, '', buildHandlers());

    expect(row.querySelector('.port-number').textContent).toBe('8080');
    expect(row.querySelector('.port-process').textContent).toBe('tcp · node.exe');
    expect(row.classList.contains('protected')).toBe(false);
  });

  it('marks a protected port, but keeps its dot clickable (to unprotect)', () => {
    const row = buildPortRow(buildPort(), true, '', buildHandlers());

    expect(row.classList.contains('protected')).toBe(true);
    expect(row.querySelector('.port-dot').disabled).toBe(false);
  });

  it('does not render a note line when there is no note', () => {
    const row = buildPortRow(buildPort(), false, '', buildHandlers());

    expect(row.querySelector('.port-note')).toBeNull();
  });

  it('renders the note when one is given', () => {
    const row = buildPortRow(buildPort(), false, 'Meu backend Node', buildHandlers());

    expect(row.querySelector('.port-note').textContent).toBe('Meu backend Node');
  });

  it('calls onKill with the port and row when the kill button is clicked', () => {
    const onKill = vi.fn();
    const port = buildPort();
    const row = buildPortRow(port, false, '', buildHandlers({ onKill }));

    row.querySelector('.kill-btn').click();

    expect(onKill).toHaveBeenCalledWith(port, row);
  });

  it('calls onProtect with the port number when an unprotected dot is clicked', () => {
    const onProtect = vi.fn();
    const row = buildPortRow(buildPort({ port: 5432 }), false, '', buildHandlers({ onProtect }));

    row.querySelector('.port-dot').click();

    expect(onProtect).toHaveBeenCalledWith(5432);
  });

  it('calls onUnprotect with the port number when a protected dot is clicked', () => {
    const onUnprotect = vi.fn();
    const row = buildPortRow(buildPort({ port: 5432 }), true, '', buildHandlers({ onUnprotect }));

    row.querySelector('.port-dot').click();

    expect(onUnprotect).toHaveBeenCalledWith(5432);
  });

  it('calls onHide with the port when the hide button is clicked', () => {
    const onHide = vi.fn();
    const port = buildPort();
    const row = buildPortRow(port, false, '', buildHandlers({ onHide }));

    row.querySelector('.row-hide-btn').click();

    expect(onHide).toHaveBeenCalledWith(port);
  });

  it('calls onEditNote with the port when the info area is clicked', () => {
    const onEditNote = vi.fn();
    const port = buildPort();
    const row = buildPortRow(port, false, '', buildHandlers({ onEditNote }));

    row.querySelector('.port-info').click();

    expect(onEditNote).toHaveBeenCalledWith(port);
  });
});

describe('renderPortRows', () => {
  it('renders one row per port and marks protected ones', () => {
    const list = document.createElement('ul');
    const ports = [buildPort({ port: 8080 }), buildPort({ port: 5432 })];

    renderPortRows(list, ports, [5432], {}, buildHandlers());

    expect(list.children).toHaveLength(2);
    expect(list.children[1].classList.contains('protected')).toBe(true);
  });

  it('looks up each port note by its port key', () => {
    const list = document.createElement('ul');
    const ports = [buildPort({ port: 8080 }), buildPort({ port: 5432 })];

    renderPortRows(list, ports, [], { '5432/TCP': 'Postgres do projeto X' }, buildHandlers());

    expect(list.children[0].querySelector('.port-note')).toBeNull();
    expect(list.children[1].querySelector('.port-note').textContent).toBe('Postgres do projeto X');
  });

  it('clears previous rows before rendering new ones', () => {
    const list = document.createElement('ul');
    list.innerHTML = '<li>stale</li>';

    renderPortRows(list, [], [], {}, buildHandlers());

    expect(list.children).toHaveLength(0);
  });
});
