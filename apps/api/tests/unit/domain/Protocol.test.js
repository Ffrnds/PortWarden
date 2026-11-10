const { Protocol } = require('../../../src/domain/value-objects/Protocol');

describe('Protocol', () => {
  it.each(['TCP', 'UDP'])('accepts %s', (valid) => {
    expect(new Protocol(valid).value).toBe(valid);
  });

  it('normalizes lowercase input', () => {
    expect(new Protocol('tcp').value).toBe('TCP');
  });

  it.each(['ICMP', 'http', '', null, undefined, 123])('rejects invalid value: %s', (invalid) => {
    expect(() => new Protocol(invalid)).toThrow();
  });

  it('is immutable', () => {
    const protocol = new Protocol('TCP');

    expect(() => {
      protocol.value = 'UDP';
    }).toThrow();
  });

  it('compares by value, not by reference', () => {
    const a = new Protocol('TCP');
    const b = new Protocol('tcp');
    const c = new Protocol('UDP');

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
