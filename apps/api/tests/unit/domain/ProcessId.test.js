const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

describe('ProcessId', () => {
  it('creates a valid process id', () => {
    expect(new ProcessId(1234).value).toBe(1234);
  });

  it('accepts 0 (System Idle on Windows)', () => {
    expect(() => new ProcessId(0)).not.toThrow();
  });

  it.each([-1, 1.5, NaN, 'abc', null, undefined])('rejects invalid value: %s', (invalid) => {
    expect(() => new ProcessId(invalid)).toThrow();
  });

  it('is immutable', () => {
    const pid = new ProcessId(4);

    expect(() => {
      pid.value = 5;
    }).toThrow();
  });

  it('compares by value, not by reference', () => {
    const a = new ProcessId(4);
    const b = new ProcessId(4);
    const c = new ProcessId(5);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
