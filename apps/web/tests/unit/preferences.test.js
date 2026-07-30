import {
  getHiddenProcessNames,
  hideProcessName,
  unhideProcessName,
  getHideSystemPorts,
  setHideSystemPorts,
  getPortNotes,
  getPortNote,
  setPortNote,
} from '../../src/ui/preferences.js';

beforeEach(() => {
  localStorage.clear();
});

describe('hidden process names', () => {
  it('starts empty', () => {
    expect(getHiddenProcessNames()).toEqual([]);
  });

  it('persists a hidden name, lowercased', () => {
    hideProcessName('OneDrive.Sync.Service.exe');
    expect(getHiddenProcessNames()).toEqual(['onedrive.sync.service.exe']);
  });

  it('does not duplicate a name hidden twice', () => {
    hideProcessName('btweb.exe');
    hideProcessName('btweb.exe');
    expect(getHiddenProcessNames()).toEqual(['btweb.exe']);
  });

  it('treats different casings of the same name as the same entry', () => {
    hideProcessName('Code.exe');
    hideProcessName('CODE.EXE');
    expect(getHiddenProcessNames()).toEqual(['code.exe']);
  });

  it('removes a name when unhidden', () => {
    hideProcessName('btweb.exe');
    hideProcessName('node.exe');
    unhideProcessName('btweb.exe');
    expect(getHiddenProcessNames()).toEqual(['node.exe']);
  });
});

describe('hide system ports toggle', () => {
  it('defaults to false', () => {
    expect(getHideSystemPorts()).toBe(false);
  });

  it('persists the toggle value', () => {
    setHideSystemPorts(true);
    expect(getHideSystemPorts()).toBe(true);
  });
});

describe('port notes', () => {
  it('starts empty for any key', () => {
    expect(getPortNotes()).toEqual({});
    expect(getPortNote('3000/TCP')).toBe('');
  });

  it('persists a note keyed by port+protocol', () => {
    setPortNote('3000/TCP', 'Meu backend Node');

    expect(getPortNote('3000/TCP')).toBe('Meu backend Node');
    expect(getPortNote('5432/TCP')).toBe('');
  });

  it('trims whitespace around the note', () => {
    setPortNote('3000/TCP', '  Meu backend Node  ');

    expect(getPortNote('3000/TCP')).toBe('Meu backend Node');
  });

  it('clears the note when set to an empty (or whitespace-only) string', () => {
    setPortNote('3000/TCP', 'Meu backend Node');
    setPortNote('3000/TCP', '   ');

    expect(getPortNote('3000/TCP')).toBe('');
    expect(getPortNotes()).toEqual({});
  });

  it('keeps notes for different ports independent', () => {
    setPortNote('3000/TCP', 'API');
    setPortNote('5432/TCP', 'Postgres');

    expect(getPortNotes()).toEqual({ '3000/TCP': 'API', '5432/TCP': 'Postgres' });
  });
});
