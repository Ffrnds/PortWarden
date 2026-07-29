const { parsePortParam, ValidationError } = require('../../../../../../src/adapters/driving/http/validators/parsePortParam');

describe('parsePortParam', () => {
  it('parses a numeric string into an integer', () => {
    expect(parsePortParam('8080')).toBe(8080);
  });

  it('rejects a non-numeric value', () => {
    expect(() => parsePortParam('abc')).toThrow(ValidationError);
  });

  it('rejects a decimal value', () => {
    expect(() => parsePortParam('80.5')).toThrow(ValidationError);
  });
});
