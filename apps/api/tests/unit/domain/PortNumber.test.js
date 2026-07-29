const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');

describe('PortNumber', () => {
  it('creates a valid port number', () => {
    const port = new PortNumber(8080);

    expect(port.value).toBe(8080);
  });

  it.each([0, -1, 65536, 1.5, NaN, 'abc'])('rejects invalid value: %s', (invalid) => {
    expect(() => new PortNumber(invalid)).toThrow();
  });

  it('accepts the boundaries of the valid range', () => {
    expect(() => new PortNumber(1)).not.toThrow();
    expect(() => new PortNumber(65535)).not.toThrow();
  });

  it('is immutable', () => {
    const port = new PortNumber(80);

    expect(() => {
      port.value = 443;
    }).toThrow();
  });

  it('compares by value, not by reference', () => {
    const a = new PortNumber(3000);
    const b = new PortNumber(3000);
    const c = new PortNumber(3001);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a).not.toBe(b);
  });
});
