const { InsufficientPrivilegeError } = require('../../../src/domain/exceptions/InsufficientPrivilegeError');
const { ProcessId } = require('../../../src/domain/value-objects/ProcessId');

describe('InsufficientPrivilegeError', () => {
  it('is a typed Error carrying the pid', () => {
    const pid = new ProcessId(4321);

    const error = new InsufficientPrivilegeError(pid);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InsufficientPrivilegeError');
    expect(error.pid).toBe(pid);
    expect(error.message).toContain('4321');
  });

  it('can be distinguished from a generic Error by callers', () => {
    const error = new InsufficientPrivilegeError(new ProcessId(4321));

    expect(error instanceof InsufficientPrivilegeError).toBe(true);
  });

  it('rejects a pid that is not a ProcessId instance', () => {
    expect(() => new InsufficientPrivilegeError(4321)).toThrow();
  });
});
