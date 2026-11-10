import { friendlyErrorMessage } from '../ui/friendlyError.js';

async function parseErrorBody(response) {
  return response.json().catch(() => ({}));
}

async function assertOk(response, fallback) {
  if (!response.ok) {
    const body = await parseErrorBody(response);
    throw new Error(friendlyErrorMessage(response.status, body.error, fallback));
  }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(apiBaseUrl, accessKey) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessKey }),
  });
  await assertOk(response, 'Não foi possível autenticar com a API.');
  const body = await response.json();
  return body.token;
}

export async function listPorts(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/ports`);
  await assertOk(response, 'Não foi possível listar as portas.');
  return response.json();
}

export async function listProtectedPorts(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/protection`);
  await assertOk(response, 'Não foi possível carregar as portas protegidas.');
  return response.json();
}

// port/protectPort/unprotectPort mutate state, so — unlike the read-only
// calls above — the API guards them with a JWT (see createAuthGuard.js on
// the API side); token is whatever apps/web's login() call returned.
export async function killPort(apiBaseUrl, port, protocol, token) {
  const response = await fetch(`${apiBaseUrl}/ports/${port}?protocol=${protocol}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await assertOk(response, 'Não foi possível encerrar o processo.');
}

export async function protectPort(apiBaseUrl, port, token) {
  const response = await fetch(`${apiBaseUrl}/protection/${port}`, { method: 'PUT', headers: authHeaders(token) });
  await assertOk(response, 'Não foi possível proteger a porta.');
}

export async function unprotectPort(apiBaseUrl, port, token) {
  const response = await fetch(`${apiBaseUrl}/protection/${port}`, { method: 'DELETE', headers: authHeaders(token) });
  await assertOk(response, 'Não foi possível desproteger a porta.');
}

export async function listOutboundConnections(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/connections`);
  await assertOk(response, 'Não foi possível listar as conexões de saída.');
  return response.json();
}

export async function listAlerts(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/alerts`);
  await assertOk(response, 'Não foi possível verificar atividade suspeita.');
  return response.json();
}
