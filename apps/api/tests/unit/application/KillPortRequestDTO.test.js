const { KillPortRequestDTO } = require('../../../src/application/dto/KillPortRequestDTO');

describe('KillPortRequestDTO', () => {
  it('holds the raw request fields as-is, without validating them', () => {
    const dto = new KillPortRequestDTO({ portNumber: '8080', protocol: 'tcp' });

    expect(dto).toEqual({ portNumber: '8080', protocol: 'tcp' });
  });
});
