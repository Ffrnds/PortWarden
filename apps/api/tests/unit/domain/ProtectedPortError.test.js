const { ProtectedPortError } = require('../../../src/domain/exceptions/ProtectedPortError');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');

describe('ProtectedPortError', () => {
  it('is a typed Error carrying the protected port', () => {
    const port = new PortNumber(5432);

    const error = new ProtectedPortError(port);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ProtectedPortError');
    expect(error.portNumber).toBe(port);
    expect(error.message).toContain('5432');
  });

  it('can be distinguished from a generic Error by callers', () => {
    const error = new ProtectedPortError(new PortNumber(5432));

    expect(error instanceof ProtectedPortError).toBe(true);
  });

  it('rejects a portNumber that is not a PortNumber instance', () => {
    expect(() => new ProtectedPortError(5432)).toThrow();
  });
});
