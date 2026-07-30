// Processes that are almost never what a developer is looking for in a
// day-to-day port list — Windows services, browsers, and other background
// apps you didn't start yourself, not something you spun up.
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
  'btweb.exe',
  'helper.exe',
  'code.exe',
  'msedge.exe',
  'onedrive.sync.service.exe',
  'jhi_service.exe',
]);

export function isSystemPort(port) {
  return SYSTEM_PROCESS_NAMES.has(port.processName.toLowerCase());
}
