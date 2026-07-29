const { isAccessDeniedError } = require('../../../../../src/adapters/driven/process/NodeProcessTerminatorAdapter');

describe('isAccessDeniedError', () => {
  it('treats exit code 1 as access denied', () => {
    expect(isAccessDeniedError({ code: 1 })).toBe(true);
  });

  it('does not treat exit code 128 (pid not found) as access denied', () => {
    expect(isAccessDeniedError({ code: 128 })).toBe(false);
  });

  it('does not treat a successful-looking value as access denied', () => {
    expect(isAccessDeniedError({ code: 0 })).toBe(false);
    expect(isAccessDeniedError(undefined)).toBe(false);
  });
});
