import { connectPortsSocket } from '../../src/realtime/portsSocket.js';

// A fake of the browser's WebSocket, not a mock of anything this project
// owns — same reasoning as FakePortInspectorAdapter on the API side: it
// lets the reconnect/dispatch logic here be tested as pure logic. The real
// wire-level behavior is covered by apps/api's
// createPortsWebSocketServer.test.js (real http.Server + real `ws` client)
// and the web e2e suite (real browser WebSocket against the real API).
class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = {};
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  dispatch(type, arg) {
    (this.listeners[type] || []).forEach((listener) => listener(arg));
  }

  close() {
    this.closed = true;
    this.dispatch('close');
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
});

describe('connectPortsSocket', () => {
  it('connects to a ws:// URL derived from the http(s) API base URL', () => {
    connectPortsSocket('http://127.0.0.1:3000/api', {}, { WebSocketImpl: FakeWebSocket });

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe('ws://127.0.0.1:3000/ws');
  });

  it('calls onOpen when the socket opens', () => {
    const onOpen = vi.fn();
    connectPortsSocket('http://127.0.0.1:3000/api', { onOpen }, { WebSocketImpl: FakeWebSocket });

    FakeWebSocket.instances[0].dispatch('open');

    expect(onOpen).toHaveBeenCalled();
  });

  it('calls onSnapshot with the parsed message for a snapshot frame', () => {
    const onSnapshot = vi.fn();
    connectPortsSocket('http://127.0.0.1:3000/api', { onSnapshot }, { WebSocketImpl: FakeWebSocket });

    const payload = { type: 'snapshot', ports: [], connections: [], protectedPorts: [], alerts: [] };
    FakeWebSocket.instances[0].dispatch('message', { data: JSON.stringify(payload) });

    expect(onSnapshot).toHaveBeenCalledWith(payload);
  });

  it('ignores a malformed message instead of throwing', () => {
    const onSnapshot = vi.fn();
    connectPortsSocket('http://127.0.0.1:3000/api', { onSnapshot }, { WebSocketImpl: FakeWebSocket });

    expect(() => FakeWebSocket.instances[0].dispatch('message', { data: 'not json' })).not.toThrow();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('ignores a message whose type is not "snapshot"', () => {
    const onSnapshot = vi.fn();
    connectPortsSocket('http://127.0.0.1:3000/api', { onSnapshot }, { WebSocketImpl: FakeWebSocket });

    FakeWebSocket.instances[0].dispatch('message', { data: JSON.stringify({ type: 'ping' }) });

    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('calls onClose and reconnects after the delay when the socket closes', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    connectPortsSocket('http://127.0.0.1:3000/api', { onClose }, { WebSocketImpl: FakeWebSocket, reconnectDelayMs: 1000 });

    FakeWebSocket.instances[0].dispatch('close');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    vi.useRealTimers();
  });

  it('does not reconnect after close() was called by the caller', () => {
    vi.useFakeTimers();
    const handle = connectPortsSocket('http://127.0.0.1:3000/api', {}, { WebSocketImpl: FakeWebSocket, reconnectDelayMs: 1000 });

    handle.close();
    vi.advanceTimersByTime(5000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].closed).toBe(true);

    vi.useRealTimers();
  });
});
