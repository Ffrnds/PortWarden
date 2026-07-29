import { friendlyErrorMessage } from '../../src/ui/friendlyError.js';

describe('friendlyErrorMessage', () => {
  it('returns a PT-BR message for known status codes', () => {
    expect(friendlyErrorMessage(403, 'anything', 'fallback')).toBe('Essa porta está protegida e não pode ser encerrada.');
    expect(friendlyErrorMessage(409, 'anything', 'fallback')).toBe('Sem privilégio suficiente para encerrar esse processo.');
  });

  it('falls back to the backend message for an unknown status code', () => {
    expect(friendlyErrorMessage(418, 'sou um bule de chá', 'fallback')).toBe('sou um bule de chá');
  });

  it('falls back to the given fallback when neither is available', () => {
    expect(friendlyErrorMessage(418, undefined, 'fallback')).toBe('fallback');
  });
});
