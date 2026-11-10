const FRIENDLY_ERRORS = {
  400: 'Porta inválida.',
  403: 'Essa porta está protegida e não pode ser encerrada.',
  404: 'Nenhum processo está usando essa porta.',
  409: 'Sem privilégio suficiente para encerrar esse processo.',
  500: 'Algo deu errado no Port Manager.',
};

export function friendlyErrorMessage(status, backendMessage, fallback) {
  return FRIENDLY_ERRORS[status] || backendMessage || fallback;
}
