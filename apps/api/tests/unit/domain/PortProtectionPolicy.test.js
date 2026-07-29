const { PortProtectionPolicy } = require('../../../src/domain/services/PortProtectionPolicy');
const { PortNumber } = require('../../../src/domain/value-objects/PortNumber');

describe('PortProtectionPolicy', () => {
  it('reports no port as protected when the list is empty', () => {
    const policy = new PortProtectionPolicy();

    expect(policy.isProtected(new PortNumber(5432))).toBe(false);
  });

  it('reports a configured port as protected', () => {
    const policy = new PortProtectionPolicy([new PortNumber(5432), new PortNumber(6379)]);

    expect(policy.isProtected(new PortNumber(5432))).toBe(true);
    expect(policy.isProtected(new PortNumber(6379))).toBe(true);
  });

  it('reports a non-configured port as not protected', () => {
    const policy = new PortProtectionPolicy([new PortNumber(5432)]);

    expect(policy.isProtected(new PortNumber(3000))).toBe(false);
  });

  it('rejects a non-PortNumber in the configured list', () => {
    expect(() => new PortProtectionPolicy([5432])).toThrow();
  });

  it('rejects a non-PortNumber argument to isProtected', () => {
    const policy = new PortProtectionPolicy([new PortNumber(5432)]);

    expect(() => policy.isProtected(5432)).toThrow();
  });

  it('is not affected by mutating the array passed to the constructor', () => {
    const externalList = [new PortNumber(5432)];
    const policy = new PortProtectionPolicy(externalList);

    externalList.push(new PortNumber(3000));

    expect(policy.isProtected(new PortNumber(3000))).toBe(false);
  });
});
