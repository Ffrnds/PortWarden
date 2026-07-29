// Processes that are almost never what a developer is looking for in a
// day-to-day port list — core Windows services, not something you spun up.
const SYSTEM_PROCESS_NAMES = new Set([
  'system',
  'system idle process',
  'svchost.exe',
  'wininit.exe',
  'services.exe',
  'lsass.exe',
  'csrss.exe',
  'smss.exe',
  'spoolsv.exe',
  'dllhost.exe',
  'dns.exe',
  'registry',
  'memory compression',
]);

export function isSystemPort(port) {
  return SYSTEM_PROCESS_NAMES.has(port.processName.toLowerCase());
}
