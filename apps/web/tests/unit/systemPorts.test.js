import { isSystemPort } from '../../src/ui/systemPorts.js';

function buildPort(processName) {
  return { port: 445, protocol: 'TCP', pid: 4, processName };
}

describe('isSystemPort', () => {
  it('recognizes known Windows system processes', () => {
    expect(isSystemPort(buildPort('System'))).toBe(true);
    expect(isSystemPort(buildPort('svchost.exe'))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSystemPort(buildPort('SVCHOST.EXE'))).toBe(true);
  });

  it('does not flag a regular dev process', () => {
    expect(isSystemPort(buildPort('node.exe'))).toBe(false);
    expect(isSystemPort(buildPort('postgres.exe'))).toBe(false);
  });
});
