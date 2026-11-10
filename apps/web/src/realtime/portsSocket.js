// Client side of the real-time push in apps/api (see
// createPortsWebSocketServer.js) — augments, not replaces, the REST API:
// callers keep their normal polling loop as a fallback and are expected to
// pause it while onOpen has fired and resume it on onClose (a fixed
// interval here would fight with page unload/test teardown, and it's the
// caller who actually knows what "pause polling" means for it).
export function connectPortsSocket(apiBaseUrl, handlers = {}, { reconnectDelayMs = 5000, WebSocketImpl = WebSocket } = {}) {
  const wsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '/ws');
  let socket = null;
  let reconnectTimer = null;
  let closedByCaller = false;

  function connect() {
    socket = new WebSocketImpl(wsUrl);

    socket.addEventListener('open', () => handlers.onOpen?.());

    socket.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return; // malformed frame — ignore rather than crash the UI over it
      }
      if (message.type === 'snapshot') {
        handlers.onSnapshot?.(message);
      }
    });

    socket.addEventListener('close', () => {
      handlers.onClose?.();
      if (!closedByCaller) {
        reconnectTimer = setTimeout(connect, reconnectDelayMs);
      }
    });

    // A connection-refused/network error fires 'error' and then 'close' —
    // the 'close' handler above is what schedules the reconnect, so there's
    // nothing extra to do here beyond not letting it throw unhandled.
    socket.addEventListener('error', () => {});
  }

  connect();

  return {
    close() {
      closedByCaller = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
