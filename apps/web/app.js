// Minimal placeholder — proves the embedded API port arrives correctly and
// is reachable over fetch(). The real port-list UI is built in a later step.
const apiPort = new URLSearchParams(location.search).get('apiPort');
const appElement = document.getElementById('app');

fetch(`http://127.0.0.1:${apiPort}/api/ports`)
  .then((response) => response.json())
  .then((ports) => {
    appElement.textContent = `API on port ${apiPort} — ${ports.length} port(s) in use.`;
  })
  .catch((error) => {
    appElement.textContent = `Failed to reach API on port ${apiPort}: ${error.message}`;
  });
