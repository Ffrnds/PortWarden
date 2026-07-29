import {
  getHiddenPortKeys,
  hidePortKey,
  unhidePortKey,
  getHideSystemPorts,
  setHideSystemPorts,
} from '../../src/ui/preferences.js';

beforeEach(() => {
  localStorage.clear();
});

describe('hidden port keys', () => {
  it('starts empty', () => {
    expect(getHiddenPortKeys()).toEqual([]);
  });

  it('persists a hidden key', () => {
    hidePortKey('8080/TCP');
    expect(getHiddenPortKeys()).toEqual(['8080/TCP']);
  });

  it('does not duplicate a key hidden twice', () => {
    hidePortKey('8080/TCP');
    hidePortKey('8080/TCP');
    expect(getHiddenPortKeys()).toEqual(['8080/TCP']);
  });

  it('removes a key when unhidden', () => {
    hidePortKey('8080/TCP');
    hidePortKey('3000/TCP');
    unhidePortKey('8080/TCP');
    expect(getHiddenPortKeys()).toEqual(['3000/TCP']);
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
