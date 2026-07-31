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

export async function killPort(apiBaseUrl, port, protocol) {
  const response = await fetch(`${apiBaseUrl}/ports/${port}?protocol=${protocol}`, { method: 'DELETE' });
  await assertOk(response, 'Não foi possível encerrar o processo.');
}

export async function protectPort(apiBaseUrl, port) {
  const response = await fetch(`${apiBaseUrl}/protection/${port}`, { method: 'PUT' });
  await assertOk(response, 'Não foi possível proteger a porta.');
}

export async function unprotectPort(apiBaseUrl, port) {
  const response = await fetch(`${apiBaseUrl}/protection/${port}`, { method: 'DELETE' });
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
